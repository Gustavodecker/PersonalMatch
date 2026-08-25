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
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { Lead, Appointment, Review } from '@/types/database';
import { getPlanById, type PlanId } from '@/src/stripe-config';
import {
  Star, Users, Eye, MessageSquare,
  CheckCircle, XCircle, Clock, ChevronRight,
  Edit, Calendar, Monitor, ArrowUpRight,
  Crown, Zap, UserCheck, TrendingUp, Phone,
  Percent, AlertTriangle,
  Share2, BadgeCheck, CalendarClock, Bell,
  Quote, Sparkles,
} from 'lucide-react-native';

type TrainerStatus = 'pending' | 'active' | 'inactive' | 'rejected';

const statusConfig: Record<TrainerStatus, {
  label: string; icon: any; desc: string; dotColor: string; glow: string;
}> = {
  pending:  { label: 'Em análise', icon: Clock,       desc: 'Seu perfil está em análise pela equipe.', dotColor: '#F59E0B', glow: 'rgba(245,158,11,0.25)' },
  active:   { label: 'Ativo',      icon: CheckCircle, desc: 'Seu perfil está visível para alunos.',    dotColor: '#22C55E', glow: 'rgba(34,197,94,0.25)' },
  inactive: { label: 'Inativo',    icon: XCircle,     desc: 'Perfil temporariamente desativado.',      dotColor: '#94A3B8', glow: 'rgba(148,163,184,0.25)' },
  rejected: { label: 'Recusado',   icon: XCircle,     desc: 'Perfil recusado. Entre em contato.',      dotColor: '#F43F5E', glow: 'rgba(244,63,94,0.25)' },
};

