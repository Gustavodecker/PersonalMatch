import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://mirxceopqeyyhmyyoxiv.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.includes('mirxceopqeyyhmyyoxiv')
  ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pcnhjZW9wcWV5eWhteXlveGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTk2MzMsImV4cCI6MjA5NjUzNTYzM30.gIGaTgcRYsnprWLTa69BTWLsJ2d1FSs3DkCtIV-NFJw';

const storage = Platform.OS === 'web'
  ? {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) => { localStorage.setItem(key, value); return Promise.resolve(); },
      removeItem: (key: string) => { localStorage.removeItem(key); return Promise.resolve(); },
    }
  : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    // On web: detect code/token in URL after OAuth redirect.
    // On native: session is exchanged manually via WebBrowser + exchangeCodeForSession.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
