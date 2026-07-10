import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import {
  Colors,
  Spacing,
  FontSizes,
  BorderRadii,
} from '@/constants/theme';
import { ArrowLeft } from 'lucide-react-native';
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

    const { error: err } = await signUp(
      email.trim().toLowerCase(),
      password,
      fullName.trim(),
      role
    );

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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* TOPO */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.back}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={Colors.white} />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <Image
                source={require(
                  '@/assets/images/logo3.png'
                )}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.topBarSpacer} />
          </View>

          {/* CARD */}
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Criar conta</Text>

              <Text style={styles.subtitle}>
                Escolha seu perfil para começar
              </Text>
            </View>

            {/* PERFIL */}
            <View style={styles.roleRow}>
              {(['student', 'trainer'] as Role[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleBtn,
                    role === r && styles.roleBtnActive,
                  ]}
                  onPress={() => setRole(r)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.roleLabel,
                      role === r && styles.roleLabelActive,
                    ]}
                  >
                    {r === 'student' ? 'Aluno' : 'Personal'}
                  </Text>

                  <Text
                    style={[
                      styles.roleDesc,
                      role === r && styles.roleDescActive,
                    ]}
                  >
                    {r === 'student'
                      ? 'Quero treinar'
                      : 'Quero dar aulas'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? (
              <Text style={styles.errorMsg}>
                {error}
              </Text>
            ) : null}

            {/* FORMULÁRIO */}
            <View style={styles.form}>
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
            </View>

            <Button
              onPress={handleRegister}
              loading={submitting}
              size="lg"
            >
              Criar conta
            </Button>

            <TouchableOpacity
              style={styles.link}
              onPress={() => router.push('/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>
                Já tem conta?{' '}
                <Text style={styles.linkBold}>
                  Entrar
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.primary[700],
  },

  flex: {
    flex: 1,
  },

  scroll: {
    flexGrow: 1,
  },

  /* TOPO */

  topBar: {
    minHeight: 118,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    position: 'relative',
  },

  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    zIndex: 2,
  },

  topBarSpacer: {
    width: 44,
    height: 44,
  },

  logoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },

  logo: {
    width: 275,
    height: 122,
  },

  /* CARD */

  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: Spacing.xl,
    paddingTop: 36,
    paddingBottom: Spacing.xl,
  },

  /* HEADER */

  header: {
    alignItems: 'center',
    marginBottom: 28,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.neutral[900],
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
  },

  /* PERFIS */

  roleRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },

  roleBtn: {
    flex: 1,
    minHeight: 88,
    borderWidth: 1.5,
    borderColor: Colors.neutral[300],
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.white,
  },

  roleBtnActive: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },

  roleLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.neutral[700],
  },

  roleLabelActive: {
    color: Colors.primary[700],
  },

  roleDesc: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[500],
  },

  roleDescActive: {
    color: Colors.primary[500],
  },

  /* ERRO */

  errorMsg: {
    backgroundColor: Colors.error[50],
    color: Colors.error[700],
    borderRadius: BorderRadii.md,
    padding: Spacing.md,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
  },

  /* FORMULÁRIO */

  form: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },

  /* LINK */

  link: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },

  linkText: {
    fontSize: FontSizes.md,
    color: Colors.neutral[600],
  },

  linkBold: {
    color: Colors.primary[600],
    fontWeight: '700',
  },
});