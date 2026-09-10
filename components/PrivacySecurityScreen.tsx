import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Platform, Alert, Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import {
  ArrowLeft, Shield, FileText, Trash2, LogOut,
  AlertTriangle, X, Check, ExternalLink,
} from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';
const IS_IOS = Platform.OS === 'ios';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

type DeleteStep = 'info' | 'confirm' | 'deleting' | 'done';

export default function PrivacySecurityScreen() {
  const { user, session, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('info');
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

  const openDeleteModal = () => {
    setDeleteStep('info');
    setError(null);
    setDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deleteStep === 'deleting') return;
    if (deleteStep === 'done') {
      signOut().then(() => router.replace('/'));
      return;
    }
    setDeleteModal(false);
  };

  const handleDeleteAccount = async () => {
    if (!session?.access_token) {
      setError('Voce precisa estar logado para excluir a conta.');
      return;
    }
    setDeleteStep('deleting');
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
        setDeleteStep('confirm');
        return;
      }
      setDeleteStep('done');
    } catch (e: any) {
      setError(e.message ?? 'Erro de conexao. Tente novamente.');
      setDeleteStep('confirm');
    }
  };

  const handleDoneClose = async () => {
    setDeleteModal(false);
    await signOut();
    router.replace('/');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacidade e seguranca</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, Spacing.xxl) }}
      >
        <Text style={s.intro}>
          Gerencie sua privacidade, seguranca e dados pessoais associados a sua conta.
        </Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Documentos legais</Text>

          <TouchableOpacity
            style={s.rowCard}
            onPress={() => router.push('/privacidade')}
            activeOpacity={0.7}
          >
            <View style={s.rowIcon}><Shield size={18} color={Colors.primary[600]} /></View>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>Politica de Privacidade</Text>
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
              <Text style={s.rowDesc}>Regras e condicoes da plataforma</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Conta</Text>

          <TouchableOpacity
            style={[s.rowCard, { borderColor: Colors.error[200] }]}
            onPress={openDeleteModal}
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

      {/* Delete account modal */}
      <Modal visible={deleteModal} transparent animationType="fade" onRequestClose={closeDeleteModal}>
        <View style={s.modalBg}>
          <View style={[s.modalCard, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>

            {/* Step 1: Info */}
            {deleteStep === 'info' && (
              <>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Excluir conta</Text>
                  <TouchableOpacity onPress={closeDeleteModal} style={s.modalClose}>
                    <X size={20} color={Colors.neutral[500]} />
                  </TouchableOpacity>
                </View>

                <View style={s.modalAlert}>
                  <AlertTriangle size={28} color={Colors.error[600]} />
                </View>

                <Text style={s.modalDesc}>
                  Ao excluir sua conta, seu perfil, fotos, favoritos, contatos e demais dados
                  associados serao permanentemente removidos. Esta acao nao pode ser desfeita.
                </Text>

                {(IS_IOS || Platform.OS === 'android') && (
                  <View style={s.subWarningBox}>
                    <AlertTriangle size={16} color={Colors.warning[700]} />
                    <Text style={s.subWarningText}>
                      Se voce possui uma assinatura ativa pela {IS_IOS ? 'Apple' : 'Google'}, a exclusao
                      da conta nao cancela automaticamente a cobranca. Voce deve cancelar
                      a assinatura diretamente nas configuracoes da sua conta {IS_IOS ? 'Apple' : 'Google'}.
                    </Text>
                  </View>
                )}

                {(IS_IOS || Platform.OS === 'android') && (
                  <TouchableOpacity
                    style={s.manageSubLink}
                    onPress={() => {
                      const url = IS_IOS
                        ? 'https://apps.apple.com/account/subscriptions'
                        : 'https://play.google.com/store/account/subscriptions';
                      Linking.openURL(url).catch(() => {});
                    }}
                    activeOpacity={0.7}
                  >
                    <ExternalLink size={14} color={Colors.primary[600]} />
                    <Text style={s.manageSubLinkText}>Gerenciar assinatura na {IS_IOS ? 'Apple' : 'Google'}</Text>
                  </TouchableOpacity>
                )}

                <View style={s.modalBtnRow}>
                  <TouchableOpacity style={s.cancelBtn} onPress={closeDeleteModal}>
                    <Text style={s.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.nextBtn} onPress={() => setDeleteStep('confirm')}>
                    <Text style={s.nextBtnText}>Quero excluir</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Step 2: Final confirmation */}
            {deleteStep === 'confirm' && (
              <>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Tem certeza?</Text>
                  <TouchableOpacity onPress={closeDeleteModal} style={s.modalClose}>
                    <X size={20} color={Colors.neutral[500]} />
                  </TouchableOpacity>
                </View>

                <View style={s.modalAlert}>
                  <Trash2 size={28} color={Colors.error[600]} />
                </View>

                <Text style={s.modalDesc}>
                  Esta e sua ultima chance. Todos os seus dados serao excluidos permanentemente
                  e voce nao podera recuperar sua conta.
                </Text>

                {error && (
                  <View style={s.errorBox}>
                    <Text style={s.errorText}>{error}</Text>
                  </View>
                )}

                <View style={s.modalBtnRow}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setDeleteStep('info')}>
                    <Text style={s.cancelBtnText}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.confirmBtn} onPress={handleDeleteAccount}>
                    <Trash2 size={15} color={Colors.white} />
                    <Text style={s.confirmBtnText}>Excluir definitivamente</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Step 3: Deleting */}
            {deleteStep === 'deleting' && (
              <View style={s.deletingWrap}>
                <ActivityIndicator size="large" color={Colors.error[600]} />
                <Text style={s.deletingText}>Excluindo sua conta...</Text>
                <Text style={s.deletingSubtext}>Isso pode levar alguns segundos.</Text>
              </View>
            )}

            {/* Step 4: Done */}
            {deleteStep === 'done' && (
              <>
                <View style={s.doneWrap}>
                  <View style={s.doneIcon}>
                    <Check size={32} color={Colors.secondary[600]} />
                  </View>
                  <Text style={s.doneTitle}>Conta excluida</Text>
                  <Text style={s.doneDesc}>
                    Sua conta e todos os dados associados foram permanentemente removidos.
                  </Text>
                </View>
                <TouchableOpacity style={s.doneBtn} onPress={handleDoneClose}>
                  <Text style={s.doneBtnText}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
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

  subWarningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.warning[50], borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.warning[200], marginTop: Spacing.sm,
  },
  subWarningText: { flex: 1, fontSize: FontSizes.sm, color: Colors.warning[800], lineHeight: 20, fontWeight: '600' },

  manageSubLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: Spacing.sm,
  },
  manageSubLinkText: { fontSize: FontSizes.sm, color: Colors.primary[600], fontWeight: '700', textDecorationLine: 'underline' },

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
  nextBtn: {
    flex: 1.3, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.error[600],
  },
  nextBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
  confirmBtn: {
    flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.error[600],
  },
  confirmBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },

  deletingWrap: { alignItems: 'center', gap: 12, paddingVertical: Spacing.xl },
  deletingText: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },
  deletingSubtext: { fontSize: FontSizes.sm, color: Colors.neutral[500] },

  doneWrap: { alignItems: 'center', gap: 10, paddingVertical: Spacing.lg },
  doneIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.secondary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  doneTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.neutral[900] },
  doneDesc: { fontSize: FontSizes.sm, color: Colors.neutral[600], textAlign: 'center', lineHeight: 22 },
  doneBtn: {
    backgroundColor: Colors.neutral[800], borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md,
  },
  doneBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
});
