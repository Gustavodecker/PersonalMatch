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
  ChevronLeft, TrendingUp, Eye, Users, BarChart3, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react-native';

type Period = '7d' | '30d' | '90d';

export default function ConversaoScreen() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState<Period>('30d');
  const [views, setViews] = useState<{ viewed_at: string }[]>([]);
  const [leads, setLeads] = useState<{ created_at: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [platformAvg, setPlatformAvg] = useState<number>(0);

  const periodDays: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };

  const load = useCallback(async () => {
    if (!profile) return;
    const days = periodDays[period];
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString();

    const [viewsRes, leadsRes, avgRes] = await Promise.all([
      supabase.from('profile_views').select('viewed_at')
        .eq('trainer_id', profile.id).gte('viewed_at', sinceStr),
      supabase.from('leads').select('created_at, status')
        .eq('trainer_id', profile.id).gte('created_at', sinceStr),
      supabase.from('profile_views').select('trainer_id', { count: 'exact', head: true })
        .gte('viewed_at', sinceStr),
    ]);

    setViews((viewsRes.data ?? []) as { viewed_at: string }[]);
    setLeads((leadsRes.data ?? []) as { created_at: string; status: string }[]);

    // Estimate platform average
    const totalPlatformViews = avgRes.count ?? 0;
    const { count: trainerCount } = await supabase
      .from('trainers').select('id', { count: 'exact', head: true })
      .eq('status', 'approved');
    const avgViews = (trainerCount && trainerCount > 0) ? totalPlatformViews / trainerCount : 0;
    setPlatformAvg(Math.round(avgViews));

    setLoading(false);
    setRefreshing(false);
  }, [profile, period]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const totalViews = views.length;
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l) => l.status === 'converted').length;
  const conversionRate = totalViews > 0 ? ((totalLeads / totalViews) * 100) : 0;
  const closeRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100) : 0;

  // Group views by day for chart
  const viewsByDay: Record<string, number> = {};
  const leadsByDay: Record<string, number> = {};
  views.forEach((v) => {
    const day = v.viewed_at.slice(0, 10);
    viewsByDay[day] = (viewsByDay[day] ?? 0) + 1;
  });
  leads.forEach((l) => {
    const day = l.created_at.slice(0, 10);
    leadsByDay[day] = (leadsByDay[day] ?? 0) + 1;
  });

  // Build day labels for chart (last N days)
  const days = periodDays[period];
  const chartDays: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    chartDays.push(d.toISOString().slice(0, 10));
  }
  const maxViews = Math.max(1, ...chartDays.map((d) => viewsByDay[d] ?? 0));

  // Peak days
  const peakDay = chartDays.reduce((best, d) => (viewsByDay[d] ?? 0) > (viewsByDay[best] ?? 0) ? d : best, chartDays[0]);
  const peakDayLabel = peakDay
    ? new Date(peakDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })
    : '-';

  // Comparison with platform
  const vsAvg = platformAvg > 0 ? Math.round(((totalViews - platformAvg) / platformAvg) * 100) : 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Painel de Conversão</Text>
          <Text style={s.headerSub}>Análise avançada do seu perfil</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Period picker */}
      <View style={s.periodRow}>
        {(['7d', '30d', '90d'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.periodChip, period === p && s.periodChipActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[s.periodText, period === p && s.periodTextActive]}>
              {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={s.scroll}
      >
        {loading ? (
          <View style={s.emptyBox}><Text style={s.emptyNote}>Carregando...</Text></View>
        ) : (
          <>
            {/* KPI Cards */}
            <View style={s.kpiGrid}>
              <View style={s.kpiCard}>
                <View style={[s.kpiIconWrap, { backgroundColor: Colors.primary[50] }]}>
                  <Eye size={18} color={Colors.primary[600]} />
                </View>
                <Text style={s.kpiValue}>{totalViews}</Text>
                <Text style={s.kpiLabel}>Visualizações</Text>
              </View>
              <View style={s.kpiCard}>
                <View style={[s.kpiIconWrap, { backgroundColor: Colors.secondary[50] }]}>
                  <Users size={18} color={Colors.secondary[600]} />
                </View>
                <Text style={s.kpiValue}>{totalLeads}</Text>
                <Text style={s.kpiLabel}>Contatos recebidos</Text>
              </View>
              <View style={s.kpiCard}>
                <View style={[s.kpiIconWrap, { backgroundColor: Colors.accent[50] }]}>
                  <TrendingUp size={18} color={Colors.accent[600]} />
                </View>
                <Text style={s.kpiValue}>{conversionRate.toFixed(1)}%</Text>
                <Text style={s.kpiLabel}>Taxa de conversão</Text>
              </View>
              <View style={s.kpiCard}>
                <View style={[s.kpiIconWrap, { backgroundColor: '#F0FDF4' }]}>
                  <BarChart3 size={18} color="#16A34A" />
                </View>
                <Text style={s.kpiValue}>{closeRate.toFixed(1)}%</Text>
                <Text style={s.kpiLabel}>Taxa de fechamento</Text>
              </View>
            </View>

            {/* Comparison card */}
            <View style={s.compareCard}>
              <Text style={s.compareTitle}>Comparativo com a plataforma</Text>
              <View style={s.compareRow}>
                <View style={s.compareItem}>
                  <Text style={s.compareLabel}>Suas visualizações</Text>
                  <Text style={s.compareValue}>{totalViews}</Text>
                </View>
                <View style={s.compareDivider} />
                <View style={s.compareItem}>
                  <Text style={s.compareLabel}>Média da plataforma</Text>
                  <Text style={s.compareValue}>{platformAvg}</Text>
                </View>
                <View style={s.compareDivider} />
                <View style={s.compareItem}>
                  <Text style={s.compareLabel}>Diferença</Text>
                  <View style={s.compareDiffRow}>
                    {vsAvg > 0 ? <ArrowUpRight size={14} color="#16A34A" /> :
                     vsAvg < 0 ? <ArrowDownRight size={14} color={Colors.error[500]} /> :
                     <Minus size={14} color={Colors.neutral[400]} />}
                    <Text style={[s.compareDiffText, {
                      color: vsAvg > 0 ? '#16A34A' : vsAvg < 0 ? Colors.error[500] : Colors.neutral[500],
                    }]}>
                      {vsAvg > 0 ? '+' : ''}{vsAvg}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Mini bar chart */}
            <View style={s.chartCard}>
              <Text style={s.chartTitle}>Visualizações por dia</Text>
              <View style={s.chartBars}>
                {chartDays.slice(-14).map((day) => {
                  const count = viewsByDay[day] ?? 0;
                  const height = Math.max(4, (count / maxViews) * 80);
                  const hasLead = (leadsByDay[day] ?? 0) > 0;
                  return (
                    <View key={day} style={s.barCol}>
                      <View style={[s.bar, { height, backgroundColor: hasLead ? Colors.secondary[400] : Colors.primary[300] }]} />
                      {count > 0 && <Text style={s.barCount}>{count}</Text>}
                    </View>
                  );
                })}
              </View>
              <View style={s.chartLegend}>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: Colors.primary[300] }]} />
                  <Text style={s.legendText}>Visualizações</Text>
                </View>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: Colors.secondary[400] }]} />
                  <Text style={s.legendText}>Dia com lead</Text>
                </View>
              </View>
            </View>

            {/* Insights */}
            <View style={s.insightsCard}>
              <Text style={s.insightsTitle}>Insights</Text>
              <View style={s.insightRow}>
                <Text style={s.insightLabel}>Dia de pico</Text>
                <Text style={s.insightValue}>{peakDayLabel}</Text>
              </View>
              <View style={s.insightRow}>
                <Text style={s.insightLabel}>Leads convertidos</Text>
                <Text style={s.insightValue}>{convertedLeads} de {totalLeads}</Text>
              </View>
              <View style={s.insightRow}>
                <Text style={s.insightLabel}>Média diária de visualizações</Text>
                <Text style={s.insightValue}>{(totalViews / days).toFixed(1)}</Text>
              </View>
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },
  headerSub: { fontSize: FontSizes.xs, color: Colors.neutral[500], marginTop: 1 },

  periodRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
  },
  periodChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1.5, borderColor: Colors.neutral[200], backgroundColor: Colors.white,
  },
  periodChipActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  periodText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[600] },
  periodTextActive: { color: Colors.white },

  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },

  emptyBox: { marginTop: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  emptyNote: { fontSize: FontSizes.md, color: Colors.neutral[400] },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    width: '48%', backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    padding: Spacing.md, ...Shadows.sm, borderWidth: 1, borderColor: Colors.neutral[100],
    gap: 6,
  },
  kpiIconWrap: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  kpiValue: { fontSize: 22, fontWeight: '800', color: Colors.neutral[900] },
  kpiLabel: { fontSize: FontSizes.xs, color: Colors.neutral[500], fontWeight: '500' },

  compareCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    padding: Spacing.md, marginTop: 14, ...Shadows.sm,
    borderWidth: 1, borderColor: Colors.neutral[100],
  },
  compareTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700], marginBottom: 12 },
  compareRow: { flexDirection: 'row', alignItems: 'center' },
  compareItem: { flex: 1, alignItems: 'center', gap: 4 },
  compareLabel: { fontSize: 10, color: Colors.neutral[500], textAlign: 'center' },
  compareValue: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.neutral[900] },
  compareDivider: { width: 1, height: 36, backgroundColor: Colors.neutral[100] },
  compareDiffRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  compareDiffText: { fontSize: FontSizes.md, fontWeight: '800' },

  chartCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    padding: Spacing.md, marginTop: 14, ...Shadows.sm,
    borderWidth: 1, borderColor: Colors.neutral[100],
  },
  chartTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700], marginBottom: 12 },
  chartBars: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 3,
    height: 100, paddingTop: 16,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '80%', borderRadius: 3, minHeight: 4 },
  barCount: { fontSize: 8, color: Colors.neutral[400], marginTop: 2 },
  chartLegend: { flexDirection: 'row', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSizes.xs, color: Colors.neutral[500] },

  insightsCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    padding: Spacing.md, marginTop: 14, ...Shadows.sm,
    borderWidth: 1, borderColor: Colors.neutral[100],
  },
  insightsTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700], marginBottom: 8 },
  insightRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.neutral[50],
  },
  insightLabel: { fontSize: FontSizes.sm, color: Colors.neutral[500] },
  insightValue: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[900] },
});
