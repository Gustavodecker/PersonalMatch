import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSizes, BorderRadii } from '@/constants/theme';
import { Dumbbell } from 'lucide-react-native';

function GoogleIcon() {
  return (
    <View style={g.iconWrap}>
      <Text style={g.iconText}>G</Text>
    </View>
  );
}

const g = StyleSheet.create({
  iconWrap: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#dadce0',
  },
  iconText: {
    fontSize: 13, fontWeight: '800',
    color: '#4285F4',
    letterSpacing: -0.2,
    lineHeight: 17,
  },
});

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

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

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error: err } = await signInWithGoogle();
    if (err) {
      setError(err);
      setGoogleLoading(false);
    }
    // On success the page redirects — no need to reset loading
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <Dumbbell size={36} color={Colors.white} />
            </View>
            <Text style={styles.brand}>SuperShape</Text>
            <Text style={styles.tagline}>Conecte-se ao personal certo</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Entrar</Text>

            {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

            {/* Google OAuth */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogle}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              <GoogleIcon />
              <Text style={styles.googleBtnText}>
                {googleLoading ? 'Redirecionando…' : 'Continuar com Google'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou entre com e-mail</Text>
              <View style={styles.dividerLine} />
            </View>

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
  hero: { alignItems: 'center', paddingTop: Spacing.xxxl, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  logoWrap: {
    width: 72, height: 72, borderRadius: BorderRadii.xl,
    backgroundColor: Colors.primary[500], alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  brand: { fontSize: FontSizes.xxxl, fontWeight: '700', color: Colors.white, letterSpacing: -0.5 },
  tagline: { fontSize: FontSizes.md, color: Colors.primary[200] },
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

  // Google button
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: '#dadce0',
    borderRadius: BorderRadii.lg, paddingVertical: 13,
    marginBottom: Spacing.sm,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  googleBtnText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[800] },

  // Divider
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginVertical: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.neutral[200] },
  dividerText: { fontSize: FontSizes.sm, color: Colors.neutral[400], fontWeight: '500' },

  link: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.sm },
  linkText: { fontSize: FontSizes.md, color: Colors.neutral[600] },
  linkBold: { color: Colors.primary[600], fontWeight: '700' },
  homeLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  homeLinkText: { fontSize: FontSizes.sm, color: Colors.neutral[400] },
});
