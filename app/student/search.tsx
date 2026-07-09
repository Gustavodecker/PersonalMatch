import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Image, Linking, Platform, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, FontSizes, Shadows } from '@/constants/theme';
import { TrainerWithProfile, Specialty, OBJECTIVES_OPTIONS } from '@/types/database';
import { normalizeText, normalizedIncludes } from '@/lib/textUtils';
import {
  Search, X, SlidersHorizontal, MessageCircle, Star, MapPin,
  Monitor, Users, Zap, BadgeCheck, ChevronRight,
  Home, Building2,
} from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';
const SCREEN_W = Dimensions.get('window').width;
const IS_DESKTOP = IS_WEB && SCREEN_W >= 1024;

const COVER_PH = 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=600&h=300&fit=crop';
const AVATAR_PH = 'https://images.pexels.com/photos/6551133/pexels-photo-6551133.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop';

const PRICE_RANGES = [
  { label: 'Até R$ 80',  min: 0,   max: 80  },
  { label: 'R$ 80–150',  min: 80,  max: 150 },
  { label: 'R$ 150+',    min: 150, max: 9999 },
];
const MIN_RATINGS = [
  { label: '3+ ★', val: 3 },
  { label: '4+ ★', val: 4 },
  { label: '4.5+ ★', val: 4.5 },
];
const SORT_OPTIONS = [
  { key: 'relevance', label: 'Mais relevantes' },
  { key: 'rating',    label: 'Melhor avaliação' },
  { key: 'price_asc', label: 'Menor preço' },
  { key: 'price_desc',label: 'Maior preço' },
] as const;
type SortKey = typeof SORT_OPTIONS[number]['key'];

type Filters = {
  minRating: number;
  priceKey: string | null;
  specialties: string[];
  objectives: string[];
  online: boolean;
  inPerson: boolean;
  home: boolean;
  gym: boolean;
  sort: SortKey;
};

const DEFAULT_FILTERS: Filters = {
  minRating: 0, priceKey: null, specialties: [],
  objectives: [], online: false, inPerson: false, home: false, gym: false,
  sort: 'relevance',
};

interface QueryIntent {
  nameQuery: string;
  cityQuery: string;
  neighborhoodQuery: string;
}

function parseLocationQuery(raw: string): QueryIntent {
  const q = raw.trim();
  if (!q) return { nameQuery: '', cityQuery: '', neighborhoodQuery: '' };
  const parts = q.split(/[,\-]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { nameQuery: '', cityQuery: parts[0], neighborhoodQuery: parts.slice(1).join(' ') };
  }
  return { nameQuery: q, cityQuery: q, neighborhoodQuery: q };
}

function applyLocationFilter(
  trainers: TrainerWithProfile[],
  intent: QueryIntent,
  onlineActive: boolean
): { filtered: TrainerWithProfile[]; locationLabel: string } {
  if (!intent.nameQuery && !intent.cityQuery) {
    return { filtered: trainers, locationLabel: '' };
  }

  const normCity         = normalizeText(intent.cityQuery);
  const normNeighborhood = normalizeText(intent.neighborhoodQuery);
  const normName         = normalizeText(intent.nameQuery);

  const isExactCity = (t: TrainerWithProfile) =>
    normalizedIncludes(t.profile.city, normCity) ||
    (t.normalized_city != null && t.normalized_city.includes(normCity));
  const isExactNeighborhood = (t: TrainerWithProfile) =>
    normalizedIncludes(t.neighborhood, normNeighborhood) ||
    (t.normalized_neighborhood != null && t.normalized_neighborhood.includes(normNeighborhood));
  const matchesName = (t: TrainerWithProfile) =>
    normalizedIncludes(t.profile.full_name, normName) ||
    t.specialties?.some((s) => normalizedIncludes(s.name, normName));

  if (intent.cityQuery !== intent.nameQuery) {
    const filtered = trainers.filter((t) => {
      if (onlineActive && t.accepts_online) return true;
      return isExactCity(t) && isExactNeighborhood(t);
    });
    const locationLabel = intent.neighborhoodQuery
      ? `${intent.cityQuery}, ${intent.neighborhoodQuery}`
      : intent.cityQuery;
    return { filtered, locationLabel };
  }

  const cityMatches = trainers.filter((t) =>
    onlineActive && t.accepts_online ? true : isExactCity(t)
  );
  if (cityMatches.length > 0) return { filtered: cityMatches, locationLabel: intent.cityQuery };

  const nbhMatches = trainers.filter((t) =>
    onlineActive && t.accepts_online ? true : isExactNeighborhood(t)
  );
  if (nbhMatches.length > 0) return { filtered: nbhMatches, locationLabel: intent.neighborhoodQuery };

  return { filtered: trainers.filter((t) => matchesName(t)), locationLabel: '' };
}

