import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSizes, BorderRadii } from '@/constants/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) { setError('Preencha e-mail e senha.'); return; }
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (err) {
      setError('E-mail ou senha incorretos.');
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Image
              source={require('@/assets/images/k-1aa6IzU5CK8N6qYmpX7_BKvZ5utI_00001.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Conecte-se ao personal certo</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Entrar</Text>

            {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

            <Input
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="seu@email.com"
            />
            <Input
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />

            <Button onPress={handleLogin} loading={loading} size="lg">Entrar</Button>

            <TouchableOpacity style={styles.link} onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.linkText}>
                Não tem conta? <Text style={styles.linkBold}>Cadastre-se</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.homeLink} onPress={() => router.replace('/')}>
              <Text style={styles.homeLinkText}>Voltar ao início</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary[700] },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  logo: {
    width: 260,
    height: 80,
  },
  tagline: { fontSize: FontSizes.md, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  card: {
    flex: 1, backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadii.xl, borderTopRightRadius: BorderRadii.xl,
    padding: Spacing.xl, paddingTop: Spacing.xxl, gap: Spacing.xs,
  },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.neutral[900], marginBottom: Spacing.md },
  errorMsg: {
    backgroundColor: Colors.error[50], color: Colors.error[700],
    borderRadius: BorderRadii.md, padding: Spacing.md, fontSize: FontSizes.sm, marginBottom: Spacing.sm,
  },
  link: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.sm },
  linkText: { fontSize: FontSizes.md, color: Colors.neutral[600] },
  linkBold: { color: Colors.primary[600], fontWeight: '700' },
  homeLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  homeLinkText: { fontSize: FontSizes.sm, color: Colors.neutral[400] },
});
