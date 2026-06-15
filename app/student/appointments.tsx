import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Image, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { Appointment, TrainerWithProfile } from '@/types/database';
import { Calendar, Clock, Monitor, Users, ChevronRight, X, ArrowRight, Star } from 'lucide-react-native';

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
  { key: 'upcoming', label: 'Proximas' },
  { key: 'past',     label: 'Historico' },
];

const AVATAR_PLACEHOLDER = 'https://images.pexels.com/photos/6551133/pexels-photo-6551133.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop';

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={rStyles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Star
            size={36}
            color={n <= value ? '#F59E0B' : Colors.neutral[300]}
            fill={n <= value ? '#F59E0B' : 'transparent'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function StudentAppointments() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  // review state
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [reviewModal, setReviewModal] = useState<AppointmentWithTrainer | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => { if (profile?.id) loadAppointments(); }, [profile?.id]);

  const loadAppointments = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }
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
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (data) {
      const mapped = data.map((apt: any) => ({
        ...apt,
        trainerProfile: apt.trainer_prof
          ? { id: apt.trainer_id, profile: { full_name: apt.trainer_prof.full_name, avatar_url: apt.trainer_prof.avatar_url }, specialties: [] }
          : undefined,
      }));
      setAppointments(mapped as AppointmentWithTrainer[]);

      // load which trainers this student already reviewed
      const trainerIds = [...new Set(data.map((a: any) => a.trainer_id))];
      if (trainerIds.length > 0) {
        const { data: existingReviews } = await supabase
          .from('reviews')
          .select('trainer_id')
          .eq('student_id', profile.id)
          .in('trainer_id', trainerIds);
        if (existingReviews) {
          setReviewedIds(new Set(existingReviews.map((r: any) => r.trainer_id)));
        }
      }
    }
    setLoading(false);
    setRefreshing(false);
  };

  const cancelAppointment = async (id: string) => {
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'cancelled' } : a));
  };

  const openReview = (apt: AppointmentWithTrainer) => {
    setReviewRating(5);
    setReviewComment('');
    setReviewError(null);
    setReviewSuccess(false);
    setReviewModal(apt);
  };

  const submitReview = async () => {
    if (!profile || !reviewModal) return;
    setReviewSaving(true);
    setReviewError(null);
    const { error } = await supabase.from('reviews').insert({
      student_id: profile.id,
      trainer_id: reviewModal.trainer_id,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
      status: 'pending',
    });
    setReviewSaving(false);
    if (error) {
      setReviewError(error.message ?? 'Erro ao enviar avaliacao. Tente novamente.');
      return;
    }
    setReviewedIds((prev) => new Set([...prev, reviewModal.trainer_id]));
    setReviewSuccess(true);
    setTimeout(() => setReviewModal(null), 1500);
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

  const RATING_LABELS: Record<number, string> = { 1: 'Pessimo', 2: 'Ruim', 3: 'Regular', 4: 'Bom', 5: 'Excelente' };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Agenda</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
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
                <Text style={styles.nextBannerLabel}>Proxima sessao confirmada</Text>
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
            <Text style={styles.emptyNote}>Carregando...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Calendar size={40} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>
              {tab === 'upcoming' ? 'Nenhuma sessao proxima' : 'Nenhum historico ainda'}
            </Text>
            <Text style={styles.emptyDesc}>
              {tab === 'upcoming'
                ? 'Encontre um personal e solicite uma sessao.'
                : 'Suas sessoes realizadas aparecerao aqui.'}
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
            const isPast = apt.appointment_date < today;
            const canReview = (apt.status === 'completed' || (isPast && apt.status !== 'cancelled' && apt.status !== 'rejected')) && !reviewedIds.has(apt.trainer_id);
            const alreadyReviewed = reviewedIds.has(apt.trainer_id) && (apt.status === 'completed' || isPast);
            const dateStr = formatDateShort(apt.appointment_date);

            return (
              <View key={apt.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.trainerRow}
                  onPress={() => tp?.id && router.push(`/trainer/${tp.id}`)}
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
                  <View style={styles.footerActions}>
                    {canReview && (
                      <TouchableOpacity style={styles.reviewBtn} onPress={() => openReview(apt)}>
                        <Star size={12} color={Colors.white} fill={Colors.white} />
                        <Text style={styles.reviewBtnText}>Avaliar</Text>
                      </TouchableOpacity>
                    )}
                    {alreadyReviewed && !canReview && (
                      <View style={styles.reviewedBadge}>
                        <Star size={11} color='#F59E0B' fill='#F59E0B' />
                        <Text style={styles.reviewedText}>Avaliado</Text>
                      </View>
                    )}
                    {canCancel && (
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelAppointment(apt.id)}>
                        <X size={13} color={Colors.error[600]} />
                        <Text style={styles.cancelText}>Cancelar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={!!reviewModal} transparent animationType="slide" onRequestClose={() => setReviewModal(null)}>
        <View style={rStyles.overlay}>
          <View style={rStyles.sheet}>
            <View style={rStyles.handle} />

            <View style={rStyles.header}>
              <Text style={rStyles.title}>Avaliar personal</Text>
              <TouchableOpacity onPress={() => setReviewModal(null)} style={rStyles.closeBtn}>
                <X size={20} color={Colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            {reviewSuccess ? (
              <View style={rStyles.successBox}>
                <View style={rStyles.successIcon}>
                  <Star size={32} color='#F59E0B' fill='#F59E0B' />
                </View>
                <Text style={rStyles.successTitle}>Avaliacao enviada!</Text>
                <Text style={rStyles.successSub}>Obrigado pelo seu feedback. Ele sera revisado pela equipe.</Text>
              </View>
            ) : (
              <>
                <Text style={rStyles.trainerName}>
                  {reviewModal?.trainerProfile?.profile?.full_name ?? 'Personal'}
                </Text>
                <Text style={rStyles.label}>Qual foi sua nota para esta sessao?</Text>
                <StarPicker value={reviewRating} onChange={setReviewRating} />
                <Text style={rStyles.ratingLabel}>{RATING_LABELS[reviewRating]}</Text>

                <Text style={rStyles.label}>Comentario (opcional)</Text>
                <TextInput
                  style={rStyles.input}
                  multiline
                  numberOfLines={4}
                  placeholder="Conte como foi a experiencia..."
                  placeholderTextColor={Colors.neutral[400]}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  textAlignVertical="top"
                />

                {reviewError && <Text style={rStyles.errorText}>{reviewError}</Text>}

                <TouchableOpacity
                  style={[rStyles.submitBtn, reviewSaving && { opacity: 0.6 }]}
                  onPress={submitReview}
                  disabled={reviewSaving}
                >
                  {reviewSaving
                    ? <ActivityIndicator size="small" color={Colors.white} />
                    : <Text style={rStyles.submitBtnText}>Enviar avaliacao</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.neutral[900] },
  scrollContent: { paddingHorizontal: Spacing.lg },

  nextBanner: {
    backgroundColor: Colors.primary[600], borderRadius: BorderRadii.xl,
    padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.md,
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
  nextAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  nextInfo: { flex: 1, gap: 4 },
  nextTrainerName: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  nextDetailText: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },

  tabBar: {
    flexDirection: 'row', marginBottom: Spacing.sm,
    backgroundColor: Colors.neutral[100], borderRadius: BorderRadii.lg, padding: 3,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadii.md },
  tabActive: { backgroundColor: Colors.white, ...Shadows.xs },
  tabText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[500] },
  tabTextActive: { color: Colors.neutral[900] },

  emptyBox: {
    marginTop: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: BorderRadii.xl, padding: Spacing.xl, ...Shadows.xs,
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
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md,
  },
  trainerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.neutral[200] },
  trainerInfo: { flex: 1 },
  trainerName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  divider: { height: 1, backgroundColor: Colors.neutral[100] },

  detailsRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 10 },
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
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadii.full },
  statusText: { fontSize: FontSizes.xs, fontWeight: '700' },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F59E0B', borderRadius: BorderRadii.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  reviewBtnText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.white },
  reviewedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFBEB', borderRadius: BorderRadii.full,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  reviewedText: { fontSize: FontSizes.xs, fontWeight: '600', color: '#B45309' },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadii.full,
    borderWidth: 1.5, borderColor: Colors.error[100], backgroundColor: Colors.error[50],
  },
  cancelText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.error[600] },
});

const rStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: 14,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.neutral[200],
    alignSelf: 'center', marginBottom: 4,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.neutral[900] },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center',
  },
  trainerName: { fontSize: FontSizes.md, color: Colors.neutral[600], fontWeight: '600' },
  label: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700] },
  starRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 4 },
  ratingLabel: { fontSize: FontSizes.md, fontWeight: '700', color: '#F59E0B', textAlign: 'center', marginTop: -4 },
  input: {
    borderWidth: 1.5, borderColor: Colors.neutral[200], borderRadius: 14,
    padding: 12, minHeight: 100, fontSize: FontSizes.md, color: Colors.neutral[900],
    backgroundColor: Colors.neutral[50],
  },
  errorText: { fontSize: FontSizes.sm, color: Colors.error[600], fontWeight: '600' },
  submitBtn: {
    backgroundColor: Colors.primary[600], borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
  },
  submitBtnText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.white },
  successBox: { alignItems: 'center', gap: 10, paddingVertical: Spacing.xl },
  successIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.neutral[900] },
  successSub: { fontSize: FontSizes.sm, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20 },
});
