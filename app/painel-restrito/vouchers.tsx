import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, ScrollView, Switch,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/admin/AdminShell';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { Colors, FontSizes, Spacing, Shadows } from '@/constants/theme';
import { Voucher } from '@/types/database';
import { Search, X, Plus, Edit2, Trash2, Tag, Percent, DollarSign } from 'lucide-react-native';

type ApplicableFor = 'trainer' | 'student' | 'both';
type VoucherType = 'percentage' | 'fixed';

const APPLICABLE_LABELS: Record<ApplicableFor, string> = {
  trainer: 'Personal', student: 'Aluno', both: 'Ambos',
};

const EMPTY_FORM = {
  code: '',
  description: '',
  type: 'percentage' as VoucherType,
  discount_value: '',
  start_date: new Date().toISOString().slice(0, 10),
  expiry_date: '',
  max_uses: '',
  max_uses_per_user: '1',
  is_active: true,
  applicable_for: 'both' as ApplicableFor,
};

type FormState = typeof EMPTY_FORM;

export default function AdminVouchers() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Voucher | null>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  const [confirmDelete, setConfirmDelete] = useState<Voucher | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { fetchVouchers(); }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    const { data } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
    if (data) setVouchers(data as Voucher[]);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let r = [...vouchers];
    if (activeOnly) r = r.filter((v) => v.is_active);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((v) => v.code.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q));
    }
    return r;
  }, [vouchers, query, activeOnly]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (v: Voucher) => {
    setEditing(v);
    setForm({
      code: v.code,
      description: v.description ?? '',
      type: v.type,
      discount_value: String(v.discount_value),
      start_date: v.start_date.slice(0, 10),
      expiry_date: v.expiry_date ? v.expiry_date.slice(0, 10) : '',
      max_uses: v.max_uses != null ? String(v.max_uses) : '',
      max_uses_per_user: String(v.max_uses_per_user),
      is_active: v.is_active,
      applicable_for: v.applicable_for,
    });
    setFormError('');
    setModalOpen(true);
  };

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const saveVoucher = async () => {
    setFormError('');
    if (!form.code.trim()) { setFormError('O código é obrigatório.'); return; }
    const dv = parseFloat(form.discount_value);
    if (isNaN(dv) || dv <= 0) { setFormError('Informe um valor de desconto válido.'); return; }
    if (form.type === 'percentage' && dv > 100) { setFormError('Percentual não pode exceder 100%.'); return; }

    setSaving(true);
    const payload: any = {
      code:               form.code.trim().toUpperCase(),
      description:        form.description.trim() || null,
      type:               form.type,
      discount_value:     dv,
      start_date:         form.start_date,
      expiry_date:        form.expiry_date || null,
      max_uses:           form.max_uses ? parseInt(form.max_uses) : null,
      max_uses_per_user:  parseInt(form.max_uses_per_user) || 1,
      is_active:          form.is_active,
      applicable_for:     form.applicable_for,
      updated_at:         new Date().toISOString(),
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from('vouchers').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('vouchers').insert({ ...payload, use_count: 0 }));
    }

    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setModalOpen(false);
    fetchVouchers();
  };

  const deleteVoucher = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    await supabase.from('vouchers').delete().eq('id', confirmDelete.id);
    setDeleteLoading(false);
    setConfirmDelete(null);
    fetchVouchers();
  };

  const toggleActive = async (v: Voucher) => {
    await supabase.from('vouchers').update({ is_active: !v.is_active, updated_at: new Date().toISOString() }).eq('id', v.id);
    fetchVouchers();
  };

  const activeCount = vouchers.filter((v) => v.is_active).length;

  return (
    <AdminShell
      title="Vouchers"
      actions={
        <TouchableOpacity style={s.createBtn} onPress={openCreate} activeOpacity={0.85}>
          <Plus size={16} color={Colors.white} />
          <Text style={s.createBtnText}>Novo voucher</Text>
        </TouchableOpacity>
      }
    >
      <View style={s.filterBar}>
        <View style={s.searchBox}>
          <Search size={16} color={Colors.neutral[400]} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por código ou descrição..."
            placeholderTextColor={Colors.neutral[400]}
          />
          {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><X size={15} color={Colors.neutral[400]} /></TouchableOpacity>}
        </View>
        <TouchableOpacity style={[s.pill, activeOnly && s.pillActive]} onPress={() => setActiveOnly(!activeOnly)}>
          <Text style={[s.pillText, activeOnly && s.pillTextActive]}>
            Apenas ativos ({activeCount})
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={s.countText}>{filtered.length} voucher{filtered.length !== 1 ? 's' : ''}</Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary[600]} size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={s.cards}>
          {filtered.map((v) => (
            <View key={v.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={s.codeRow}>
                  <View style={s.codeBox}>
                    <Tag size={13} color={Colors.primary[600]} />
                    <Text style={s.codeText}>{v.code}</Text>
                  </View>
                  <View style={[s.discountBadge, v.type === 'percentage' ? s.discountBadgeBlue : s.discountBadgeGreen]}>
                    {v.type === 'percentage'
                      ? <Percent size={11} color={Colors.primary[700]} />
                      : <DollarSign size={11} color={Colors.secondary[700]} />}
                    <Text style={[s.discountText, v.type === 'percentage' ? s.discountTextBlue : s.discountTextGreen]}>
                      {v.type === 'percentage' ? `${v.discount_value}%` : `R$ ${v.discount_value.toFixed(2)}`}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={v.is_active}
                  onValueChange={() => toggleActive(v)}
                  trackColor={{ false: Colors.neutral[200], true: Colors.secondary[300] }}
                  thumbColor={v.is_active ? Colors.secondary[600] : Colors.neutral[400]}
                />
              </View>

              {v.description && <Text style={s.description}>{v.description}</Text>}

              <View style={s.metaRow}>
                <Text style={s.metaItem}>
                  Para: <Text style={s.metaVal}>{APPLICABLE_LABELS[v.applicable_for]}</Text>
                </Text>
                <Text style={s.metaDot}>·</Text>
                <Text style={s.metaItem}>
                  Usos: <Text style={s.metaVal}>{v.use_count}{v.max_uses != null ? `/${v.max_uses}` : ''}</Text>
                </Text>
                {v.expiry_date && (
                  <>
                    <Text style={s.metaDot}>·</Text>
                    <Text style={s.metaItem}>
                      Expira: <Text style={s.metaVal}>{new Date(v.expiry_date).toLocaleDateString('pt-BR')}</Text>
                    </Text>
                  </>
                )}
              </View>

              <View style={s.cardActions}>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(v)} activeOpacity={0.8}>
                  <Edit2 size={13} color={Colors.primary[600]} />
                  <Text style={s.editBtnText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.deleteBtn} onPress={() => setConfirmDelete(v)} activeOpacity={0.8}>
                  <Trash2 size={13} color={Colors.error[600]} />
                  <Text style={s.deleteBtnText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {filtered.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>Nenhum voucher encontrado.</Text>
            </View>
          )}
        </View>
      )}

      {/* Create / Edit modal */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={s.modalBg}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setModalOpen(false)} />
          <View style={s.formPanel}>
            <View style={s.formHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.formTitle}>{editing ? 'Editar voucher' : 'Novo voucher'}</Text>

              <Text style={s.fieldLabel}>Código *</Text>
              <TextInput
                style={s.fieldInput}
                value={form.code}
                onChangeText={(t) => setField('code', t.toUpperCase())}
                placeholder="Ex: PROMO20"
                placeholderTextColor={Colors.neutral[400]}
                autoCapitalize="characters"
              />

              <Text style={s.fieldLabel}>Descrição</Text>
              <TextInput
                style={[s.fieldInput, s.fieldInputMulti]}
                value={form.description}
                onChangeText={(t) => setField('description', t)}
                placeholder="Descrição interna (opcional)"
                placeholderTextColor={Colors.neutral[400]}
                multiline
                numberOfLines={2}
              />

              <Text style={s.fieldLabel}>Tipo de desconto</Text>
              <View style={s.segmentRow}>
                {(['percentage', 'fixed'] as VoucherType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.segment, form.type === t && s.segmentActive]}
                    onPress={() => setField('type', t)}
                  >
                    <Text style={[s.segmentText, form.type === t && s.segmentTextActive]}>
                      {t === 'percentage' ? 'Percentual (%)' : 'Valor fixo (R$)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fieldLabel}>
                {form.type === 'percentage' ? 'Percentual de desconto (%)' : 'Valor do desconto (R$)'} *
              </Text>
              <TextInput
                style={s.fieldInput}
                value={form.discount_value}
                onChangeText={(t) => setField('discount_value', t)}
                keyboardType="decimal-pad"
                placeholder={form.type === 'percentage' ? '20' : '50.00'}
                placeholderTextColor={Colors.neutral[400]}
              />

              <View style={s.rowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Data de início</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.start_date}
                    onChangeText={(t) => setField('start_date', t)}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={Colors.neutral[400]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Data de expiração</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.expiry_date}
                    onChangeText={(t) => setField('expiry_date', t)}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={Colors.neutral[400]}
                  />
                </View>
              </View>

              <View style={s.rowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Máx. de usos totais</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.max_uses}
                    onChangeText={(t) => setField('max_uses', t)}
                    keyboardType="number-pad"
                    placeholder="Ilimitado"
                    placeholderTextColor={Colors.neutral[400]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Máx. por usuário</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={form.max_uses_per_user}
                    onChangeText={(t) => setField('max_uses_per_user', t)}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor={Colors.neutral[400]}
                  />
                </View>
              </View>

              <Text style={s.fieldLabel}>Aplicável para</Text>
              <View style={s.segmentRow}>
                {(['both', 'student', 'trainer'] as ApplicableFor[]).map((af) => (
                  <TouchableOpacity
                    key={af}
                    style={[s.segment, form.applicable_for === af && s.segmentActive]}
                    onPress={() => setField('applicable_for', af)}
                  >
                    <Text style={[s.segmentText, form.applicable_for === af && s.segmentTextActive]}>
                      {APPLICABLE_LABELS[af]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.activeRow}>
                <Text style={s.fieldLabel}>Voucher ativo</Text>
                <Switch
                  value={form.is_active}
                  onValueChange={(v) => setField('is_active', v)}
                  trackColor={{ false: Colors.neutral[200], true: Colors.secondary[300] }}
                  thumbColor={form.is_active ? Colors.secondary[600] : Colors.neutral[400]}
                />
              </View>

              {formError ? <Text style={s.formError}>{formError}</Text> : null}

              <TouchableOpacity style={s.saveBtn} onPress={saveVoucher} disabled={saving} activeOpacity={0.85}>
                {saving
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={s.saveBtnText}>{editing ? 'Salvar alterações' : 'Criar voucher'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!confirmDelete}
        title="Excluir voucher?"
        message={`O voucher "${confirmDelete?.code}" será removido permanentemente.`}
        confirmLabel="Excluir"
        danger
        onConfirm={deleteVoucher}
        onCancel={() => setConfirmDelete(null)}
        loading={deleteLoading}
      />
    </AdminShell>
  );
}

const s = StyleSheet.create({
  filterBar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  searchBox: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1.5, borderColor: Colors.neutral[200] },
  searchInput: { flex: 1, fontSize: FontSizes.md, color: Colors.neutral[900] },
  pill: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.neutral[200] },
  pillActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  pillText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[600] },
  pillTextActive: { color: Colors.white },
  countText: { fontSize: FontSizes.sm, color: Colors.neutral[500], fontWeight: '600' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary[600], paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  createBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
  cards: { gap: 12 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], gap: 10, ...Shadows.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary[50], paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  codeText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.primary[700], letterSpacing: 1 },
  discountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  discountBadgeBlue: { backgroundColor: Colors.primary[50] },
  discountBadgeGreen: { backgroundColor: Colors.secondary[50] },
  discountText: { fontSize: FontSizes.sm, fontWeight: '700' },
  discountTextBlue: { color: Colors.primary[700] },
  discountTextGreen: { color: Colors.secondary[700] },
  description: { fontSize: FontSizes.sm, color: Colors.neutral[600] },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  metaItem: { fontSize: FontSizes.xs, color: Colors.neutral[500] },
  metaVal: { fontWeight: '700', color: Colors.neutral[700] },
  metaDot: { fontSize: FontSizes.xs, color: Colors.neutral[300] },
  cardActions: { flexDirection: 'row', gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: Colors.neutral[100] },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.primary[50] },
  editBtnText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary[600] },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.error[50] },
  deleteBtnText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.error[600] },
  emptyState: { padding: 64, alignItems: 'center' },
  emptyText: { fontSize: FontSizes.md, color: Colors.neutral[500] },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  formPanel: { backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, paddingTop: 16, maxHeight: '92%' },
  formHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.neutral[200], alignSelf: 'center', marginBottom: 12 },
  formTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[900], marginBottom: 20 },
  fieldLabel: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  fieldInput: { backgroundColor: Colors.neutral[50], borderWidth: 1.5, borderColor: Colors.neutral[200], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: FontSizes.md, color: Colors.neutral[900] },
  fieldInputMulti: { minHeight: 60, textAlignVertical: 'top' },
  rowTwo: { flexDirection: 'row', gap: 12 },
  segmentRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  segment: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.neutral[200], backgroundColor: Colors.neutral[50], alignItems: 'center' },
  segmentActive: { borderColor: Colors.primary[400], backgroundColor: Colors.primary[50] },
  segmentText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[600] },
  segmentTextActive: { color: Colors.primary[700] },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  formError: { fontSize: FontSizes.sm, color: Colors.error[600], fontWeight: '600', marginTop: 8 },
  saveBtn: { backgroundColor: Colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
  cancelBtn: { backgroundColor: Colors.neutral[100], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  cancelBtnText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[700] },
});
