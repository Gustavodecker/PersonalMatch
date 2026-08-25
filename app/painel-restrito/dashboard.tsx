import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/admin/AdminShell';
import { Colors, FontSizes, Spacing, Shadows } from '@/constants/theme';
import {
  Users, Dumbbell, Clock, TrendingUp, Star, Tag,
  ChevronRight, AlertCircle, Eye, Smartphone, X, Save,
} from 'lucide-react-native';

type Stats = {
  totalUsers: number;
  totalStudents: number;
  totalTrainers: number;
  pendingTrainers: number;
  totalLeads: number;
  pendingReviews: number;
  activeVouchers: number;
  siteVisits: number;
  iosDownloads: number;
  androidDownloads: number;
};

export default function AdminDashboard() {
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editIos, setEditIos]   = useState('');
  const [editAndroid, setEditAndroid] = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    const [profilesRes, trainersRes, leadsRes, reviewsRes, vouchersRes, viewsRes, metricsRes] = await Promise.all([
      supabase.from('profiles').select('id, role', { count: 'exact' }),
      supabase.from('trainers').select('id, status', { count: 'exact' }),
      supabase.from('leads').select('id', { count: 'exact' }),
      supabase.from('reviews').select('id, status', { count: 'exact' }),
      supabase.from('vouchers').select('id, is_active', { count: 'exact' }),
      supabase.from('profile_views').select('id', { count: 'exact', head: true }),
      supabase.from('platform_metrics').select('id, value'),
    ]);
    const profiles  = profilesRes.data ?? [];
    const trainers  = trainersRes.data ?? [];
    const reviews   = reviewsRes.data ?? [];
    const vouchers  = vouchersRes.data ?? [];
    const metrics   = metricsRes.data ?? [];

    const getMetric = (key: string) => Number(metrics.find((m: any) => m.id === key)?.value ?? 0);

    setStats({
      totalUsers:      profilesRes.count ?? 0,
      totalStudents:   profiles.filter((p: any) => p.role === 'student').length,
      totalTrainers:   trainers.length,
      pendingTrainers: trainers.filter((t: any) => t.status === 'pending').length,
      totalLeads:      leadsRes.count ?? 0,
      pendingReviews:  reviews.filter((r: any) => r.status === 'pending').length,
      activeVouchers:  vouchers.filter((v: any) => v.is_active).length,
      siteVisits:      viewsRes.count ?? 0,
      iosDownloads:    getMetric('ios_downloads'),
      androidDownloads: getMetric('android_downloads'),
    });
    setLoading(false);
    setRefreshing(false);
  };

  const openEdit = () => {
    setEditIos(String(stats?.iosDownloads ?? 0));
    setEditAndroid(String(stats?.androidDownloads ?? 0));
    setEditModal(true);
  };

  const saveDownloads = async () => {
    setSaving(true);
    await Promise.all([
      supabase.from('platform_metrics').upsert({ id: 'ios_downloads', value: parseInt(editIos) || 0, updated_at: new Date().toISOString() }),
      supabase.from('platform_metrics').upsert({ id: 'android_downloads', value: parseInt(editAndroid) || 0, updated_at: new Date().toISOString() }),
    ]);
    setSaving(false);
    setEditModal(false);
    loadStats();
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return String(n);
  };

  const STAT_CARDS = [
    { label: 'Total de usuários',    value: stats?.totalUsers,      icon: Users,    color: Colors.primary[500],   bg: Colors.primary[50],   href: '/painel-restrito/users' },
    { label: 'Alunos cadastrados',   value: stats?.totalStudents,   icon: Users,    color: Colors.secondary[600], bg: Colors.secondary[50], href: '/painel-restrito/users' },
    { label: 'Personais ativos',     value: stats?.totalTrainers,   icon: Dumbbell, color: Colors.accent[600],    bg: Colors.accent[50],    href: '/painel-restrito/trainers' },
    { label: 'Personais pendentes',  value: stats?.pendingTrainers, icon: Clock,    color: Colors.warning[600],   bg: Colors.warning[100],  href: '/painel-restrito/trainers' },
    { label: 'Leads gerados',        value: stats?.totalLeads,      icon: TrendingUp, color: Colors.primary[500], bg: Colors.primary[50],   href: '/painel-restrito/leads' },
    { label: 'Avaliações pendentes', value: stats?.pendingReviews,  icon: Star,     color: Colors.warning[600],   bg: Colors.warning[100],  href: '/painel-restrito/reviews' },
    { label: 'Vouchers ativos',      value: stats?.activeVouchers,  icon: Tag,      color: Colors.secondary[600], bg: Colors.secondary[50], href: '/painel-restrito/vouchers' },
  ];

  const QUICK_LINKS = [
    { label: 'Aprovar treinadores pendentes', href: '/painel-restrito/trainers', badge: stats?.pendingTrainers, warn: true },
    { label: 'Moderar avaliações',            href: '/painel-restrito/reviews',  badge: stats?.pendingReviews,  warn: true },
    { label: 'Gerenciar usuários',            href: '/painel-restrito/users',    badge: null,                  warn: false },
    { label: 'Criar voucher',                 href: '/painel-restrito/vouchers', badge: null,                  warn: false },
    { label: 'Configurações do marketplace',  href: '/painel-restrito/settings', badge: null,                  warn: false },
  ];

  return (
    <AdminShell title="Dashboard">
      <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStats(); }} style={{ flex: 0 }} />

      {/* Platform metrics section */}
      <View style={s.platformSection}>
        <View style={s.platformHeader}>
          <Text style={s.sectionTitle}>Plataforma</Text>
          <TouchableOpacity style={s.editBtn} onPress={openEdit} activeOpacity={0.8}>
            <Text style={s.editBtnText}>Editar downloads</Text>
          </TouchableOpacity>
        </View>
        <View style={s.platformGrid}>
          <View style={s.platformCard}>
            <View style={[s.platformIconWrap, { backgroundColor: Colors.primary[50] }]}>
              <Eye size={20} color={Colors.primary[500]} />
            </View>
            <Text style={s.platformValue}>{loading ? '—' : formatNumber(stats?.siteVisits ?? 0)}</Text>
            <Text style={s.platformLabel}>Visitas no site</Text>
            <Text style={s.platformSub}>visualizações de perfil</Text>
          </View>
          <View style={s.platformCard}>
            <View style={[s.platformIconWrap, { backgroundColor: '#EEF2FF' }]}>
              <Smartphone size={20} color="#4F46E5" />
            </View>
            <Text style={s.platformValue}>{loading ? '—' : formatNumber(stats?.iosDownloads ?? 0)}</Text>
            <Text style={s.platformLabel}>Downloads iOS</Text>
            <Text style={s.platformSub}>App Store</Text>
          </View>
          <View style={s.platformCard}>
            <View style={[s.platformIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Smartphone size={20} color="#059669" />
            </View>
            <Text style={s.platformValue}>{loading ? '—' : formatNumber(stats?.androidDownloads ?? 0)}</Text>
            <Text style={s.platformLabel}>Downloads Android</Text>
            <Text style={s.platformSub}>Google Play</Text>
          </View>
        </View>
      </View>

      {/* Stats grid */}
      <View style={s.statsGrid}>
        {STAT_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <TouchableOpacity key={c.label} style={s.statCard} onPress={() => router.push(c.href as any)} activeOpacity={0.85}>
              <View style={[s.statIconWrap, { backgroundColor: c.bg }]}>
                <Icon size={20} color={c.color} />
              </View>
              <Text style={s.statValue}>{loading ? '—' : (c.value ?? 0)}</Text>
              <Text style={s.statLabel}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Alerts */}
      {!loading && (stats?.pendingTrainers ?? 0) + (stats?.pendingReviews ?? 0) > 0 && (
        <View style={s.alertBox}>
          <AlertCircle size={16} color={Colors.warning[600]} />
          <Text style={s.alertText}>
            {[
              stats?.pendingTrainers ? `${stats.pendingTrainers} treinador${stats.pendingTrainers > 1 ? 'es' : ''} aguardando aprovação` : null,
              stats?.pendingReviews  ? `${stats.pendingReviews} avaliação${stats.pendingReviews > 1 ? 'ões' : ''} pendente${stats.pendingReviews > 1 ? 's' : ''}` : null,
            ].filter(Boolean).join(' · ')}
          </Text>
        </View>
      )}

      {/* Quick links */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Ações rápidas</Text>
        <View style={s.quickLinks}>
          {QUICK_LINKS.map((ql) => (
            <TouchableOpacity
              key={ql.label}
              style={s.quickLink}
              onPress={() => router.push(ql.href as any)}
              activeOpacity={0.85}
            >
              <Text style={s.quickLinkLabel}>{ql.label}</Text>
              <View style={s.quickLinkRight}>
                {ql.badge ? (
                  <View style={[s.badgePill, ql.warn && s.badgePillWarn]}>
                    <Text style={[s.badgeText, ql.warn && s.badgeTextWarn]}>{ql.badge}</Text>
                  </View>
                ) : null}
                <ChevronRight size={16} color={Colors.neutral[400]} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Edit downloads modal */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={s.modalBg}>
          <View style={s.modalPanel}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Atualizar Downloads</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <X size={20} color={Colors.neutral[500]} />
              </TouchableOpacity>
            </View>
            <Text style={s.modalDesc}>
              Insira o número total de downloads de cada loja. Esses dados vêm do App Store Connect e Google Play Console.
            </Text>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Downloads iOS (App Store)</Text>
              <TextInput
                style={s.input}
                value={editIos}
                onChangeText={setEditIos}
                keyboardType="number-pad"
                placeholder="0"
              />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Downloads Android (Google Play)</Text>
              <TextInput
                style={s.input}
                value={editAndroid}
                onChangeText={setEditAndroid}
                keyboardType="number-pad"
                placeholder="0"
              />
            </View>
            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={saveDownloads}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Save size={16} color={Colors.white} />
              <Text style={s.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AdminShell>
  );
}

const s = StyleSheet.create({
  platformSection: { gap: 12 },
  platformHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  platformGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  platformCard: {
    flex: 1, minWidth: 140, backgroundColor: Colors.white, borderRadius: 16,
    padding: Spacing.lg, gap: 6, borderWidth: 1, borderColor: Colors.neutral[200], ...Shadows.sm,
  },
  platformIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  platformValue: { fontSize: 28, fontWeight: '800', color: Colors.neutral[900] },
  platformLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700] },
  platformSub: { fontSize: FontSizes.xs, color: Colors.neutral[400], fontWeight: '500' },
  editBtn: { backgroundColor: Colors.neutral[100], paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[600] },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
  },
  statCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    padding: Spacing.lg, gap: 8, minWidth: 140, flex: 1,
    borderWidth: 1, borderColor: Colors.neutral[200],
    ...Shadows.sm,
  },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: Colors.neutral[900] },
  statLabel: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.neutral[500] },

  alertBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.warning[50], borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.warning[300],
  },
  alertText: { flex: 1, fontSize: FontSizes.sm, color: Colors.warning[700], fontWeight: '600' },

  section: { gap: 12 },
  sectionTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.7 },
  quickLinks: {
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.neutral[200],
    overflow: 'hidden', ...Shadows.sm,
  },
  quickLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
  },
  quickLinkLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[800] },
  quickLinkRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgePill: { backgroundColor: Colors.neutral[200], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgePillWarn: { backgroundColor: Colors.warning[100] },
  badgeText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[600] },
  badgeTextWarn: { color: Colors.warning[700] },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalPanel: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, gap: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.neutral[900] },
  modalDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], lineHeight: 20 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[700] },
  input: {
    borderWidth: 1, borderColor: Colors.neutral[300], borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSizes.md,
    color: Colors.neutral[900], backgroundColor: Colors.neutral[50],
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary[600], borderRadius: 12, paddingVertical: 14, marginTop: 4,
  },
  saveBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
});
