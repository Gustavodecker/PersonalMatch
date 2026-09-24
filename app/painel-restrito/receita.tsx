import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/admin/AdminShell';
import { Colors, FontSizes, Spacing, Shadows, BorderRadii } from '@/constants/theme';
import {
  DollarSign, Users, CreditCard, TrendingUp,
  Smartphone, Globe, Apple,
} from 'lucide-react-native';

type PlanBreakdown = { plan: string; count: number };
type ProviderBreakdown = { provider: string; count: number; revenue: number };
type RecentOrder = {
  id: number;
  amount_total: number;
  currency: string;
  payment_status: string;
  created_at: string;
  customer_id: string | null;
};
type TrainerSub = {
  id: string;
  full_name: string;
  subscription_plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
};

const PLAN_LABELS: Record<string, string> = {
  premium: 'Premium',
  pro: 'Pro',
  free_trial: 'Teste Gratis',
  free: 'Gratis',
};

const PLAN_COLORS: Record<string, string> = {
  premium: Colors.accent[500],
  pro: Colors.primary[500],
  free_trial: Colors.warning[500],
  free: Colors.neutral[400],
};

const PLAN_PRICES: Record<string, number> = {
  pro: 29.90,
  premium: 59.90,
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  trialing: 'Trial',
  canceled: 'Cancelado',
  past_due: 'Atrasado',
  expired: 'Expirado',
};

