import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      setError('E-mail ou senha incorretos. Verifique e tente novamente.');
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={[Colors.primary[800], Colors.primary[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <Image
                source={require('@/assets/images/logo-icon.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.tagline}>Conecte-se ao personal certo</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.title}>Boas-vindas de volta</Text>
            <Text style={styles.subtitle}>Entre com sua conta para continuar</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorMsg}>{error}</Text>
              </View>
            ) : null}

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

            <View style={styles.btnWrap}>
              <Button onPress={handleLogin} loading={loading} size="lg" style={styles.btn}>
                Entrar
              </Button>
            </View>

            <View style={styles.divider}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>ou</Text>
              <View style={styles.divLine} />
            </View>

            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.registerText}>
                Não tem conta? <Text style={styles.registerBold}>Criar conta grátis</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.homeLink} onPress={() => router.replace('/')}>
              <Text style={styles.homeLinkText}>← Voltar à página inicial</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary[800] },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },

  hero: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl + 8,
    paddingBottom: Spacing.xl + 4,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  logoImg: { width: 75, height: 75 },
  tagline: {
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: Spacing.xl,
    paddingTop: 36,
    paddingBottom: 32,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: '800',
    color: Colors.neutral[900],
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.neutral[500],
    marginBottom: Spacing.xl,
  },

  errorBox: {
    backgroundColor: Colors.error[50],
    borderWidth: 1,
    borderColor: Colors.error[100],
    borderRadius: BorderRadii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorMsg: {
    fontSize: FontSizes.sm,
    color: Colors.error[700],
    fontWeight: '500',
  },

  btnWrap: { marginTop: Spacing.sm },
  btn: { width: '100%' },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.lg,
  },
  divLine: { flex: 1, height: 1, backgroundColor: Colors.neutral[200] },
  divText: { fontSize: FontSizes.sm, color: Colors.neutral[400], fontWeight: '500' },

  registerBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  registerText: { fontSize: FontSizes.md, color: Colors.neutral[600] },
  registerBold: { color: Colors.primary[600], fontWeight: '700' },

  homeLink: { alignItems: 'center', paddingTop: Spacing.lg },
  homeLinkText: { fontSize: FontSizes.sm, color: Colors.neutral[400] },
});
