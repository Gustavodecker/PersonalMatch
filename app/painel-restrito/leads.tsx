import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/admin/AdminShell';
import { Colors, FontSizes, Spacing, Shadows } from '@/constants/theme';
import { Lead } from '@/types/database';
import { Search, X, MessageSquare, ChevronDown } from 'lucide-react-native';

type LeadStatus = 'pending' | 'contacted' | 'converted' | 'lost';
type StatusFilter = 'all' | LeadStatus;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Novo', contacted: 'Respondido', converted: 'Fechado', lost: 'Perdido',
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: Colors.warning[50],   text: Colors.warning[700] },
  contacted: { bg: Colors.primary[50],   text: Colors.primary[700] },
  converted: { bg: Colors.secondary[50], text: Colors.secondary[700] },
  lost:      { bg: Colors.neutral[100],  text: Colors.neutral[600] },
};

const STATUS_OPTIONS: StatusFilter[] = ['all', 'pending', 'contacted', 'converted', 'lost'];

type LeadRow = Lead & { student: any; trainer: any };

export default function AdminLeads() {
  const [leads, setLeads]   = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<LeadRow | null>(null);
  const [statusDropdown, setStatusDropdown] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('leads')
      .select('*, student:profiles!leads_student_id_fkey(*), trainer:profiles!leads_trainer_id_fkey(*)')
      .order('created_at', { ascending: false });
    if (data) setLeads(data as LeadRow[]);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let r = [...leads];
    if (statusFilter !== 'all') r = r.filter((l) => l.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((l) =>
        l.student?.full_name?.toLowerCase().includes(q) ||
        l.trainer?.full_name?.toLowerCase().includes(q) ||
        l.message?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [leads, query, statusFilter]);

  const updateStatus = async (lead: LeadRow, newStatus: LeadStatus) => {
    setUpdating(true);
    await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', lead.id);
    setUpdating(false);
    setSelected(null);
    fetchLeads();
  };

  return (
    <AdminShell title="Leads">
      <View style={s.filterBar}>
        <View style={s.searchBox}>
          <Search size={16} color={Colors.neutral[400]} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar aluno, personal ou mensagem..."
            placeholderTextColor={Colors.neutral[400]}
          />
          {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><X size={15} color={Colors.neutral[400]} /></TouchableOpacity>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pills}>
          {STATUS_OPTIONS.map((sf) => (
            <TouchableOpacity key={sf} style={[s.pill, statusFilter === sf && s.pillActive]} onPress={() => setStatusFilter(sf)}>
              <Text style={[s.pillText, statusFilter === sf && s.pillTextActive]}>
                {sf === 'all' ? 'Todos' : STATUS_LABELS[sf]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={s.countText}>{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary[600]} size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={s.cards}>
          {filtered.map((lead) => {
            const sc = STATUS_COLORS[lead.status] ?? STATUS_COLORS.pending;
            return (
              <TouchableOpacity key={lead.id} style={s.card} onPress={() => setSelected(lead)} activeOpacity={0.85}>
                <View style={s.cardTop}>
                  <View style={s.cardPeople}>
                    <Text style={s.cardStudentLabel}>Aluno</Text>
                    <Text style={s.cardPersonName}>{lead.student?.full_name ?? '—'}</Text>
                    <Text style={s.cardPersonEmail}>{lead.student?.email}</Text>
                  </View>
                  <View style={s.cardArrow}><MessageSquare size={16} color={Colors.neutral[400]} /></View>
                  <View style={s.cardPeople}>
                    <Text style={s.cardTrainerLabel}>Personal</Text>
                    <Text style={s.cardPersonName}>{lead.trainer?.full_name ?? '—'}</Text>
                    <Text style={s.cardPersonEmail}>{lead.trainer?.email}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.statusText, { color: sc.text }]}>{STATUS_LABELS[lead.status]}</Text>
                  </View>
                </View>
                {lead.message ? (
                  <Text style={s.messagePreview} numberOfLines={2}>{lead.message}</Text>
                ) : null}
                <Text style={s.dateText}>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</Text>
              </TouchableOpacity>
            );
          })}
          {filtered.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>Nenhum lead encontrado.</Text>
            </View>
          )}
        </View>
      )}

      {/* Detail modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={s.modalBg}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSelected(null)} />
          {selected && (
            <View style={s.detailPanel}>
              <View style={s.detailHandle} />
              <Text style={s.detailTitle}>Detalhes do lead</Text>
              <View style={s.detailRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.detailLabel}>Aluno</Text>
                  <Text style={s.detailVal}>{selected.student?.full_name}</Text>
                  <Text style={s.detailSub}>{selected.student?.email}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.detailLabel}>Personal</Text>
                  <Text style={s.detailVal}>{selected.trainer?.full_name}</Text>
                  <Text style={s.detailSub}>{selected.trainer?.email}</Text>
                </View>
              </View>
              {selected.message && (
                <View style={s.messagebox}>
                  <Text style={s.messageboxText}>{selected.message}</Text>
                </View>
              )}
              <Text style={s.detailLabel}>Alterar status</Text>
              <View style={s.statusOptions}>
                {(['pending', 'contacted', 'converted', 'lost'] as LeadStatus[]).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[s.statusOption, selected.status === st && s.statusOptionActive]}
                    onPress={() => updateStatus(selected, st)}
                    disabled={updating}
                  >
                    <Text style={[s.statusOptionText, selected.status === st && s.statusOptionTextActive]}>
                      {STATUS_LABELS[st]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </Modal>
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
  cards: { gap: 12 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], gap: 8, ...Shadows.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardPeople: { flex: 1, gap: 2 },
  cardStudentLabel: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary[500], textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTrainerLabel: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.secondary[600], textTransform: 'uppercase', letterSpacing: 0.5 },
  cardPersonName: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[900] },
  cardPersonEmail: { fontSize: FontSizes.xs, color: Colors.neutral[500] },
  cardArrow: { paddingTop: 14 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: FontSizes.xs, fontWeight: '700' },
  messagePreview: { fontSize: FontSizes.sm, color: Colors.neutral[600], fontStyle: 'italic', lineHeight: 18 },
  dateText: { fontSize: FontSizes.xs, color: Colors.neutral[400] },
  emptyState: { padding: 64, alignItems: 'center' },
  emptyText: { fontSize: FontSizes.md, color: Colors.neutral[500] },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  detailPanel: { backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, paddingTop: 16, gap: 14 },
  detailHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.neutral[200], alignSelf: 'center', marginBottom: 8 },
  detailTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[900] },
  detailRow: { flexDirection: 'row', gap: 16 },
  detailLabel: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  detailVal: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[900] },
  detailSub: { fontSize: FontSizes.xs, color: Colors.neutral[500] },
  messagebox: { backgroundColor: Colors.neutral[50], borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.neutral[200] },
  messageboxText: { fontSize: FontSizes.sm, color: Colors.neutral[700], lineHeight: 20 },
  statusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.neutral[200], backgroundColor: Colors.neutral[50] },
  statusOptionActive: { borderColor: Colors.primary[400], backgroundColor: Colors.primary[50] },
  statusOptionText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[600] },
  statusOptionTextActive: { color: Colors.primary[700] },
});