const leadStatusMap: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pendente',   color: '#D97706', bg: 'rgba(217,119,6,0.10)' },
  contacted: { label: 'Contatado',  color: '#2D4EDE', bg: 'rgba(45,78,222,0.10)' },
  converted: { label: 'Convertido', color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
  lost:      { label: 'Perdido',    color: '#64748B', bg: 'rgba(100,116,139,0.10)' },
};

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

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
  const [availabilitySlots, setAvailabilitySlots] = useState(0);
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
      setCompletionPct(calcCompletion(t, specialtiesRes.count ?? 0, photosRes.count ?? 0));
    }
    if (subRes.data) {
      if (subRes.data.plan) setSubscriptionPlan(subRes.data.plan as PlanId);
      if (subRes.data.status === 'trialing') setTrialEnd(subRes.data.current_period_end);
    }

    const allLeads = (leadsRes.data ?? []) as Lead[];
    setLeads(allLeads);
    setNewLeadsCount(allLeads.filter((l) => l.status === 'pending').length);
    setUnansweredCount(allLeads.filter((l) => l.status === 'pending' || l.status === 'contacted').length);
    setConvertedCount(allLeads.filter((l) => l.status === 'converted').length);
    setConversionRate(allLeads.length > 0 ? Math.round((allLeads.filter((l) => l.status === 'converted').length / allLeads.length) * 100) : 0);
    setPendingApts(pendingAptsRes.count ?? 0);
    setAvailabilitySlots(availRes.data?.length ?? 0);

    const allReviews = (reviewsRes.data ?? []) as Review[];
    setStats({
      rating: allReviews.length > 0 ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length : 0,
      reviewCount: allReviews.length,
      viewCount: viewsRes.count ?? 0,
      leadCount: allLeads.length,
    });
    setReviews(allReviews);
    if (aptRes.data) setAppointments(aptRes.data as Appointment[]);
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const updateLeadStatus = async (id: string, status: Lead['status']) => {
    await supabase.from('leads').update({ status }).eq('id', id);
    setLeads((p) => p.map((l) => l.id === id ? { ...l, status } : l));
  };

  const openWhatsApp = (phone: string) => {
    const d = phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${d.startsWith('55') ? d : `55${d}`}`);
  };

  const updateAppointment = async (id: string, status: 'confirmed' | 'rejected') => {
    await supabase.from('appointments').update({ status }).eq('id', id);
    setAppointments((p) => p.map((a) => a.id === id ? { ...a, status } : a));
  };

  const shareProfile = async () => {
    if (!profile?.id) return;
    const url = IS_WEB ? `${window.location.origin}/trainer/${profile.id}` : `https://99personal.app/trainer/${profile.id}`;
    try { await Share.share({ message: `Confira meu perfil de personal trainer: ${url}` }); } catch {}
  };

  const si = statusConfig[trainerStatus];
  const StatusIcon = si.icon;
  const firstName = profile?.full_name?.split(' ')[0] ?? '';
  const initial = profile?.full_name?.[0]?.toUpperCase() ?? '?';
  const plan = getPlanById(subscriptionPlan);
  const isPaid = subscriptionPlan === 'premium' || subscriptionPlan === 'pro';
  const trialDaysLeft = daysUntil(trialEnd);

  const primaryStats = [
    { key: 'rating',      label: 'Nota média',    icon: Star,          grad: ['#FEF3C7', '#FDE68A'], color: '#D97706', route: '/trainer/(app)/avaliacoes' },
    { key: 'reviewCount', label: 'Avaliações',    icon: MessageSquare, grad: ['#E0E7FF', '#C7D2FE'], color: '#2D4EDE', route: '/trainer/(app)/avaliacoes' },
    { key: 'viewCount',   label: 'Visualizações', icon: Eye,           grad: ['#FFEDD5', '#FED7AA'], color: '#EA580C', route: '/trainer/(app)/visualizacoes' },
    { key: 'leadCount',   label: 'Leads',         icon: Users,         grad: ['#DCFCE7', '#BBF7D0'], color: '#16A34A', route: '/trainer/(app)/leads' },
  ];

  const metrics = [
    { label: 'Novos leads',       value: newLeadsCount,       icon: Bell,           color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
    { label: 'Sem resposta',      value: unansweredCount,     icon: AlertTriangle,  color: '#E11D48', bg: 'rgba(225,29,72,0.08)' },
    { label: 'Convertidos',       value: convertedCount,      icon: UserCheck,      color: '#16A34A', bg: 'rgba(22,163,74,0.08)' },
    { label: 'Conversão',         value: `${conversionRate}%`, icon: Percent,        color: '#2D4EDE', bg: 'rgba(45,78,222,0.08)' },
    { label: 'Perfil completo',   value: `${completionPct}%`, icon: BadgeCheck,     color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
    { label: 'Horários livres',   value: availabilitySlots,   icon: CalendarClock,  color: '#EA580C', bg: 'rgba(234,88,12,0.08)' },
  ];

  const attentionItems: { label: string; count: number; icon: any; color: string; bg: string; route: string }[] = [
    { label: 'Sessões para responder', count: pendingApts, icon: Calendar, color: '#D97706', bg: 'rgba(217,119,6,0.08)', route: '/trainer/(app)/availability' },
    { label: 'Leads pendentes', count: newLeadsCount, icon: Bell, color: '#E11D48', bg: 'rgba(225,29,72,0.08)', route: '/trainer/(app)/leads' },
    { label: 'Perfil incompleto', count: completionPct < 100 ? 100 - completionPct : 0, icon: AlertTriangle, color: '#EA580C', bg: 'rgba(234,88,12,0.08)', route: '/trainer/onboarding' },
  ].filter((a) => a.count > 0);

  const isPremium = subscriptionPlan === 'premium';
  const shortcuts = [
    { label: 'Editar perfil',   icon: Edit,         route: '/trainer/onboarding' },
    { label: 'Disponibilidade', icon: CalendarClock, route: '/trainer/(app)/availability' },
    { label: 'Compartilhar',    icon: Share2,       action: 'share' as const },
    { label: 'Perfil público',  icon: Eye,          route: `/trainer/${profile?.id}` },
    ...(isPremium ? [
      { label: 'Promoções',       icon: Percent,      route: '/trainer/(app)/promocoes' },
      { label: 'Conversão',       icon: TrendingUp,   route: '/trainer/(app)/conversao' },
      { label: 'Config. Premium', icon: Crown,        route: '/trainer/(app)/premium-settings' },
    ] : []),
  ];

  const fmtAptDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return { day: d.getDate(), month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), weekday: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') };
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />}
      >
        {/* ═══════ PREMIUM HERO ═══════ */}
        <LinearGradient
          colors={[Colors.primary[900], Colors.primary[700], Colors.primary[600]]}
          start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }}
          style={s.hero}
        >
          {/* Decorative glow circles */}
          <View style={s.heroGlow1} />
          <View style={s.heroGlow2} />

          <View style={s.heroContent}>
            {/* Top row */}
            <View style={s.heroTop}>
              <View style={s.heroLeft}>
                <View style={s.heroAvatar}>
                  <Text style={s.heroAvatarText}>{initial}</Text>
                </View>
                <View>
                  <Text style={s.heroGreeting}>Olá, {firstName}</Text>
                  <View style={s.heroStatusRow}>
                    <View style={[s.heroStatusDot, { backgroundColor: si.dotColor }]} />
                    <Text style={s.heroStatusText}>{si.label}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={s.heroEditBtn} onPress={() => router.push('/trainer/onboarding')}>
                <Edit size={15} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {/* Status description pill */}
            <View style={s.heroStatusPill}>
              <StatusIcon size={12} color={si.dotColor} />
              <Text style={s.heroStatusDesc}>{si.desc}</Text>
            </View>

            {/* Trial banner */}
            {trialDaysLeft !== null && (
              <TouchableOpacity
                style={[s.trialBanner, trialDaysLeft <= 3 && s.trialBannerUrgent]}
                onPress={() => router.push('/trainer/(app)/assinatura')}
                activeOpacity={0.85}
              >
                <View style={[s.trialIconWrap, { backgroundColor: trialDaysLeft <= 3 ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)' }]}>
                  <Clock size={13} color={trialDaysLeft <= 3 ? '#FCA5A5' : '#FCD34D'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.trialText, trialDaysLeft <= 3 && { color: '#FECACA' }]}>
                    {trialDaysLeft > 0
                      ? `${trialDaysLeft} dia${trialDaysLeft !== 1 ? 's' : ''} de teste restantes`
                      : 'Teste encerrado — assine para continuar'}
                  </Text>
                  {trialEnd && trialDaysLeft > 0 && (
                    <Text style={s.trialSub}>Vence em {new Date(trialEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</Text>
                  )}
                </View>
                <ChevronRight size={14} color={trialDaysLeft <= 3 ? '#FCA5A5' : '#FCD34D'} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* ═══════ PLAN BADGE ═══════ */}
        <View style={s.planWrap}>
          <LinearGradient
            colors={isPaid ? ['#1E293B', '#0F172A'] : ['#F8FAFC', '#F1F5F9']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.planBadge}
          >
            <View style={[s.planIconWrap, { backgroundColor: isPaid ? 'rgba(252,211,77,0.2)' : 'rgba(45,78,222,0.1)' }]}>
              {isPaid
                ? <Crown size={15} color="#FCD34D" />
                : <Zap size={15} color={Colors.primary[600]} />}
            </View>
            <View style={s.planText}>
              <Text style={[s.planName, { color: isPaid ? '#FCD34D' : Colors.neutral[800] }]}>
                Plano {plan.name}
              </Text>
              {!isPaid && <Text style={s.planSub}>Faça upgrade para mais recursos</Text>}
              {isPaid && <Text style={[s.planSub, { color: 'rgba(255,255,255,0.5)' }]}>Conta premium ativa</Text>}
            </View>
            <TouchableOpacity
              style={[s.planUpgradeBtn, { backgroundColor: isPaid ? 'rgba(255,255,255,0.1)' : Colors.primary[600] }]}
              onPress={() => router.push('/trainer/assinatura')}
            >
              <Text style={[s.planUpgradeText, { color: isPaid ? Colors.white : Colors.white }]}>
                {isPaid ? 'Gerenciar' : 'Upgrade'}
              </Text>
              <ChevronRight size={12} color={Colors.white} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* ═══════ PRIMARY STATS — 2x2 GRADIENT GRID ═══════ */}
        <View style={s.statsGrid}>
          {primaryStats.map(({ key, label, icon: Icon, grad, color, route }) => {
            const val = stats[key as keyof typeof stats];
            const display = key === 'rating' ? (val > 0 ? (val as number).toFixed(1) : '—') : String(val);
            return (
              <TouchableOpacity
                key={key}
                style={s.statCard}
                onPress={() => router.push(route as any)}
                activeOpacity={0.65}
              >
                <LinearGradient
                  colors={grad as [string, string]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.statIconWrap}
                >
                  <Icon size={18} color={color} />
                </LinearGradient>
                <Text style={s.statValue}>{display}</Text>
                <Text style={s.statLabel}>{label}</Text>
                <View style={s.statArrow}>
                  <ArrowUpRight size={11} color={Colors.neutral[300]} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══════ MÉTRICAS — COMPACT INSIGHT STRIP ═══════ */}
        <View style={s.metricsCard}>
          <View style={s.metricsHeader}>
            <View style={s.metricsTitleRow}>
              <Sparkles size={13} color={Colors.primary[600]} />
              <Text style={s.metricsTitle}>Métricas</Text>
            </View>
          </View>
          <View style={s.metricsGrid}>
            {metrics.map((m, i) => (
              <View
                key={m.label}
                style={[
                  s.metricCell,
                  i < metrics.length - (metrics.length % 3 || 3) && s.metricCellBorder,
                  (i + 1) % 3 !== 0 && s.metricCellRightBorder,
                ]}
              >
                <View style={[s.metricIcon, { backgroundColor: m.bg }]}>
                  <m.icon size={13} color={m.color} />
                </View>
                <Text style={s.metricValue}>{m.value}</Text>
                <Text style={s.metricLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ═══════ ATALHOS ═══════ */}
        <View style={s.shortcutsRow}>
          {shortcuts.map((sc) => (
            <TouchableOpacity
              key={sc.label}
              style={s.shortcutBtn}
              onPress={() => sc.action === 'share' ? shareProfile() : router.push(sc.route as any)}
              activeOpacity={0.65}
            >
              <LinearGradient
                colors={[Colors.primary[50], Colors.primary[100]]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.shortcutIconWrap}
              >
                <sc.icon size={18} color={Colors.primary[600]} />
              </LinearGradient>
              <Text style={s.shortcutLabel}>{sc.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══════ ATENÇÃO ═══════ */}
        {attentionItems.length > 0 && (
          <>
            <SectionHeader title="Precisa da sua atenção" />
            <View style={s.listPad}>
              {attentionItems.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[s.attentionCard, { borderLeftColor: item.color }]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.65}
                >
                  <View style={[s.attentionIcon, { backgroundColor: item.bg }]}>
                    <item.icon size={15} color={item.color} />
                  </View>
                  <Text style={s.attentionLabel}>{item.label}</Text>
                  <View style={[s.attentionBadge, { backgroundColor: item.color }]}>
                    <Text style={s.attentionBadgeText}>{item.count}</Text>
                  </View>
                  <ChevronRight size={14} color={Colors.neutral[300]} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ═══════ LEADS ═══════ */}
        <SectionHeader
          title="Últimos interessados"
          actionLabel="Ver todos"
          onAction={() => router.push('/trainer/(app)/leads')}
        />
        {leads.length === 0 ? (
          <EmptyBlock
            icon={UserCheck}
            title="Nenhuma solicitação ainda"
            desc="Complete seu perfil para aparecer nas buscas e receber leads."
            btnLabel="Completar perfil"
            btnIcon={TrendingUp}
            onBtn={() => router.push('/trainer/onboarding')}
          />
        ) : (
          <View style={s.listPad}>
            {leads.slice(0, 4).map((lead) => {
              const student = lead.student as any;
              const st = leadStatusMap[lead.status] ?? leadStatusMap.pending;
              const phone = extractPhone(lead.message);
              const goal = extractGoal(lead.message);
              const nextMap: Record<string, Lead['status']> = { pending: 'contacted', contacted: 'converted', converted: 'lost', lost: 'pending' };
              return (
                <TouchableOpacity
                  key={lead.id}
                  style={s.leadCard}
                  onPress={() => router.push('/trainer/(app)/leads')}
                  activeOpacity={0.7}
                >
                  <View style={[s.leadAvatar, { backgroundColor: st.bg }]}>
                    <Text style={[s.leadAvatarText, { color: st.color }]}>{student?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <View style={s.leadInfo}>
                    <Text style={s.leadName}>{student?.full_name ?? '—'}</Text>
                    {goal && <Text style={s.leadGoal} numberOfLines={1}>{goal}</Text>}
                    <View style={s.leadMetaRow}>
                      <Clock size={9} color={Colors.neutral[400]} />
                      <Text style={s.leadDate}>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</Text>
                    </View>
                  </View>
                  <View style={s.leadRight}>
                    {phone && (
                      <TouchableOpacity style={s.whatsappBtn} onPress={(e) => { e.stopPropagation?.(); openWhatsApp(phone); }}>
                        <Phone size={12} color={Colors.white} />
                        <Text style={s.whatsappText}>WhatsApp</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[s.leadStatusChip, { backgroundColor: st.bg }]}
                      onPress={(e) => { e.stopPropagation?.(); updateLeadStatus(lead.id, nextMap[lead.status]); }}
                    >
                      <Text style={[s.leadStatusText, { color: st.color }]}>{st.label}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ═══════ PRÓXIMAS SESSÕES — TIMELINE STYLE ═══════ */}
        <SectionHeader
          title="Próximas sessões"
          actionLabel="Ver agenda"
          onAction={() => router.push('/trainer/(app)/availability')}
        />
        {appointments.length === 0 ? (
          <EmptyRow icon={Calendar} text="Nenhuma sessão próxima" />
        ) : (
          <View style={s.listPad}>
            {appointments.map((apt) => {
              const student = apt.student as any;
              const isReq = apt.status === 'requested';
              const { day, month, weekday } = fmtAptDate(apt.appointment_date);
              return (
                <View key={apt.id} style={s.aptCard}>
                  {/* Date block */}
                  <View style={s.aptDateBlock}>
                    <Text style={s.aptDateDay}>{day}</Text>
                    <Text style={s.aptDateMonth}>{month}</Text>
                    <Text style={s.aptDateWeekday}>{weekday}</Text>
                  </View>
                  {/* Divider */}
                  <View style={s.aptDivider} />
                  {/* Info */}
                  <View style={s.aptInfo}>
                    <Text style={s.aptName} numberOfLines={1}>{student?.full_name ?? '—'}</Text>
                    <View style={s.aptMetaRow}>
                      <Clock size={10} color={Colors.neutral[400]} />
                      <Text style={s.aptTime}>{apt.start_time?.slice(0, 5)}</Text>
                      {apt.modality === 'online'
                        ? <><Monitor size={10} color={Colors.neutral[400]} /><Text style={s.aptModality}>Online</Text></>
                        : <><Users size={10} color={Colors.neutral[400]} /><Text style={s.aptModality}>Presencial</Text></>}
                    </View>
                  </View>
                  {/* Actions */}
                  {isReq ? (
                    <View style={s.aptActions}>
                      <TouchableOpacity style={s.aptAcceptBtn} onPress={() => updateAppointment(apt.id, 'confirmed')}>
                        <CheckCircle size={13} color={Colors.white} />
                        <Text style={s.aptAcceptText}>Aceitar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.aptRejectBtn} onPress={() => updateAppointment(apt.id, 'rejected')}>
                        <XCircle size={14} color={Colors.error[600]} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={s.aptConfirmedBadge}>
                      <CheckCircle size={11} color="#16A34A" />
                      <Text style={s.aptConfirmedText}>Confirmado</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ═══════ AVALIAÇÕES — ELEGANT QUOTE CARDS ═══════ */}
        <SectionHeader
          title="Avaliações recentes"
          actionLabel="Ver todas"
          onAction={() => router.push('/trainer/(app)/avaliacoes')}
        />
        {reviews.length === 0 ? (
          <EmptyRow icon={MessageSquare} text="Nenhuma avaliação ainda" />
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
                  activeOpacity={0.7}
                >
                  <Quote size={20} color={Colors.primary[100]} style={s.reviewQuoteIcon} />
                  <View style={s.reviewHead}>
                    <View style={s.reviewAvatar}>
                      <Text style={s.reviewAvatarText}>{name[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <View style={s.reviewInfo}>
                      <Text style={s.reviewName} numberOfLines={1}>{name}</Text>
                      <View style={s.reviewStars}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={10} color={n <= rv.rating ? '#F59E0B' : Colors.neutral[200]} fill={n <= rv.rating ? '#F59E0B' : 'transparent'} />
                        ))}
                      </View>
                    </View>
                  </View>
                  {rv.comment && <Text style={s.reviewComment} numberOfLines={2}>{rv.comment}</Text>}
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

// ─── Reusable section header ───
function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={s.sectionLink} onPress={onAction}>
          <Text style={s.sectionLinkText}>{actionLabel}</Text>
          <ChevronRight size={13} color={Colors.primary[600]} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function EmptyRow({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <View style={[s.emptyRow, { marginHorizontal: Spacing.lg }]}>
      <Icon size={15} color={Colors.neutral[300]} />
      <Text style={s.emptyRowText}>{text}</Text>
    </View>
  );
}

function EmptyBlock({ icon: Icon, title, desc, btnLabel, btnIcon: BtnIcon, onBtn }: {
  icon: any; title: string; desc: string; btnLabel: string; btnIcon: any; onBtn: () => void;
}) {
  return (
    <View style={[s.emptyBox, { marginHorizontal: Spacing.lg }]}>
      <View style={s.emptyIconWrap}>
        <Icon size={24} color={Colors.neutral[400]} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyDesc}>{desc}</Text>
      <TouchableOpacity style={s.emptyBtn} onPress={onBtn}>
        <BtnIcon size={13} color={Colors.white} />
        <Text style={s.emptyBtnText}>{btnLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function calcCompletion(t: any, specialties: number, photos: number): number {
  const fields = [
    !!t.bio && t.bio.length > 10, !!t.cref,
    t.experience_years > 0, t.hourly_rate > 0,
    !!t.whatsapp, !!t.instagram,
    !!t.avatar_url, !!t.cover_photo_url,
    specialties > 0, photos > 0,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },

  // ═══════ HERO ═══════
  hero: {
    position: 'relative', overflow: 'hidden',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    marginBottom: 16,
  },
  heroGlow1: {
    position: 'absolute', top: -60, right: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroGlow2: {
    position: 'absolute', bottom: -30, left: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  heroAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { fontSize: 22, fontWeight: '800', color: Colors.white },
  heroGreeting: { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.5 },
  heroStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  heroStatusDot: { width: 7, height: 7, borderRadius: 4 },
  heroStatusText: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  heroEditBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10, marginBottom: 10,
  },
  heroStatusDesc: { flex: 1, fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  trialBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  trialBannerUrgent: { backgroundColor: 'rgba(244,63,94,0.15)' },
  trialIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  trialText: { fontSize: FontSizes.sm, color: '#FDE68A', fontWeight: '700' },
  trialSub: { fontSize: FontSizes.xs, color: 'rgba(253,230,138,0.7)', marginTop: 2, fontWeight: '500' },

  // ═══════ PLAN BADGE ═══════
  planWrap: { paddingHorizontal: Spacing.lg, marginBottom: 16 },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    borderRadius: 16, padding: 14, ...Shadows.sm,
  },
  planIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  planText: { flex: 1 },
  planName: { fontSize: FontSizes.md, fontWeight: '800' },
  planSub: { fontSize: FontSizes.xs, color: Colors.neutral[500], marginTop: 2, fontWeight: '500' },
  planUpgradeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  planUpgradeText: { fontSize: FontSizes.sm, fontWeight: '700' },

  // ═══════ STATS GRID ═══════
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: 12, marginBottom: 14 },
  statCard: {
    flex: 1, minWidth: '44%', borderRadius: 18, padding: 16,
    backgroundColor: Colors.white, alignItems: 'flex-start', gap: 8,
    ...Shadows.sm, borderWidth: 1, borderColor: Colors.neutral[100],
  },
  statIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 26, fontWeight: '800', color: Colors.neutral[900], letterSpacing: -0.5 },
  statLabel: { fontSize: FontSizes.sm, color: Colors.neutral[500], fontWeight: '600' },
  statArrow: { position: 'absolute', top: 14, right: 14 },

  // ═══════ METRICS CARD ═══════
  metricsCard: {
    marginHorizontal: Spacing.lg, backgroundColor: Colors.white,
    borderRadius: 18, padding: 16, marginBottom: 16, ...Shadows.sm, borderWidth: 1, borderColor: Colors.neutral[100],
  },
  metricsHeader: { marginBottom: 12 },
  metricsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricsTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700], letterSpacing: 0.3 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  metricCell: {
    width: '33.33%', alignItems: 'center', paddingVertical: 8, gap: 5,
  },
  metricCellBorder: { borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  metricCellRightBorder: { borderRightWidth: 1, borderRightColor: Colors.neutral[100] },
  metricIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.neutral[900] },
  metricLabel: { fontSize: 9, color: Colors.neutral[500], fontWeight: '600', textAlign: 'center' },

  // ═══════ SHORTCUTS ═══════
  shortcutsRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: 10, marginBottom: 8 },
  shortcutBtn: { flex: 1, alignItems: 'center', gap: 7, backgroundColor: Colors.white, borderRadius: 16, paddingVertical: 14, ...Shadows.xs, borderWidth: 1, borderColor: Colors.neutral[100] },
  shortcutIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { fontSize: 10, fontWeight: '700', color: Colors.neutral[700], textAlign: 'center' },

  // ═══════ SECTION HEADER ═══════
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: 10 },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.neutral[900], letterSpacing: -0.3 },
  sectionLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionLinkText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.primary[600] },

  // ═══════ ATTENTION ═══════
  attentionCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    ...Shadows.xs, borderLeftWidth: 3,
  },
  attentionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  attentionLabel: { flex: 1, fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[800] },
  attentionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  attentionBadgeText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.white },

  // ═══════ LEADS ═══════
  listPad: { paddingHorizontal: Spacing.lg, gap: 10, marginBottom: 4 },
  leadCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...Shadows.sm, borderWidth: 1, borderColor: Colors.neutral[100],
  },
  leadAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  leadAvatarText: { fontSize: FontSizes.lg, fontWeight: '800' },
  leadInfo: { flex: 1, gap: 2 },
  leadName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  leadGoal: { fontSize: FontSizes.sm, color: Colors.neutral[500] },
  leadMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  leadDate: { fontSize: FontSizes.xs, color: Colors.neutral[400] },
  leadRight: { alignItems: 'flex-end', gap: 6 },
  whatsappBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#16A34A', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  whatsappText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.white },
  leadStatusChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  leadStatusText: { fontSize: FontSizes.xs, fontWeight: '700' },

  // ═══════ APPOINTMENTS — TIMELINE ═══════
  aptCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...Shadows.sm, borderWidth: 1, borderColor: Colors.neutral[100],
  },
  aptDateBlock: { width: 52, alignItems: 'center', backgroundColor: Colors.primary[50], borderRadius: 12, paddingVertical: 10 },
  aptDateDay: { fontSize: 22, fontWeight: '800', color: Colors.primary[700], lineHeight: 24 },
  aptDateMonth: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary[600], textTransform: 'uppercase' },
  aptDateWeekday: { fontSize: 9, color: Colors.primary[400], fontWeight: '600', marginTop: 2 },
  aptDivider: { width: 1, height: 36, backgroundColor: Colors.neutral[100] },
  aptInfo: { flex: 1 },
  aptName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  aptMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  aptTime: { fontSize: FontSizes.sm, color: Colors.neutral[600], fontWeight: '600' },
  aptModality: { fontSize: FontSizes.xs, color: Colors.neutral[400], fontWeight: '500' },
  aptActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aptAcceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary[600], borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  aptAcceptText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.white },
  aptRejectBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.error[50], alignItems: 'center', justifyContent: 'center' },
  aptConfirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  aptConfirmedText: { fontSize: FontSizes.xs, fontWeight: '700', color: '#16A34A' },

  // ═══════ REVIEWS ═══════
  reviewCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    ...Shadows.sm, borderWidth: 1, borderColor: Colors.neutral[100],
    position: 'relative', overflow: 'hidden',
  },
  reviewQuoteIcon: { position: 'absolute', top: 10, right: 12 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.secondary[100], alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.secondary[700] },
  reviewInfo: { flex: 1 },
  reviewName: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[900] },
  reviewStars: { flexDirection: 'row', gap: 2, marginTop: 3 },
  reviewComment: { fontSize: FontSizes.sm, color: Colors.neutral[600], lineHeight: 20, marginTop: 10, fontStyle: 'italic' },

  // ═══════ EMPTY STATES ═══════
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: 12, padding: 14, ...Shadows.xs, borderWidth: 1, borderColor: Colors.neutral[100] },
  emptyRowText: { fontSize: FontSizes.sm, color: Colors.neutral[400] },
  emptyBox: { padding: Spacing.xl, backgroundColor: Colors.white, borderRadius: 20, alignItems: 'center', gap: 8, ...Shadows.sm, borderWidth: 1, borderColor: Colors.neutral[100] },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[700], textAlign: 'center' },
  emptyDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary[600], borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18, marginTop: 6 },
  emptyBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
});
