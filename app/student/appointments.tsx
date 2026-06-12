import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { Appointment, TrainerWithProfile } from '@/types/database';
import { Calendar, Clock, Monitor, Users, ChevronRight, X, ArrowRight } from 'lucide-react-native';

type AppointmentWithTrainer = Appointment & { trainerProfile?: TrainerWithProfile };

const STATUS_CONFIG: Record<
  Appointment['status'],
  { label: string; bg: string; color: string }
> = {
  requested:  { label: 'Solicitado',  bg: Colors.warning[50],   color: Colors.warning[700] },
  confirmed:  { label: 'Confirmado',  bg: Colors.success[50],   color: Colors.success[700] },
  rejected:   { label: 'Recusado',    bg: Colors.error[50],     color: Colors.error[700] },
  cancelled:  { label: 'Cancelado',   bg: Colors.neutral[100],  color: Colors.neutral[600] },
  completed:  { label: 'Realizado',   bg: Colors.primary[50],   color: Colors.primary[700] },
};

const TAB_OPTIONS: { key: 'upcoming' | 'past'; label: string }[] = [
  { key: 'upcoming', label: 'Próximas' },
  { key: 'past',     label: 'Histórico' },
];

const AVATAR_PLACEHOLDER = 'https://images.pexels.com/photos/6551133/pexels-photo-6551133.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop';

const DAY_NAMES_FULL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

