import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: 'student' | 'trainer') => Promise<{ error: string | null }>;
  signInWithGoogle: (intendedRole?: 'student' | 'trainer') => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getSessionStorage = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' ? window.sessionStorage : null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data);
    return data as Profile | null;
  };

  const createOAuthProfile = async (authUser: User) => {
    const ss = getSessionStorage();
    const pendingRole = (ss?.getItem('oauth_pending_role') as 'student' | 'trainer' | null) ?? 'student';
    const fullName =
      authUser.user_metadata?.full_name ??
      authUser.user_metadata?.name ??
      authUser.email?.split('@')[0] ??
      'Usuário';
    const email = authUser.email ?? '';

    const { error: profileErr } = await supabase.from('profiles').insert({
      id: authUser.id,
      full_name: fullName,
      email,
      role: pendingRole,
    });

    if (!profileErr) {
      if (pendingRole === 'trainer') {
        const now = new Date();
        const trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + 15);
        await supabase.from('trainers').insert({
          id: authUser.id,
          status: 'active',
          subscription_plan: 'free_trial',
          subscription_status: 'trialing',
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEndsAt.toISOString(),
        });
      } else {
        await supabase.from('students').insert({ id: authUser.id });
      }
      ss?.removeItem('oauth_pending_role');
    }

    await fetchProfile(authUser.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const existing = await fetchProfile(s.user.id);
        // New OAuth user landing after provider redirect
        if (!existing && event === 'SIGNED_IN') {
          await createOAuthProfile(s.user);
        }
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'student' | 'trainer') => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        email,
        role,
      });
      if (profileError) return { error: profileError.message };
      if (role === 'trainer') {
        const now = new Date();
        const trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + 15);
        await supabase.from('trainers').insert({
          id: data.user.id,
          status: 'active',
          subscription_plan: 'free_trial',
          subscription_status: 'trialing',
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEndsAt.toISOString(),
        });
      } else {
        await supabase.from('students').insert({ id: data.user.id });
      }
    }
    return { error: null };
  };

  const signInWithGoogle = async (intendedRole?: 'student' | 'trainer') => {
    if (intendedRole) {
      getSessionStorage()?.setItem('oauth_pending_role', intendedRole);
    }
    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin + '/'
        : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
