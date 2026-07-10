import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSizes, BorderRadii } from '@/constants/theme';
import { ArrowLeft, Dumbbell, Search } from 'lucide-react-native';

type Role = 'student' | 'trainer';

const ROLES: { id: Role; label: string; sub: string; icon: typeof Search }[] = [
  { id: 'student', label: 'Sou Aluno',   sub: 'Quero encontrar um personal',   icon: Search },
  { id: 'trainer', label: 'Sou Personal', sub: 'Quero oferecer meus serviços', icon: Dumbbell },
];

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const params = useLocalSearchParams<{ role?: string }>();
  const initialRole: Role = params.role === 'trainer' ? 'trainer' : 'student';
  const [fullName, setFullName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [role, setRole]           = useState<Role>(initialRole);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Preencha todos os campos.'); return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.'); return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await signUp(
      email.trim().toLowerCase(), password, fullName.trim(), role,
    );
    setLoading(false);
    if (err) {
      setError(err);
    } else if (role === 'trainer') {
      router.replace('/trainer/onboarding');
    } else {
      router.replace('/onboarding/student');
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

          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={20} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.topLogoWrap}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.topLogoImg}
                resizeMode="contain"
              />
            </View>
            <View style={styles.backBtn} />
          </View>

          {/* Headline */}
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Criar sua conta</Text>
            <Text style={styles.heroSub}>É grátis e leva menos de 2 minutos</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Role selector */}
            <Text style={styles.roleLabel}>Como você vai usar o Personal?</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => {
                const Icon = r.icon;
                const active = role === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.roleBtn, active && styles.roleBtnActive]}
                    onPress={() => setRole(r.id)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.roleIconWrap, active && styles.roleIconWrapActive]}>
                      <Icon size={20} color={active ? Colors.white : Colors.neutral[500]} />
                    </View>
                    <Text style={[styles.roleBtnLabel, active && styles.roleBtnLabelActive]}>
                      {r.label}
                    </Text>
                    <Text style={[styles.roleBtnSub, active && styles.roleBtnSubActive]}>
                      {r.sub}
                    </Text>
                    {active && <View style={styles.roleCheck}><Text style={styles.roleCheckText}>✓</Text></View>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorMsg}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Nome completo"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholder="Seu nome"
            />
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
              placeholder="Mínimo 6 caracteres"
            />

            <Button onPress={handleRegister} loading={loading} size="lg" style={styles.btn}>
              Criar conta grátis
            </Button>

            <View style={styles.terms}>
              <Text style={styles.termsText}>
                Ao criar uma conta você concorda com nossos{' '}
                <Text style={styles.termsLink} onPress={() => router.push('/termos')}>Termos de Uso</Text>
                {' '}e{' '}
                <Text style={styles.termsLink} onPress={() => router.push('/privacidade')}>Política de Privacidade</Text>
                .
              </Text>
            </View>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.loginText}>
                Já tem conta? <Text style={styles.loginBold}>Entrar</Text>
              </Text>
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

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xs,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  topLogoWrap: { alignItems: 'center', justifyContent: 'center' },
  topLogoImg: { width: 150, height: 150 },

  heroText: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  heroTitle: {
    fontSize: FontSizes.huge,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.8,
  },
  heroSub: {
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },

  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 32,
  },

  roleLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.neutral[700],
    letterSpacing: 0.1,
    marginBottom: 12,
  },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.xl },
  roleBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.neutral[200],
    borderRadius: 18,
    padding: 16,
    gap: 6,
    alignItems: 'flex-start',
    backgroundColor: Colors.neutral[50],
  },
  roleBtnActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  roleIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.neutral[200],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  roleIconWrapActive: { backgroundColor: Colors.primary[600] },
  roleBtnLabel: {
    fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[800],
  },
  roleBtnLabelActive: { color: Colors.primary[700] },
  roleBtnSub: {
    fontSize: FontSizes.sm, color: Colors.neutral[500], lineHeight: 17,
  },
  roleBtnSubActive: { color: Colors.primary[500] },
  roleCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary[600],
    alignItems: 'center', justifyContent: 'center',
  },
  roleCheckText: { fontSize: 12, color: Colors.white, fontWeight: '800' },

  errorBox: {
    backgroundColor: Colors.error[50],
    borderWidth: 1, borderColor: Colors.error[100],
    borderRadius: BorderRadii.md, padding: Spacing.md, marginBottom: Spacing.md,
  },
  errorMsg: { fontSize: FontSizes.sm, color: Colors.error[700], fontWeight: '500' },

  btn: { width: '100%', marginTop: Spacing.sm },

  terms: { marginTop: Spacing.md, paddingHorizontal: 4 },
  termsText: { fontSize: 12, color: Colors.neutral[500], lineHeight: 18, textAlign: 'center' },
  termsLink: { color: Colors.primary[600], fontWeight: '600' },

  loginLink: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.xs },
  loginText: { fontSize: FontSizes.md, color: Colors.neutral[600] },
  loginBold: { color: Colors.primary[600], fontWeight: '700' },
});
