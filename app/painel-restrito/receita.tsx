import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/admin/AdminShell';
import { Colors, FontSizes, Spacing, Shadows, BorderRadii } from '@/constants/theme';
import { DollarSign, Users, TrendingUp, CalendarDays, Smartphone, Globe, Apple, CircleHelp } from 'lucide-react-native';

type Provider = 'stripe' | 'apple' | 'google' | 'manual';
type Payment = {
  id: string;
  trainer_id: string | null;
  provider: Provider;
  plan: string;
  amount_cents: number;
  currency: string;
  kind: 'new' | 'renewal';
  paid_at: string;
};
type ActiveSub = {
  trainer_id: string;
  plan: string;
  provider: Provider;
  status: string;
  since: string | null;
};

const PLAN_PRICES: Record<string, number> = { pro: 29.9, premium: 59.9 };
const PLAN_LABELS: Record<string, string> = { pro: 'Pro', premium: 'Premium' };
const PLAN_COLORS: Record<string, string> = { pro: Colors.primary[500], premium: Colors.accent[500] };

const SOURCES: Record<Provider, { label: string; icon: any; color: string }> = {
  stripe: { label: 'Site', icon: Globe, color: Colors.primary[600] },
  google: { label: 'Android', icon: Smartphone, color: Colors.secondary[600] },
  apple: { label: 'iOS', icon: Apple, color: Colors.neutral[800] },
  manual: { label: 'Sem pagamento', icon: CircleHelp, color: Colors.neutral[400] },
};
const SOURCE_ORDER: Provider[] = ['stripe', 'google', 'apple'];

type Filter = 'all' | Provider;

