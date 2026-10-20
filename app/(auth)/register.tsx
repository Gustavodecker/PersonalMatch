import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { SocialLoginButtons } from '@/components/SocialLoginButtons';
import { Colors, Spacing, FontSizes, BorderRadii } from '@/constants/theme';
import { ArrowLeft } from 'lucide-react-native';
import { checkEmail } from '@/lib/emailCheck';
import { ConfirmEmailNotice } from '@/components/ConfirmEmailNotice';

type Role = 'student' | 'trainer';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const params = useLocalSearchParams<{ role?: string }>();
  const initialRole: Role = params.role === 'trainer' ? 'trainer' : 'student';
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<Role>(initialRole);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [acceptedEmail, setAcceptedEmail] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres.');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const check = checkEmail(cleanEmail);
    if (check.error && (!check.suggestion || acceptedEmail !== cleanEmail)) {
      setError(check.error);
      setSuggestion(check.suggestion);
      if (check.suggestion) setAcceptedEmail(cleanEmail);
      return;
    }
    setError(null);
    setSuggestion(null);
    setLoading(true);
    const { error: err, needsConfirmation } = await signUp(cleanEmail, password, fullName.trim(), role);
    setLoading(false);
    if (err) {
      setError(err);
    } else if (needsConfirmation) {
      setPendingEmail(cleanEmail);
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
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <ArrowLeft size={22} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Criar conta</Text>
          </View>

          <View style={styles.card}>
            {pendingEmail ? (
              <ConfirmEmailNotice email={pendingEmail} onBack={() => router.replace('/(auth)/login')} />
            ) : (
            <>
            <Text style={styles.title}>Quem é você?</Text>

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

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                {suggestion ? (
                  <>
                    <TouchableOpacity
                      style={styles.suggestionBtn}
                      onPress={() => { setEmail(suggestion); setError(null); setSuggestion(null); }}
                    >
                      <Text style={styles.suggestionBtnText}>Corrigir para {suggestion}</Text>
                    </TouchableOpacity>
                    <Text style={styles.suggestionHint}>Se o seu e-mail estiver certo, toque em Criar conta de novo.</Text>
                  </>
                ) : null}
              </View>
            ) : null}

            <Input label="Nome completo" value={fullName} onChangeText={setFullName} autoCapitalize="words" placeholder="Seu nome" />
            <Input label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="seu@email.com" />
            <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo 6 caracteres" />

            <Button onPress={handleRegister} loading={loading} size="lg">Criar conta</Button>

            <SocialLoginButtons />

            <TouchableOpacity style={styles.link} onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.linkText}>
                Já tem conta? <Text style={styles.linkBold}>Entrar</Text>
              </Text>
            </TouchableOpacity>
            </>
            )}
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
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  back: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.white },
  card: {
    flex: 1, backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadii.xl, borderTopRightRadius: BorderRadii.xl,
    padding: Spacing.xl, paddingTop: Spacing.xxl, gap: Spacing.xs,
  },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.neutral[900], marginBottom: Spacing.md },
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
  errorBox: {
    backgroundColor: Colors.error[50], borderRadius: BorderRadii.md,
    padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm,
  },
  errorText: { color: Colors.error[700], fontSize: FontSizes.sm, lineHeight: 20 },
  suggestionBtn: {
    alignSelf: 'flex-start', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.error[200],
    borderRadius: BorderRadii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  suggestionBtnText: { color: Colors.error[700], fontSize: FontSizes.sm, fontWeight: '700' },
  suggestionHint: { color: Colors.error[600], fontSize: FontSizes.xs },
  link: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.sm },
  linkText: { fontSize: FontSizes.md, color: Colors.neutral[600] },
  linkBold: { color: Colors.primary[600], fontWeight: '700' },
});
