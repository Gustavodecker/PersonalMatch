import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { Appointment } from '@/types/database';
import {
  Calendar, Clock, CheckCircle, XCircle, Users, Monitor,
  Phone, Settings, X, ChevronRight,
} from 'lucide-react-native';

const TAB_OPTIONS: { key: 'pending' | 'upcoming' | 'past'; label: string }[] = [
  { key: 'pending',  label: 'Pendentes' },
  { key: 'upcoming', label: 'Próximas'  },
  { key: 'past',     label: 'Histórico' },
];

export default function AvailabilityScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'pending' | 'upcoming' | 'past'>('pending');
  const [pendingApts, setPendingApts] = useState<Appointment[]>([]);
  const [upcomingApts, setUpcomingApts] = useState<Appointment[]>([]);
  const [pastApts, setPastApts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailApt, setDetailApt] = useState<Appointment | null>(null);

  const loadData = useCallback(async () => {
    if (!profile) return;
    const today = new Date().toISOString().split('T')[0];
    const [pendingRes, upcomingRes, pastRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('*, student:profiles!appointments_student_id_fkey(*)')
        .eq('trainer_id', profile.id)
        .eq('status', 'requested')
        .order('appointment_date').order('start_time'),
      supabase
        .from('appointments')
        .select('*, student:profiles!appointments_student_id_fkey(*)')
        .eq('trainer_id', profile.id)
        .eq('status', 'confirmed')
        .gte('appointment_date', today)
        .order('appointment_date').order('start_time')
        .limit(30),
      supabase
        .from('appointments')
        .select('*, student:profiles!appointments_student_id_fkey(*)')
        .eq('trainer_id', profile.id)
        .in('status', ['rejected', 'cancelled', 'completed'])
        .order('appointment_date', { ascending: false })
        .limit(20),
    ]);
    if (pendingRes.data) setPendingApts(pendingRes.data as Appointment[]);
    if (upcomingRes.data) setUpcomingApts(upcomingRes.data as Appointment[]);
    if (pastRes.data) setPastApts(pastRes.data as Appointment[]);
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const respondAppointment = async (aptId: string, status: 'confirmed' | 'rejected') => {
    await supabase.from('appointments').update({ status }).eq('id', aptId);
    const apt = pendingApts.find((a) => a.id === aptId);
    setPendingApts((prev) => prev.filter((a) => a.id !== aptId));
    if (status === 'confirmed' && apt) {
      setUpcomingApts((prev) => [...prev, { ...apt, status: 'confirmed' as const }].sort(
        (a, b) => a.appointment_date.localeCompare(b.appointment_date)
      ));
    }
    if (detailApt?.id === aptId) setDetailApt(null);
  };

  const cancelAppointment = async (aptId: string) => {
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', aptId);
    setUpcomingApts((prev) => prev.filter((a) => a.id !== aptId));
    setDetailApt(null);
  };

  const openWhatsApp = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    const num = digits.startsWith('55') ? digits : `55${digits}`;
    Linking.openURL(`https://wa.me/${num}`);
  };

  const getName = (apt: Appointment) => apt.student_name ?? (apt.student as any)?.full_name ?? '—';
  const getPhone = (apt: Appointment) => apt.student_phone ?? (apt.student as any)?.phone ?? null;

  const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

  const fmtDateLong = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const STATUS_COLORS: Record<string, { bar: string; avatar: string; text: string }> = {
    requested: { bar: Colors.warning[500],    avatar: Colors.warning[100],  text: Colors.warning[700] },
    confirmed:  { bar: Colors.primary[500],   avatar: Colors.primary[100],  text: Colors.primary[700] },
    rejected:   { bar: Colors.error[500],     avatar: Colors.error[50],     text: Colors.error[700] },
    cancelled:  { bar: Colors.neutral[300],   avatar: Colors.neutral[100],  text: Colors.neutral[500] },
    completed:  { bar: '#16A34A',             avatar: '#D1FAE5',            text: '#065F46' },
  };

  const displayedApts =
    tab === 'pending'  ? pendingApts  :
    tab === 'upcoming' ? upcomingApts : pastApts;

  const renderCard = (apt: Appointment) => {
    const name  = getName(apt);
    const phone = getPhone(apt);
    const col   = STATUS_COLORS[apt.status] ?? STATUS_COLORS.cancelled;
    const isPending  = apt.status === 'requested';
    const isConfirmed = apt.status === 'confirmed';

    return (
      <TouchableOpacity
        key={apt.id}
        style={s.aptCard}
        onPress={() => setDetailApt(apt)}
        activeOpacity={0.75}
      >
        <View style={[s.aptBar, { backgroundColor: col.bar }]} />
        <View style={s.aptContent}>
          <View style={[s.aptAvatar, { backgroundColor: col.avatar }]}>
            <Text style={[s.aptAvatarText, { color: col.text }]}>{name[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View style={s.aptInfo}>
            <Text style={s.aptName}>{name}</Text>
            <View style={s.aptMeta}>
              <Calendar size={11} color={Colors.neutral[400]} />
              <Text style={s.aptMetaText}>{fmtDate(apt.appointment_date)}</Text>
              <Clock size={11} color={Colors.neutral[400]} />
              <Text style={s.aptMetaText}>{apt.start_time?.slice(0, 5)} – {apt.end_time?.slice(0, 5)}</Text>
              {apt.modality === 'online'
                ? <Monitor size={11} color={Colors.neutral[400]} />
                : <Users size={11} color={Colors.neutral[400]} />}
            </View>
            {(apt.student_goal ?? apt.objective ?? apt.class_type_name ?? apt.message)
              ? <Text style={s.aptGoal} numberOfLines={1}>{apt.class_type_name ? `Aula: ${apt.class_type_name}` : (apt.student_goal ?? apt.objective ?? apt.message)}</Text>
              : null}
          </View>
          <View style={s.aptRight}>
            {isPending && (
              <>
                <TouchableOpacity
                  style={s.acceptBtn}
                  onPress={(e) => { e.stopPropagation?.(); respondAppointment(apt.id, 'confirmed'); }}
                >
                  <CheckCircle size={14} color={Colors.white} />
                  <Text style={s.acceptBtnText}>Aceitar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.rejectBtn}
                  onPress={(e) => { e.stopPropagation?.(); respondAppointment(apt.id, 'rejected'); }}
                >
                  <XCircle size={14} color={Colors.error[600]} />
                  <Text style={s.rejectBtnText}>Recusar</Text>
                </TouchableOpacity>
              </>
            )}
            {!isPending && (
              <ChevronRight size={16} color={Colors.neutral[300]} />
            )}
          </View>
        </View>
        {phone && isPending ? (
          <TouchableOpacity
            style={s.whatsappBar}
            onPress={(e) => { e.stopPropagation?.(); openWhatsApp(phone); }}
          >
            <Phone size={12} color={Colors.white} />
            <Text style={s.whatsappBarText}>WhatsApp · {phone}</Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Agenda</Text>
          <Text style={s.subtitle}>Solicitações e sessões</Text>
        </View>
        <TouchableOpacity
          style={s.configBtn}
          onPress={() => router.push('/trainer/agenda-config')}
        >
          <Settings size={18} color={Colors.neutral[700]} />
          <Text style={s.configBtnText}>Configurar</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {TAB_OPTIONS.map((t) => {
          const count = t.key === 'pending' ? pendingApts.length : 0;
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, tab === t.key && s.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
              {count > 0 && (
                <View style={s.tabBadge}><Text style={s.tabBadgeText}>{count}</Text></View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={s.scroll}
      >
        {loading ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyNote}>Carregando…</Text>
          </View>
        ) : displayedApts.length === 0 ? (
          <View style={s.emptyBox}>
            <Calendar size={36} color={Colors.neutral[300]} />
            <Text style={s.emptyTitle}>
              {tab === 'pending'  ? 'Nenhuma solicitação pendente'  :
               tab === 'upcoming' ? 'Nenhuma sessão confirmada' : 'Nenhum histórico'}
            </Text>
            {tab === 'pending' && (
              <Text style={s.emptyDesc}>Solicitações de alunos aparecerão aqui.</Text>
            )}
          </View>
        ) : (
          displayedApts.map(renderCard)
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Detail modal */}
      <Modal visible={!!detailApt} transparent animationType="slide" onRequestClose={() => setDetailApt(null)}>
        <View style={s.modalBg}>
          <View style={[s.modalCard, { paddingBottom: Math.max(insets.bottom, Spacing.xl) }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Detalhes da sessão</Text>
              <TouchableOpacity onPress={() => setDetailApt(null)}>
                <X size={22} color={Colors.neutral[600]} />
              </TouchableOpacity>
            </View>
            {detailApt && (() => {
              const name  = getName(detailApt);
              const phone = getPhone(detailApt);
              const goal  = detailApt.student_goal ?? detailApt.objective;
              const isPending   = detailApt.status === 'requested';
              const isConfirmed = detailApt.status === 'confirmed';
              const rows = [
                ['Aluno',      name],
                phone ? ['Telefone', phone] : null,
                ['Data',       fmtDateLong(detailApt.appointment_date)],
                ['Horário',    `${detailApt.start_time?.slice(0, 5)} – ${detailApt.end_time?.slice(0, 5)}`],
                ['Modalidade', detailApt.modality === 'online' ? 'Online' : 'Presencial'],
                detailApt.class_type_name ? ['Aula', detailApt.class_type_name] : null,
                goal ? ['Objetivo', goal] : null,
                detailApt.message ? ['Mensagem', detailApt.message] : null,
                ['Status',
                  isPending   ? 'Pendente'   :
                  isConfirmed ? 'Confirmado' :
                  detailApt.status === 'rejected'  ? 'Recusado'  :
                  detailApt.status === 'cancelled' ? 'Cancelado' : 'Concluído'],
              ].filter(Boolean) as [string, string][];

              return (
                <>
                  {rows.map(([label, val], i) => (
                    <TouchableOpacity
                      key={i}
                      style={s.detailRow}
                      onPress={label === 'Telefone' && phone ? () => openWhatsApp(phone) : undefined}
                      activeOpacity={label === 'Telefone' ? 0.6 : 1}
                    >
                      <Text style={s.detailLabel}>{label}</Text>
                      <Text style={[
                        s.detailValue,
                        label === 'Telefone' && { color: Colors.primary[600], textDecorationLine: 'underline' },
                        label === 'Status' && isPending   && { color: Colors.warning[600] },
                        label === 'Status' && isConfirmed && { color: '#16A34A' },
                      ]}>
                        {val}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {isPending && (
                    <View style={s.detailBtns}>
                      <TouchableOpacity style={s.acceptBtn} onPress={() => respondAppointment(detailApt.id, 'confirmed')}>
                        <CheckCircle size={15} color={Colors.white} />
                        <Text style={s.acceptBtnText}>Aceitar sessão</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.rejectBtn} onPress={() => respondAppointment(detailApt.id, 'rejected')}>
                        <XCircle size={15} color={Colors.error[600]} />
                        <Text style={s.rejectBtnText}>Recusar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {isConfirmed && (
                    <TouchableOpacity
                      style={s.cancelAptBtn}
                      onPress={() => cancelAppointment(detailApt.id)}
                    >
                      <Text style={s.cancelAptBtnText}>Cancelar sessão</Text>
                    </TouchableOpacity>
                  )}
                  {phone ? (
                    <TouchableOpacity style={s.whatsappFullBtn} onPress={() => openWhatsApp(phone)}>
                      <Phone size={15} color={Colors.white} />
                      <Text style={s.whatsappFullBtnText}>Abrir WhatsApp</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              );
            })()}
          </View>
        </View>
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
  configBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.neutral[100], borderRadius: BorderRadii.lg,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.neutral[200],
  },
  configBtnText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[700] },

  tabBar: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    backgroundColor: Colors.neutral[100], borderRadius: BorderRadii.lg, padding: 3,
  },
  tab: {
    flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center',
    borderRadius: BorderRadii.md, flexDirection: 'row', gap: 5,
  },
  tabActive: { backgroundColor: Colors.white, ...Shadows.xs },
  tabText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[500] },
  tabTextActive: { color: Colors.neutral[900] },
  tabBadge: {
    backgroundColor: Colors.warning[500], borderRadius: 99,
    paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center',
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.white },

  scroll: { paddingHorizontal: Spacing.lg, paddingTop: 4 },

  emptyBox: {
    marginTop: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: BorderRadii.xl,
    padding: Spacing.xl, ...Shadows.xs,
  },
  emptyNote: { fontSize: FontSizes.md, color: Colors.neutral[400] },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[700], textAlign: 'center' },
  emptyDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], textAlign: 'center' },

  aptCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.neutral[100], overflow: 'hidden', ...Shadows.sm,
  },
  aptBar: { height: 3, width: '100%' },
  aptContent: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: Spacing.md, paddingVertical: 12, gap: 10,
  },
  aptAvatar: {
    width: 40, height: 40, borderRadius: 20, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  aptAvatarText: { fontSize: FontSizes.md, fontWeight: '700' },
  aptInfo: { flex: 1, gap: 3 },
  aptName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  aptMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  aptMetaText: { fontSize: FontSizes.xs, color: Colors.neutral[500] },
  aptGoal: { fontSize: FontSizes.xs, color: Colors.neutral[500], fontStyle: 'italic' },
  aptRight: { gap: 5, alignItems: 'flex-end', flexShrink: 0, justifyContent: 'center' },

  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary[600], borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  acceptBtnText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.white },
  rejectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.error[50], borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.error[100],
  },
  rejectBtnText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.error[600] },

  whatsappBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#16A34A', paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  whatsappBarText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.white, flex: 1 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, gap: 0, maxHeight: '88%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[900] },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100], gap: 12,
  },
  detailLabel: { fontSize: FontSizes.sm, color: Colors.neutral[500], fontWeight: '600' },
  detailValue: { fontSize: FontSizes.sm, color: Colors.neutral[900], fontWeight: '600', textAlign: 'right', flex: 1 },
  detailBtns: { flexDirection: 'row', gap: 10, marginTop: Spacing.md },
  cancelAptBtn: {
    marginTop: Spacing.sm, padding: 12, borderRadius: BorderRadii.lg, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.error[100], backgroundColor: Colors.error[50],
  },
  cancelAptBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.error[600] },
  whatsappFullBtn: {
    marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#16A34A', borderRadius: BorderRadii.lg, paddingVertical: 12,
  },
  whatsappFullBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
});
