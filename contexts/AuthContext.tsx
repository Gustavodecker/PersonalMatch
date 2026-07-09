import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

// Needed on Android/iOS to warm up the browser for faster OAuth
WebBrowser.maybeCompleteAuthSession();

// ─── Types ────────────────────────────────────────────────────────────────────

export type OAuthProvider = 'google' | 'azure' | 'apple';

export type OAuthUserMeta = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** True when the user signed in via OAuth but has no profile yet and needs to choose their role. */
  needsRoleSelection: boolean;
  /** Name/avatar extracted from the OAuth provider for display on the role selection screen. */
  oauthUserMeta: OAuthUserMeta | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: 'student' | 'trainer') => Promise<{ error: string | null }>;
  /** Sign in / sign up with Google, Microsoft (azure), or Apple.
   *  On the Register screen pass `intendedRole` so the profile is created automatically without
   *  prompting the role-selection step. */
  signInWithProvider: (provider: OAuthProvider, intendedRole?: 'student' | 'trainer') => Promise<{ error: string | null }>;
  /** Called from the role-selection screen after the user picks a role. Creates the profile. */
  completeOAuthSignup: (role: 'student' | 'trainer') => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const APP_SCHEME = 'supershape';

/** SessionStorage is only available on web. Returns null on native. */
const ss = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' ? window.sessionStorage : null;

