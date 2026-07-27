import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, Linking, Share,
} from 'react-native';
import { router } from 'expo-router';

const IS_WEB = Platform.OS === 'web';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { Lead, Appointment, Review } from '@/types/database';
import { getPlanById, type PlanId } from '@/src/stripe-config';
import {
  Star, Users, Eye, MessageSquare,
  CheckCircle, XCircle, Clock, ChevronRight,
  Edit, Calendar, Monitor, ArrowUpRight,
  Crown, Zap, UserCheck, TrendingUp, Phone,
  Target, Percent, Sparkles, AlertTriangle,
  Share2, BadgeCheck, CalendarClock, Bell,
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
function extractGoal(message: string | null): string | null {
  if (!message) return null;
  const match = message.match(/Objetivo:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

type TrainerData = {
  status: TrainerStatus;
  rating: number;
  review_count: number;
  subscription_plan: PlanId;
  trial_ends_at: string | null;
  subscription_status: string;
  bio: string | null;
  cref: string | null;
  experience_years: number;
  hourly_rate: number | null;
  whatsapp: string | null;
  instagram: string | null;
  avatar_url: string | null;
  cover_photo_url: string | null;
  specialties_count: number;
  photos_count: number;
};

export default function TrainerDashboard() {
  const { profile } = useAuth();
  const [trainerStatus, setTrainerStatus] = useState<TrainerStatus>('pending');
  const [stats, setStats] = useState({ rating: 0, reviewCount: 0, viewCount: 0, leadCount: 0 });
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [convertedCount, setConvertedCount] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [completionPct, setCompletionPct] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pendingApts, setPendingApts] = useState(0);
  const [availabilitySlots, setAvailabilitySlots] = useState<number>(0);
  const [subscriptionPlan, setSubscriptionPlan] = useState<PlanId>('free');
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile) return;
    const [
      trainerRes, leadsRes, viewsRes, aptRes, subRes, reviewsRes,
      pendingAptsRes, specialtiesRes, photosRes, availRes,
    ] = await Promise.all([
      supabase.from('trainers').select('status, rating, review_count, subscription_plan, trial_ends_at, subscription_status, bio, cref, experience_years, hourly_rate, whatsapp, instagram, avatar_url, cover_photo_url').eq('id', profile.id).maybeSingle(),
      supabase.from('leads').select('*, student:profiles!leads_student_id_fkey(*)').eq('trainer_id', profile.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('profile_views').select('id', { count: 'exact', head: true }).eq('trainer_id', profile.id),
      supabase.from('appointments').select('*, student:profiles!appointments_student_id_fkey(*)').eq('trainer_id', profile.id).gte('appointment_date', new Date().toISOString().split('T')[0]).in('status', ['requested', 'confirmed']).order('appointment_date').order('start_time').limit(5),
      supabase.from('subscriptions').select('plan, status, current_period_end').eq('trainer_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('reviews').select('*, student:profiles!reviews_student_id_fkey(*)').eq('trainer_id', profile.id).eq('status', 'approved').order('created_at', { ascending: false }),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('trainer_id', profile.id).eq('status', 'requested'),
      supabase.from('trainer_specialties').select('id', { count: 'exact', head: true }).eq('trainer_id', profile.id),
      supabase.from('trainer_photos').select('id', { count: 'exact', head: true }).eq('trainer_id', profile.id),
      supabase.from('trainer_availability').select('id, is_active').eq('trainer_id', profile.id).eq('is_active', true),
    ]);

    const t = trainerRes.data as any;
    if (t) {
      setTrainerStatus(t.status as TrainerStatus);
      setSubscriptionPlan((t.subscription_plan ?? 'free') as PlanId);
      if (t.subscription_status !== 'active' && t.trial_ends_at) setTrialEnd(t.trial_ends_at);

      const profileCompletion = calcCompletion(t, specialtiesRes.count ?? 0, photosRes.count ?? 0);
      setCompletionPct(profileCompletion);
    }
    if (subRes.data) {
      if (subRes.data.plan) setSubscriptionPlan(subRes.data.plan as PlanId);
      if (subRes.data.status === 'trialing') setTrialEnd(subRes.data.current_period_end);
    }

    const allLeads = (leadsRes.data ?? []) as Lead[];
    const newLeads = allLeads.filter((l) => l.status === 'pending').length;
    const unanswered = allLeads.filter((l) => l.status === 'pending' || l.status === 'contacted').length;
    const converted = allLeads.filter((l) => l.status === 'converted').length;
    const totalLeads = allLeads.length;
    const rate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

    setLeads(allLeads);
    setNewLeadsCount(newLeads);
    setUnansweredCount(unanswered);
    setConvertedCount(converted);
    setConversionRate(rate);
    setPendingApts(pendingAptsRes.count ?? 0);
    setAvailabilitySlots(availRes.data?.length ?? 0);

    const allReviews = (reviewsRes.data ?? []) as Review[];
    const reviewCount = allReviews.length;
    const avgRating = reviewCount > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

    setStats({
      rating:      avgRating,
      reviewCount,
      viewCount:   viewsRes.count ?? 0,
      leadCount:   allLeads.length,
    });

    setReviews(allReviews);
    if (aptRes.data) setAppointments(aptRes.data as Appointment[]);
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);
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

  const shareProfile = async () => {
    if (!profile?.id) return;
    const url = IS_WEB ? `${window.location.origin}/trainer/${profile.id}` : `https://99personal.app/trainer/${profile.id}`;
    try {
      await Share.share({ message: `Confira meu perfil de personal trainer: ${url}` });
    } catch { /* user cancelled */ }
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

  // Primary stats (clickable)
  const primaryStats = [
    { key: 'rating',      label: 'Nota média',    icon: Star,          iconColor: '#F59E0B', bg: '#FFFBEB', route: '/trainer/(app)/avaliacoes' as const },
    { key: 'reviewCount', label: 'Avaliações',    icon: MessageSquare, iconColor: Colors.primary[600], bg: Colors.primary[50], route: '/trainer/(app)/avaliacoes' as const },
    { key: 'viewCount',   label: 'Visualizações', icon: Eye,           iconColor: '#EA580C', bg: '#FFF7ED', route: '/trainer/(app)/visualizacoes' as const },
    { key: 'leadCount',   label: 'Leads',         icon: Users,         iconColor: '#16A34A', bg: '#F0FDF4', route: '/trainer/(app)/leads' as const },
  ] as const;

  // Secondary metric cards
  const metricCards = [
    { label: 'Novos leads',          value: newLeadsCount,       icon: Bell,      color: Colors.warning[600], bg: Colors.warning[50] },
    { label: 'Não respondidos',      value: unansweredCount,     icon: AlertTriangle, color: Colors.error[600], bg: Colors.error[50] },
    { label: 'Alunos convertidos',   value: convertedCount,      icon: UserCheck, color: '#16A34A',          bg: '#F0FDF4' },
    { label: 'Taxa de conversão',    value: `${conversionRate}%`, icon: Percent,   color: Colors.primary[600], bg: Colors.primary[50] },
    { label: 'Perfil completo',      value: `${completionPct}%`, icon: BadgeCheck, color: '#7C3AED',          bg: '#F5F3FF' },
    { label: 'Horários disponíveis', value: availabilitySlots,   icon: CalendarClock, color: '#EA580C',      bg: '#FFF7ED' },
  ];

  // Attention items
  const attentionItems: { label: string; count: number; icon: any; color: string; route: string }[] = [
    { label: 'Sessões para responder', count: pendingApts, icon: Calendar, color: Colors.warning[600], route: '/trainer/(app)/availability' },
    { label: 'Leads pendentes', count: newLeadsCount, icon: Bell, color: Colors.error[600], route: '/trainer/(app)/leads' },
    { label: 'Perfil incompleto', count: completionPct < 100 ? 100 - completionPct : 0, icon: AlertTriangle, color: '#EA580C', route: '/trainer/onboarding' },
  ].filter((a) => a.count > 0);

  // Shortcuts
  const shortcuts = [
    { label: 'Editar perfil', icon: Edit, route: '/trainer/onboarding' },
    { label: 'Disponibilidade', icon: CalendarClock, route: '/trainer/(app)/availability' },
    { label: 'Compartilhar', icon: Share2, action: 'share' as const },
    { label: 'Perfil público', icon: Eye, route: `/trainer/${profile?.id}` },
  ];

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

          <View style={s.heroStatus}>
            <StatusIcon size={13} color={statusInfo.iconColor} />
            <Text style={s.heroStatusText}>{statusInfo.desc}</Text>
            <View style={[s.heroStatusBadge, { backgroundColor: `${statusInfo.iconColor}28` }]}>
              <Text style={[s.heroStatusBadgeText, { color: statusInfo.iconColor }]}>{statusInfo.label}</Text>
            </View>
          </View>

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
                    : 'Período de teste encerrado — assine para continuar'}
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

        {/* Primary stats grid (clickable) */}
        <View style={s.statsGrid}>
          {primaryStats.map(({ key, label, icon: Icon, iconColor, bg, route }) => {
            const val = stats[key as keyof typeof stats];
            const display = key === 'rating'
              ? (val > 0 ? (val as number).toFixed(1) : '—')
              : String(val);
            return (
              <TouchableOpacity
                key={key}
                style={s.statCard}
                onPress={() => router.push(route as any)}
                activeOpacity={0.7}
              >
                <View style={[s.statIcon, { backgroundColor: bg }]}>
                  <Icon size={17} color={iconColor} />
                </View>
                <Text style={s.statValue}>{display}</Text>
                <Text style={s.statLabel}>{label}</Text>
                <View style={s.statArrow}>
                  <ArrowUpRight size={12} color={Colors.neutral[300]} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Secondary metric cards */}
        <View style={s.metricsGrid}>
          {metricCards.map((m) => (
            <View key={m.label} style={s.metricCard}>
              <View style={[s.metricIcon, { backgroundColor: m.bg }]}>
                <m.icon size={15} color={m.color} />
              </View>
              <Text style={s.metricValue}>{m.value}</Text>
              <Text style={s.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Shortcuts */}
        <View style={s.shortcutsRow}>
          {shortcuts.map((sc) => (
            <TouchableOpacity
              key={sc.label}
              style={s.shortcutBtn}
              onPress={() => sc.action === 'share' ? shareProfile() : router.push(sc.route as any)}
              activeOpacity={0.7}
            >
              <View style={s.shortcutIcon}>
                <sc.icon size={18} color={Colors.primary[600]} />
              </View>
              <Text style={s.shortcutLabel}>{sc.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Últimos interessados (leads) */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Últimos interessados</Text>
          <TouchableOpacity style={s.sectionLink} onPress={() => router.push('/trainer/(app)/leads')}>
            <Text style={s.sectionLinkText}>Ver todos</Text>
            <ChevronRight size={14} color={Colors.primary[600]} />
          </TouchableOpacity>
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
            {leads.slice(0, 4).map((lead) => {
              const student = lead.student as any;
              const st = leadStatusMap[lead.status] ?? leadStatusMap.pending;
              const phone = extractPhone(lead.message);
              const goal = extractGoal(lead.message);
              const nextStatusMap: Record<string, Lead['status']> = {
                pending: 'contacted', contacted: 'converted', converted: 'lost', lost: 'pending',
              };
              return (
                <TouchableOpacity
                  key={lead.id}
                  style={s.leadCard}
                  onPress={() => router.push('/trainer/(app)/leads')}
                  activeOpacity={0.75}
                >
                  <View style={s.leadAvatar}>
                    <Text style={s.leadAvatarText}>{student?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <View style={s.leadInfo}>
                    <Text style={s.leadName}>{student?.full_name ?? '—'}</Text>
                    {goal ? <Text style={s.leadGoal} numberOfLines={1}>{goal}</Text> : null}
                    <View style={s.leadMetaRow}>
                      <Clock size={10} color={Colors.neutral[400]} />
                      <Text style={s.leadDate}>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</Text>
                    </View>
                  </View>
                  <View style={s.leadRight}>
                    {phone ? (
                      <TouchableOpacity style={s.whatsappBtn} onPress={(e) => { e.stopPropagation?.(); openWhatsApp(phone); }}>
                        <Phone size={13} color={Colors.white} />
                        <Text style={s.whatsappBtnText}>WhatsApp</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); updateLeadStatus(lead.id, nextStatusMap[lead.status]); }}>
                      <StatusBadge label={st.label} variant={st.variant} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* O que precisa da sua atenção */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>O que precisa da sua atenção</Text>
        </View>
        {attentionItems.length === 0 ? (
          <View style={[s.emptyRow, { marginHorizontal: Spacing.lg }]}>
            <CheckCircle size={16} color="#16A34A" />
            <Text style={s.emptyRowText}>Tudo em dia! Nada pendente.</Text>
          </View>
        ) : (
          <View style={s.listPad}>
            {attentionItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={s.attentionCard}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={[s.attentionIcon, { backgroundColor: `${item.color}15` }]}>
                  <item.icon size={16} color={item.color} />
                </View>
                <Text style={s.attentionLabel}>{item.label}</Text>
                <View style={[s.attentionBadge, { backgroundColor: item.color }]}>
                  <Text style={s.attentionBadgeText}>{item.count}</Text>
                </View>
                <ChevronRight size={14} color={Colors.neutral[300]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Próximas sessões */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Próximas sessões</Text>
          <TouchableOpacity style={s.sectionLink} onPress={() => router.push('/trainer/(app)/availability')}>
            <Text style={s.sectionLinkText}>Ver agenda</Text>
            <ChevronRight size={14} color={Colors.primary[600]} />
          </TouchableOpacity>
        </View>

        {appointments.length === 0 ? (
          <View style={[s.emptyRow, { marginHorizontal: Spacing.lg }]}>
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

        {/* Avaliações recentes */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Avaliações recentes</Text>
          <TouchableOpacity style={s.sectionLink} onPress={() => router.push('/trainer/(app)/avaliacoes')}>
            <Text style={s.sectionLinkText}>Ver todas</Text>
            <ChevronRight size={14} color={Colors.primary[600]} />
          </TouchableOpacity>
        </View>

        {reviews.length === 0 ? (
          <View style={[s.emptyRow, { marginHorizontal: Spacing.lg }]}>
            <MessageSquare size={16} color={Colors.neutral[300]} />
            <Text style={s.emptyRowText}>Nenhuma avaliação ainda</Text>
          </View>
        ) : (
          <View style={s.listPad}>
            {reviews.slice(0, 3).map((rv) => {
              const student = rv.student as any;
              const name = student?.full_name ?? 'Aluno';
              return (
                <TouchableOpacity
                  key={rv.id}
                  style={s.reviewCard}
                  onPress={() => router.push('/trainer/(app)/avaliacoes')}
                  activeOpacity={0.75}
                >
                  <View style={s.reviewHead}>
                    <View style={s.reviewAvatar}>
                      <Text style={s.reviewAvatarText}>{name[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <View style={s.reviewInfo}>
                      <Text style={s.reviewName} numberOfLines={1}>{name}</Text>
                      <View style={s.reviewStars}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={11}
                            color={n <= rv.rating ? Colors.warning[500] : Colors.neutral[300]}
                            fill={n <= rv.rating ? Colors.warning[500] : 'transparent'}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  {rv.comment ? <Text style={s.reviewComment} numberOfLines={2}>{rv.comment}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function calcCompletion(t: any, specialties: number, photos: number): number {
  const fields = [
    !!t.bio && t.bio.length > 10,
    !!t.cref,
    t.experience_years != null && t.experience_years > 0,
    t.hourly_rate != null && t.hourly_rate > 0,
    !!t.whatsapp,
    !!t.instagram,
    !!t.avatar_url,
    !!t.cover_photo_url,
    specialties > 0,
    photos > 0,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
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
    paddingHorizontal: Spacing.lg, gap: 12, marginBottom: 14,
  },
  statCard: {
    flex: 1, minWidth: '44%', borderRadius: 16, padding: 16,
    backgroundColor: Colors.white, alignItems: 'flex-start', gap: 8,
    ...Shadows.sm,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.neutral[900] },
  statLabel: { fontSize: FontSizes.xs, color: Colors.neutral[500], fontWeight: '600' },
  statArrow: { position: 'absolute', top: 14, right: 14 },

  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg, gap: 10, marginBottom: 16,
  },
  metricCard: {
    flex: 1, minWidth: '30%', borderRadius: 14, padding: 12,
    backgroundColor: Colors.white, alignItems: 'flex-start', gap: 5,
    ...Shadows.xs,
  },
  metricIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.neutral[900] },
  metricLabel: { fontSize: 10, color: Colors.neutral[500], fontWeight: '600' },

  shortcutsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg, gap: 10, marginBottom: 8,
  },
  shortcutBtn: {
    flex: 1, minWidth: '22%', alignItems: 'center', gap: 7,
    backgroundColor: Colors.white, borderRadius: 14, paddingVertical: 14,
    ...Shadows.xs,
  },
  shortcutIcon: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  shortcutLabel: { fontSize: 10, fontWeight: '700', color: Colors.neutral[700], textAlign: 'center' },

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
  leadGoal: { fontSize: FontSizes.sm, color: Colors.neutral[600] },
  leadMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  leadDate: { fontSize: FontSizes.xs, color: Colors.neutral[400] },
  leadRight: { alignItems: 'flex-end', gap: 6 },
  whatsappBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#16A34A', borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  whatsappBtnText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.white },

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

  attentionCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10, ...Shadows.sm,
  },
  attentionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  attentionLabel: { flex: 1, fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[800] },
  attentionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  attentionBadgeText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.white },

  reviewCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    ...Shadows.sm,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.secondary[100], alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.secondary[700] },
  reviewInfo: { flex: 1 },
  reviewName: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[900] },
  reviewStars: { flexDirection: 'row', gap: 2, marginTop: 3 },
  reviewComment: { fontSize: FontSizes.sm, color: Colors.neutral[600], lineHeight: 19, marginTop: 8 },

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
