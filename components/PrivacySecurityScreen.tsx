import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import {
  ArrowLeft, Shield, FileText, Trash2, LogOut,
  AlertTriangle, X, Check,
} from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export default function PrivacySecurityScreen() {
  const { user, session, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    const doSignOut = async () => {
      await signOut();
      router.replace('/');
    };
    if (IS_WEB) {
      if (window.confirm('Deseja sair da sua conta?')) doSignOut();
    } else {
      Alert.alert('Sair da conta', 'Deseja sair da sua conta?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: doSignOut },
      ]);
    }
  };

  const handleDeleteAccount = async () => {
    if (!session?.access_token) {
      setError('Você precisa estar logado para excluir a conta.');
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Erro ao excluir conta. Tente novamente.');
        setDeleting(false);
        return;
      }
      // Success — sign out locally and go home
      await signOut();
      setDeleteModal(false);
      router.replace('/');
    } catch (e: any) {
      setError(e.message ?? 'Erro de conexão. Tente novamente.');
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacidade e segurança</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, Spacing.xxl) }}
      >
        <Text style={s.intro}>
          Gerencie sua privacidade, segurança e dados pessoais associados à sua conta.
        </Text>

        {/* Legal section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Documentos legais</Text>

          <TouchableOpacity
            style={s.rowCard}
            onPress={() => router.push('/privacidade')}
            activeOpacity={0.7}
          >
            <View style={s.rowIcon}><Shield size={18} color={Colors.primary[600]} /></View>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>Política de Privacidade</Text>
              <Text style={s.rowDesc}>Como tratamos seus dados pessoais</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.rowCard}
            onPress={() => router.push('/termos')}
            activeOpacity={0.7}
          >
            <View style={s.rowIcon}><FileText size={18} color={Colors.primary[600]} /></View>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>Termos de Uso</Text>
              <Text style={s.rowDesc}>Regras e condições da plataforma</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Account section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Conta</Text>

          <TouchableOpacity
            style={[s.rowCard, { borderColor: Colors.error[200] }]}
            onPress={() => setDeleteModal(true)}
            activeOpacity={0.7}
          >
            <View style={[s.rowIcon, { backgroundColor: Colors.error[50] }]}>
              <Trash2 size={18} color={Colors.error[600]} />
            </View>
            <View style={s.rowInfo}>
              <Text style={[s.rowTitle, { color: Colors.error[600] }]}>Excluir minha conta</Text>
              <Text style={s.rowDesc}>Remover permanentemente todos os seus dados</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.rowCard}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={s.rowIcon}><LogOut size={18} color={Colors.neutral[600]} /></View>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>Sair da conta</Text>
              <Text style={s.rowDesc}>Desconectar deste dispositivo</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete confirmation modal */}
      <Modal visible={deleteModal} transparent animationType="fade" onRequestClose={() => !deleting && setDeleteModal(false)}>
        <View style={s.modalBg}>
          <View style={[s.modalCard, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Excluir conta</Text>
              {!deleting && (
                <TouchableOpacity onPress={() => setDeleteModal(false)} style={s.modalClose}>
                  <X size={20} color={Colors.neutral[500]} />
                </TouchableOpacity>
              )}
            </View>

            <View style={s.modalAlert}>
              <AlertTriangle size={28} color={Colors.error[600]} />
            </View>

            <Text style={s.modalDesc}>
              Ao excluir sua conta, seu perfil, fotos, favoritos, contatos e demais dados
              associados serão permanentemente removidos. Esta ação não pode ser desfeita.
            </Text>

            <Text style={s.modalDesc2}>
              Se você tiver uma assinatura ativa, ela será cancelada automaticamente.
            </Text>

            {error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={[s.cancelBtn, deleting && { opacity: 0.5 }]}
                onPress={() => setDeleteModal(false)}
                disabled={deleting}
              >
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.confirmBtn}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <>
                      <Trash2 size={15} color={Colors.white} />
                      <Text style={s.confirmBtnText}>Excluir definitivamente</Text>
                    </>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
    ...Shadows.xs,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },

  intro: {
    fontSize: FontSizes.sm, color: Colors.neutral[500],
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.sm },
  sectionTitle: {
    fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[500],
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },

  rowCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200],
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  rowDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginTop: 2 },

  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    width: '90%', backgroundColor: Colors.white, borderRadius: 24,
    padding: Spacing.lg, ...Shadows.lg,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.neutral[900] },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  modalAlert: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.error[50],
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: Spacing.md,
  },
  modalDesc: { fontSize: FontSizes.sm, color: Colors.neutral[700], lineHeight: 22, textAlign: 'center' },
  modalDesc2: { fontSize: FontSizes.sm, color: Colors.neutral[500], lineHeight: 20, textAlign: 'center', marginTop: Spacing.sm, fontWeight: '600' },

  errorBox: {
    backgroundColor: Colors.error[50], borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.error[100], marginTop: Spacing.sm,
  },
  errorText: { fontSize: FontSizes.sm, color: Colors.error[700] },

  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: Spacing.lg },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[700] },
  confirmBtn: {
    flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.error[600],
  },
  confirmBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
});
