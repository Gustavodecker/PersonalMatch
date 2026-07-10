import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute } from '@/lib/role-routes';

export default function LoginScreen() {
  const { signIn, user, profile, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile) {
      router.replace(getDashboardRoute(profile.role) as any);
    }
  }, [user, profile]);

  if (loading) return null;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setError(null);
    setSubmitting(true);

    const { error: err } = await signIn(
      email.trim().toLowerCase(),
      password
    );

    setSubmitting(false);

    if (err) {
      setError('E-mail ou senha incorretos.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>

          {/* LOGO */}
          <View style={styles.logoContainer}>
            <Image
              source={require(
                '@/assets/images/logo4.png'
              )}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* CABEÇALHO */}
          <View style={styles.header}>
            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>
              Entre na sua conta para continuar
            </Text>
          </View>

          {error ? (
            <Text style={styles.errorMsg}>{error}</Text>
          ) : null}

          {/* FORMULÁRIO */}
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Mail size={20} color="#94a3b8" />

              <TextInput
                style={styles.input}
                placeholder="Seu e-mail"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={20} color="#94a3b8" />

              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Sua senha"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />

              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#94a3b8" />
                ) : (
                  <Eye size={20} color="#94a3b8" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                submitting && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.loadingText}>
                    Entrando...
                  </Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>
                  Entrar
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* RODAPÉ */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Não tem uma conta?{' '}
            </Text>

            <TouchableOpacity
              onPress={() => router.push('/signup')}
              activeOpacity={0.7}
            >
              <Text style={styles.signupLink}>
                Criar conta
              </Text>
            </TouchableOpacity>
          </View>

          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={styles.homeLink}
              onPress={() => router.push('/')}
              activeOpacity={0.7}
            >
              <Text style={styles.homeLinkText}>
                Voltar ao início
              </Text>
            </TouchableOpacity>
          )}

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  keyboardView: {
    flex: 1,
  },

  content: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    justifyContent: 'center',
  },

  /* LOGO */

  logoContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },

  logo: {
    width: 290,
    height: 205,
  },

  /* CABEÇALHO */

  header: {
    alignItems: 'center',
    marginBottom: 32,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },

  /* ERRO */

  errorMsg: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#fecaca',
  },

  /* FORMULÁRIO */

  form: {
    gap: 16,
    marginBottom: 28,
  },

  inputWrapper: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',

    shadowColor: '#0f172a',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 2,
  },

  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0f172a',
    paddingVertical: 16,
  },

  passwordInput: {
    marginRight: 8,
  },

  eyeBtn: {
    padding: 6,
  },

  /* BOTÃO */

  loginButton: {
    minHeight: 58,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,

    shadowColor: '#2563eb',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.28,
    shadowRadius: 14,

    elevation: 8,
  },

  loginButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },

  loginButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.1,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  /* FOOTER */

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  footerText: {
    fontSize: 15,
    color: '#64748b',
  },

  signupLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563eb',
  },

  homeLink: {
    alignItems: 'center',
    marginTop: 20,
    padding: 8,
  },

  homeLinkText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});