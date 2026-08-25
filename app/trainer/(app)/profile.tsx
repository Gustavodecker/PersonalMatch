import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, RefreshControl, Platform, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { TrainerClassType } from '@/types/database';
import {
  ArrowLeft, Plus, Trash2, Check, X, BookOpen, Clock,
  Edit, ChevronRight, Dumbbell, AlertCircle, Shield,
} from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';

type ClassForm = {
  id: string | null;
  name: string;
  description: string;
  duration_minutes: string;
};

const emptyForm = (): ClassForm => ({ id: null, name: '', description: '', duration_minutes: '60' });

export default function TrainerProfileScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [classTypes, setClassTypes] = useState<TrainerClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<ClassForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadClassTypes = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('trainer_class_types')
      .select('*')
      .eq('trainer_id', profile.id)
      .eq('is_active', true)
      .order('created_at');
    setClassTypes((data ?? []) as TrainerClassType[]);
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => { loadClassTypes(); }, [loadClassTypes]);
  const onRefresh = () => { setRefreshing(true); loadClassTypes(); };

  const openAdd = () => { setForm(emptyForm()); setError(null); setModal(true); };
  const openEdit = (ct: TrainerClassType) => {
    setForm({ id: ct.id, name: ct.name, description: ct.description ?? '', duration_minutes: String(ct.duration_minutes) });
    setError(null);
    setModal(true);
  };

  const saveClass = async () => {
    if (!profile || !form.name.trim()) { setError('Informe o nome da aula.'); return; }
    setSaving(true);
    setError(null);
    const payload = {
      trainer_id: profile.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      duration_minutes: parseInt(form.duration_minutes) || 60,
      is_active: true,
    };
    if (form.id) {
      const { error: err } = await supabase.from('trainer_class_types').update(payload).eq('id', form.id);
      if (err) {
        console.error('class type save failed', err);
        setError('Não foi possível salvar a aula. Tente novamente.');
        setSaving(false);
        return;
      }
      setClassTypes((prev) => prev.map((c) => c.id === form.id ? { ...c, ...payload } : c));
    } else {
      const { data, error: err } = await supabase.from('trainer_class_types').insert(payload).select('*').single();
      if (err) {
        console.error('class type save failed', err);
        setError('Não foi possível salvar a aula. Tente novamente.');
        setSaving(false);
        return;
      }
      if (data) setClassTypes((prev) => [...prev, data as TrainerClassType]);
    }
    setSaving(false);
    setModal(false);
  };

  const deleteClass = (ct: TrainerClassType) => {
    const doDelete = async () => {
      setDeletingId(ct.id);
      await supabase.from('trainer_class_types').update({ is_active: false }).eq('id', ct.id);
      setClassTypes((prev) => prev.filter((c) => c.id !== ct.id));
      setDeletingId(null);
    };
    if (IS_WEB) {
      if (window.confirm(`Excluir a aula "${ct.name}"? Os horários configurados para ela também serão removidos.`)) doDelete();
    } else {
      Alert.alert('Excluir aula', `Excluir a aula "${ct.name}"? Os horários configurados para ela também serão removidos.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Perfil</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 24) }]}
      >
        {/* Edit profile link */}
        <TouchableOpacity style={s.editCard} onPress={() => router.push('/trainer/onboarding')} activeOpacity={0.7}>
          <View style={s.editIcon}><Edit size={18} color={Colors.primary[600]} /></View>
          <View style={s.editInfo}>
            <Text style={s.editTitle}>Editar perfil público</Text>
            <Text style={s.editDesc}>Foto, bio, preços, especialidades, contato</Text>
          </View>
          <ChevronRight size={18} color={Colors.neutral[400]} />
        </TouchableOpacity>

        {/* Class types section */}
        <View style={s.sectionHeader}>
          <View>
            <Text style={s.sectionTitle}>Aulas oferecidas</Text>
            <Text style={s.sectionDesc}>Cada aula vira uma aba na configuração de agenda</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={openAdd}>
            <Plus size={14} color={Colors.white} />
            <Text style={s.addBtnText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.emptyBox}><Text style={s.emptyText}>Carregando…</Text></View>
        ) : classTypes.length === 0 ? (
          <View style={s.emptyBox}>
            <BookOpen size={32} color={Colors.neutral[300]} />
            <Text style={s.emptyTitle}>Nenhuma aula cadastrada</Text>
            <Text style={s.emptyText}>Adicione as aulas que você oferece para configurar horários específicos para cada uma.</Text>
            <TouchableOpacity style={s.emptyAddBtn} onPress={openAdd}>
              <Plus size={15} color={Colors.white} />
              <Text style={s.emptyAddBtnText}>Adicionar primeira aula</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.classList}>
            {classTypes.map((ct) => (
              <View key={ct.id} style={s.classCard}>
                <View style={s.classIcon}><Dumbbell size={16} color={Colors.primary[600]} /></View>
                <View style={s.classInfo}>
                  <Text style={s.className}>{ct.name}</Text>
                  {ct.description ? <Text style={s.classDesc} numberOfLines={2}>{ct.description}</Text> : null}
                  <View style={s.classMeta}>
                    <Clock size={11} color={Colors.primary[500]} />
                    <Text style={s.classMetaText}>{ct.duration_minutes} min</Text>
                  </View>
                </View>
                <View style={s.classActions}>
                  <TouchableOpacity style={s.classEditBtn} onPress={() => openEdit(ct)}>
                    <Edit size={14} color={Colors.neutral[500]} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.classDelBtn}
                    onPress={() => deleteClass(ct)}
                    disabled={deletingId === ct.id}
                  >
                    <Trash2 size={14} color={Colors.error[500]} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Link to agenda config */}
        <TouchableOpacity style={s.agendaLink} onPress={() => router.push('/trainer/agenda-config')} activeOpacity={0.7}>
          <View style={s.agendaLinkIcon}><Clock size={18} color={Colors.secondary[600]} /></View>
          <View style={s.agendaLinkInfo}>
            <Text style={s.agendaLinkTitle}>Configurar agenda</Text>
            <Text style={s.agendaLinkDesc}>Horários e bloqueios por aula</Text>
          </View>
          <ChevronRight size={18} color={Colors.neutral[400]} />
        </TouchableOpacity>

        {/* Privacy & security */}
        <TouchableOpacity style={s.agendaLink} onPress={() => router.push('/trainer/(app)/configuracoes')} activeOpacity={0.7}>
          <View style={s.agendaLinkIcon}><Shield size={18} color={Colors.neutral[600]} /></View>
          <View style={s.agendaLinkInfo}>
            <Text style={s.agendaLinkTitle}>Privacidade e segurança</Text>
            <Text style={s.agendaLinkDesc}>Excluir conta, termos, política de privacidade</Text>
          </View>
          <ChevronRight size={18} color={Colors.neutral[400]} />
        </TouchableOpacity>
      </ScrollView>

      {/* Add/Edit class modal */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.modalBg}>
          <View style={[s.modalCard, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{form.id ? 'Editar aula' : 'Nova aula'}</Text>
              <TouchableOpacity onPress={() => setModal(false)} style={s.modalClose}>
                <X size={20} color={Colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Nome da aula *</Text>
                <TextInput
                  style={s.fieldInput}
                  value={form.name}
                  onChangeText={(v) => setForm({ ...form, name: v })}
                  placeholder="Ex: Musculação, Natação, Yoga…"
                  placeholderTextColor={Colors.neutral[400]}
                />
              </View>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Descrição (opcional)</Text>
                <TextInput
                  style={[s.fieldInput, s.fieldInputMulti]}
                  value={form.description}
                  onChangeText={(v) => setForm({ ...form, description: v })}
                  placeholder="Breve descrição do que é essa aula"
                  placeholderTextColor={Colors.neutral[400]}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Duração padrão (minutos)</Text>
                <View style={s.durationRow}>
                  {[30, 45, 60, 90].map((min) => (
                    <TouchableOpacity
                      key={min}
                      style={[s.durChip, parseInt(form.duration_minutes) === min && s.durChipActive]}
                      onPress={() => setForm({ ...form, duration_minutes: String(min) })}
                    >
                      <Text style={[s.durChipText, parseInt(form.duration_minutes) === min && s.durChipTextActive]}>{min}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {error ? (
                <View style={s.errorBox}>
                  <AlertCircle size={14} color={Colors.error[600]} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              style={[s.modalSaveBtn, (!form.name.trim() || saving) && s.modalSaveBtnDisabled]}
              onPress={saveClass}
              disabled={!form.name.trim() || saving}
            >
              <Check size={16} color={Colors.white} />
              <Text style={s.modalSaveBtnText}>{saving ? 'Salvando…' : form.id ? 'Salvar alterações' : 'Adicionar aula'}</Text>
            </TouchableOpacity>
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
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[900] },

  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },

  editCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: BorderRadii.xl,
    padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.neutral[200], ...Shadows.xs,
  },
  editIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  editInfo: { flex: 1 },
  editTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  editDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },
  sectionDesc: { fontSize: FontSizes.xs, color: Colors.neutral[400], marginTop: 2 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primary[600], borderRadius: BorderRadii.lg,
    paddingHorizontal: 12, paddingVertical: 8, ...Shadows.sm,
  },
  addBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },

  emptyBox: {
    alignItems: 'center', gap: 10, padding: Spacing.xl,
    backgroundColor: Colors.white, borderRadius: BorderRadii.xl,
    borderWidth: 1, borderColor: Colors.neutral[200], ...Shadows.xs,
  },
  emptyTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[700] },
  emptyText: { fontSize: FontSizes.sm, color: Colors.neutral[400], textAlign: 'center', lineHeight: 18 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
    backgroundColor: Colors.primary[600], borderRadius: BorderRadii.lg,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  emptyAddBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },

  classList: { gap: 8 },
  classCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], ...Shadows.xs,
  },
  classIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  classInfo: { flex: 1 },
  className: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  classDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginTop: 2 },
  classMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  classMetaText: { fontSize: FontSizes.xs, color: Colors.primary[600], fontWeight: '600' },
  classActions: { flexDirection: 'row', gap: 6 },
  classEditBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  classDelBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.error[50], alignItems: 'center', justifyContent: 'center' },

  agendaLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.secondary[50], borderRadius: BorderRadii.xl,
    padding: Spacing.md, marginTop: Spacing.lg, borderWidth: 1, borderColor: Colors.secondary[100],
  },
  agendaLinkIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.secondary[100], alignItems: 'center', justifyContent: 'center' },
  agendaLinkInfo: { flex: 1 },
  agendaLinkTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  agendaLinkDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginTop: 2 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, gap: Spacing.md, maxHeight: '88%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[900] },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' },

  field: { gap: 6 },
  fieldLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700] },
  fieldInput: {
    backgroundColor: Colors.neutral[50], borderWidth: 1.5, borderColor: Colors.neutral[200],
    borderRadius: BorderRadii.lg, paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontSize: FontSizes.md, color: Colors.neutral[900],
  },
  fieldInputMulti: { minHeight: 72, textAlignVertical: 'top' },

  durationRow: { flexDirection: 'row', gap: 8 },
  durChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: BorderRadii.md,
    borderWidth: 1.5, borderColor: Colors.neutral[200], backgroundColor: Colors.neutral[50],
  },
  durChipActive: { borderColor: Colors.primary[400], backgroundColor: Colors.primary[50] },
  durChipText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[600] },
  durChipTextActive: { color: Colors.primary[700], fontWeight: '700' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.error[50], borderRadius: BorderRadii.md,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  errorText: { flex: 1, fontSize: FontSizes.sm, color: Colors.error[700], fontWeight: '600' },

  modalSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary[600], borderRadius: BorderRadii.lg, paddingVertical: 14,
  },
  modalSaveBtnDisabled: { opacity: 0.5 },
  modalSaveBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },

});
