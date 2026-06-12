import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/admin/AdminShell';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { Colors, FontSizes, Spacing, Shadows } from '@/constants/theme';
import { Review } from '@/types/database';
import { Search, X, Star, CheckCircle, XCircle, Trash2 } from 'lucide-react-native';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', approved: 'Aprovada', rejected: 'Recusada',
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:  { bg: Colors.warning[50],   text: Colors.warning[700] },
  approved: { bg: Colors.secondary[50], text: Colors.secondary[700] },
  rejected: { bg: Colors.error[50],     text: Colors.error[700] },
};

type ReviewRow = Review & { student: any; trainerProfile: any };

export default function AdminReviews() {
  const [reviews, setReviews]   = useState<ReviewRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject' | 'delete'; review: ReviewRow } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reviews')
      .select('*, student:profiles!reviews_student_id_fkey(*)')
      .order('created_at', { ascending: false });
    if (data) setReviews(data as ReviewRow[]);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let r = [...reviews];
    if (statusFilter !== 'all') r = r.filter((rv) => rv.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((rv) =>
        rv.student?.full_name?.toLowerCase().includes(q) ||
        rv.comment?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [reviews, query, statusFilter]);

  const runAction = async () => {
    if (!confirmAction) return;
    const { type, review } = confirmAction;
    setActionLoading(true);
    if (type === 'approve') await supabase.from('reviews').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', review.id);
    if (type === 'reject')  await supabase.from('reviews').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', review.id);
    if (type === 'delete')  await supabase.from('reviews').delete().eq('id', review.id);
    setActionLoading(false);
    setConfirmAction(null);
    fetchReviews();
  };

  const pendingCount = reviews.filter((r) => r.status === 'pending').length;

  return (
    <AdminShell title={`Avaliações${pendingCount > 0 ? ` (${pendingCount} pendentes)` : ''}`}>
      <View style={s.filterBar}>
        <View style={s.searchBox}>
          <Search size={16} color={Colors.neutral[400]} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar aluno ou comentário..."
            placeholderTextColor={Colors.neutral[400]}
          />
          {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><X size={15} color={Colors.neutral[400]} /></TouchableOpacity>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pills}>
          {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((sf) => (
            <TouchableOpacity key={sf} style={[s.pill, statusFilter === sf && s.pillActive]} onPress={() => setStatusFilter(sf)}>
              <Text style={[s.pillText, statusFilter === sf && s.pillTextActive]}>
                {sf === 'all' ? 'Todas' : STATUS_LABELS[sf]}
                {sf === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={s.countText}>{filtered.length} avaliação{filtered.length !== 1 ? 'ões' : ''}</Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary[600]} size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={s.cards}>
          {filtered.map((review) => {
            const sc = STATUS_COLORS[review.status] ?? STATUS_COLORS.pending;
            return (
              <View key={review.id} style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.starsRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={14}
                        color={n <= review.rating ? '#F59E0B' : Colors.neutral[300]}
                        fill={n <= review.rating ? '#F59E0B' : 'transparent'}
                      />
                    ))}
                    <Text style={s.ratingNum}>{review.rating}/5</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.statusText, { color: sc.text }]}>{STATUS_LABELS[review.status]}</Text>
                  </View>
                </View>

                {review.comment ? (
                  <Text style={s.comment}>"{review.comment}"</Text>
                ) : (
                  <Text style={s.noComment}>Sem comentário</Text>
                )}

                <View style={s.cardBottom}>
                  <View style={s.studentInfo}>
                    <View style={s.studentAvatar}>
                      <Text style={s.studentAvatarText}>{review.student?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <View>
                      <Text style={s.studentName}>{review.student?.full_name ?? '—'}</Text>
                      <Text style={s.dateText}>{new Date(review.created_at).toLocaleDateString('pt-BR')}</Text>
                    </View>
                  </View>
                  <View style={s.actions}>
                    {review.status === 'pending' && (
                      <>
                        <TouchableOpacity style={[s.iconBtn, s.iconBtnGreen]} onPress={() => setConfirmAction({ type: 'approve', review })}>
                          <CheckCircle size={16} color={Colors.secondary[600]} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.iconBtn, s.iconBtnRed]} onPress={() => setConfirmAction({ type: 'reject', review })}>
                          <XCircle size={16} color={Colors.error[600]} />
                        </TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity style={[s.iconBtn, s.iconBtnGray]} onPress={() => setConfirmAction({ type: 'delete', review })}>
                      <Trash2 size={16} color={Colors.neutral[500]} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
          {filtered.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>Nenhuma avaliação encontrada.</Text>
            </View>
          )}
        </View>
      )}

      {confirmAction && (
        <ConfirmModal
          visible
          title={confirmAction.type === 'approve' ? 'Aprovar avaliação?' : confirmAction.type === 'reject' ? 'Recusar avaliação?' : 'Excluir avaliação?'}
          message={confirmAction.type === 'approve' ? 'A avaliação ficará visível publicamente no perfil do personal.' : confirmAction.type === 'reject' ? 'A avaliação será ocultada e não aparecerá publicamente.' : 'Esta ação é irreversível.'}
          confirmLabel={confirmAction.type === 'approve' ? 'Aprovar' : confirmAction.type === 'reject' ? 'Recusar' : 'Excluir'}
          danger={confirmAction.type !== 'approve'}
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
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1.5, borderColor: Colors.neutral[200] },
  searchInput: { flex: 1, fontSize: FontSizes.md, color: Colors.neutral[900] },
  pills: { gap: 7 },
  pill: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.neutral[200] },
  pillActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  pillText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[600] },
  pillTextActive: { color: Colors.white },
  countText: { fontSize: FontSizes.sm, color: Colors.neutral[500], fontWeight: '600' },
  cards: { gap: 14 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], gap: 10, ...Shadows.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingNum: { fontSize: FontSizes.xs, color: Colors.neutral[500], marginLeft: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: FontSizes.xs, fontWeight: '700' },
  comment: { fontSize: FontSizes.sm, color: Colors.neutral[700], lineHeight: 20, fontStyle: 'italic' },
  noComment: { fontSize: FontSizes.sm, color: Colors.neutral[400] },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  studentInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  studentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary[100], alignItems: 'center', justifyContent: 'center' },
  studentAvatarText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary[700] },
  studentName: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[800] },
  dateText: { fontSize: FontSizes.xs, color: Colors.neutral[400] },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconBtnGreen: { backgroundColor: Colors.secondary[50] },
  iconBtnRed: { backgroundColor: Colors.error[50] },
  iconBtnGray: { backgroundColor: Colors.neutral[100] },
  emptyState: { padding: 64, alignItems: 'center' },
  emptyText: { fontSize: FontSizes.md, color: Colors.neutral[500] },
});
