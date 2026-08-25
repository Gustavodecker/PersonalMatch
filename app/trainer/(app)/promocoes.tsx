import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, Modal, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import {
  ChevronLeft, Plus, Tag, Percent, Trash2, Edit3, X, Gift,
} from 'lucide-react-native';

interface Promotion {
  id: string;
  trainer_id: string;
  title: string;
  description: string | null;
  discount_label: string | null;
  is_active: boolean;
  created_at: string;
}

export default function PromocoesScreen() {
  const { profile } = useAuth();
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountLabel, setDiscountLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('trainer_promotions')
      .select('*')
      .eq('trainer_id', profile.id)
      .order('created_at', { ascending: false });
    setPromos((data ?? []) as Promotion[]);
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const openNew = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setDiscountLabel('');
    setError(null);
    setModalVisible(true);
  };

  const openEdit = (p: Promotion) => {
    setEditingId(p.id);
    setTitle(p.title);
    setDescription(p.description ?? '');
    setDiscountLabel(p.discount_label ?? '');
    setError(null);
    setModalVisible(true);
  };

  const save = async () => {
    if (!profile) return;
    if (!title.trim()) { setError('Informe um título para a promoção.'); return; }
    setSaving(true);
    setError(null);
    if (editingId) {
      await supabase.from('trainer_promotions').update({
        title: title.trim(),
        description: description.trim() || null,
        discount_label: discountLabel.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editingId);
    } else {
      await supabase.from('trainer_promotions').insert({
        trainer_id: profile.id,
        title: title.trim(),
        description: description.trim() || null,
        discount_label: discountLabel.trim() || null,
      });
    }
    setSaving(false);
    setModalVisible(false);
    load();
  };

  const toggleActive = async (p: Promotion) => {
    await supabase.from('trainer_promotions').update({
      is_active: !p.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', p.id);
    setPromos((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
  };

  const deletePromo = async (id: string) => {
    await supabase.from('trainer_promotions').delete().eq('id', id);
    setPromos((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Promoções e Pacotes</Text>
          <Text style={s.headerSub}>Ofertas exclusivas para seus alunos</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openNew}>
          <Plus size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={s.scroll}
      >
        {loading ? (
          <View style={s.emptyBox}><Text style={s.emptyNote}>Carregando...</Text></View>
        ) : promos.length === 0 ? (
          <View style={s.emptyBox}>
            <View style={s.emptyIcon}>
              <Gift size={32} color={Colors.neutral[300]} />
            </View>
            <Text style={s.emptyTitle}>Nenhuma promoção criada</Text>
            <Text style={s.emptyDesc}>
              Crie ofertas especiais e pacotes para atrair mais alunos. Elas aparecerão no seu perfil público e na busca.
            </Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openNew}>
              <Plus size={16} color={Colors.white} />
              <Text style={s.emptyBtnText}>Criar promoção</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.list}>
            {promos.map((p) => (
              <View key={p.id} style={[s.card, !p.is_active && s.cardInactive]}>
                <View style={s.cardTop}>
                  <View style={s.cardIconWrap}>
                    <Tag size={16} color={p.is_active ? Colors.secondary[600] : Colors.neutral[400]} />
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={[s.cardTitle, !p.is_active && s.cardTitleInactive]}>{p.title}</Text>
                    {p.discount_label && (
                      <View style={[s.discountBadge, !p.is_active && s.discountBadgeInactive]}>
                        <Percent size={10} color={p.is_active ? Colors.secondary[700] : Colors.neutral[500]} />
                        <Text style={[s.discountText, !p.is_active && s.discountTextInactive]}>{p.discount_label}</Text>
                      </View>
                    )}
                  </View>
                  <Switch
                    value={p.is_active}
                    onValueChange={() => toggleActive(p)}
                    trackColor={{ true: Colors.secondary[400], false: Colors.neutral[200] }}
                    thumbColor={Colors.white}
                  />
                </View>
                {p.description && (
                  <Text style={s.cardDesc} numberOfLines={2}>{p.description}</Text>
                )}
                <View style={s.cardActions}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(p)}>
                    <Edit3 size={14} color={Colors.primary[600]} />
                    <Text style={s.actionText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => deletePromo(p.id)}>
                    <Trash2 size={14} color={Colors.error[500]} />
                    <Text style={[s.actionText, { color: Colors.error[500] }]}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingId ? 'Editar Promoção' : 'Nova Promoção'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={Colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Título *</Text>
            <TextInput
              style={s.fieldInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Pacote 10 aulas"
              placeholderTextColor={Colors.neutral[400]}
            />

            <Text style={s.fieldLabel}>Desconto / Destaque</Text>
            <TextInput
              style={s.fieldInput}
              value={discountLabel}
              onChangeText={setDiscountLabel}
              placeholder="Ex: 15% OFF, 1ª aula grátis"
              placeholderTextColor={Colors.neutral[400]}
            />

            <Text style={s.fieldLabel}>Descrição (opcional)</Text>
            <TextInput
              style={[s.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Detalhes da oferta..."
              placeholderTextColor={Colors.neutral[400]}
              multiline
              numberOfLines={3}
            />

            {error && <Text style={s.errorText}>{error}</Text>}

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
                <Text style={s.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
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
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', ...Shadows.xs,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },
  headerSub: { fontSize: FontSizes.xs, color: Colors.neutral[500], marginTop: 1 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.secondary[500],
    alignItems: 'center', justifyContent: 'center', ...Shadows.sm,
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },

  emptyBox: {
    marginTop: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: BorderRadii.xl,
    padding: Spacing.xl, ...Shadows.xs,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.neutral[100],
    alignItems: 'center', justifyContent: 'center',
  },
  emptyNote: { fontSize: FontSizes.md, color: Colors.neutral[400] },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[700], textAlign: 'center' },
  emptyDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.secondary[500], paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: BorderRadii.lg, marginTop: Spacing.sm,
  },
  emptyBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },

  list: { gap: 12 },
  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    padding: Spacing.md, ...Shadows.sm, borderWidth: 1, borderColor: Colors.neutral[100],
  },
  cardInactive: { opacity: 0.6, borderColor: Colors.neutral[200] },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.secondary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 4 },
  cardTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  cardTitleInactive: { color: Colors.neutral[500] },
  discountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: Colors.secondary[50], paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1, borderColor: Colors.secondary[100],
  },
  discountBadgeInactive: { backgroundColor: Colors.neutral[100], borderColor: Colors.neutral[200] },
  discountText: { fontSize: 11, fontWeight: '700', color: Colors.secondary[700] },
  discountTextInactive: { color: Colors.neutral[500] },
  cardDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginTop: 8, lineHeight: 18 },
  cardActions: {
    flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: Colors.neutral[100],
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.primary[600] },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, gap: 12,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[900] },
  fieldLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700], marginBottom: 4 },
  fieldInput: {
    backgroundColor: Colors.neutral[50], borderWidth: 1.5, borderColor: Colors.neutral[200],
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: FontSizes.md, color: Colors.neutral[900],
  },
  errorText: { fontSize: FontSizes.sm, color: Colors.error[600], marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.neutral[200], alignItems: 'center',
  },
  cancelBtnText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[700] },
  saveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.secondary[500], alignItems: 'center',
  },
  saveBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
});
