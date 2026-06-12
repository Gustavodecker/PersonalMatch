import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Linking, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { Lead } from '@/types/database';
import { Users, Phone, MessageSquare, CheckCircle, X, ChevronDown } from 'lucide-react-native';

type LeadStatus = Lead['status'];

const STATUS_CONFIG: Record<LeadStatus, { label: string; bg: string; color: string; next: LeadStatus | null }> = {
  pending:   { label: 'Pendente',   bg: Colors.warning[50],  color: Colors.warning[700],  next: 'contacted' },
  contacted: { label: 'Contatado',  bg: Colors.primary[50],  color: Colors.primary[700],  next: 'converted' },
  converted: { label: 'Convertido', bg: '#F0FDF4',           color: '#15803D',             next: null },
  lost:      { label: 'Perdido',    bg: Colors.neutral[100], color: Colors.neutral[500],   next: null },
};

const TABS: { key: 'all' | 'pending' | 'contacted' | 'converted'; label: string }[] = [
  { key: 'all',       label: 'Todos' },
  { key: 'pending',   label: 'Pendentes' },
  { key: 'contacted', label: 'Contatados' },
  { key: 'converted', label: 'Convertidos' },
];

function extractPhone(msg: string | null): string | null {
  if (!msg) return null;
  const m = msg.match(/Telefone:\s*([^\n]+)/i);
  return m ? m[1].trim() : null;
}

function extractGoal(msg: string | null): string | null {
  if (!msg) return null;
  const m = msg.match(/Objetivo:\s*([^\n]+)/i);
  return m ? m[1].trim() : null;
}

function extractName(msg: string | null): string | null {
  if (!msg) return null;
  const m = msg.match(/Nome:\s*([^\n]+)/i);
  return m ? m[1].trim() : null;
}

function cleanMessage(msg: string | null): string | null {
  if (!msg) return null;
  return msg
    .replace(/^(Nome|Telefone|Objetivo):\s*[^\n]+\n?/gim, '')
    .trim() || null;
}