/** Extract normalized user metadata from an auth.User returned by any OAuth provider. */
function extractOAuthMeta(user: User): OAuthUserMeta {
  const meta = user.user_metadata ?? {};
  const fullName =
    meta.full_name ?? meta.name ?? meta.display_name ??
    user.email?.split('@')[0] ?? 'Usuário';
  const avatarUrl =
    meta.avatar_url ?? meta.picture ?? meta.photo ?? null;
  return {
    id: user.id,
    fullName,
    email: user.email ?? meta.email ?? '',
    avatarUrl,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [session, setSession]   = useState<Session | null>(null);
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [oauthUserMeta, setOauthUserMeta]           = useState<OAuthUserMeta | null>(null);

  // Prevent concurrent profile fetches from creating duplicate profile rows
  const profileFetchingRef = useRef(false);

  // ── Core profile fetch ──────────────────────────────────────────────────────

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data as Profile | null);
    return data as Profile | null;
  };

  // ── Create profile for OAuth new users ─────────────────────────────────────

  const createProfileForOAuth = async (
    authUser: User,
    role: 'student' | 'trainer',
  ) => {
    if (profileFetchingRef.current) return;
    profileFetchingRef.current = true;
    try {
      const meta = extractOAuthMeta(authUser);

      // Insert profile (may fail if already exists due to race — that's fine)
      await supabase.from('profiles').upsert(
        {
          id: authUser.id,
          full_name: meta.fullName,
          email: meta.email,
          role,
          avatar_url: meta.avatarUrl,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );

      if (role === 'trainer') {
        const now = new Date();
        const trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + 15);
        await supabase.from('trainers').upsert(
          {
            id: authUser.id,
            status: 'active',
            subscription_plan: 'free_trial',
            subscription_status: 'trialing',
            trial_started_at: now.toISOString(),
            trial_ends_at: trialEndsAt.toISOString(),
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      } else {
        await supabase.from('students').upsert(
          { id: authUser.id },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      }

      await fetchProfile(authUser.id);
    } finally {
      profileFetchingRef.current = false;
    }
  };

  // ── Auth state listener ─────────────────────────────────────────────────────

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).then((p) => {
          // User is authenticated but has no profile (e.g., refreshed the page mid-onboarding)
          if (!p) {
            setNeedsRoleSelection(true);
            setOauthUserMeta(extractOAuthMeta(s.user));
          }
        }).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        const existing = await fetchProfile(s.user.id);

        if (!existing) {
          // Check for a role pre-selected on the Register screen
          const pendingRole = ss()?.getItem('oauth_pending_role') as 'student' | 'trainer' | null;

          if ((pendingRole === 'student' || pendingRole === 'trainer') && event === 'SIGNED_IN') {
            // Auto-create profile using the pre-selected role
            ss()?.removeItem('oauth_pending_role');
            await createProfileForOAuth(s.user, pendingRole);
          } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            // No pre-selected role → show role-selection screen
            setNeedsRoleSelection(true);
            setOauthUserMeta(extractOAuthMeta(s.user));
          }
        } else {
          setNeedsRoleSelection(false);
        }
      } else {
        setProfile(null);
        setNeedsRoleSelection(false);
        setOauthUserMeta(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Auth methods ────────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'student' | 'trainer') => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id, full_name: fullName, email, role,
      });
      if (profileError) return { error: profileError.message };
      if (role === 'trainer') {
        const now = new Date();
        const trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + 15);
        await supabase.from('trainers').insert({
          id: data.user.id, status: 'active',
          subscription_plan: 'free_trial', subscription_status: 'trialing',
          trial_started_at: now.toISOString(), trial_ends_at: trialEndsAt.toISOString(),
        });
      } else {
        await supabase.from('students').insert({ id: data.user.id });
      }
    }
    return { error: null };
  };

  /**
   * Sign in with a social OAuth provider.
   * - On **web**: triggers a full-page redirect to the provider and back.
   * - On **native**: opens an in-app browser via expo-web-browser and exchanges
   *   the returned code for a session without leaving the app.
   *
   * Pass `intendedRole` from the Register screen to skip the role-selection step.
   */
  const signInWithProvider = async (
    provider: OAuthProvider,
    intendedRole?: 'student' | 'trainer',
  ): Promise<{ error: string | null }> => {
    // Store the intended role so onAuthStateChange can auto-create the profile
    if (intendedRole) {
      ss()?.setItem('oauth_pending_role', intendedRole);
    }

    if (Platform.OS === 'web') {
      // ── Web: standard OAuth redirect ──────────────────────────────────────
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      // On success the browser navigates away — nothing else to do here
      return { error: error?.message ?? null };
    }

    // ── Native: use expo-web-browser + manual code exchange ─────────────────
    const redirectUri = `${APP_SCHEME}://`;

    const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUri, skipBrowserRedirect: true },
    });

    if (oauthErr) return { error: oauthErr.message };
    if (!data.url) return { error: 'Não foi possível iniciar o login social.' };

    let result: WebBrowser.WebBrowserAuthSessionResult;
    try {
      result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri, {
        showInRecents: true,
      });
    } catch (e: any) {
      return { error: e.message ?? 'Erro ao abrir o navegador.' };
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      // User cancelled — clean up pending role
      ss()?.removeItem('oauth_pending_role');
      return { error: null };
    }

    if (result.type !== 'success' || !result.url) {
      ss()?.removeItem('oauth_pending_role');
      return { error: 'Autenticação cancelada ou falhou.' };
    }

    // Try PKCE exchange (code param)
    const parsedUrl = new URL(result.url);
    const code = parsedUrl.searchParams.get('code');
    if (code) {
      const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
      return { error: exchangeErr?.message ?? null };
    }

    // Fallback: implicit flow (access_token in URL hash or query)
    const fragment = result.url.includes('#')
      ? result.url.split('#')[1]
      : result.url.split('?')[1] ?? '';
    const params = new URLSearchParams(fragment);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token) {
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token ?? '',
      });
      return { error: sessionErr?.message ?? null };
    }

    ss()?.removeItem('oauth_pending_role');
    return { error: 'Não foi possível processar a autenticação.' };
  };

  /**
   * Called from the role-selection screen when a new OAuth user picks their role.
   * Creates the profile row and student/trainer records, then refreshes local state.
   */
  const completeOAuthSignup = async (role: 'student' | 'trainer'): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Usuário não autenticado.' };

    const meta = oauthUserMeta ?? extractOAuthMeta(user);

    const { error: profileErr } = await supabase.from('profiles').insert({
      id: user.id,
      full_name: meta.fullName,
      email: meta.email,
      role,
      avatar_url: meta.avatarUrl,
    });

    if (profileErr) {
      // Row might already exist in a race — try fetching it
      const existing = await fetchProfile(user.id);
      if (!existing) return { error: profileErr.message };
      setNeedsRoleSelection(false);
      setOauthUserMeta(null);
      return { error: null };
    }

    if (role === 'trainer') {
      const now = new Date();
      const trialEndsAt = new Date(now);
      trialEndsAt.setDate(trialEndsAt.getDate() + 15);
      await supabase.from('trainers').insert({
        id: user.id, status: 'active',
        subscription_plan: 'free_trial', subscription_status: 'trialing',
        trial_started_at: now.toISOString(), trial_ends_at: trialEndsAt.toISOString(),
      });
    } else {
      await supabase.from('students').insert({ id: user.id });
    }

    await fetchProfile(user.id);
    setNeedsRoleSelection(false);
    setOauthUserMeta(null);
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setNeedsRoleSelection(false);
    setOauthUserMeta(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      needsRoleSelection, oauthUserMeta,
      signIn, signUp, signInWithProvider, completeOAuthSignup,
      signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