export default function StudentAppointments() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => { loadAppointments(); }, []);

  const loadAppointments = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        trainer_prof:profiles!appointments_trainer_id_fkey(
          full_name, avatar_url
        )
      `)
      .eq('student_id', profile.id)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('loadAppointments error:', error.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (data) {
      const mapped = data.map((apt: any) => ({
        ...apt,
        trainerProfile: apt.trainer_prof
          ? {
              id: apt.trainer_id,
              profile: {
                full_name: apt.trainer_prof.full_name,
                avatar_url: apt.trainer_prof.avatar_url,
              },
              specialties: [],
            }
          : undefined,
      }));
      setAppointments(mapped as AppointmentWithTrainer[]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const cancelAppointment = async (id: string) => {
    await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id);
    setAppointments((prev) =>
      prev.map((a) => a.id === id ? { ...a, status: 'cancelled' } : a)
    );
  };

  const today = new Date().toISOString().split('T')[0];

  const nextSession = appointments.find(
    (a) => a.status === 'confirmed' && a.appointment_date >= today
  );

  const filtered = appointments.filter((a) => {
    if (tab === 'upcoming') return a.appointment_date >= today && a.status !== 'cancelled' && a.status !== 'rejected';
    return a.appointment_date < today || a.status === 'cancelled' || a.status === 'completed' || a.status === 'rejected';
  });

  const onRefresh = () => { setRefreshing(true); loadAppointments(); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Agenda</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Next session banner */}
        {!loading && nextSession && (() => {
          const tp = nextSession.trainerProfile;
          const trainerName = tp?.profile?.full_name ?? 'Personal';
          const avatarUrl = tp?.profile?.avatar_url ?? AVATAR_PLACEHOLDER;
          return (
            <TouchableOpacity
              style={styles.nextBanner}
              activeOpacity={0.85}
              onPress={() => tp?.id && router.push(`/trainer/${tp.id}`)}
            >
              <View style={styles.nextBannerTop}>
                <Text style={styles.nextBannerLabel}>Próxima sessão confirmada</Text>
                <ArrowRight size={14} color={Colors.white} />
              </View>
              <View style={styles.nextBannerBody}>
                <Image source={{ uri: avatarUrl }} style={styles.nextAvatar} />
                <View style={styles.nextInfo}>
                  <Text style={styles.nextTrainerName}>{trainerName}</Text>
                  <View style={styles.nextRow}>
                    <Calendar size={13} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.nextDetailText}>{formatDateFull(nextSession.appointment_date)}</Text>
                  </View>
                  <View style={styles.nextRow}>
                    <Clock size={13} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.nextDetailText}>
                      {nextSession.start_time?.slice(0, 5)} – {nextSession.end_time?.slice(0, 5)}
                    </Text>
                    {nextSession.modality === 'online'
                      ? <Monitor size={13} color="rgba(255,255,255,0.85)" style={{ marginLeft: 8 }} />
                      : <Users size={13} color="rgba(255,255,255,0.85)" style={{ marginLeft: 8 }} />}
                    <Text style={styles.nextDetailText}>
                      {nextSession.modality === 'online' ? 'Online' : 'Presencial'}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })()}

        {/* Tabs */}
        <View style={styles.tabBar}>
          {TAB_OPTIONS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyNote}>Carregando…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Calendar size={40} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>
              {tab === 'upcoming' ? 'Nenhuma sessão próxima' : 'Nenhum histórico ainda'}
            </Text>
            <Text style={styles.emptyDesc}>
              {tab === 'upcoming'
                ? 'Encontre um personal e solicite uma sessão.'
                : 'Suas sessões realizadas aparecerão aqui.'}
            </Text>
            {tab === 'upcoming' && (
              <TouchableOpacity style={styles.searchBtn} onPress={() => router.push('/student/search')}>
                <Text style={styles.searchBtnText}>Buscar personais</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((apt) => {
            const cfg = STATUS_CONFIG[apt.status];
            const tp = apt.trainerProfile;
            const trainerName = tp?.profile?.full_name ?? 'Personal';
            const avatarUrl = tp?.profile?.avatar_url ?? AVATAR_PLACEHOLDER;
            const canCancel = apt.status === 'requested' || apt.status === 'confirmed';
            const dateStr = formatDateShort(apt.appointment_date);

            return (
              <View key={apt.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.trainerRow}
                  onPress={() => {
                    if (!tp?.id) return;
                    router.push(`/trainer/${tp.id}`);
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: avatarUrl }} style={styles.trainerAvatar} />
                  <View style={styles.trainerInfo}>
                    <Text style={styles.trainerName}>{trainerName}</Text>
                  </View>
                  <ChevronRight size={16} color={Colors.neutral[400]} />
                </TouchableOpacity>

                <View style={styles.divider} />

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Calendar size={14} color={Colors.primary[600]} />
                    <Text style={styles.detailText}>{dateStr}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Clock size={14} color={Colors.neutral[500]} />
                    <Text style={styles.detailText}>
                      {apt.start_time?.slice(0, 5)} – {apt.end_time?.slice(0, 5)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    {apt.modality === 'online'
                      ? <Monitor size={14} color={Colors.neutral[500]} />
                      : <Users size={14} color={Colors.neutral[500]} />}
                    <Text style={styles.detailText}>
                      {apt.modality === 'online' ? 'Online' : 'Presencial'}
                    </Text>
                  </View>
                </View>

                {apt.objective ? (
                  <Text style={styles.objective} numberOfLines={2}>{apt.objective}</Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  {canCancel && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelAppointment(apt.id)}>
                      <X size={13} color={Colors.error[600]} />
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.neutral[900] },

  scrollContent: { paddingHorizontal: Spacing.lg },

  // Next session banner
  nextBanner: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadii.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  nextBannerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  nextBannerLabel: {
    fontSize: FontSizes.xs, fontWeight: '700', color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  nextBannerBody: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  nextAvatar: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  nextInfo: { flex: 1, gap: 4 },
  nextTrainerName: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  nextDetailText: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },

  // Tabs
  tabBar: {
    flexDirection: 'row', marginBottom: Spacing.sm,
    backgroundColor: Colors.neutral[100], borderRadius: BorderRadii.lg, padding: 3,
  },
  tab: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: BorderRadii.md,
  },
  tabActive: { backgroundColor: Colors.white, ...Shadows.xs },
  tabText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[500] },
  tabTextActive: { color: Colors.neutral[900] },

  emptyBox: {
    marginTop: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: BorderRadii.xl,
    padding: Spacing.xl, ...Shadows.xs,
  },
  emptyNote: { fontSize: FontSizes.md, color: Colors.neutral[400] },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[700] },
  emptyDesc: { fontSize: FontSizes.md, color: Colors.neutral[500], textAlign: 'center', lineHeight: 22 },
  searchBtn: {
    marginTop: Spacing.sm, backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.xl, paddingVertical: 10, borderRadius: BorderRadii.lg,
  },
  searchBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },

  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadii.xl,
    marginBottom: Spacing.md, ...Shadows.sm, overflow: 'hidden',
  },
  trainerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md,
  },
  trainerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.neutral[200],
  },
  trainerInfo: { flex: 1 },
  trainerName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  trainerSpecialty: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.neutral[100] },

  detailsRow: {
    flexDirection: 'row', gap: 0, paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  detailItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: FontSizes.xs, color: Colors.neutral[700], fontWeight: '500' },

  objective: {
    fontSize: FontSizes.sm, color: Colors.neutral[600], lineHeight: 18,
    paddingHorizontal: Spacing.md, paddingBottom: 8,
  },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.neutral[100],
    backgroundColor: Colors.neutral[50],
  },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadii.full,
  },
  statusText: { fontSize: FontSizes.xs, fontWeight: '700' },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadii.full,
    borderWidth: 1.5, borderColor: Colors.error[100], backgroundColor: Colors.error[50],
  },
  cancelText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.error[600] },
});
