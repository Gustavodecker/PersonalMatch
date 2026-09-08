import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/admin/AdminShell';
import { Colors, FontSizes, Spacing, Shadows } from '@/constants/theme';
import {
  Search, X, Globe, MapPin, Monitor, Smartphone, Tablet,
  Clock, ArrowUpDown, ChevronLeft, ChevronRight, Eye,
  RefreshCw,
} from 'lucide-react-native';

type SiteVisit = {
  id: string;
  visitor_id: string | null;
  ip_address: string;
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  isp: string | null;
  page_path: string;
  referrer: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  session_id: string | null;
  visited_at: string;
  visitor?: { full_name: string; email: string } | null;
};

type DateFilter = '24h' | '7d' | '30d' | '90d' | 'all';
type DeviceFilter = 'all' | 'desktop' | 'mobile' | 'tablet';

const DATE_OPTIONS: { key: DateFilter; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
  { key: 'all', label: 'Todos' },
];

const DEVICE_OPTIONS: { key: DeviceFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'desktop', label: 'Desktop' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'tablet', label: 'Tablet' },
];

const PAGE_SIZE = 50;

export default function AdminVisits() {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('7d');
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<SiteVisit | null>(null);
  const [sortBy, setSortBy] = useState<'visited_at' | 'country'>('visited_at');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchVisits = useCallback(async () => {
    setLoading(true);

    let q = supabase
      .from('site_visits')
      .select('*, visitor:profiles!site_visits_visitor_id_fkey(full_name, email)', { count: 'exact' });

    if (dateFilter !== 'all') {
      const hours = dateFilter === '24h' ? 24 : dateFilter === '7d' ? 168 : dateFilter === '30d' ? 720 : 2160;
      const since = new Date(Date.now() - hours * 3600000).toISOString();
      q = q.gte('visited_at', since);
    }

    if (deviceFilter !== 'all') {
      q = q.eq('device_type', deviceFilter);
    }

    q = q.order(sortBy, { ascending: sortAsc })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count } = await q;
    if (data) setVisits(data as SiteVisit[]);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [dateFilter, deviceFilter, page, sortBy, sortAsc]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  useEffect(() => { setPage(0); }, [dateFilter, deviceFilter]);

  const filtered = useMemo(() => {
    if (!query.trim()) return visits;
    const q = query.toLowerCase();
    return visits.filter(
      (v) =>
        v.ip_address?.toLowerCase().includes(q) ||
        v.country?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q) ||
        v.region?.toLowerCase().includes(q) ||
        v.page_path?.toLowerCase().includes(q) ||
        v.browser?.toLowerCase().includes(q) ||
        v.os?.toLowerCase().includes(q) ||
        v.isp?.toLowerCase().includes(q) ||
        v.referrer?.toLowerCase().includes(q)
    );
  }, [visits, query]);

  const stats = useMemo(() => {
    const uniqueIps = new Set(visits.map((v) => v.ip_address)).size;
    const countries = new Set(visits.filter((v) => v.country).map((v) => v.country)).size;
    const cities = new Set(visits.filter((v) => v.city).map((v) => v.city)).size;
    const deviceCounts: Record<string, number> = {};
    visits.forEach((v) => {
      const d = v.device_type || 'unknown';
      deviceCounts[d] = (deviceCounts[d] || 0) + 1;
    });

    const countryCounts: Record<string, number> = {};
    visits.forEach((v) => {
      const c = v.country || 'Desconhecido';
      countryCounts[c] = (countryCounts[c] || 0) + 1;
    });
    const topCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const cityCounts: Record<string, number> = {};
    visits.forEach((v) => {
      const c = v.city || 'Desconhecida';
      cityCounts[c] = (cityCounts[c] || 0) + 1;
    });
    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const pageCounts: Record<string, number> = {};
    visits.forEach((v) => {
      pageCounts[v.page_path] = (pageCounts[v.page_path] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const browserCounts: Record<string, number> = {};
    visits.forEach((v) => {
      const b = v.browser || 'unknown';
      browserCounts[b] = (browserCounts[b] || 0) + 1;
    });

    return { uniqueIps, countries, cities, deviceCounts, topCountries, topCities, topPages, browserCounts };
  }, [visits]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const toggleSort = (col: 'visited_at' | 'country') => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(false); }
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
      ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const DeviceIcon = ({ type }: { type: string | null }) => {
    if (type === 'mobile') return <Smartphone size={14} color={Colors.primary[500]} />;
    if (type === 'tablet') return <Tablet size={14} color={Colors.accent[500]} />;
    return <Monitor size={14} color={Colors.neutral[500]} />;
  };

  return (
    <AdminShell
      title="Visitas do Site"
      actions={
        <TouchableOpacity style={s.refreshBtn} onPress={fetchVisits}>
          <RefreshCw size={16} color={Colors.primary[600]} />
        </TouchableOpacity>
      }
    >
      {/* Summary cards */}
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Eye size={18} color={Colors.primary[500]} />
          <Text style={s.summaryValue}>{totalCount}</Text>
          <Text style={s.summaryLabel}>Total de visitas</Text>
        </View>
        <View style={s.summaryCard}>
          <Globe size={18} color={Colors.secondary[600]} />
          <Text style={s.summaryValue}>{stats.uniqueIps}</Text>
          <Text style={s.summaryLabel}>IPs unicos</Text>
        </View>
        <View style={s.summaryCard}>
          <MapPin size={18} color={Colors.accent[600]} />
          <Text style={s.summaryValue}>{stats.countries}</Text>
          <Text style={s.summaryLabel}>Paises</Text>
        </View>
        <View style={s.summaryCard}>
          <MapPin size={18} color={Colors.warning[600]} />
          <Text style={s.summaryValue}>{stats.cities}</Text>
          <Text style={s.summaryLabel}>Cidades</Text>
        </View>
      </View>

      {/* Top locations & pages */}
      <View style={s.insightsRow}>
        <View style={s.insightCard}>
          <Text style={s.insightTitle}>Top paises</Text>
          {stats.topCountries.length === 0 && <Text style={s.insightEmpty}>Sem dados</Text>}
          {stats.topCountries.map(([name, count]) => (
            <View key={name} style={s.insightRow}>
              <Text style={s.insightName} numberOfLines={1}>{name}</Text>
              <Text style={s.insightCount}>{count}</Text>
            </View>
          ))}
        </View>
        <View style={s.insightCard}>
          <Text style={s.insightTitle}>Top cidades</Text>
          {stats.topCities.length === 0 && <Text style={s.insightEmpty}>Sem dados</Text>}
          {stats.topCities.map(([name, count]) => (
            <View key={name} style={s.insightRow}>
              <Text style={s.insightName} numberOfLines={1}>{name}</Text>
              <Text style={s.insightCount}>{count}</Text>
            </View>
          ))}
        </View>
        <View style={s.insightCard}>
          <Text style={s.insightTitle}>Paginas mais visitadas</Text>
          {stats.topPages.length === 0 && <Text style={s.insightEmpty}>Sem dados</Text>}
          {stats.topPages.map(([path, count]) => (
            <View key={path} style={s.insightRow}>
              <Text style={s.insightName} numberOfLines={1}>{path}</Text>
              <Text style={s.insightCount}>{count}</Text>
            </View>
          ))}
        </View>
        <View style={s.insightCard}>
          <Text style={s.insightTitle}>Navegadores</Text>
          {Object.entries(stats.browserCounts).length === 0 && <Text style={s.insightEmpty}>Sem dados</Text>}
          {Object.entries(stats.browserCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => (
              <View key={name} style={s.insightRow}>
                <Text style={s.insightName} numberOfLines={1}>{name}</Text>
                <Text style={s.insightCount}>{count}</Text>
              </View>
            ))}
        </View>
      </View>

      {/* Filters */}
      <View style={s.filterSection}>
        <View style={s.searchWrap}>
          <Search size={16} color={Colors.neutral[400]} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar IP, pais, cidade, pagina..."
            placeholderTextColor={Colors.neutral[400]}
            value={query}
            onChangeText={setQuery}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={16} color={Colors.neutral[400]} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={s.pillRow}>
          <Text style={s.pillLabel}>Periodo:</Text>
          {DATE_OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.key}
              style={[s.pill, dateFilter === o.key && s.pillActive]}
              onPress={() => setDateFilter(o.key)}
            >
              <Text style={[s.pillText, dateFilter === o.key && s.pillTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.pillRow}>
          <Text style={s.pillLabel}>Dispositivo:</Text>
          {DEVICE_OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.key}
              style={[s.pill, deviceFilter === o.key && s.pillActive]}
              onPress={() => setDeviceFilter(o.key)}
            >
              <Text style={[s.pillText, deviceFilter === o.key && s.pillTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Table header */}
      <View style={s.tableHeader}>
        <TouchableOpacity style={[s.thCell, { flex: 1.5 }]} onPress={() => toggleSort('visited_at')}>
          <Clock size={12} color={Colors.neutral[500]} />
          <Text style={s.thText}>Data</Text>
          {sortBy === 'visited_at' && <ArrowUpDown size={10} color={Colors.primary[500]} />}
        </TouchableOpacity>
        <Text style={[s.thText, { flex: 1.2 }]}>IP</Text>
        <TouchableOpacity style={[s.thCell, { flex: 1.2 }]} onPress={() => toggleSort('country')}>
          <Text style={s.thText}>Pais</Text>
          {sortBy === 'country' && <ArrowUpDown size={10} color={Colors.primary[500]} />}
        </TouchableOpacity>
        <Text style={[s.thText, { flex: 1 }]}>Cidade</Text>
        <Text style={[s.thText, { flex: 1 }]}>Pagina</Text>
        <Text style={[s.thText, { flex: 0.7 }]}>Disp.</Text>
        <Text style={[s.thText, { flex: 0.8 }]}>Nav.</Text>
      </View>

      {/* Table body */}
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary[500]} /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyText}>Nenhuma visita encontrada</Text>
        </View>
      ) : (
        filtered.map((v) => (
          <TouchableOpacity
            key={v.id}
            style={s.tableRow}
            onPress={() => setSelected(v)}
            activeOpacity={0.7}
          >
            <Text style={[s.cellText, { flex: 1.5 }]}>{formatDate(v.visited_at)}</Text>
            <Text style={[s.cellTextMono, { flex: 1.2 }]} numberOfLines={1}>{v.ip_address}</Text>
            <Text style={[s.cellText, { flex: 1.2 }]} numberOfLines={1}>{v.country || '—'}</Text>
            <Text style={[s.cellText, { flex: 1 }]} numberOfLines={1}>{v.city || '—'}</Text>
            <Text style={[s.cellText, { flex: 1 }]} numberOfLines={1}>{v.page_path}</Text>
            <View style={{ flex: 0.7, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <DeviceIcon type={v.device_type} />
              <Text style={s.cellTextSmall}>{v.device_type || '—'}</Text>
            </View>
            <Text style={[s.cellTextSmall, { flex: 0.8 }]} numberOfLines={1}>{v.browser || '—'}</Text>
          </TouchableOpacity>
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={s.pagination}>
          <TouchableOpacity style={s.pageBtn} onPress={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
            <ChevronLeft size={16} color={page === 0 ? Colors.neutral[300] : Colors.primary[600]} />
          </TouchableOpacity>
          <Text style={s.pageInfo}>{page + 1} / {totalPages}</Text>
          <TouchableOpacity style={s.pageBtn} onPress={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>
            <ChevronRight size={16} color={page >= totalPages - 1 ? Colors.neutral[300] : Colors.primary[600]} />
          </TouchableOpacity>
        </View>
      )}

      {/* Detail modal */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <TouchableOpacity style={s.modalCard} activeOpacity={1} onPress={() => {}}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Detalhes da visita</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <X size={20} color={Colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            {selected && (
              <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
                <DetailRow label="Data/Hora" value={formatDate(selected.visited_at)} />
                <DetailRow label="IP" value={selected.ip_address} mono />
                <DetailRow label="Pais" value={`${selected.country ?? '—'} ${selected.country_code ? `(${selected.country_code})` : ''}`} />
                <DetailRow label="Regiao/Estado" value={selected.region || '—'} />
                <DetailRow label="Cidade" value={selected.city || '—'} />
                <DetailRow label="Fuso horario" value={selected.timezone || '—'} />
                {selected.latitude && selected.longitude && (
                  <DetailRow label="Coordenadas" value={`${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`} mono />
                )}
                <DetailRow label="ISP / Provedor" value={selected.isp || '—'} />
                <View style={s.divider} />
                <DetailRow label="Pagina" value={selected.page_path} />
                <DetailRow label="Referrer" value={selected.referrer || 'Direto'} />
                <DetailRow label="Dispositivo" value={selected.device_type || '—'} />
                <DetailRow label="Navegador" value={selected.browser || '—'} />
                <DetailRow label="Sistema operacional" value={selected.os || '—'} />
                <DetailRow label="User Agent" value={selected.user_agent || '—'} small />
                {selected.visitor && (
                  <>
                    <View style={s.divider} />
                    <DetailRow label="Usuario" value={selected.visitor.full_name || '—'} />
                    <DetailRow label="E-mail" value={selected.visitor.email || '—'} />
                  </>
                )}
                {selected.session_id && <DetailRow label="Sessao" value={selected.session_id} mono />}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </AdminShell>
  );
}

function DetailRow({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text
        style={[
          s.detailValue,
          mono && s.detailMono,
          small && { fontSize: 11 },
        ]}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  refreshBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: Colors.primary[50], alignItems: 'center', justifyContent: 'center',
  },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryCard: {
    flex: 1, minWidth: 130, backgroundColor: Colors.white, borderRadius: 14,
    padding: Spacing.md, gap: 6, borderWidth: 1, borderColor: Colors.neutral[200], ...Shadows.sm,
    alignItems: 'flex-start',
  },
  summaryValue: { fontSize: 24, fontWeight: '800', color: Colors.neutral[900] },
  summaryLabel: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.neutral[500] },

  insightsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  insightCard: {
    flex: 1, minWidth: 180, backgroundColor: Colors.white, borderRadius: 14,
    padding: Spacing.md, gap: 8, borderWidth: 1, borderColor: Colors.neutral[200], ...Shadows.sm,
  },
  insightTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700] },
  insightEmpty: { fontSize: FontSizes.xs, color: Colors.neutral[400], fontStyle: 'italic' },
  insightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  insightName: { flex: 1, fontSize: FontSizes.sm, color: Colors.neutral[600] },
  insightCount: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[800] },

  filterSection: { gap: 10 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.neutral[200], paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, fontSize: FontSizes.sm, color: Colors.neutral[800] },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pillLabel: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.neutral[500], marginRight: 2 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.neutral[200],
  },
  pillActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  pillText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.neutral[600] },
  pillTextActive: { color: Colors.white },

  tableHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.neutral[100], borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  thCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  thText: { fontSize: 11, fontWeight: '700', color: Colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.5 },

  tableRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.neutral[100],
  },
  cellText: { fontSize: FontSizes.xs, color: Colors.neutral[700] },
  cellTextMono: { fontSize: 11, color: Colors.neutral[600], fontFamily: 'monospace' },
  cellTextSmall: { fontSize: 10, color: Colors.neutral[500] },

  center: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: FontSizes.sm, color: Colors.neutral[400] },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 },
  pageBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.neutral[200],
  },
  pageInfo: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[600] },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    width: '100%', maxWidth: 500, maxHeight: '85%',
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
  },
  modalTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },
  modalBody: { paddingHorizontal: 20, paddingVertical: 16 },

  detailRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.neutral[50] },
  detailLabel: { fontSize: 11, fontWeight: '600', color: Colors.neutral[400], textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  detailValue: { fontSize: FontSizes.sm, color: Colors.neutral[800] },
  detailMono: { fontFamily: 'monospace', fontSize: 12 },
  divider: { height: 1, backgroundColor: Colors.neutral[200], marginVertical: 8 },
});
