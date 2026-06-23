import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, Linking,
} from 'react-native';
import { router } from 'expo-router';

const IS_WEB = Platform.OS === 'web';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, Spacing, FontSizes, Shadows } from '@/constants/theme';
import { Lead, Appointment } from '@/types/database';
import { getPlanById, type PlanId } from '@/src/stripe-config';
import {
  Star, Users, Eye, MessageSquare,
  CheckCircle, XCircle, Clock, ChevronRight,
  Edit, Calendar, Monitor, ArrowUpRight,
  Crown, Zap, UserCheck, TrendingUp, Phone,
} from 'lucide-react-native';

type TrainerStatus = 'pending' | 'active' | 'inactive' | 'rejected';

const statusConfig: Record<TrainerStatus, {
  label: string;
  variant: 'warning' | 'success' | 'neutral' | 'error';
  icon: any;
  desc: string;
  bg: string;
  border: string;
  iconColor: string;
}> = {
  pending:  { label: 'Em análise', variant: 'warning', icon: Clock,       desc: 'Seu perfil está em análise pela equipe.', bg: Colors.warning[50], border: Colors.warning[100], iconColor: Colors.warning[600] },
  active:   { label: 'Ativo',      variant: 'success', icon: CheckCircle, desc: 'Seu perfil está visível para alunos.', bg: '#F0FDF4', border: '#BBF7D0', iconColor: '#16A34A' },
  inactive: { label: 'Inativo',    variant: 'neutral', icon: XCircle,     desc: 'Perfil temporariamente desativado.', bg: Colors.neutral[100], border: Colors.neutral[200], iconColor: Colors.neutral[500] },
  rejected: { label: 'Recusado',   variant: 'error',   icon: XCircle,     desc: 'Perfil recusado. Entre em contato.', bg: Colors.error[50], border: Colors.error[100], iconColor: Colors.error[600] },
};

const leadStatusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' }> = {
  pending:   { label: 'Pendente',   variant: 'warning' },
  contacted: { label: 'Contatado',  variant: 'info' },
  converted: { label: 'Convertido', variant: 'success' },
  lost:      { label: 'Perdido',    variant: 'neutral' },
};

