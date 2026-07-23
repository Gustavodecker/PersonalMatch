import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Profile } from '@/types/database';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: 'student' | 'trainer') => Promise<{ error: string | null }>;
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

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (mountedRef.current) setProfile(data);
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
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          try {
            await fetchProfile(s.user.id);
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
          try { await fetchProfile(s.user.id); }
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

  const signOut = async () => {
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
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