export default function ContactsScreen() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'all' | 'pending' | 'contacted' | 'converted'>('all');
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [statusPickerLead, setStatusPickerLead] = useState<Lead | null>(null);

  const loadLeads = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('leads')
      .select('*, student:profiles!leads_student_id_fkey(*)')
      .eq('trainer_id', profile.id)
      .order('created_at', { ascending: false });
    if (data) setLeads(data as Lead[]);
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => { loadLeads(); }, [loadLeads]);
  const onRefresh = () => { setRefreshing(true); loadLeads(); };

  const updateStatus = async (leadId: string, status: LeadStatus) => {
    await supabase.from('leads').update({ status }).eq('id', leadId);
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status } : l));
    setStatusPickerLead(null);
    if (detailLead?.id === leadId) setDetailLead((d) => d ? { ...d, status } : d);
  };

  const openWhatsApp = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    const num = digits.startsWith('55') ? digits : `55${digits}`;
    Linking.openURL(`https://wa.me/${num}`);
  };

  const filtered = tab === 'all' ? leads : leads.filter((l) => l.status === tab);
  const pendingCount = leads.filter((l) => l.status === 'pending').length;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const getDisplayName = (lead: Lead) =>
    (lead.student as any)?.full_name ?? extractName(lead.message) ?? 'Aluno';

  const getPhone = (lead: Lead) =>
    (lead.student as any)?.phone ?? extractPhone(lead.message) ?? null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Contatos</Text>
          <Text style={s.subtitle}>Solicitações de alunos</Text>
        </View>
        {pendingCount > 0 && (
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeText}>{pendingCount} novos</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScrollRow} contentContainerStyle={s.tabScrollContent}>
        {TABS.map((t) => {
          const count = t.key === 'pending' ? pendingCount : 0;
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.tabChip, tab === t.key && s.tabChipActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[s.tabChipText, tab === t.key && s.tabChipTextActive]}>{t.label}</Text>
              {count > 0 && <View style={s.tabDot}><Text style={s.tabDotText}>{count}</Text></View>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={s.scroll}
      >
        {loading ? (
          <View style={s.emptyBox}><Text style={s.emptyNote}>Carregando…</Text></View>
        ) : filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Users size={40} color={Colors.neutral[300]} />
            <Text style={s.emptyTitle}>Nenhum contato aqui</Text>
            <Text style={s.emptyDesc}>
              {tab === 'pending' ? 'Nenhuma nova solicitação pendente.' : 'Contatos aparecem quando alunos te acionam.'}
            </Text>
          </View>
        ) : (
          filtered.map((lead) => {
            const cfg = STATUS_CONFIG[lead.status];
            const name = getDisplayName(lead);
            const phone = getPhone(lead);
            const goal = extractGoal(lead.message);
            const cleanMsg = cleanMessage(lead.message);
            const isPending = lead.status === 'pending';

            return (
              <TouchableOpacity
                key={lead.id}
                style={s.card}
                onPress={() => setDetailLead(lead)}
                activeOpacity={0.75}
              >
                <View style={[s.cardBar, { backgroundColor: cfg.bg, borderLeftColor: cfg.color }]}>
                  <View style={s.cardLeft}>
                    <View style={[s.avatar, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                      <Text style={[s.avatarText, { color: cfg.color }]}>{name[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <View style={s.cardInfo}>
                      <Text style={s.cardName}>{name}</Text>
                      {goal && <Text style={s.cardGoal} numberOfLines={1}>{goal}</Text>}
                      <Text style={s.cardDate}>{fmtDate(lead.created_at)}</Text>
                    </View>
                  </View>
                  <View style={s.cardRight}>
                    <TouchableOpacity
                      style={[s.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                      onPress={(e) => { e.stopPropagation?.(); setStatusPickerLead(lead); }}
                    >
                      <Text style={[s.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                      <ChevronDown size={10} color={cfg.color} />
                    </TouchableOpacity>
                    {phone && (
                      <TouchableOpacity
                        style={s.waBtn}
                        onPress={(e) => { e.stopPropagation?.(); openWhatsApp(phone); }}
                      >
                        <Phone size={13} color={Colors.white} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {cleanMsg && (
                  <View style={s.msgPreview}>
                    <Text style={s.msgPreviewText} numberOfLines={2}>{cleanMsg}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Detail modal */}
      <Modal visible={!!detailLead} transparent animationType="slide" onRequestClose={() => setDetailLead(null)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Contato</Text>
              <TouchableOpacity onPress={() => setDetailLead(null)}>
                <X size={22} color={Colors.neutral[600]} />
              </TouchableOpacity>
            </View>
            {detailLead && (() => {
              const name  = getDisplayName(detailLead);
              const phone = getPhone(detailLead);
              const goal  = extractGoal(detailLead.message);
              const cleanMsg = cleanMessage(detailLead.message);
              const cfg   = STATUS_CONFIG[detailLead.status];
              const rows: [string, string, boolean?][] = [
                ['Aluno',   name],
                ...(phone ? [['Telefone', phone, true] as [string, string, boolean]] : []),
                ...(goal   ? [['Objetivo', goal] as [string, string]] : []),
                ['Data',    fmtDate(detailLead.created_at)],
              ];
              return (
                <>
                  {rows.map(([label, val, isPhone], i) => (
                    <TouchableOpacity
                      key={i}
                      style={s.detailRow}
                      onPress={isPhone && phone ? () => openWhatsApp(phone) : undefined}
                      activeOpacity={isPhone ? 0.6 : 1}
                    >
                      <Text style={s.detailLabel}>{label}</Text>
                      <Text style={[
                        s.detailValue,
                        isPhone && { color: Colors.primary[600], textDecorationLine: 'underline' },
                      ]}>
                        {val}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {cleanMsg && (
                    <View style={s.detailMsgBox}>
                      <Text style={s.detailMsgLabel}>Mensagem</Text>
                      <Text style={s.detailMsgText}>{cleanMsg}</Text>
                    </View>
                  )}

                  {/* Status selector */}
                  <Text style={[s.detailLabel, { marginTop: Spacing.md }]}>Status</Text>
                  <View style={s.statusRow}>
                    {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((st) => {
                      const c = STATUS_CONFIG[st];
                      const active = detailLead.status === st;
                      return (
                        <TouchableOpacity
                          key={st}
                          style={[s.statusOpt, active && { backgroundColor: c.color }]}
                          onPress={() => updateStatus(detailLead.id, st)}
                        >
                          <Text style={[s.statusOptText, active && { color: Colors.white }]}>{c.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {phone && (
                    <TouchableOpacity style={s.waBtnFull} onPress={() => openWhatsApp(phone)}>
                      <Phone size={15} color={Colors.white} />
                      <Text style={s.waBtnFullText}>Abrir WhatsApp</Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Status picker bottom sheet */}
      <Modal visible={!!statusPickerLead} transparent animationType="fade" onRequestClose={() => setStatusPickerLead(null)}>
        <TouchableOpacity style={s.pickerBg} activeOpacity={1} onPress={() => setStatusPickerLead(null)}>
          <View style={s.pickerCard}>
            <Text style={s.pickerTitle}>Alterar status</Text>
            {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((st) => {
              const c = STATUS_CONFIG[st];
              const active = statusPickerLead?.status === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[s.pickerOpt, active && { backgroundColor: Colors.primary[50] }]}
                  onPress={() => statusPickerLead && updateStatus(statusPickerLead.id, st)}
                >
                  {active && <CheckCircle size={14} color={Colors.primary[600]} />}
                  <Text style={[s.pickerOptText, active && { color: Colors.primary[700], fontWeight: '700' }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.neutral[900] },
  subtitle: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginTop: 1 },
  headerBadge: {
    backgroundColor: Colors.warning[500], borderRadius: BorderRadii.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  headerBadgeText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.white },

  tabScrollRow: { flexGrow: 0 },
  tabScrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: 8, flexDirection: 'row' },
  tabChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: BorderRadii.full, borderWidth: 1.5,
    borderColor: Colors.neutral[200], backgroundColor: Colors.white,
  },
  tabChipActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  tabChipText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[600] },
  tabChipTextActive: { color: Colors.white },
  tabDot: {
    backgroundColor: Colors.warning[500], borderRadius: 99,
    paddingHorizontal: 5, minWidth: 16, alignItems: 'center',
  },
  tabDotText: { fontSize: 10, fontWeight: '800', color: Colors.white },

  scroll: { paddingHorizontal: Spacing.lg, paddingTop: 4 },

  emptyBox: {
    marginTop: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: BorderRadii.xl,
    padding: Spacing.xl, ...Shadows.xs,
  },
  emptyNote: { fontSize: FontSizes.md, color: Colors.neutral[400] },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[700] },
  emptyDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], textAlign: 'center' },

  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    marginBottom: 10, overflow: 'hidden', ...Shadows.sm,
    borderWidth: 1, borderColor: Colors.neutral[100],
  },
  cardBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderLeftWidth: 4,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  avatarText: { fontSize: FontSizes.md, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  cardGoal: { fontSize: FontSizes.xs, color: Colors.neutral[500], marginTop: 1 },
  cardDate: { fontSize: FontSizes.xs, color: Colors.neutral[400], marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadii.full,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  waBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center',
  },
  msgPreview: {
    paddingHorizontal: Spacing.md, paddingBottom: 10,
    borderTopWidth: 1, borderTopColor: Colors.neutral[100],
    paddingTop: 8,
  },
  msgPreviewText: { fontSize: FontSizes.sm, color: Colors.neutral[500], lineHeight: 18 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[900] },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100], gap: 12,
  },
  detailLabel: { fontSize: FontSizes.sm, color: Colors.neutral[500], fontWeight: '600' },
  detailValue: { fontSize: FontSizes.sm, color: Colors.neutral[900], fontWeight: '600', textAlign: 'right', flex: 1 },
  detailMsgBox: {
    marginTop: Spacing.sm, backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadii.lg, padding: Spacing.md,
  },
  detailMsgLabel: { fontSize: FontSizes.xs, color: Colors.neutral[500], fontWeight: '700', marginBottom: 4 },
  detailMsgText: { fontSize: FontSizes.sm, color: Colors.neutral[800], lineHeight: 20 },

  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: Spacing.md },
  statusOpt: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadii.full,
    borderWidth: 1.5, borderColor: Colors.neutral[200], backgroundColor: Colors.white,
  },
  statusOptText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[700] },

  waBtnFull: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#16A34A', borderRadius: BorderRadii.lg, paddingVertical: 12,
    marginTop: 4,
  },
  waBtnFullText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },

  // Status picker
  pickerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadii.xl,
    padding: Spacing.lg, width: 240, ...Shadows.lg,
  },
  pickerTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[800], marginBottom: Spacing.sm },
  pickerOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadii.md,
  },
  pickerOptText: { fontSize: FontSizes.md, color: Colors.neutral[700] },
});
