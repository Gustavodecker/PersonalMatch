import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AdminShell } from '@/components/admin/AdminShell';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { Colors, FontSizes, Spacing, Shadows } from '@/constants/theme';
import { TrainerWithProfile } from '@/types/database';
import {
  Search, X, Star, MapPin, BadgeCheck, Zap, Lock,
  Unlock, Trash2, CheckCircle, XCircle, ChevronDown,
} from 'lucide-react-native';

type StatusFilter = 'all' | 'pending' | 'active' | 'rejected' | 'blocked' | 'inactive';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', active: 'Ativo', rejected: 'Recusado',
  blocked: 'Bloqueado', inactive: 'Inativo',
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:  { bg: Colors.warning[50],   text: Colors.warning[700] },
  active:   { bg: Colors.secondary[50], text: Colors.secondary[700] },
  rejected: { bg: Colors.error[50],     text: Colors.error[700] },
  blocked:  { bg: Colors.error[50],     text: Colors.error[700] },
  inactive: { bg: Colors.neutral[100],  text: Colors.neutral[600] },
};

const STATUS_FILTERS: StatusFilter[] = ['all', 'pending', 'active', 'rejected', 'blocked'];

export default function AdminTrainers() {
  const { profile } = useAuth();
  const [trainers, setTrainers]   = useState<TrainerWithProfile[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected]   = useState<TrainerWithProfile | null>(null);
  const [detailModal, setDetailModal] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{ type: string; trainer: TrainerWithProfile } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchTrainers(); }, []);

  const fetchTrainers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('trainers')
      .select('*, profile:profiles!trainers_id_fkey(*), specialties:trainer_specialties(specialty:specialties(*))')
      .order('created_at', { ascending: false });
    if (data) {
      setTrainers(data.map((t: any) => ({
        ...t,
        profile: t.profile,
        specialties: t.specialties?.map((ts: any) => ts.specialty).filter(Boolean) ?? [],
      })));
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let r = [...trainers];
    if (statusFilter !== 'all') r = r.filter((t) => t.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((t) =>
        t.profile.full_name.toLowerCase().includes(q) ||
        t.profile.email.toLowerCase().includes(q) ||
        t.profile.city?.toLowerCase().includes(q) ||
        t.cref?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [trainers, query, statusFilter]);

  const runAction = async () => {
    if (!confirmAction) return;
    const { type, trainer } = confirmAction;
    setActionLoading(true);
    switch (type) {
      case 'approve':
        await supabase.from('trainers').update({ status: 'active', approved_at: new Date().toISOString(), approved_by: profile?.id }).eq('id', trainer.id);
        break;
      case 'reject':
        await supabase.from('trainers').update({ status: 'rejected' }).eq('id', trainer.id);
        break;
      case 'block':
        await supabase.from('trainers').update({ status: 'blocked' }).eq('id', trainer.id);
        break;
      case 'unblock':
        await supabase.from('trainers').update({ status: 'active' }).eq('id', trainer.id);
        break;
      case 'feature':
        await supabase.from('trainers').update({ is_featured: !trainer.is_featured }).eq('id', trainer.id);
        break;
      case 'verify':
        await supabase.from('trainers').update({ is_verified: true }).eq('id', trainer.id);
        break;
      case 'delete':
        await supabase.from('trainers').delete().eq('id', trainer.id);
        break;
    }
    setActionLoading(false);
    setConfirmAction(null);
    setDetailModal(false);
    setSelected(null);
    fetchTrainers();
  };

  const openDetail = (t: TrainerWithProfile) => { setSelected(t); setDetailModal(true); };

  const CONFIRM_MESSAGES: Record<string, { title: string; message: string; danger: boolean; label: string }> = {
    approve: { title: 'Aprovar treinador?', message: 'O treinador ficará visível na busca pública.', danger: false, label: 'Aprovar' },
    reject:  { title: 'Recusar treinador?', message: 'O treinador será notificado e não aparecerá na busca.', danger: true, label: 'Recusar' },
    block:   { title: 'Bloquear treinador?', message: 'O treinador será removido da busca e não poderá acessar o painel.', danger: true, label: 'Bloquear' },
    unblock: { title: 'Desbloquear treinador?', message: 'O treinador voltará a aparecer na busca.', danger: false, label: 'Desbloquear' },
    feature: { title: selected?.is_featured ? 'Remover destaque?' : 'Marcar como destaque?', message: selected?.is_featured ? 'O treinador não aparecerá mais em destaque.' : 'O treinador aparecerá em posição de destaque na busca.', danger: false, label: selected?.is_featured ? 'Remover' : 'Destacar' },
    verify:  { title: 'Validar CREF?', message: 'O perfil receberá o selo de verificado.', danger: false, label: 'Validar' },
    delete:  { title: 'Excluir treinador?', message: 'Esta ação é irreversível. O perfil e todos os dados serão removidos.', danger: true, label: 'Excluir' },
  };

  return (
    <AdminShell title="Treinadores">
      <View style={s.filterBar}>
        <View style={s.searchBox}>
          <Search size={16} color={Colors.neutral[400]} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Nome, e-mail, CREF, cidade..."
            placeholderTextColor={Colors.neutral[400]}
          />
          {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><X size={15} color={Colors.neutral[400]} /></TouchableOpacity>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pills}>
          {STATUS_FILTERS.map((sf) => (
            <TouchableOpacity
              key={sf}
              style={[s.pill, statusFilter === sf && s.pillActive]}
              onPress={() => setStatusFilter(sf)}
            >
              <Text style={[s.pillText, statusFilter === sf && s.pillTextActive]}>
                {sf === 'all' ? 'Todos' : STATUS_LABELS[sf]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={s.countText}>{filtered.length} treinador{filtered.length !== 1 ? 'es' : ''}</Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary[600]} size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={s.table}>
          <View style={[s.row, s.headerRow]}>
            <Text style={[s.cell, s.cellFlex, s.headerCell]}>Treinador</Text>
            <Text style={[s.cell, s.cellMd, s.headerCell]}>Status</Text>
            <Text style={[s.cell, s.cellSm, s.headerCell]}>Rating</Text>
            <Text style={[s.cell, s.cellSm, s.headerCell]}>Ações</Text>
          </View>
          {filtered.map((t, idx) => {
            const sc = STATUS_COLORS[t.status] ?? STATUS_COLORS.inactive;
            return (
              <TouchableOpacity key={t.id} style={[s.row, idx % 2 === 0 && s.rowAlt]} onPress={() => openDetail(t)} activeOpacity={0.8}>
                <View style={[s.cell, s.cellFlex]}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{t.profile.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.nameRow}>
                      <Text style={s.trainerName} numberOfLines={1}>{t.profile.full_name}</Text>
                      {t.is_featured && <Zap size={11} color={Colors.warning[600]} fill={Colors.warning[300]} />}
                      {t.is_verified && <BadgeCheck size={11} color={Colors.primary[500]} />}
                    </View>
                    <Text style={s.trainerMeta} numberOfLines={1}>
                      {[t.profile.city, t.cref ? `CREF ${t.cref}` : null].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </View>
                <View style={[s.cell, s.cellMd]}>
                  <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.statusText, { color: sc.text }]}>{STATUS_LABELS[t.status] ?? t.status}</Text>
                  </View>
                </View>
                <View style={[s.cell, s.cellSm]}>
                  {t.rating > 0 ? (
                    <View style={s.ratingRow}>
                      <Star size={11} color="#F59E0B" fill="#F59E0B" />
                      <Text style={s.ratingText}>{t.rating.toFixed(1)}</Text>
                    </View>
                  ) : <Text style={s.noRating}>—</Text>}
                </View>
                <View style={[s.cell, s.cellSm, s.actionsCell]}>
                  {t.status === 'pending' && (
                    <>
                      <TouchableOpacity style={[s.iconBtn, s.iconBtnGreen]} onPress={(e) => { e.stopPropagation?.(); setConfirmAction({ type: 'approve', trainer: t }); }}>
                        <CheckCircle size={15} color={Colors.secondary[600]} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.iconBtn, s.iconBtnRed]} onPress={(e) => { e.stopPropagation?.(); setConfirmAction({ type: 'reject', trainer: t }); }}>
                        <XCircle size={15} color={Colors.error[600]} />
                      </TouchableOpacity>
                    </>
                  )}
                  {t.status === 'active' && (
                    <TouchableOpacity style={[s.iconBtn, s.iconBtnOrange]} onPress={(e) => { e.stopPropagation?.(); setConfirmAction({ type: 'block', trainer: t }); }}>
                      <Lock size={15} color={Colors.warning[600]} />
                    </TouchableOpacity>
                  )}
                  {t.status === 'blocked' && (
                    <TouchableOpacity style={[s.iconBtn, s.iconBtnGreen]} onPress={(e) => { e.stopPropagation?.(); setConfirmAction({ type: 'unblock', trainer: t }); }}>
                      <Unlock size={15} color={Colors.secondary[600]} />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          {filtered.length === 0 && (
            <View style={s.emptyRow}>
              <Text style={s.emptyText}>Nenhum treinador encontrado.</Text>
            </View>
          )}
        </View>
      )}

      {/* Detail modal */}
      <Modal visible={detailModal && !!selected} transparent animationType="slide">
        <View style={s.modalBg}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setDetailModal(false)} />
          {selected && (
            <View style={s.detailPanel}>
              <View style={s.detailHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.detailName}>{selected.profile.full_name}</Text>
                <Text style={s.detailEmail}>{selected.profile.email}</Text>
                {selected.profile.city && <View style={s.infoRow}><MapPin size={13} color={Colors.neutral[500]} /><Text style={s.infoText}>{selected.profile.city}</Text></View>}
                {selected.cref && <View style={s.infoRow}><BadgeCheck size={13} color={Colors.primary[500]} /><Text style={s.infoText}>CREF {selected.cref}</Text></View>}
                {selected.hourly_rate && <Text style={s.detailInfo}>R$ {selected.hourly_rate}/h</Text>}
                {selected.experience_years > 0 && <Text style={s.detailInfo}>{selected.experience_years} anos de experiência</Text>}

                {selected.specialties && selected.specialties.length > 0 && (
                  <View style={s.tagsWrap}>
                    {selected.specialties.map((sp) => (
                      <View key={sp.id} style={s.tag}><Text style={s.tagText}>{sp.name}</Text></View>
                    ))}
                  </View>
                )}

                <Text style={s.actionsTitle}>Ações</Text>
                <View style={s.actionButtons}>
                  {selected.status === 'pending' && (
                    <>
                      <TouchableOpacity style={s.actionBtnGreen} onPress={() => setConfirmAction({ type: 'approve', trainer: selected })}>
                        <Text style={s.actionBtnText}>Aprovar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.actionBtnRed} onPress={() => setConfirmAction({ type: 'reject', trainer: selected })}>
                        <Text style={s.actionBtnText}>Recusar</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {selected.status === 'active' && (
                    <TouchableOpacity style={s.actionBtnOrange} onPress={() => setConfirmAction({ type: 'block', trainer: selected })}>
                      <Text style={s.actionBtnText}>Bloquear</Text>
                    </TouchableOpacity>
                  )}
                  {selected.status === 'blocked' && (
                    <TouchableOpacity style={s.actionBtnGreen} onPress={() => setConfirmAction({ type: 'unblock', trainer: selected })}>
                      <Text style={s.actionBtnText}>Desbloquear</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={selected.is_featured ? s.actionBtnGray : s.actionBtnYellow}
                    onPress={() => setConfirmAction({ type: 'feature', trainer: selected })}
                  >
                    <Text style={s.actionBtnText}>{selected.is_featured ? 'Remover destaque' : 'Marcar destaque'}</Text>
                  </TouchableOpacity>
                  {!selected.is_verified && (
                    <TouchableOpacity style={s.actionBtnBlue} onPress={() => setConfirmAction({ type: 'verify', trainer: selected })}>
                      <Text style={s.actionBtnText}>Validar CREF</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.actionBtnRed} onPress={() => setConfirmAction({ type: 'delete', trainer: selected })}>
                    <Trash2 size={14} color={Colors.white} />
                    <Text style={s.actionBtnText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {confirmAction && CONFIRM_MESSAGES[confirmAction.type] && (
        <ConfirmModal
          visible
          title={CONFIRM_MESSAGES[confirmAction.type].title}
          message={CONFIRM_MESSAGES[confirmAction.type].message}
          confirmLabel={CONFIRM_MESSAGES[confirmAction.type].label}
          danger={CONFIRM_MESSAGES[confirmAction.type].danger}
          onConfirm={runAction}
          onCancel={() => setConfirmAction(null)}
          loading={actionLoading}
        />
      )}
    </AdminShell>
  );
}

const s = StyleSheet.create({
  filterBar: { gap: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1.5, borderColor: Colors.neutral[200],
  },
  searchInput: { flex: 1, fontSize: FontSizes.md, color: Colors.neutral[900] },
  pills: { gap: 7 },
  pill: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.neutral[200] },
  pillActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  pillText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[600] },
  pillTextActive: { color: Colors.white },

  countText: { fontSize: FontSizes.sm, color: Colors.neutral[500], fontWeight: '600' },

  table: { backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.neutral[200], overflow: 'hidden', ...Shadows.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, minHeight: 60 },
  rowAlt: { backgroundColor: Colors.neutral[50] },
  headerRow: { backgroundColor: Colors.neutral[100], minHeight: 42 },
  cell: { paddingHorizontal: 8, paddingVertical: 8, justifyContent: 'center' },
  cellFlex: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cellMd: { width: 110 },
  cellSm: { width: 80 },
  headerCell: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.5 },
  actionsCell: { flexDirection: 'row', gap: 6, justifyContent: 'center' },

  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary[100], alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.primary[700] },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trainerName: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[900], flex: 1 },
  trainerMeta: { fontSize: FontSizes.xs, color: Colors.neutral[500] },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  statusText: { fontSize: FontSizes.xs, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[700] },
  noRating: { fontSize: FontSizes.sm, color: Colors.neutral[400] },

  iconBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconBtnGreen: { backgroundColor: Colors.secondary[50] },
  iconBtnRed: { backgroundColor: Colors.error[50] },
  iconBtnOrange: { backgroundColor: Colors.warning[50] },

  emptyRow: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: FontSizes.md, color: Colors.neutral[500] },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  detailPanel: { backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, paddingTop: 16, maxHeight: '85%' },
  detailHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.neutral[200], alignSelf: 'center', marginBottom: 16 },
  detailName: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.neutral[900] },
  detailEmail: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  infoText: { fontSize: FontSizes.sm, color: Colors.neutral[600] },
  detailInfo: { fontSize: FontSizes.sm, color: Colors.neutral[600], marginBottom: 4 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 },
  tag: { backgroundColor: Colors.primary[50], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: Colors.primary[100] },
  tagText: { fontSize: FontSizes.xs, color: Colors.primary[700], fontWeight: '600' },
  actionsTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 10 },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtnGreen: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.secondary[600], paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  actionBtnRed: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.error[600], paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  actionBtnOrange: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.warning[600], paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  actionBtnGray: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.neutral[500], paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  actionBtnYellow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.warning[500], paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  actionBtnBlue: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary[600], paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
});
