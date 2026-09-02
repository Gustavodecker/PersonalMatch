import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  console.error(`[99Personal] Variáveis do Supabase ausentes: ${missing.join(', ')}`);
}

export function validateEnvironment(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!process.env.EXPO_PUBLIC_WEB_URL) missing.push('EXPO_PUBLIC_WEB_URL');

  if (Platform.OS === 'android' && !process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY) {
    console.warn('[99Personal] EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ausente — compras in-app desativadas no Android');
  }
  if (Platform.OS === 'ios' && !process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY) {
    console.warn('[99Personal] EXPO_PUBLIC_REVENUECAT_IOS_KEY ausente — compras in-app desativadas no iOS');
  }

  if (missing.length > 0) {
    console.error(`[99Personal] Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
  }

  return { ok: missing.length === 0, missing };
}

const nativeStorage = {
  getItem: (key: string): Promise<string | null> =>
    SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> =>
    SecureStore.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> =>
    SecureStore.deleteItemAsync(key),
};

const webStorage = {
  getItem: (key: string) =>
    Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null),
  setItem: (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return Promise.resolve();
  },
};

const storage = Platform.OS === 'web' ? webStorage : nativeStorage;

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      storage,
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: Platform.OS === 'web',
    },
  }
);
