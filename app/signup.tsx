import { useState, useEffect } from 'react';
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
import { ArrowLeft, Dumbbell } from 'lucide-react-native';
import { getDashboardRoute } from '@/lib/role-routes';

type Role = 'student' | 'trainer';

export default function SignupScreen() {
  const { signUp, user, profile, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile) {
      router.replace(getDashboardRoute(profile.role) as any);
    }
  }, [user, profile]);

  if (loading) return null;

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: err } = await signUp(email.trim().toLowerCase(), password, fullName.trim(), role);
    setSubmitting(false);
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
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <ArrowLeft size={22} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.logoRow}>
              <Dumbbell size={20} color={Colors.white} />
              <Text style={styles.brand}>SuperShape</Text>
            </View>
            <View style={{ width: 38 }} />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>Escolha seu perfil para começar</Text>

            <View style={styles.roleRow}>
              {(['student', 'trainer'] as Role[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleLabel, role === r && styles.roleLabelActive]}>
                    {r === 'student' ? 'Aluno' : 'Personal'}
                  </Text>
                  <Text style={[styles.roleDesc, role === r && styles.roleDescActive]}>
                    {r === 'student' ? 'Quero treinar' : 'Quero dar aulas'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

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

            <Button onPress={handleRegister} loading={submitting} size="lg">
              Criar conta
            </Button>

            <TouchableOpacity style={styles.link} onPress={() => router.push('/login')}>
              <Text style={styles.linkText}>
                Já tem conta? <Text style={styles.linkBold}>Entrar</Text>
              </Text>
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
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  back: { padding: Spacing.xs },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white },
  card: {
    flex: 1, backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadii.xl, borderTopRightRadius: BorderRadii.xl,
    padding: Spacing.xl, paddingTop: Spacing.xxl, gap: Spacing.xs,
  },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.neutral[900] },
  subtitle: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginBottom: Spacing.md },
  roleRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  roleBtn: {
    flex: 1, borderWidth: 2, borderColor: Colors.neutral[300],
    borderRadius: BorderRadii.lg, padding: Spacing.md, alignItems: 'center', gap: 4,
  },
  roleBtnActive: { borderColor: Colors.primary[600], backgroundColor: Colors.primary[50] },
  roleLabel: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[700] },
  roleLabelActive: { color: Colors.primary[700] },
  roleDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500] },
  roleDescActive: { color: Colors.primary[500] },
  errorMsg: {
    backgroundColor: Colors.error[50], color: Colors.error[700],
    borderRadius: BorderRadii.md, padding: Spacing.md, fontSize: FontSizes.sm, marginBottom: Spacing.sm,
  },
  link: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.sm },
  linkText: { fontSize: FontSizes.md, color: Colors.neutral[600] },
  linkBold: { color: Colors.primary[600], fontWeight: '700' },
});