const STAT_CONFIGS = [
  { key: 'rating',      label: 'Nota média',    icon: Star,          iconColor: '#F59E0B', bg: '#FFFBEB' },
  { key: 'reviewCount', label: 'Avaliações',    icon: MessageSquare, iconColor: Colors.primary[600], bg: Colors.primary[50] },
  { key: 'viewCount',   label: 'Visualizações', icon: Eye,           iconColor: '#EA580C', bg: '#FFF7ED' },
  { key: 'leadCount',   label: 'Leads',         icon: Users,         iconColor: '#16A34A', bg: '#F0FDF4' },
] as const;

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function extractPhone(message: string | null): string | null {
  if (!message) return null;
  const match = message.match(/Telefone:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

export default function TrainerDashboard() {
  const { profile } = useAuth();
  const [trainerStatus, setTrainerStatus] = useState<TrainerStatus>('pending');
  const [stats, setStats] = useState({ rating: 0, reviewCount: 0, viewCount: 0, leadCount: 0 });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [subscriptionPlan, setSubscriptionPlan] = useState<PlanId>('free');
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (!profile) return;
    const [trainerRes, leadsRes, viewsRes, aptRes, subRes] = await Promise.all([
      supabase.from('trainers').select('status, rating, review_count, subscription_plan, trial_ends_at, subscription_status').eq('id', profile.id).maybeSingle(),
      supabase.from('leads').select('*, student:profiles!leads_student_id_fkey(*)').eq('trainer_id', profile.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('profile_views').select('id', { count: 'exact', head: true }).eq('trainer_id', profile.id),
      supabase.from('appointments').select('*, student:profiles!appointments_student_id_fkey(*)').eq('trainer_id', profile.id).gte('appointment_date', new Date().toISOString().split('T')[0]).in('status', ['requested', 'confirmed']).order('appointment_date').order('start_time').limit(5),
      supabase.from('subscriptions').select('plan, status, current_period_end').eq('trainer_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (trainerRes.data) {
      setTrainerStatus(trainerRes.data.status as TrainerStatus);
      setSubscriptionPlan((trainerRes.data.subscription_plan ?? 'free') as PlanId);
      setStats({
        rating:      trainerRes.data.rating ?? 0,
        reviewCount: trainerRes.data.review_count ?? 0,
        viewCount:   viewsRes.count ?? 0,
        leadCount:   leadsRes.data?.length ?? 0,
      });
      // Use trial_ends_at from trainers table as fallback
      if (trainerRes.data.subscription_status !== 'active' && trainerRes.data.trial_ends_at) {
        setTrialEnd(trainerRes.data.trial_ends_at);
      }
    }
    if (subRes.data) {
      if (subRes.data.plan) setSubscriptionPlan(subRes.data.plan as PlanId);
      if (subRes.data.status === 'trialing') setTrialEnd(subRes.data.current_period_end);
    }
    if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
    if (aptRes.data) setAppointments(aptRes.data as Appointment[]);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const updateLeadStatus = async (leadId: string, status: Lead['status']) => {
    await supabase.from('leads').update({ status }).eq('id', leadId);
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status } : l));
  };

  const openWhatsApp = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    const num = digits.startsWith('55') ? digits : `55${digits}`;
    Linking.openURL(`https://wa.me/${num}`);
  };

  const updateAppointment = async (aptId: string, status: 'confirmed' | 'rejected') => {
    await supabase.from('appointments').update({ status }).eq('id', aptId);
    setAppointments((prev) => prev.map((a) => a.id === aptId ? { ...a, status } : a));
  };
  const statusInfo = statusConfig[trainerStatus];
  const StatusIcon = statusInfo.icon;
  const firstName = profile?.full_name?.split(' ')[0] ?? '';
  const initial = profile?.full_name?.[0]?.toUpperCase() ?? '?';
  const plan = getPlanById(subscriptionPlan);
  const isPremium = subscriptionPlan === 'premium';
  const isPro = subscriptionPlan === 'pro';
  const trialDaysLeft = daysUntil(trialEnd);

  const planBannerStyle = isPremium
    ? { bg: '#FFFBEB', border: '#FCD34D', iconColor: '#D97706', textColor: '#92400E' }
    : isPro
    ? { bg: Colors.primary[50], border: Colors.primary[200], iconColor: Colors.primary[600], textColor: Colors.primary[800] }
    : { bg: Colors.neutral[50], border: Colors.neutral[200], iconColor: Colors.neutral[500], textColor: Colors.neutral[600] };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />}
      >
        {/* Gradient hero header */}
        <LinearGradient
          colors={[Colors.primary[900], Colors.primary[700]]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroTop}>
            <View style={s.heroLeft}>
              <View style={s.heroAvatar}>
                <Text style={s.heroAvatarText}>{initial}</Text>
              </View>
              <View>
                <Text style={s.heroGreeting}>Olá, {firstName}!</Text>
                <Text style={s.heroSub}>Meu painel</Text>
              </View>
            </View>
            <TouchableOpacity style={s.heroEditBtn} onPress={() => router.push('/trainer/onboarding')}>
              <Edit size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Status pill inside hero */}
          <View style={s.heroStatus}>
            <StatusIcon size={13} color={statusInfo.iconColor} />
            <Text style={s.heroStatusText}>{statusInfo.desc}</Text>
            <View style={[s.heroStatusBadge, { backgroundColor: `${statusInfo.iconColor}28` }]}>
              <Text style={[s.heroStatusBadgeText, { color: statusInfo.iconColor }]}>{statusInfo.label}</Text>
            </View>
          </View>

          {/* Trial countdown */}
          {trialDaysLeft !== null && (
            <TouchableOpacity
              style={[s.trialBanner, trialDaysLeft <= 3 && { backgroundColor: Colors.error[50] }]}
              onPress={() => router.push('/trainer/(app)/assinatura')}
              activeOpacity={0.85}
            >
              <Clock size={13} color={trialDaysLeft <= 3 ? Colors.error[600] : Colors.warning[600]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.trialText, trialDaysLeft <= 3 && { color: Colors.error[700] }]}>
                  {trialDaysLeft > 0
                    ? `Teste gratuito: ${trialDaysLeft} dia${trialDaysLeft !== 1 ? 's' : ''} restantes`
                    : 'Periodo de teste encerrado — assine para continuar'}
                </Text>
                {trialEnd && trialDaysLeft > 0 && (
                  <Text style={s.trialSubText}>
                    Vence em {new Date(trialEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </Text>
                )}
              </View>
              <ChevronRight size={14} color={trialDaysLeft <= 3 ? Colors.error[600] : Colors.warning[600]} />
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Plan banner */}
        {IS_WEB ? (
          <TouchableOpacity
            style={[s.planBanner, { backgroundColor: planBannerStyle.bg, borderColor: planBannerStyle.border }]}
            onPress={() => router.push('/trainer/assinatura')}
            activeOpacity={0.8}
          >
            <View style={[s.planBannerIcon, { backgroundColor: planBannerStyle.border }]}>
              {isPremium || isPro
                ? <Crown size={15} color={planBannerStyle.iconColor} />
                : <Zap size={15} color={planBannerStyle.iconColor} />}
            </View>
            <View style={s.planBannerText}>
              <Text style={[s.planBannerName, { color: planBannerStyle.textColor }]}>Plano {plan.name}</Text>
              {subscriptionPlan === 'free' && (
                <Text style={s.planBannerSub}>Faça upgrade para mais recursos</Text>
              )}
            </View>
            <ChevronRight size={16} color={planBannerStyle.iconColor} />
          </TouchableOpacity>
        ) : (
          <View style={[s.planBanner, { backgroundColor: planBannerStyle.bg, borderColor: planBannerStyle.border }]}>
            <View style={[s.planBannerIcon, { backgroundColor: planBannerStyle.border }]}>
              {isPremium || isPro
                ? <Crown size={15} color={planBannerStyle.iconColor} />
                : <Zap size={15} color={planBannerStyle.iconColor} />}
            </View>
            <View style={s.planBannerText}>
              <Text style={[s.planBannerName, { color: planBannerStyle.textColor }]}>Plano {plan.name}</Text>
            </View>
          </View>
        )}

        {/* Stats grid */}
        <View style={s.statsGrid}>
          {STAT_CONFIGS.map(({ key, label, icon: Icon, iconColor, bg }) => {
            const val = stats[key as keyof typeof stats];
            const display = key === 'rating'
              ? (val > 0 ? (val as number).toFixed(1) : '—')
              : String(val);
            return (
              <View key={key} style={s.statCard}>
                <View style={[s.statIcon, { backgroundColor: bg }]}>
                  <Icon size={17} color={iconColor} />
                </View>
                <Text style={s.statValue}>{display}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </View>
            );
          })}
        </View>

        {/* Quick actions */}
        <View style={s.actionsRow}>
          <TouchableOpacity style={s.actionPrimary} onPress={() => router.push(`/trainer/${profile?.id}`)}>
            <Eye size={15} color={Colors.white} />
            <Text style={s.actionPrimaryText}>Ver perfil público</Text>
            <ArrowUpRight size={13} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <TouchableOpacity style={s.actionOutline} onPress={() => router.push('/trainer/onboarding')}>
            <Edit size={15} color={Colors.neutral[700]} />
            <Text style={s.actionOutlineText}>Editar perfil</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming appointments */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Próximas sessões</Text>
          <TouchableOpacity style={s.sectionLink} onPress={() => router.push('/trainer/availability')}>
            <Text style={s.sectionLinkText}>Ver agenda</Text>
            <ChevronRight size={14} color={Colors.primary[600]} />
          </TouchableOpacity>
        </View>

        {appointments.length === 0 ? (
          <View style={s.emptyRow}>
            <Calendar size={16} color={Colors.neutral[300]} />
            <Text style={s.emptyRowText}>Nenhuma sessão próxima</Text>
          </View>
        ) : (
          <View style={s.listPad}>
            {appointments.map((apt) => {
              const student = apt.student as any;
              const isRequested = apt.status === 'requested';
              const dateStr = new Date(apt.appointment_date + 'T12:00:00').toLocaleDateString('pt-BR', {
                weekday: 'short', day: '2-digit', month: 'short',
              });
              return (
                <View key={apt.id} style={s.aptCard}>
                  <View style={s.aptDateBadge}>
                    <Calendar size={12} color={Colors.primary[600]} />
                    <Text style={s.aptDateText}>{dateStr}</Text>
                  </View>
                  <View style={s.aptMid}>
                    <View style={s.aptAvatar}>
                      <Text style={s.aptAvatarText}>{student?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <View>
                      <Text style={s.aptName} numberOfLines={1}>{student?.full_name ?? '—'}</Text>
                      <View style={s.aptTimeLine}>
                        <Clock size={10} color={Colors.neutral[400]} />
                        <Text style={s.aptTimeText}>{apt.start_time?.slice(0, 5)}</Text>
                        {apt.modality === 'online'
                          ? <Monitor size={10} color={Colors.neutral[400]} />
                          : <Users size={10} color={Colors.neutral[400]} />}
                      </View>
                    </View>
                  </View>
                  {isRequested ? (
                    <View style={s.aptActions}>
                      <TouchableOpacity style={s.aptAcceptBtn} onPress={() => updateAppointment(apt.id, 'confirmed')}>
                        <CheckCircle size={14} color={Colors.white} />
                        <Text style={s.aptAcceptText}>Aceitar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.aptRejectBtn} onPress={() => updateAppointment(apt.id, 'rejected')}>
                        <XCircle size={14} color={Colors.error[600]} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <StatusBadge label="Confirmado" variant="success" />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Leads */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Últimos leads</Text>
        </View>

        {leads.length === 0 ? (
          <View style={[s.emptyBox, { marginHorizontal: Spacing.lg }]}>
            <View style={s.emptyIconWrap}>
              <UserCheck size={26} color={Colors.neutral[400]} />
            </View>
            <Text style={s.emptyTitle}>Nenhuma solicitação de contato ainda</Text>
            <Text style={s.emptyDesc}>
              Complete seu perfil para aparecer nas buscas e receber leads.
            </Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/trainer/onboarding')}>
              <TrendingUp size={14} color={Colors.white} />
              <Text style={s.emptyBtnText}>Completar perfil</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.listPad}>
            {leads.map((lead) => {
              const student = lead.student as any;
              const st = leadStatusMap[lead.status] ?? leadStatusMap.pending;
              const phone = extractPhone(lead.message);
              const nextStatusMap: Record<string, Lead['status']> = {
                pending: 'contacted', contacted: 'converted', converted: 'lost', lost: 'pending',
              };
              return (
                <View key={lead.id} style={s.leadCard}>
                  <View style={s.leadAvatar}>
                    <Text style={s.leadAvatarText}>{student?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <View style={s.leadInfo}>
                    <Text style={s.leadName}>{student?.full_name ?? '—'}</Text>
                    {lead.message ? <Text style={s.leadMsg} numberOfLines={1}>{lead.message}</Text> : null}
                    <View style={s.leadMetaRow}>
                      <Clock size={10} color={Colors.neutral[400]} />
                      <Text style={s.leadDate}>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</Text>
                    </View>
                  </View>
                  <View style={s.leadRight}>
                    {phone ? (
                      <TouchableOpacity style={s.whatsappBtn} onPress={() => openWhatsApp(phone)}>
                        <Phone size={13} color={Colors.white} />
                        <Text style={s.whatsappBtnText}>WhatsApp</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity onPress={() => updateLeadStatus(lead.id, nextStatusMap[lead.status])}>
                      <StatusBadge label={st.label} variant={st.variant} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },

  hero: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 16,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.white },
  heroGreeting: { fontSize: 20, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  heroSub: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  heroEditBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, marginBottom: 10,
  },
  heroStatusText: { flex: 1, fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  heroStatusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  heroStatusBadgeText: { fontSize: FontSizes.xs, fontWeight: '700' },
  trialBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.warning[50], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  trialText: { fontSize: FontSizes.sm, color: Colors.warning[700], fontWeight: '700' },
  trialSubText: { fontSize: FontSizes.xs, color: Colors.warning[600], marginTop: 2, fontWeight: '500' },

  planBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: Spacing.lg, borderRadius: 14, borderWidth: 1.5,
    padding: 12, marginBottom: 14,
  },
  planBannerIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  planBannerText: { flex: 1 },
  planBannerName: { fontSize: FontSizes.sm, fontWeight: '700' },
  planBannerSub: { fontSize: FontSizes.xs, color: Colors.neutral[500], marginTop: 1 },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg, gap: 12, marginBottom: 16,
  },
  statCard: {
    flex: 1, minWidth: '44%', borderRadius: 16, padding: 16,
    backgroundColor: Colors.white, alignItems: 'flex-start', gap: 8,
    ...Shadows.sm,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.neutral[900] },
  statLabel: { fontSize: FontSizes.xs, color: Colors.neutral[500], fontWeight: '600' },

  actionsRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: 10, marginBottom: 4 },
  actionPrimary: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: Colors.primary[600], borderRadius: 14, paddingVertical: 14, ...Shadows.sm,
  },
  actionPrimaryText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
  actionOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: Colors.white, borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: Colors.neutral[200], ...Shadows.xs,
  },
  actionOutlineText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700] },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: 10,
  },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },
  sectionLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionLinkText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.primary[600] },

  emptyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.lg, backgroundColor: Colors.white,
    borderRadius: 12, padding: 14, ...Shadows.xs,
  },
  emptyRowText: { fontSize: FontSizes.sm, color: Colors.neutral[400] },

  listPad: { paddingHorizontal: Spacing.lg, gap: 10, marginBottom: 4 },

  aptCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, ...Shadows.sm,
  },
  aptDateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary[50], paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  aptDateText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary[700] },
  aptMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aptAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.secondary[100], alignItems: 'center', justifyContent: 'center',
  },
  aptAvatarText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.secondary[700] },
  aptName: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[900] },
  aptTimeLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  aptTimeText: { fontSize: FontSizes.xs, color: Colors.neutral[500] },

  leadCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, ...Shadows.sm,
  },
  leadAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.secondary[100], alignItems: 'center', justifyContent: 'center',
  },
  leadAvatarText: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.secondary[700] },
  leadInfo: { flex: 1, gap: 2 },
  leadName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  leadMsg: { fontSize: FontSizes.sm, color: Colors.neutral[600] },
  leadMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  leadDate: { fontSize: FontSizes.xs, color: Colors.neutral[400] },
  leadRight: { alignItems: 'flex-end', gap: 6 },
  whatsappBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#16A34A', borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  whatsappBtnText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.white },
  aptActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aptAcceptBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary[600], borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 6,
  },
  aptAcceptText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.white },
  aptRejectBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.error[50], alignItems: 'center', justifyContent: 'center',
  },

  emptyBox: {
    padding: Spacing.xl, backgroundColor: Colors.white,
    borderRadius: 20, alignItems: 'center', gap: 8, ...Shadows.sm,
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[700], textAlign: 'center' },
  emptyDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary[600], borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18, marginTop: 6,
  },
  emptyBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
});