export default function StudentSearch() {
  const [query, setQuery]             = useState('');
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [all, setAll]                 = useState<TrainerWithProfile[]>([]);
  const [results, setResults]         = useState<TrainerWithProfile[]>([]);
  const [locationLabel, setLocationLabel] = useState('');
  const [filters, setFilters]         = useState<Filters>(DEFAULT_FILTERS);
  const [pending, setPending]         = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [focused, setFocused]         = useState(false);

  useEffect(() => {
    supabase.from('specialties').select('*').order('name').then(({ data }) => {
      if (data) setSpecialties(data);
    });
    fetchTrainers();
  }, []);

  useEffect(() => { compute(all, query, filters); }, [all, query, filters]);

  const fetchTrainers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('trainers')
      .select(`
        *, normalized_city, normalized_neighborhood, service_region, service_radius_km, accepts_gym,
        profile:profiles!trainers_id_fkey(*),
        specialties:trainer_specialties(specialty:specialties(*))
      `)
      .eq('status', 'active')
      .order('rating', { ascending: false });
    if (data) {
      setAll(data.map((t: any) => ({
        ...t,
        profile: t.profile,
        specialties: t.specialties?.map((ts: any) => ts.specialty).filter(Boolean) ?? [],
      })));
    }
    setLoading(false);
  };

  const compute = useCallback((trainers: TrainerWithProfile[], q: string, f: Filters) => {
    let r = [...trainers];

    if (f.online)   r = r.filter((t) => t.accepts_online);
    if (f.inPerson) r = r.filter((t) => t.accepts_in_person);
    if (f.home)     r = r.filter((t) => t.accepts_home);
    if (f.gym)      r = r.filter((t) => (t as any).accepts_gym);

    if (f.minRating > 0) r = r.filter((t) => t.rating >= f.minRating);

    if (f.priceKey) {
      const pr = PRICE_RANGES.find((p) => p.label === f.priceKey);
      if (pr) r = r.filter((t) => t.hourly_rate != null && t.hourly_rate >= pr.min && t.hourly_rate <= pr.max);
    }

    if (f.specialties.length) {
      r = r.filter((t) => f.specialties.every((id) => t.specialties?.some((s) => s.id === id)));
    }

    if (f.objectives.length) {
      r = r.filter((t) => f.objectives.some((o) => (t.objectives ?? []).includes(o)));
    }

    let label = '';
    if (q.trim()) {
      const intent = parseLocationQuery(q);
      const { filtered, locationLabel: ll } = applyLocationFilter(r, intent, f.online);
      r = filtered;
      label = ll;
    }
    setLocationLabel(label);

    if (f.sort === 'rating') {
      r = [...r].sort((a, b) => b.rating - a.rating);
    } else if (f.sort === 'price_asc') {
      r = [...r].sort((a, b) => (a.hourly_rate ?? 9999) - (b.hourly_rate ?? 9999));
    } else if (f.sort === 'price_desc') {
      r = [...r].sort((a, b) => (b.hourly_rate ?? 0) - (a.hourly_rate ?? 0));
    }

    setResults(r);
  }, []);

  const togglePending = <K extends keyof Filters>(field: K, val: string) => {
    setPending((prev) => {
      const arr = prev[field] as string[];
      return { ...prev, [field]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  };

  const applyModal  = () => { setFilters(pending); setShowFilters(false); };
  const clearModal  = () => { setPending(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); setShowFilters(false); };
  const openFilters = () => { setPending(filters); setShowFilters(true); };
  const openWhatsApp = (w: string) => Linking.openURL(`https://wa.me/55${w.replace(/\D/g, '')}`);

  const activeCount = [
    filters.minRating > 0, !!filters.priceKey,
    filters.specialties.length > 0, filters.objectives.length > 0,
    filters.online, filters.inPerson, filters.home, filters.gym,
    filters.sort !== 'relevance',
  ].filter(Boolean).length;

  const featured    = results.filter((t) => t.is_featured);
  const regular     = results.filter((t) => !t.is_featured);
  const isFiltering = query.trim().length > 0 || activeCount > 0;

  const countLabel = loading
    ? 'Buscando...'
    : locationLabel
      ? `${results.length} personal${results.length !== 1 ? 'is' : ''} em ${locationLabel}`
      : `${results.length} personal${results.length !== 1 ? 'is' : ''} encontrado${results.length !== 1 ? 's' : ''}`;

  const MODALITY_PILLS = [
    { key: 'online',   label: 'Online',    active: filters.online,   icon: <Monitor  size={12} color={filters.online   ? Colors.primary[700] : 'rgba(255,255,255,0.9)'} />, onPress: () => setFilters((p) => ({ ...p, online: !p.online })) },
    { key: 'inPerson', label: 'Presencial', active: filters.inPerson, icon: <Users    size={12} color={filters.inPerson ? Colors.primary[700] : 'rgba(255,255,255,0.9)'} />, onPress: () => setFilters((p) => ({ ...p, inPerson: !p.inPerson })) },
    { key: 'home',     label: 'Domicílio',  active: filters.home,     icon: <Home     size={12} color={filters.home     ? Colors.primary[700] : 'rgba(255,255,255,0.9)'} />, onPress: () => setFilters((p) => ({ ...p, home: !p.home })) },
    { key: 'gym',      label: 'Academia',   active: filters.gym,      icon: <Building2 size={12} color={filters.gym    ? Colors.primary[700] : 'rgba(255,255,255,0.9)'} />, onPress: () => setFilters((p) => ({ ...p, gym: !p.gym })) },
  ];

  const FiltersPanel = () => (
    <View style={s.filtersPanel}>
      <View style={s.filtersPanelHeader}>
        <Text style={s.filtersPanelTitle}>Filtros</Text>
        {activeCount > 0 && (
          <TouchableOpacity onPress={clearModal}>
            <Text style={s.filtersClearLink}>Limpar tudo</Text>
          </TouchableOpacity>
        )}
      </View>

      <FilterSection title="Ordenar por">
        {SORT_OPTIONS.map((opt) => (
          <Chip key={opt.key} label={opt.label} active={pending.sort === opt.key}
            onPress={() => setPending((p) => ({ ...p, sort: opt.key }))} />
        ))}
      </FilterSection>

      <FilterSection title="Nota mínima">
        {MIN_RATINGS.map((r) => (
          <Chip key={r.val} label={r.label} active={pending.minRating === r.val}
            onPress={() => setPending((p) => ({ ...p, minRating: p.minRating === r.val ? 0 : r.val }))} />
        ))}
      </FilterSection>

      <FilterSection title="Faixa de preço">
        {PRICE_RANGES.map((pr) => (
          <Chip key={pr.label} label={pr.label} active={pending.priceKey === pr.label}
            onPress={() => setPending((p) => ({ ...p, priceKey: p.priceKey === pr.label ? null : pr.label }))} />
        ))}
      </FilterSection>

      <FilterSection title="Modalidade">
        <Chip label="Online"     active={pending.online}    onPress={() => setPending((p) => ({ ...p, online: !p.online }))} />
        <Chip label="Presencial"  active={pending.inPerson} onPress={() => setPending((p) => ({ ...p, inPerson: !p.inPerson }))} />
        <Chip label="Domicílio"   active={pending.home}     onPress={() => setPending((p) => ({ ...p, home: !p.home }))} />
        <Chip label="Academia"    active={pending.gym}      onPress={() => setPending((p) => ({ ...p, gym: !p.gym }))} />
      </FilterSection>

      <FilterSection title="Especialidades">
        {specialties.map((sp) => (
          <Chip key={sp.id} label={sp.name} active={pending.specialties.includes(sp.id)}
            onPress={() => togglePending('specialties', sp.id)} />
        ))}
      </FilterSection>

      <FilterSection title="Objetivo">
        {OBJECTIVES_OPTIONS.map((o) => (
          <Chip key={o} label={o} active={pending.objectives.includes(o)}
            onPress={() => togglePending('objectives', o)} />
        ))}
      </FilterSection>
    </View>
  );

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[Colors.primary[900], Colors.primary[700]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.headerGrad}
      >
        <SafeAreaView edges={['top']} style={s.headerInner}>
          <Text style={s.headerTitle}>Encontre seu personal</Text>
          <Text style={s.headerSub}>Digite cidade, bairro ou nome</Text>

          <View style={[s.searchBox, focused && s.searchBoxFocused]}>
            <Search size={17} color={focused ? Colors.primary[600] : Colors.neutral[400]} />
            <TextInput
              style={s.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Curitiba, Pinheiros, João Silva..."
              placeholderTextColor={Colors.neutral[400]}
              autoCapitalize="words"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={15} color={Colors.neutral[400]} />
              </TouchableOpacity>
            )}
          </View>

          <View style={s.controlRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillScroll}>
              {MODALITY_PILLS.map((p) => (
                <TouchableOpacity key={p.key} style={[s.pill, p.active && s.pillActive]} onPress={p.onPress}>
                  {p.icon}
                  <Text style={[s.pillText, p.active && s.pillTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[s.filterBtn, activeCount > 0 && s.filterBtnActive]} onPress={openFilters}>
              <SlidersHorizontal size={16} color={activeCount > 0 ? Colors.primary[700] : Colors.primary[100]} />
              {activeCount > 0 && <Text style={s.filterCount}>{activeCount}</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {IS_DESKTOP ? (
        <View style={s.desktopBody}>
          <View style={s.desktopSidebar}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <FiltersPanel />
              <TouchableOpacity style={s.applyBtnDesktop} onPress={applyModal}>
                <Text style={s.applyBtnDesktopTxt}>Aplicar filtros</Text>
              </TouchableOpacity>
              <View style={{ height: Spacing.xxl }} />
            </ScrollView>
          </View>
          <ScrollView style={s.desktopResults} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
            <CountBar label={countLabel} hasFilters={activeCount > 0} onClear={clearModal} />
            <ResultsList
              loading={loading} results={results} isFiltering={isFiltering}
              featured={featured} regular={regular} locationLabel={locationLabel}
              openWhatsApp={openWhatsApp}
            />
            <View style={{ height: Spacing.xxl }} />
          </ScrollView>
        </View>
      ) : (
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          <CountBar label={countLabel} hasFilters={activeCount > 0} onClear={clearModal} />
          <ResultsList
            loading={loading} results={results} isFiltering={isFiltering}
            featured={featured} regular={regular} locationLabel={locationLabel}
            openWhatsApp={openWhatsApp}
          />
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}

      {!IS_DESKTOP && (
        <Modal visible={showFilters} transparent animationType="slide">
          <View style={s.modalBg}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowFilters(false)} />
            <View style={s.modalPanel}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Filtros</Text>
                <TouchableOpacity style={s.modalClose} onPress={() => setShowFilters(false)}>
                  <X size={18} color={Colors.neutral[600]} />
                </TouchableOpacity>
              </View>
              <ScrollView style={s.modalScroll} contentContainerStyle={s.modalScrollContent} showsVerticalScrollIndicator={false}>
                <FiltersPanel />
                <View style={{ height: 16 }} />
              </ScrollView>
              <View style={s.modalActions}>
                <TouchableOpacity style={s.clearBtn} onPress={clearModal}>
                  <Text style={s.clearBtnTxt}>Limpar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.applyBtn} onPress={applyModal}>
                  <Text style={s.applyBtnTxt}>Aplicar{activeCount > 0 ? ` (${activeCount})` : ''}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function CountBar({ label, hasFilters, onClear }: { label: string; hasFilters: boolean; onClear: () => void }) {
  return (
    <View style={s.countBar}>
      <Text style={s.countText}>{label}</Text>
      {hasFilters && (
        <TouchableOpacity onPress={onClear}>
          <Text style={s.clearText}>Limpar filtros</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ResultsList({
  loading, results, isFiltering, featured, regular, locationLabel, openWhatsApp,
}: {
  loading: boolean;
  results: TrainerWithProfile[];
  isFiltering: boolean;
  featured: TrainerWithProfile[];
  regular: TrainerWithProfile[];
  locationLabel: string;
  openWhatsApp: (w: string) => void;
}) {
  if (loading) return (
    <View style={s.emptyState}>
      <View style={s.emptyIcon}><Search size={28} color={Colors.neutral[300]} /></View>
      <Text style={s.emptyTitle}>Buscando...</Text>
    </View>
  );

  if (!loading && results.length === 0) {
    const hasLocation = !!locationLabel;
    return (
      <View style={s.emptyState}>
        <View style={s.emptyIcon}><MapPin size={28} color={Colors.neutral[400]} /></View>
        <Text style={s.emptyTitle}>
          {hasLocation ? `Nenhum personal em ${locationLabel}` : 'Nenhum resultado'}
        </Text>
        <Text style={s.emptyDesc}>
          {hasLocation
            ? 'Experimente buscar por outro bairro, cidade\nou marque "Online" para ver personais remotos.'
            : 'Tente ajustar os filtros ou buscar por outro nome.'}
        </Text>
      </View>
    );
  }

  return (
    <>
      {!isFiltering && featured.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              <Zap size={14} color={Colors.warning[600]} fill={Colors.warning[300]} />
              <Text style={s.sectionTitle}>Em destaque</Text>
            </View>
          </View>
          {featured.map((t) => <TrainerSearchCard key={t.id} trainer={t} onWhatsApp={openWhatsApp} />)}
        </View>
      )}

      {isFiltering && results.map((t) => (
        <TrainerSearchCard key={t.id} trainer={t} onWhatsApp={openWhatsApp} />
      ))}

      {!isFiltering && featured.length === 0 && results.map((t) => (
        <TrainerSearchCard key={t.id} trainer={t} onWhatsApp={openWhatsApp} />
      ))}

      {!isFiltering && featured.length > 0 && regular.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Todos os personais</Text>
          </View>
          {regular.map((t) => <TrainerSearchCard key={t.id} trainer={t} onWhatsApp={openWhatsApp} />)}
        </View>
      )}
    </>
  );
}

function TrainerSearchCard({
  trainer: t, onWhatsApp,
}: { trainer: TrainerWithProfile; onWhatsApp: (w: string) => void }) {
  const cover  = t.cover_photo_url ?? COVER_PH;
  const avatar = t.profile.avatar_url ?? AVATAR_PH;

  const modalities: string[] = [];
  if (t.accepts_online)    modalities.push('Online');
  if (t.accepts_in_person) modalities.push('Presencial');
  if (t.accepts_home)      modalities.push('Domicílio');
  if ((t as any).accepts_gym) modalities.push('Academia');
  const modLabel = modalities.join(' · ') || 'Consulte';

  const loc = [t.neighborhood, t.profile.city, t.profile.state].filter(Boolean).join(', ');

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => router.push(`/trainer/${t.id}`)}
      activeOpacity={0.92}
    >
      <View style={s.coverWrap}>
        <Image source={{ uri: cover }} style={s.cover} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(11,31,111,0.75)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0.35 }} end={{ x: 0, y: 1 }}
        />

        <View style={s.cardBadges}>
          {t.is_featured && (
            <View style={s.featBadge}>
              <Zap size={9} color={Colors.warning[700]} fill={Colors.warning[500]} />
              <Text style={s.featText}>Destaque</Text>
            </View>
          )}
          {t.is_verified && (
            <View style={s.verBadge}>
              <BadgeCheck size={9} color={Colors.primary[700]} />
              <Text style={s.verText}>Verificado</Text>
            </View>
          )}
        </View>

        {t.rating > 0 && (
          <View style={s.ratingPill}>
            <Star size={11} color="#F59E0B" fill="#F59E0B" />
            <Text style={s.ratingNum}>{t.rating.toFixed(1)}</Text>
            {t.review_count > 0 && <Text style={s.ratingCnt}>({t.review_count})</Text>}
          </View>
        )}

        <View style={s.coverFooter}>
          <Image source={{ uri: avatar }} style={s.coverAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={s.coverName} numberOfLines={1}>{t.profile.full_name}</Text>
            {loc ? (
              <View style={s.coverLocRow}>
                <MapPin size={10} color="rgba(255,255,255,0.8)" />
                <Text style={s.coverLocText} numberOfLines={1}>{loc}</Text>
              </View>
            ) : null}
          </View>
          {t.hourly_rate ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.coverPrice}>R$ {t.hourly_rate}</Text>
              <Text style={s.coverPriceUnit}>/hora</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={s.cardBody}>
        {t.specialties && t.specialties.length > 0 && (
          <View style={s.tags}>
            {t.specialties.slice(0, 4).map((sp) => (
              <View key={sp.id} style={s.tag}><Text style={s.tagTxt}>{sp.name}</Text></View>
            ))}
            {t.specialties.length > 4 && <Text style={s.tagMore}>+{t.specialties.length - 4}</Text>}
          </View>
        )}

        <View style={s.metaRow}>
          <View style={s.metaItem}>
            {t.accepts_online ? <Monitor size={12} color={Colors.primary[500]} /> : <Users size={12} color={Colors.neutral[500]} />}
            <Text style={s.metaText} numberOfLines={1}>{modLabel}</Text>
          </View>
          {t.experience_years > 0 && (
            <View style={s.expTag}>
              <Text style={s.expText}>{t.experience_years} anos exp.</Text>
            </View>
          )}
          {t.cref ? (
            <View style={s.crefTag}>
              <BadgeCheck size={9} color={Colors.primary[600]} />
              <Text style={s.crefText}>CREF {t.cref}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.cardActions}>
          <TouchableOpacity style={s.btnView} onPress={() => router.push(`/trainer/${t.id}`)}>
            <Text style={s.btnViewTxt}>Ver perfil</Text>
            <ChevronRight size={14} color={Colors.white} />
          </TouchableOpacity>
          {t.whatsapp ? (
            <TouchableOpacity style={s.btnWa} onPress={() => onWhatsApp(t.whatsapp!)}>
              <MessageCircle size={14} color={Colors.white} />
              <Text style={s.btnWaTxt}>WhatsApp</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.filterSection}>
      <Text style={s.filterSectionTitle}>{title}</Text>
      <View style={s.filterChips}>{children}</View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.chip, active && s.chipActive]} onPress={onPress}>
      <Text style={[s.chipTxt, active && s.chipTxtActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.neutral[50] },

  headerGrad: {},
  headerInner: { paddingHorizontal: Spacing.lg, paddingBottom: 16, paddingTop: 8 },
  headerTitle: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  headerSub: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 14, marginTop: 2 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 13,
    borderWidth: 2, borderColor: 'transparent', ...Shadows.md,
  },
  searchBoxFocused: { borderColor: Colors.primary[300] },
  searchInput: { flex: 1, fontSize: FontSizes.md, color: Colors.neutral[900] },

  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  pillScroll: { gap: 7, paddingRight: 4 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  pillActive: { backgroundColor: Colors.white, borderColor: Colors.white },
  pillText: { fontSize: FontSizes.sm, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  pillTextActive: { color: Colors.primary[700] },
  filterBtn: {
    width: 44, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4,
  },
  filterBtnActive: { backgroundColor: Colors.white, borderColor: Colors.white },
  filterCount: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.primary[700] },

  desktopBody: { flex: 1, flexDirection: 'row', maxWidth: 1280, alignSelf: 'center', width: '100%' },
  desktopSidebar: { width: 280, borderRightWidth: 1, borderRightColor: Colors.neutral[100] },
  desktopResults: { flex: 1 },
  applyBtnDesktop: {
    marginHorizontal: 20, marginBottom: 8,
    backgroundColor: Colors.primary[600], borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  applyBtnDesktopTxt: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 4 },

  countBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
  },
  countText: { fontSize: FontSizes.sm, color: Colors.neutral[600], fontWeight: '600' },
  clearText: { fontSize: FontSizes.sm, color: Colors.primary[600], fontWeight: '700' },

  section: { marginBottom: 4 },
  sectionHeader: { paddingHorizontal: Spacing.lg, marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[800] },

  card: {
    marginHorizontal: Spacing.lg, marginBottom: 18,
    backgroundColor: Colors.white, borderRadius: 22, overflow: 'hidden',
    shadowColor: '#1E3BBD', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 18, elevation: 6,
  },
  coverWrap: { height: 200, position: 'relative' },
  cover: { width: '100%', height: '100%' },
  cardBadges: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 },
  featBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(254,243,199,0.97)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  featText: { fontSize: 10, fontWeight: '700', color: Colors.warning[700] },
  verBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(224,231,255,0.97)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  verText: { fontSize: 10, fontWeight: '700', color: Colors.primary[700] },
  ratingPill: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
  },
  ratingNum: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.white },
  ratingCnt: { fontSize: 10, color: 'rgba(255,255,255,0.75)' },
  coverFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingBottom: 14, paddingTop: 20,
  },
  coverAvatar: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 2.5, borderColor: Colors.white, backgroundColor: Colors.neutral[200],
  },
  coverName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white, letterSpacing: -0.2 },
  coverLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  coverLocText: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  coverPrice: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.white },
  coverPriceUnit: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },

  cardBody: { padding: 14, gap: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: {
    backgroundColor: Colors.primary[50], paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1, borderColor: Colors.primary[100],
  },
  tagTxt: { fontSize: 10, fontWeight: '700', color: Colors.primary[700] },
  tagMore: { fontSize: 10, color: Colors.neutral[400], alignSelf: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FontSizes.sm, color: Colors.neutral[600], fontWeight: '500' },
  expTag: { backgroundColor: Colors.neutral[100], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  expText: { fontSize: 10, fontWeight: '600', color: Colors.neutral[600] },
  crefTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.primary[50], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    borderWidth: 1, borderColor: Colors.primary[100],
  },
  crefText: { fontSize: 10, fontWeight: '700', color: Colors.primary[700] },
  cardActions: {
    flexDirection: 'row', gap: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.neutral[100],
  },
  btnView: {
    flex: 1, backgroundColor: Colors.primary[600], borderRadius: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  btnViewTxt: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
  btnWa: {
    flex: 1, backgroundColor: '#16A34A', borderRadius: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnWaTxt: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },

  emptyState: { paddingVertical: 56, paddingHorizontal: 32, alignItems: 'center', gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[700], textAlign: 'center' },
  emptyDesc: { fontSize: FontSizes.md, color: Colors.neutral[500], textAlign: 'center', lineHeight: 22 },

  filtersPanel: { padding: 20 },
  filtersPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  filtersPanelTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },
  filtersClearLink: { fontSize: FontSizes.sm, color: Colors.primary[600], fontWeight: '700' },
  filterSection: { marginBottom: 22 },
  filterSectionTitle: {
    fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[500],
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
  },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  chip: {
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.neutral[200],
  },
  chipActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  chipTxt: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[700] },
  chipTxtActive: { color: Colors.white },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalPanel: { backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.neutral[200], alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
  },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[900] },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  modalScroll: { paddingHorizontal: 0 },
  modalScrollContent: {},
  modalActions: { flexDirection: 'row', gap: 10, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.neutral[100] },
  clearBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.neutral[100], alignItems: 'center' },
  clearBtnTxt: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[700] },
  applyBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.primary[600], alignItems: 'center' },
  applyBtnTxt: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
});
