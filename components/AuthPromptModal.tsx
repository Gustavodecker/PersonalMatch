import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontSizes, Spacing, Shadows } from '@/constants/theme';
import { X, Dumbbell, LogIn, UserPlus } from 'lucide-react-native';

type Tab = 'login' | 'register';

type Props = {
  visible: boolean;
  onClose: () => void;
  message?: string;
};

export function AuthPromptModal({ visible, onClose, message }: Props) {
  const { signIn, signUp, user } = useAuth();
  const [tab, setTab]           = useState<Tab>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Auto-close when user successfully logs in
  useEffect(() => {
    if (user && visible) onClose();
  }, [user, visible]);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setEmail(''); setPassword(''); setName(''); setError(null); setTab('login');
    }
  }, [visible]);

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Preencha e-mail e senha.'); return; }
    setError(null); setLoading(true);
    const { error: err } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (err) setError('E-mail ou senha incorretos.');
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Preencha todos os campos.'); return;
    }
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    setError(null); setLoading(true);
    const { error: err } = await signUp(email.trim().toLowerCase(), password, name.trim(), 'student');
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View style={s.logoRow}>
              <View style={s.logoBubble}>
                <Dumbbell size={18} color={Colors.white} />
              </View>
              <Text style={s.logoText}>SuperShape</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <X size={18} color={Colors.neutral[500]} />
            </TouchableOpacity>
          </View>

          {message ? (
            <Text style={s.messageText}>{message}</Text>
          ) : (
            <Text style={s.messageText}>Faça login para continuar.</Text>
          )}

          {/* Tabs */}
          <View style={s.tabs}>
            <TouchableOpacity
              style={[s.tab, tab === 'login' && s.tabActive]}
              onPress={() => { setTab('login'); setError(null); }}
            >
              <LogIn size={14} color={tab === 'login' ? Colors.primary[700] : Colors.neutral[500]} />
              <Text style={[s.tabText, tab === 'login' && s.tabTextActive]}>Entrar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, tab === 'register' && s.tabActive]}
              onPress={() => { setTab('register'); setError(null); }}
            >
              <UserPlus size={14} color={tab === 'register' ? Colors.primary[700] : Colors.neutral[500]} />
              <Text style={[s.tabText, tab === 'register' && s.tabTextActive]}>Criar conta</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={s.formScroll}
          >
            {error ? <Text style={s.errorText}>{error}</Text> : null}

            {tab === 'register' && (
              <>
                <Text style={s.fieldLabel}>Nome completo</Text>
                <TextInput
                  style={s.fieldInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Seu nome"
                  placeholderTextColor={Colors.neutral[400]}
                  autoCapitalize="words"
                />
              </>
            )}

            <Text style={s.fieldLabel}>E-mail</Text>
            <TextInput
              style={s.fieldInput}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Text style={s.fieldLabel}>Senha</Text>
            <TextInput
              style={s.fieldInput}
              value={password}
              onChangeText={setPassword}
              placeholder={tab === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
              placeholderTextColor={Colors.neutral[400]}
              secureTextEntry
            />

            <TouchableOpacity
              style={[s.submitBtn, loading && s.submitBtnDisabled]}
              onPress={tab === 'login' ? handleLogin : handleRegister}
              disabled={loading}
            >
              <Text style={s.submitBtnText}>
                {loading ? 'Aguarde...' : tab === 'login' ? 'Entrar' : 'Criar conta grátis'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.switchLink}
              onPress={() => { setTab(tab === 'login' ? 'register' : 'login'); setError(null); }}
            >
              <Text style={s.switchLinkText}>
                {tab === 'login'
                  ? 'Não tem conta? Cadastre-se grátis'
                  : 'Já tem conta? Entre aqui'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg, paddingBottom: 16,
    maxHeight: '90%',
    ...Shadows.lg,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.neutral[200], alignSelf: 'center',
    marginTop: 10, marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBubble: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primary[700], alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.primary[800] },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center',
  },
  messageText: {
    fontSize: FontSizes.md, color: Colors.neutral[600], marginBottom: 16, lineHeight: 20,
  },
  tabs: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
    backgroundColor: Colors.neutral[100], borderRadius: 12, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 9,
  },
  tabActive: { backgroundColor: Colors.white, ...Shadows.xs },
  tabText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[500] },
  tabTextActive: { color: Colors.primary[700] },
  formScroll: {},
  errorText: {
    backgroundColor: Colors.error[50], color: Colors.error[700],
    borderRadius: 10, padding: 12, fontSize: FontSizes.sm, marginBottom: 12,
  },
  fieldLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700], marginBottom: 5 },
  fieldInput: {
    backgroundColor: Colors.neutral[50], borderWidth: 1.5, borderColor: Colors.neutral[200],
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: FontSizes.md, color: Colors.neutral[900], marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: Colors.primary[600], borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  submitBtnDisabled: { backgroundColor: Colors.neutral[300] },
  submitBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
  switchLink: { alignItems: 'center', paddingVertical: 14 },
  switchLinkText: { fontSize: FontSizes.sm, color: Colors.primary[600], fontWeight: '600' },
});
