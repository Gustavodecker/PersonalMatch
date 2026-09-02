import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { Platform } from 'react-native';
import { Session, User, Provider } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { logoutRevenueCat } from '@/src/lib/revenuecat';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: 'student' | 'trainer') => Promise<{ error: string | null }>;
  signInWithProvider: (provider: Provider) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchProfile = async (userId: string, userEmail?: string, fullName?: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        if (mountedRef.current) setProfile(data);
        return;
      }
      if (userEmail) {
        const { data: created } = await supabase
          .from('profiles')
          .insert({ id: userId, email: userEmail, full_name: fullName || '', role: 'student' })
          .select()
          .single();
        if (created) {
          await supabase.from('students').insert({ id: userId });
        }
        if (mountedRef.current) setProfile(created);
      } else {
        if (mountedRef.current) setProfile(null);
      }
    } catch {
      if (mountedRef.current) setProfile(null);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let subscription: { unsubscribe: () => void } | null = null;

    (async () => {
      try {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code');
          if (code) {
            const { data: { session: oauthSession }, error: oauthError } = await supabase.auth.exchangeCodeForSession(code);
            window.history.replaceState({}, '', window.location.pathname);
            if (!mountedRef.current) return;
            if (oauthSession && !oauthError) {
              setSession(oauthSession);
              setUser(oauthSession.user);
              await fetchProfile(oauthSession.user.id, oauthSession.user.email, oauthSession.user.user_metadata?.full_name || oauthSession.user.user_metadata?.name);
              setLoading(false);
              return;
            }
          }

          const hash = window.location.hash;
          if (hash && hash.includes('access_token')) {
            const hashParams = new URLSearchParams(hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            if (accessToken && refreshToken) {
              const { data: { session: hashSession } } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              window.history.replaceState({}, '', window.location.pathname);
              if (!mountedRef.current) return;
              if (hashSession) {
                setSession(hashSession);
                setUser(hashSession.user);
                await fetchProfile(hashSession.user.id, hashSession.user.email, hashSession.user.user_metadata?.full_name || hashSession.user.user_metadata?.name);
                setLoading(false);
                return;
              }
            }
          }
        }

        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          try {
            await fetchProfile(s.user.id, s.user.email, s.user.user_metadata?.full_name || s.user.user_metadata?.name);
          } catch {
            if (mountedRef.current) setProfile(null);
          }
        }
      } catch {
        if (mountedRef.current) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mountedRef.current) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        (async () => {
          try { await fetchProfile(s.user.id, s.user.email, s.user.user_metadata?.full_name || s.user.user_metadata?.name); }
          catch { if (mountedRef.current) setProfile(null); }
        })();
      } else {
        setProfile(null);
      }
    });
    subscription = sub;

    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'student' | 'trainer') => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('signUp failed', error);
      return {
        error:
          'Não foi possível criar a conta com esses dados. Verifique o e-mail e a senha e tente novamente.',
      };
    }
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        email,
        role,
      });
      if (profileError) {
        console.error('profile creation failed', profileError);
        return { error: 'Não foi possível concluir o cadastro. Tente novamente.' };
      }
      if (role === 'trainer') {
        await supabase.from('trainers').insert({ id: data.user.id });
      } else {
        await supabase.from('students').insert({ id: data.user.id });
      }
    }
    return { error: null };
  };

  const signInWithProvider = useCallback(async (provider: Provider) => {
    try {
      if (Platform.OS === 'web') {
        const redirectTo = window.location.origin;
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            queryParams: { prompt: 'select_account' },
          },
        });
        if (error) {
          console.error('OAuth signIn failed', error);
          return { error: 'Não foi possível entrar com essa conta. Tente novamente.' };
        }
        return { error: null };
      }

      const redirectUri = makeRedirectUri({ scheme: 'personal99', path: 'auth/callback' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUri,
          queryParams: { prompt: 'select_account' },
          skipBrowserRedirect: true,
        },
      });

      if (error || !data.url) {
        console.error('OAuth signIn failed', error);
        return { error: 'Não foi possível entrar com essa conta. Tente novamente.' };
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type !== 'success' || !result.url) {
        return { error: null };
      }

      const url = new URL(result.url);

      const code = url.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('Code exchange failed', exchangeError);
          return { error: 'Não foi possível completar o login. Tente novamente.' };
        }
        return { error: null };
      }

      const fragment = url.hash?.substring(1);
      if (fragment) {
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            console.error('Session set failed', sessionError);
            return { error: 'Não foi possível completar o login. Tente novamente.' };
          }
          return { error: null };
        }
      }

      return { error: 'Não foi possível completar o login. Tente novamente.' };
    } catch (e) {
      console.error('OAuth flow error', e);
      return { error: 'Não foi possível entrar com essa conta. Tente novamente.' };
    }
  }, []);

  const signOut = async () => {
    await logoutRevenueCat();
    await supabase.auth.signOut();
    if (mountedRef.current) {
      setProfile(null);
      setUser(null);
      setSession(null);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signInWithProvider, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
