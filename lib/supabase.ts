import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// In-memory storage fallback for React Native (avoids native module dependency)
// Session is kept alive as long as the app is open; autoRefreshToken handles renewal.
const memoryStore: Record<string, string> = {};
const mobileStorage = {
  getItem: (key: string): Promise<string | null> =>
    Promise.resolve(memoryStore[key] ?? null),
  setItem: (key: string, value: string): Promise<void> => {
    memoryStore[key] = value;
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    delete memoryStore[key];
    return Promise.resolve();
  },
};

const webStorage = {
  getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};

const storage = Platform.OS === 'web' ? webStorage : mobileStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