function formatBRL(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function formatBRLFromValue(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export default function ReceitaScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [paidOrders, setPaidOrders] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [planBreakdown, setPlanBreakdown] = useState<PlanBreakdown[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [trainerSubs, setTrainerSubs] = useState<TrainerSub[]>([]);
  const [totalSubscribers, setTotalSubscribers] = useState(0);

  const loadData = useCallback(async () => {
    const [ordersRes, trainersRes] = await Promise.all([
      supabase
        .from('stripe_orders')
        .select('id, amount_total, currency, payment_status, created_at, customer_id')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('trainers')
        .select('id, subscription_plan, subscription_status, trial_ends_at')
        .order('subscription_plan', { ascending: true }),
    ]);

    const orders = (ordersRes.data ?? []) as RecentOrder[];
    const trainers = (trainersRes.data ?? []) as TrainerSub[];

    const paidOrd = orders.filter((o) => o.payment_status === 'paid');
    const revenue = paidOrd.reduce((s, o) => s + (o.amount_total ?? 0), 0);
    setTotalRevenue(revenue);
    setPaidOrders(paidOrd.length);
    setRecentOrders(orders.slice(0, 20));

    const planCounts: Record<string, number> = {};
    let activePaid = 0;
    let monthlyRevenue = 0;

    for (const t of trainers) {
      const p = t.subscription_plan ?? 'free';
      planCounts[p] = (planCounts[p] ?? 0) + 1;
      if (p === 'pro' || p === 'premium') {
        activePaid++;
        monthlyRevenue += PLAN_PRICES[p] ?? 0;
      }
    }

    setTotalSubscribers(activePaid);
    setMrr(monthlyRevenue);
    setPlanBreakdown(
      Object.entries(planCounts)
        .map(([plan, count]) => ({ plan, count }))
        .sort((a, b) => b.count - a.count),
    );

    const subsWithNames: TrainerSub[] = [];
    const trainerIds = trainers
      .filter((t) => t.subscription_plan === 'pro' || t.subscription_plan === 'premium')
      .map((t) => t.id);

    if (trainerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', trainerIds);
      const nameMap: Record<string, string> = {};
      for (const p of profiles ?? []) nameMap[p.id] = p.full_name ?? 'Sem nome';
      for (const t of trainers) {
        if (t.subscription_plan === 'pro' || t.subscription_plan === 'premium') {
          subsWithNames.push({ ...t, full_name: nameMap[t.id] ?? 'Sem nome' });
        }
      }
    }
    setTrainerSubs(subsWithNames);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const totalTrainers = planBreakdown.reduce((s, p) => s + p.count, 0);

  return (
    <AdminShell title="Receita">
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} style={{ flex: 0 }} />
        {/* KPI Cards */}
        <View style={[s.kpiRow, isWide && s.kpiRowWide]}>
          <KPICard
            icon={DollarSign}
            label="Receita Total"
            value={formatBRL(totalRevenue)}
            sub={`${paidOrders} pagamento${paidOrders !== 1 ? 's' : ''} confirmado${paidOrders !== 1 ? 's' : ''}`}
            color={Colors.secondary[500]}
            bg={Colors.secondary[50]}
          />
          <KPICard
            icon={TrendingUp}
            label="MRR Estimado"
            value={formatBRLFromValue(mrr)}
            sub="receita recorrente mensal"
            color={Colors.primary[500]}
            bg={Colors.primary[50]}
          />
          <KPICard
            icon={Users}
            label="Assinantes Pagos"
            value={String(totalSubscribers)}
            sub={`de ${totalTrainers} personais`}
            color={Colors.accent[500]}
            bg={Colors.accent[50]}
          />
          <KPICard
            icon={CreditCard}
            label="Ticket Medio"
            value={totalSubscribers > 0 ? formatBRLFromValue(mrr / totalSubscribers) : 'R$ 0,00'}
            sub="por assinante/mes"
            color={Colors.warning[600]}
            bg={Colors.warning[50]}
          />
        </View>

        <View style={[s.columnsRow, isWide && s.columnsRowWide]}>
          {/* Plan breakdown */}
          <View style={[s.card, isWide && { flex: 1 }]}>
            <Text style={s.cardTitle}>Distribuicao por Plano</Text>
            <View style={s.barChart}>
              {planBreakdown.map((item) => {
                const pct = totalTrainers > 0 ? (item.count / totalTrainers) * 100 : 0;
                return (
                  <View key={item.plan} style={s.barRow}>
                    <View style={s.barLabelRow}>
                      <View style={[s.planDot, { backgroundColor: PLAN_COLORS[item.plan] ?? Colors.neutral[400] }]} />
                      <Text style={s.barLabel}>{PLAN_LABELS[item.plan] ?? item.plan}</Text>
                      <Text style={s.barCount}>{item.count}</Text>
                    </View>
                    <View style={s.barTrack}>
                      <View
                        style={[
                          s.barFill,
                          {
                            width: `${Math.max(pct, 2)}%`,
                            backgroundColor: PLAN_COLORS[item.plan] ?? Colors.neutral[400],
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
            {planBreakdown.length === 0 && !loading && (
              <Text style={s.emptyText}>Nenhum personal cadastrado ainda</Text>
            )}
          </View>

          {/* Paid subscribers list */}
          <View style={[s.card, isWide && { flex: 1 }]}>
            <Text style={s.cardTitle}>Assinantes Pagos</Text>
            {trainerSubs.length === 0 && !loading && (
              <Text style={s.emptyText}>Nenhum assinante pago ainda</Text>
            )}
            {trainerSubs.map((t) => (
              <View key={t.id} style={s.subRow}>
                <View style={[s.subAvatar, { backgroundColor: PLAN_COLORS[t.subscription_plan] + '20' }]}>
                  <Text style={[s.subAvatarText, { color: PLAN_COLORS[t.subscription_plan] }]}>
                    {t.full_name?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.subName} numberOfLines={1}>{t.full_name}</Text>
                  <View style={s.subMeta}>
                    <View style={[s.planBadge, { backgroundColor: PLAN_COLORS[t.subscription_plan] + '18' }]}>
                      <Text style={[s.planBadgeText, { color: PLAN_COLORS[t.subscription_plan] }]}>
                        {PLAN_LABELS[t.subscription_plan] ?? t.subscription_plan}
                      </Text>
                    </View>
                    <Text style={s.subStatus}>
                      {STATUS_LABELS[t.subscription_status] ?? t.subscription_status}
                    </Text>
                  </View>
                </View>
                <Text style={s.subPrice}>
                  {formatBRLFromValue(PLAN_PRICES[t.subscription_plan] ?? 0)}/mes
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent orders */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Ultimos Pagamentos</Text>
          {recentOrders.length === 0 && !loading && (
            <Text style={s.emptyText}>Nenhum pagamento registrado ainda. Os pagamentos via Stripe, Apple e Google aparecerão aqui automaticamente.</Text>
          )}
          {recentOrders.map((o) => (
            <View key={o.id} style={s.orderRow}>
              <View style={[s.orderIcon, { backgroundColor: o.payment_status === 'paid' ? Colors.secondary[50] : Colors.warning[50] }]}>
                <CreditCard size={16} color={o.payment_status === 'paid' ? Colors.secondary[500] : Colors.warning[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.orderAmount}>{formatBRL(o.amount_total)}</Text>
                <Text style={s.orderDate}>
                  {new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {' - '}
                  {o.payment_status === 'paid' ? 'Confirmado' : o.payment_status}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Revenue sources info */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Fontes de Receita</Text>
          <Text style={s.sourceDesc}>
            Todos os pagamentos de todas as plataformas aparecem aqui automaticamente:
          </Text>
          <View style={s.sourceList}>
            <SourceItem icon={Globe} label="Site (Stripe)" desc="Pagamentos via cartao de credito no site" color={Colors.primary[500]} />
            <SourceItem icon={Apple} label="iOS (App Store)" desc="Compras dentro do app via RevenueCat" color={Colors.neutral[800]} />
            <SourceItem icon={Smartphone} label="Android (Google Play)" desc="Compras dentro do app via RevenueCat" color={Colors.secondary[500]} />
          </View>
        </View>
    </AdminShell>
  );
}

function KPICard({
  icon: Icon, label, value, sub, color, bg,
}: {
  icon: any; label: string; value: string; sub: string; color: string; bg: string;
}) {
  return (
    <View style={s.kpi}>
      <View style={[s.kpiIcon, { backgroundColor: bg }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiValue, { color }]}>{value}</Text>
      <Text style={s.kpiSub}>{sub}</Text>
    </View>
  );
}

function SourceItem({
  icon: Icon, label, desc, color,
}: {
  icon: any; label: string; desc: string; color: string;
}) {
  return (
    <View style={s.sourceRow}>
      <View style={[s.sourceIcon, { backgroundColor: color + '15' }]}>
        <Icon size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.sourceLabel}>{label}</Text>
        <Text style={s.sourceSubDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({


  kpiRow: { gap: 12 },
  kpiRowWide: { flexDirection: 'row', flexWrap: 'wrap' },
  kpi: {
    flex: 1,
    minWidth: 200,
    backgroundColor: Colors.white,
    borderRadius: BorderRadii.md,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  kpiIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  kpiLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[500], marginBottom: 4 },
  kpiValue: { fontSize: FontSizes.xxl, fontWeight: '800', marginBottom: 4 },
  kpiSub: { fontSize: FontSizes.xs, color: Colors.neutral[400], fontWeight: '500' },

  columnsRow: { gap: 16 },
  columnsRowWide: { flexDirection: 'row' },

  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadii.md,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  cardTitle: {
    fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[800],
    marginBottom: 16,
  },

  barChart: { gap: 14 },
  barRow: { gap: 6 },
  barLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planDot: { width: 10, height: 10, borderRadius: 5 },
  barLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[700], flex: 1 },
  barCount: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[800] },
  barTrack: {
    height: 8, borderRadius: 4,
    backgroundColor: Colors.neutral[100],
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },

  subRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
  },
  subAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  subAvatarText: { fontSize: FontSizes.md, fontWeight: '700' },
  subName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[800] },
  subMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  planBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  planBadgeText: { fontSize: FontSizes.xs, fontWeight: '700' },
  subStatus: { fontSize: FontSizes.xs, color: Colors.neutral[500], fontWeight: '500' },
  subPrice: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700] },

  orderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
  },
  orderIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  orderAmount: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[800] },
  orderDate: { fontSize: FontSizes.xs, color: Colors.neutral[500], marginTop: 2 },

  sourceDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginBottom: 16, lineHeight: 20 },
  sourceList: { gap: 12 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sourceIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sourceLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[800] },
  sourceSubDesc: { fontSize: FontSizes.xs, color: Colors.neutral[500], marginTop: 2 },

  emptyText: {
    fontSize: FontSizes.sm, color: Colors.neutral[400],
    textAlign: 'center', paddingVertical: 20,
    lineHeight: 20,
  },
});
