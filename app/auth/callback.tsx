import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';

export default function AuthCallbackScreen() {
  useEffect(() => {
    (async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          const parsed = new URL(url);

          const code = parsed.searchParams.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
            router.replace('/');
            return;
          }

          const fragment = parsed.hash?.substring(1);
          if (fragment) {
            const params = new URLSearchParams(fragment);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            if (accessToken && refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              router.replace('/');
              return;
            }
          }
        }
      } catch {
        // Auth state handled by onAuthStateChange listener
      }

      router.replace('/');
    })();
  }, []);

  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color={Colors.primary[600]} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[50],
  },
});
