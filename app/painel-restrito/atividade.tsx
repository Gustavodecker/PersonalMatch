import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/admin/AdminShell';
import { Colors, FontSizes, Spacing, Shadows, BorderRadii } from '@/constants/theme';
import {
  Activity, Eye, MessageCircle, UserX, ChevronDown, ChevronUp,
  CheckCircle2, Circle, MailWarning,
} from 'lucide-react-native';

type TrainerActivity = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  email_confirmed: boolean;
  is_blocked: boolean;
  last_seen_at: string | null;
  status: string;
  subscription_plan: string | null;
  has_avatar: boolean;
  has_bio: boolean;
  has_cref: boolean;
  has_whatsapp: boolean;
  has_price: boolean;
  has_availability: boolean;
  views_7d: number;
  views_30d: number;
  views_total: number;
  leads_30d: number;
  leads_total: number;
  appointments_30d: number;
  appointments_total: number;
  profile_updated_at: string | null;
};

type Level = 'active' | 'low' | 'inactive' | 'never';
type Filter = 'all' | Level | 'incomplete';

const LEVELS: Record<Level, { label: string; color: string; bg: string }> = {
  active:   { label: 'Ativo',         color: Colors.secondary[700], bg: Colors.secondary[50] },
  low:      { label: 'Pouco ativo',   color: Colors.warning[700],   bg: Colors.warning[50] },
  inactive: { label: 'Inativo',       color: Colors.error[700],     bg: Colors.error[50] },
  never:    { label: 'Nunca acessou', color: Colors.neutral[600],   bg: Colors.neutral[100] },
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Ativos' },
  { key: 'low', label: 'Pouco ativos' },
  { key: 'inactive', label: 'Inativos' },
  { key: 'incomplete', label: 'Perfil incompleto' },
];

const PLAN_LABELS: Record<string, string> = { free_trial: 'Teste grátis', free: 'Grátis', pro: 'Pro', premium: 'Premium' };

const DAY = 86400000;

function levelOf(t: TrainerActivity): Level {
  if (!t.last_seen_at) return 'never';
  const days = (Date.now() - new Date(t.last_seen_at).getTime()) / DAY;
  if (days <= 7) return 'active';
  if (days <= 30) return 'low';
  return 'inactive';
}

function checklist(t: TrainerActivity) {
  return [
    { label: 'Foto de perfil', ok: t.has_avatar },
    { label: 'Descrição (bio)', ok: t.has_bio },
    { label: 'CREF', ok: t.has_cref },
    { label: 'WhatsApp', ok: t.has_whatsapp },
    { label: 'Preço da aula', ok: t.has_price },
    { label: 'Horários disponíveis', ok: t.has_availability },
  ];
}

function relative(iso: string | null) {
  if (!iso) return 'nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'agora há pouco' : `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'há 1 mês' : `há ${months} meses`;
}

function fmtDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AtividadeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<TrainerActivity[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase.rpc('admin_trainer_activity');
    if (err || !Array.isArray(data)) {
      console.error('trainer activity load failed', err);
      setError('Não foi possível carregar a atividade dos personais. Tente novamente.');
      setLoading(false);
      return;
    }
    setRows(data as TrainerActivity[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => {
    const levels = rows.map(levelOf);
    return {
      active: levels.filter((l) => l === 'active').length,
      idle: levels.filter((l) => l === 'inactive' || l === 'never').length,
      views30: rows.reduce((s, r) => s + r.views_30d, 0),
      leads30: rows.reduce((s, r) => s + r.leads_30d + r.appointments_30d, 0),
    };
  }, [rows]);

  const visible = rows.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'incomplete') return checklist(r).some((c) => !c.ok);
    const lvl = levelOf(r);
    return filter === 'inactive' ? lvl === 'inactive' || lvl === 'never' : lvl === filter;
  });

  return (
    <AdminShell title="Atividade dos personais">
      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <View style={[s.kpiRow, isWide && s.kpiRowWide]}>
        <KPICard icon={Activity} label="Ativos na semana" value={String(stats.active)} sub={`de ${rows.length} personais`} color={Colors.secondary[600]} bg={Colors.secondary[50]} />
        <KPICard icon={UserX} label="Sem acessar há 30+ dias" value={String(stats.idle)} sub="ou que nunca voltaram" color={Colors.error[600]} bg={Colors.error[50]} />
        <KPICard icon={Eye} label="Visitas aos perfis" value={String(stats.views30)} sub="últimos 30 dias" color={Colors.primary[600]} bg={Colors.primary[50]} />
        <KPICard icon={MessageCircle} label="Contatos e agendamentos" value={String(stats.leads30)} sub="últimos 30 dias" color={Colors.accent[600]} bg={Colors.accent[50]} />
      </View>

      <View style={s.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[s.chip, active && s.chipActive]}>
              <Text style={[s.chipText, active && s.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Personais</Text>
        <Text style={s.cardHint}>Ordenados pelo último acesso. Toque em um personal para ver os detalhes.</Text>
        {!loading && visible.length === 0 && (
          <Text style={s.emptyText}>Nenhum personal neste filtro.</Text>
        )}
        {visible.map((t) => (
          <TrainerRow
            key={t.id}
            t={t}
            open={openId === t.id}
            onToggle={() => setOpenId(openId === t.id ? null : t.id)}
          />
        ))}
      </View>
    </AdminShell>
  );
}

function TrainerRow({ t, open, onToggle }: { t: TrainerActivity; open: boolean; onToggle: () => void }) {
  const lvl = LEVELS[levelOf(t)];
  const items = checklist(t);
  const done = items.filter((i) => i.ok).length;
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <View style={s.rowWrap}>
      <Pressable onPress={onToggle} style={({ pressed }) => [s.row, pressed && s.rowPressed]}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(t.full_name || t.email || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={s.rowMain}>
          <View style={s.nameLine}>
            <Text style={s.rowName} numberOfLines={1}>{t.full_name || 'Sem nome'}</Text>
            <View style={[s.badge, { backgroundColor: lvl.bg }]}>
              <Text style={[s.badgeText, { color: lvl.color }]}>{lvl.label}</Text>
            </View>
            {t.is_blocked && (
              <View style={[s.badge, { backgroundColor: Colors.error[50] }]}>
                <Text style={[s.badgeText, { color: Colors.error[700] }]}>Bloqueado</Text>
              </View>
            )}
          </View>
          <Text style={s.rowDetail} numberOfLines={1}>
            Último acesso {relative(t.last_seen_at)} · Perfil {done}/{items.length}
          </Text>
          <View style={s.metrics}>
            <Metric icon={Eye} value={t.views_7d} label="visitas 7d" />
            <Metric icon={Eye} value={t.views_30d} label="visitas 30d" />
            <Metric icon={MessageCircle} value={t.leads_30d + t.appointments_30d} label="contatos 30d" />
          </View>
        </View>
        <Chevron size={18} color={Colors.neutral[400]} />
      </Pressable>

      {open && (
        <View style={s.detail}>
          <View style={s.detailGrid}>
            <Info label="E-mail" value={t.email || '-'} />
            <Info label="Cadastro" value={fmtDate(t.created_at)} />
            <Info label="Plano" value={PLAN_LABELS[t.subscription_plan ?? ''] ?? (t.subscription_plan || '-')} />
            <Info label="Perfil editado" value={relative(t.profile_updated_at)} />
            <Info label="Visitas no total" value={String(t.views_total)} />
            <Info label="Contatos no total" value={String(t.leads_total)} />
            <Info label="Agendamentos no total" value={String(t.appointments_total)} />
          </View>

          {!t.email_confirmed && (
            <View style={s.warnBox}>
              <MailWarning size={16} color={Colors.warning[700]} />
              <Text style={s.warnText}>E-mail ainda não confirmado.</Text>
            </View>
          )}

          <Text style={s.detailTitle}>Perfil</Text>
          <View style={s.checkGrid}>
            {items.map((i) => (
              <View key={i.label} style={s.checkItem}>
                {i.ok
                  ? <CheckCircle2 size={16} color={Colors.secondary[600]} />
                  : <Circle size={16} color={Colors.neutral[300]} />}
                <Text style={[s.checkText, !i.ok && s.checkTextMissing]}>{i.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function Metric({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <View style={s.metric}>
      <Icon size={12} color={Colors.neutral[400]} />
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.info}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
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
  errorBox: { backgroundColor: Colors.error[50], borderRadius: BorderRadii.md, padding: Spacing.md },
  errorText: { color: Colors.error[700], fontSize: FontSizes.sm, fontWeight: '600' },

  kpiRow: { gap: 12 },
  kpiRowWide: { flexDirection: 'row', flexWrap: 'wrap' },
  kpi: { flex: 1, minWidth: 200, backgroundColor: Colors.white, borderRadius: BorderRadii.md, padding: Spacing.lg, ...Shadows.sm },
  kpiIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  kpiLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[500], marginBottom: 4 },
  kpiValue: { fontSize: FontSizes.xxl, fontWeight: '800', marginBottom: 4 },
  kpiSub: { fontSize: FontSizes.xs, color: Colors.neutral[400], fontWeight: '500' },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.neutral[200] },
  chipActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  chipText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[600] },
  chipTextActive: { color: Colors.white },

  card: { backgroundColor: Colors.white, borderRadius: BorderRadii.md, padding: Spacing.lg, ...Shadows.sm },
  cardTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[800], marginBottom: 4 },
  cardHint: { fontSize: FontSizes.xs, color: Colors.neutral[500], marginBottom: 8 },
  emptyText: { fontSize: FontSizes.sm, color: Colors.neutral[400], textAlign: 'center', paddingVertical: 20 },

  rowWrap: { borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderRadius: 8 },
  rowPressed: { backgroundColor: Colors.neutral[50] },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.primary[700] },
  rowMain: { flex: 1, gap: 4 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[800], flexShrink: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: FontSizes.xs, fontWeight: '700' },
  rowDetail: { fontSize: FontSizes.xs, color: Colors.neutral[500] },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricValue: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[700] },
  metricLabel: { fontSize: FontSizes.xs, color: Colors.neutral[500] },

  detail: { paddingBottom: 16, paddingLeft: 52, gap: 12 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  info: { minWidth: 140, flexGrow: 1, flexBasis: 140, gap: 2 },
  infoLabel: { fontSize: FontSizes.xs, color: Colors.neutral[500], fontWeight: '600' },
  infoValue: { fontSize: FontSizes.sm, color: Colors.neutral[800], fontWeight: '600' },
  warnBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.warning[50], borderRadius: 8, padding: 8 },
  warnText: { fontSize: FontSizes.sm, color: Colors.warning[700], fontWeight: '600' },
  detailTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700] },
  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 160 },
  checkText: { fontSize: FontSizes.sm, color: Colors.neutral[700] },
  checkTextMissing: { color: Colors.neutral[400] },
});
