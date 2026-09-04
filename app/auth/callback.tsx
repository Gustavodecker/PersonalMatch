import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    (async () => {
      try {
        const code = params.code;

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          router.replace('/');
          return;
        }

        const url = await Linking.getInitialURL();
        if (url) {
          const parsed = new URL(url);

          const urlCode = parsed.searchParams.get('code');
          if (urlCode) {
            await supabase.auth.exchangeCodeForSession(urlCode);
            router.replace('/');
            return;
          }

          const fragment = parsed.hash?.substring(1);
          if (fragment) {
            const hashParams = new URLSearchParams(fragment);
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
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

        router.replace('/');
      } catch {
        router.replace('/');
      }
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
