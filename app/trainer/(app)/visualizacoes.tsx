import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import {
  ChevronLeft, Eye, TrendingUp, Calendar,
} from 'lucide-react-native';

type Period = '7d' | '30d' | '90d' | 'all';

type ViewRow = { viewed_at: string };

export default function ProfileStatsScreen() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState<Period>('30d');
  const [views, setViews] = useState<ViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const periodDays: Record<Period, number | null> = { '7d': 7, '30d': 30, '90d': 90, 'all': null };

  const load = useCallback(async () => {
    if (!profile) return;
    let query = supabase.from('profile_views').select('viewed_at').eq('trainer_id', profile.id);
    const days = periodDays[period];
    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      query = query.gte('viewed_at', since.toISOString());
    }
    const { data } = await query.order('viewed_at', { ascending: false });
    setViews((data ?? []) as ViewRow[]);
    setLoading(false);
    setRefreshing(false);
  }, [profile, period]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const total = views.length;
  const todayStr = new Date().toDateString();
  const todayCount = views.filter((v) => new Date(v.viewed_at).toDateString() === todayStr).length;

  const last7 = views.filter((v) => {
    const d = new Date(v.viewed_at);
    const since = new Date(); since.setDate(since.getDate() - 7);
    return d >= since;
  }).length;

  const avgPerDay = (() => {
    const days = periodDays[period];
    if (!days) {
      const earliest = views.length > 0 ? new Date(views[views.length - 1].viewed_at) : new Date();
      const span = Math.max(1, Math.ceil((Date.now() - earliest.getTime()) / 86400000));
      return total / span;
    }
    return total / days;
  })();

  // Build last-7-days bar chart data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const count = views.filter((v) => new Date(v.viewed_at).toDateString() === d.toDateString()).length;
    return { label, count };
  });
  const maxBar = Math.max(...chartData.map((d) => d.count), 1);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const PERIODS: { key: Period; label: string }[] = [
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: '90d', label: '90 dias' },
    { key: 'all', label: 'Tudo' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <View style={s.headerTitleWrap}>
          <Text style={s.headerTitle}>Visualizações</Text>
          <Text style={s.headerSub}>Estatísticas do perfil</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Period selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[s.periodChip, period === p.key && s.periodChipActive]}
            onPress={() => { setLoading(true); setPeriod(p.key); }}
          >
            <Text style={[s.periodChipText, period === p.key && s.periodChipTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={s.scroll}
      >
        {/* KPI row */}
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <View style={[s.kpiIcon, { backgroundColor: '#FFF7ED' }]}>
              <Eye size={16} color="#EA580C" />
            </View>
            <Text style={s.kpiValue}>{loading ? '—' : total}</Text>
            <Text style={s.kpiLabel}>Total no período</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={[s.kpiIcon, { backgroundColor: Colors.primary[50] }]}>
              <Calendar size={16} color={Colors.primary[600]} />
            </View>
            <Text style={s.kpiValue}>{loading ? '—' : todayCount}</Text>
            <Text style={s.kpiLabel}>Hoje</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={[s.kpiIcon, { backgroundColor: '#F0FDF4' }]}>
              <TrendingUp size={16} color="#16A34A" />
            </View>
            <Text style={s.kpiValue}>{loading ? '—' : avgPerDay.toFixed(1)}</Text>
            <Text style={s.kpiLabel}>Média/dia</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>Últimos 7 dias</Text>
          <View style={s.chartBody}>
            {chartData.map((d, i) => (
              <View key={i} style={s.chartCol}>
                <View style={s.chartBarWrap}>
                  <View style={[s.chartBar, { height: `${(d.count / maxBar) * 100}%` }]} />
                </View>
                <Text style={s.chartLabel}>{d.label}</Text>
                <Text style={s.chartCount}>{d.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent views */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Visualizações recentes</Text>
        </View>
        {loading ? (
          <View style={s.emptyBox}><Text style={s.emptyNote}>Carregando…</Text></View>
        ) : views.length === 0 ? (
          <View style={s.emptyBox}>
            <View style={s.emptyIconWrap}>
              <Eye size={28} color={Colors.neutral[300]} />
            </View>
            <Text style={s.emptyTitle}>Nenhuma visualização</Text>
            <Text style={s.emptyDesc}>
              Complete seu perfil para aparecer nas buscas e receber visualizações.
            </Text>
          </View>
        ) : (
          <View style={s.list}>
            {views.slice(0, 30).map((v, i) => (
              <View key={i} style={s.viewRow}>
                <View style={s.viewDot} />
                <Text style={s.viewDate}>{fmtDate(v.viewed_at)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', ...Shadows.xs,
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },
  headerSub: { fontSize: FontSizes.xs, color: Colors.neutral[500], marginTop: 1 },

  periodRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: 8, flexDirection: 'row' },
  periodChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadii.full,
    borderWidth: 1.5, borderColor: Colors.neutral[200], backgroundColor: Colors.white,
  },
  periodChipActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  periodChipText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[600] },
  periodChipTextActive: { color: Colors.white },

  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs },

  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  kpiCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    padding: 14, alignItems: 'center', gap: 6, ...Shadows.sm,
  },
  kpiIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.neutral[900] },
  kpiLabel: { fontSize: FontSizes.xs, color: Colors.neutral[500], fontWeight: '600', textAlign: 'center' },

  chartCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.sm,
  },
  chartTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900], marginBottom: 14 },
  chartBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 130 },
  chartCol: { flex: 1, alignItems: 'center', gap: 4 },
  chartBarWrap: { flex: 1, width: 18, justifyContent: 'flex-end', borderRadius: 6, backgroundColor: Colors.neutral[50], overflow: 'hidden' },
  chartBar: { width: '100%', borderRadius: 6, backgroundColor: Colors.primary[500] },
  chartLabel: { fontSize: 9, color: Colors.neutral[400], fontWeight: '600' },
  chartCount: { fontSize: 9, color: Colors.neutral[600], fontWeight: '700' },

  sectionHeader: { marginBottom: 10, marginTop: Spacing.sm },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },

  list: { gap: 6, marginBottom: Spacing.sm },
  viewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, ...Shadows.xs },
  viewDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primary[400] },
  viewDate: { fontSize: FontSizes.sm, color: Colors.neutral[700] },

  emptyBox: {
    alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.white,
    borderRadius: BorderRadii.xl, padding: Spacing.xl, ...Shadows.xs,
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyNote: { fontSize: FontSizes.md, color: Colors.neutral[400] },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[700], textAlign: 'center' },
  emptyDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20 },
});