function money(cents: number, currency = 'BRL') {
  const v = (cents / 100).toFixed(2).replace('.', ',');
  return currency === 'BRL' ? `R$ ${v}` : `${currency} ${v}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ReceitaScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeSubs, setActiveSubs] = useState<ActiveSub[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>('all');

  const loadData = useCallback(async () => {
    setError(null);
    const [payRes, subRes, trRes] = await Promise.all([
      supabase.from('payments')
        .select('id, trainer_id, provider, plan, amount_cents, currency, kind, paid_at')
        .order('paid_at', { ascending: false })
        .limit(500),
      supabase.from('subscriptions')
        .select('trainer_id, plan, provider, status, current_period_start')
        .in('status', ['active', 'trialing'])
        .in('plan', ['pro', 'premium']),
      supabase.from('trainers')
        .select('id, subscription_plan, subscription_status')
        .in('subscription_plan', ['pro', 'premium']),
    ]);

    if (payRes.error || subRes.error || trRes.error) {
      console.error('receita load failed', payRes.error ?? subRes.error ?? trRes.error);
      setError('Não foi possível carregar os dados de receita. Tente novamente.');
      setLoading(false);
      return;
    }

    const pays = (payRes.data ?? []) as Payment[];
    const subsByTrainer = new Map<string, ActiveSub>();
    for (const s of subRes.data ?? []) {
      const prev = subsByTrainer.get(s.trainer_id);
      if (!prev || (s.plan === 'premium' && prev.plan !== 'premium')) {
        subsByTrainer.set(s.trainer_id, {
          trainer_id: s.trainer_id,
          plan: s.plan,
          provider: s.provider as Provider,
          status: s.status,
          since: s.current_period_start,
        });
      }
    }
    for (const t of trRes.data ?? []) {
      if (!subsByTrainer.has(t.id)) {
        subsByTrainer.set(t.id, {
          trainer_id: t.id,
          plan: t.subscription_plan,
          provider: 'manual',
          status: t.subscription_status ?? 'active',
          since: null,
        });
      }
    }
    const subs = [...subsByTrainer.values()];

    const ids = [...new Set([...pays.map((p) => p.trainer_id), ...subs.map((s) => s.trainer_id)].filter(Boolean))] as string[];
    if (ids.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
      const map: Record<string, string> = {};
      for (const p of profs ?? []) map[p.id] = p.full_name || p.email || 'Sem nome';
      setNames(map);
    }

    setPayments(pays);
    setActiveSubs(subs);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => {
    const brl = payments.filter((p) => p.currency === 'BRL');
    const total = brl.reduce((s, p) => s + p.amount_cents, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const thisMonth = brl.filter((p) => new Date(p.paid_at) >= monthStart).reduce((s, p) => s + p.amount_cents, 0);
    const paying = activeSubs.filter((s) => s.provider !== 'manual');
    const mrr = paying.reduce((s, a) => s + Math.round((PLAN_PRICES[a.plan] ?? 0) * 100), 0);

    const bySource = SOURCE_ORDER.map((prov) => ({
      provider: prov,
      received: brl.filter((p) => p.provider === prov).reduce((s, p) => s + p.amount_cents, 0),
      payments: payments.filter((p) => p.provider === prov).length,
      active: activeSubs.filter((a) => a.provider === prov).length,
    }));
    return { total, thisMonth, mrr, payingCount: paying.length, bySource };
  }, [payments, activeSubs]);

  const visiblePayments = filter === 'all' ? payments : payments.filter((p) => p.provider === filter);
  const visibleSubs = filter === 'all' ? activeSubs : activeSubs.filter((a) => a.provider === filter);

  return (
    <AdminShell title="Receita">
      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <View style={[s.kpiRow, isWide && s.kpiRowWide]}>
        <KPICard icon={DollarSign} label="Total recebido" value={money(stats.total)} sub={`${payments.length} pagamento${payments.length !== 1 ? 's' : ''}`} color={Colors.secondary[600]} bg={Colors.secondary[50]} />
        <KPICard icon={CalendarDays} label="Recebido este mês" value={money(stats.thisMonth)} sub="desde o dia 1" color={Colors.primary[600]} bg={Colors.primary[50]} />
        <KPICard icon={Users} label="Assinantes pagantes" value={String(stats.payingCount)} sub="com assinatura ativa" color={Colors.accent[600]} bg={Colors.accent[50]} />
        <KPICard icon={TrendingUp} label="Receita mensal prevista" value={money(stats.mrr)} sub="pelos planos ativos" color={Colors.warning[600]} bg={Colors.warning[50]} />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Por origem</Text>
        <View style={[s.sourceGrid, isWide && s.sourceGridWide]}>
          {stats.bySource.map((src) => {
            const meta = SOURCES[src.provider];
            const Icon = meta.icon;
            return (
              <View key={src.provider} style={s.sourceTile}>
                <View style={s.sourceHead}>
                  <View style={[s.sourceIcon, { backgroundColor: meta.color + '15' }]}>
                    <Icon size={18} color={meta.color} />
                  </View>
                  <Text style={s.sourceLabel}>{meta.label}</Text>
                </View>
                <Text style={s.sourceValue}>{money(src.received)}</Text>
                <Text style={s.sourceSub}>
                  {src.payments} pagamento{src.payments !== 1 ? 's' : ''} · {src.active} ativo{src.active !== 1 ? 's' : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={s.filterRow}>
        {(['all', ...SOURCE_ORDER] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <Pressable key={f} onPress={() => setFilter(f)} style={[s.chip, active && s.chipActive]}>
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {f === 'all' ? 'Todas as origens' : SOURCES[f].label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Pagamentos recebidos</Text>
        {!loading && visiblePayments.length === 0 && (
          <Text style={s.emptyText}>
            Nenhum pagamento registrado ainda. A partir de agora, cada compra ou renovação pelo site, Android ou iOS aparece aqui.
          </Text>
        )}
        {visiblePayments.map((p) => (
          <Row
            key={p.id}
            name={p.trainer_id ? names[p.trainer_id] ?? 'Usuário removido' : 'Usuário removido'}
            plan={p.plan}
            provider={p.provider}
            detail={`${p.kind === 'renewal' ? 'Renovação' : 'Nova assinatura'} · ${fmtDate(p.paid_at)}`}
            value={money(p.amount_cents, p.currency)}
          />
        ))}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Assinaturas ativas agora</Text>
        {!loading && visibleSubs.length === 0 && (
          <Text style={s.emptyText}>Nenhuma assinatura ativa nesta origem.</Text>
        )}
        {visibleSubs.map((a) => (
          <Row
            key={a.trainer_id}
            name={names[a.trainer_id] ?? 'Sem nome'}
            plan={a.plan}
            provider={a.provider}
            detail={a.provider === 'manual'
              ? 'Plano liberado sem compra registrada'
              : `${a.status === 'trialing' ? 'Em teste' : 'Ativa'} desde ${fmtDate(a.since)}`}
            value={a.provider === 'manual' ? '-' : `${money(Math.round((PLAN_PRICES[a.plan] ?? 0) * 100))}/mês`}
          />
        ))}
      </View>
    </AdminShell>
  );
}

function Row({ name, plan, provider, detail, value }: {
  name: string; plan: string; provider: Provider; detail: string; value: string;
}) {
  const src = SOURCES[provider];
  const Icon = src.icon;
  const planColor = PLAN_COLORS[plan] ?? Colors.neutral[500];
  return (
    <View style={s.row}>
      <View style={[s.rowIcon, { backgroundColor: src.color + '15' }]}>
        <Icon size={16} color={src.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowName} numberOfLines={1}>{name}</Text>
        <View style={s.rowMeta}>
          <View style={[s.badge, { backgroundColor: planColor + '18' }]}>
            <Text style={[s.badgeText, { color: planColor }]}>{PLAN_LABELS[plan] ?? plan}</Text>
          </View>
          <Text style={s.rowSource}>via {src.label}</Text>
        </View>
        <Text style={s.rowDetail}>{detail}</Text>
      </View>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

function KPICard({ icon: Icon, label, value, sub, color, bg }: {
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

const s = StyleSheet.create({
  errorBox: {
    backgroundColor: Colors.error[50], borderRadius: BorderRadii.md, padding: Spacing.md,
  },
  errorText: { color: Colors.error[700], fontSize: FontSizes.sm, fontWeight: '600' },

  kpiRow: { gap: 12 },
  kpiRowWide: { flexDirection: 'row', flexWrap: 'wrap' },
  kpi: {
    flex: 1, minWidth: 200, backgroundColor: Colors.white,
    borderRadius: BorderRadii.md, padding: Spacing.lg, ...Shadows.sm,
  },
  kpiIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  kpiLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[500], marginBottom: 4 },
  kpiValue: { fontSize: FontSizes.xxl, fontWeight: '800', marginBottom: 4 },
  kpiSub: { fontSize: FontSizes.xs, color: Colors.neutral[400], fontWeight: '500' },

  card: { backgroundColor: Colors.white, borderRadius: BorderRadii.md, padding: Spacing.lg, ...Shadows.sm },
  cardTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[800], marginBottom: 16 },

  sourceGrid: { gap: 12 },
  sourceGridWide: { flexDirection: 'row' },
  sourceTile: {
    flex: 1, borderWidth: 1, borderColor: Colors.neutral[100],
    borderRadius: BorderRadii.md, padding: Spacing.md, gap: 4,
  },
  sourceHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sourceIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sourceLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[800] },
  sourceValue: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.neutral[800] },
  sourceSub: { fontSize: FontSizes.xs, color: Colors.neutral[500] },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.neutral[200],
  },
  chipActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  chipText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[600] },
  chipTextActive: { color: Colors.white },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[800] },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: FontSizes.xs, fontWeight: '700' },
  rowSource: { fontSize: FontSizes.xs, color: Colors.neutral[600], fontWeight: '600' },
  rowDetail: { fontSize: FontSizes.xs, color: Colors.neutral[500], marginTop: 2 },
  rowValue: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[800] },

  emptyText: { fontSize: FontSizes.sm, color: Colors.neutral[400], textAlign: 'center', paddingVertical: 20, lineHeight: 20 },
});
