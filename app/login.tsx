import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, Dumbbell } from 'lucide-react-native';
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
    const { error: err } = await signIn(email.trim().toLowerCase(), password);
    setSubmitting(false);
    if (err) setError('E-mail ou senha incorretos.');
    // redirect handled by useEffect above once profile loads
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Dumbbell size={28} color="#ffffff" />
            </View>
            <Text style={styles.brand}>SuperShape</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>Entre na sua conta</Text>
          </View>

          {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Mail size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Seu e-mail"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={20} color="#9ca3af" />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Sua senha"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                {showPassword ? <EyeOff size={20} color="#9ca3af" /> : <Eye size={20} color="#9ca3af" />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, submitting && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={submitting}
            >
              {submitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.loadingText}>Entrando...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Entrar</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Não tem uma conta? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.signupLink}>Criar conta</Text>
            </TouchableOpacity>
          </View>

          {Platform.OS === 'web' && (
            <TouchableOpacity style={styles.homeLink} onPress={() => router.push('/')}>
              <Text style={styles.homeLinkText}>Voltar ao início</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  keyboardView: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  logoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 32,
  },
  logoIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center',
  },
  brand: { fontSize: 24, fontWeight: '800', color: '#1f2937', letterSpacing: -0.5 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1f2937', marginBottom: 6 },
  subtitle: { fontSize: 16, color: '#6b7280' },
  errorMsg: {
    backgroundColor: '#fef2f2', color: '#dc2626',
    borderRadius: 10, padding: 14, fontSize: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#fecaca',
  },
  form: { gap: 16, marginBottom: 24 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1f2937' },
  passwordInput: { marginRight: 8 },
  eyeBtn: { padding: 4 },
  loginButton: {
    backgroundColor: '#2563eb', borderRadius: 12,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  loginButtonDisabled: { backgroundColor: '#9ca3af', shadowOpacity: 0, elevation: 0 },
  loginButtonText: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 16, color: '#6b7280' },
  signupLink: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
  homeLink: { alignItems: 'center', marginTop: 16, padding: 8 },
  homeLinkText: { fontSize: 14, color: '#9ca3af' },
});
