import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Image, Linking, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, FontSizes, Shadows } from '@/constants/theme';
import {
  TrainerWithProfile, Specialty,
  TARGET_AUDIENCE_OPTIONS, OBJECTIVES_OPTIONS,
} from '@/types/database';
import {
  Search, X, SlidersHorizontal, MessageCircle, Star, MapPin,
  Monitor, Users, Zap, BadgeCheck, ChevronRight, ArrowLeft,
} from 'lucide-react-native';

const COVER_PH = 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=600&h=300&fit=crop';
const AVATAR_PH = 'https://images.pexels.com/photos/6551133/pexels-photo-6551133.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop';

const PRICE_RANGES = [
  { label: 'Até R$80',  min: 0,   max: 80  },
  { label: 'R$80–150',  min: 80,  max: 150 },
  { label: 'R$150+',    min: 150, max: 9999 },
];
const MIN_RATINGS = [3, 4, 4.5];
const CATEGORY_PILLS = ['Musculação', 'Yoga', 'Funcional', 'Pilates', 'Crossfit', 'Corrida'];

type Filters = {
  minRating: number;
  priceKey: string | null;
  specialties: string[];
  audience: string[];
  objectives: string[];
  modality: 'all' | 'online' | 'in_person';
  acceptsHome: boolean;
};

const defaultFilters: Filters = {
  minRating: 0, priceKey: null, specialties: [],
  audience: [], objectives: [], modality: 'all', acceptsHome: false,
};

export default function PublicSearch() {
  const [query, setQuery]             = useState('');
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [all, setAll]                 = useState<TrainerWithProfile[]>([]);
  const [results, setResults]         = useState<TrainerWithProfile[]>([]);
  const [filters, setFilters]         = useState<Filters>(defaultFilters);
  const [pending, setPending]         = useState<Filters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [focused, setFocused]         = useState(false);

  useEffect(() => {
    supabase.from('specialties').select('*').order('name').then(({ data }) => {
      if (data) setSpecialties(data);
    });
    fetchTrainers();
  }, []);

  useEffect(() => { applyFilters(all, query, filters); }, [all, query, filters]);

  const fetchTrainers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('trainers')
      .select('*, profile:profiles!trainers_id_fkey(*), specialties:trainer_specialties(specialty:specialties(*))')
      .eq('status', 'active')
      .in('subscription_status', ['trialing', 'active'])
      .order('is_featured', { ascending: false })
      .order('rating', { ascending: false });
    if (data) {
      setAll(data.map((t: any) => ({
        ...t, profile: t.profile,
        specialties: t.specialties?.map((ts: any) => ts.specialty).filter(Boolean) ?? [],
      })));
    }
    setLoading(false);
  };

  const applyFilters = (trainers: TrainerWithProfile[], q: string, f: Filters) => {
    let r = [...trainers];
    if (q.trim()) {
      const ql = q.toLowerCase();
      r = r.filter((t) =>
        t.profile.full_name.toLowerCase().includes(ql) ||
        t.profile.city?.toLowerCase().includes(ql) ||
        t.neighborhood?.toLowerCase().includes(ql) ||
        t.specialties?.some((s) => s.name.toLowerCase().includes(ql))
      );
    }
    if (f.modality === 'online')    r = r.filter((t) => t.accepts_online);
    if (f.modality === 'in_person') r = r.filter((t) => t.accepts_in_person);
    if (f.acceptsHome)              r = r.filter((t) => t.accepts_home);
    if (f.minRating > 0)            r = r.filter((t) => t.rating >= f.minRating);
    if (f.priceKey) {
      const pr = PRICE_RANGES.find((p) => p.label === f.priceKey);
      if (pr) r = r.filter((t) => t.hourly_rate != null && t.hourly_rate >= pr.min && t.hourly_rate <= pr.max);
    }
    if (f.specialties.length) r = r.filter((t) => f.specialties.every((id) => t.specialties?.some((s) => s.id === id)));
    if (f.audience.length)    r = r.filter((t) => f.audience.some((a) => (t.target_audience ?? []).includes(a)));
    if (f.objectives.length)  r = r.filter((t) => f.objectives.some((o) => (t.objectives ?? []).includes(o)));
    setResults(r);
  };

  const toggle = <K extends keyof Filters>(field: K, val: Filters[K] extends string[] ? string : never) => {
    setPending((prev) => {
      const arr = prev[field] as string[];
      return { ...prev, [field]: arr.includes(val as string) ? arr.filter((x) => x !== val) : [...arr, val as string] };
    });
  };

  const applyModal  = () => { setFilters(pending); setShowFilters(false); };
  const clearModal  = () => { setPending(defaultFilters); setFilters(defaultFilters); setShowFilters(false); };
  const openFilters = () => { setPending(filters); setShowFilters(true); };
  const openWhatsApp = (w: string) => Linking.openURL(`https://wa.me/55${w.replace(/\D/g, '')}`);

  const activeCount = [
    filters.minRating > 0, !!filters.priceKey, filters.specialties.length > 0,
    filters.audience.length > 0, filters.objectives.length > 0,
    filters.modality !== 'all', filters.acceptsHome,
  ].filter(Boolean).length;

  const featured    = results.filter((t) => t.is_featured);
  const regular     = results.filter((t) => !t.is_featured);
  const isSearching = query.trim().length > 0 || activeCount > 0;

  return (
    <View style={s.root}>
      {/* Gradient header */}
      <LinearGradient
        colors={[Colors.primary[900], Colors.primary[700]]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.headerGrad}
      >
        <SafeAreaView edges={['top']} style={s.headerInner}>
          {/* Top nav row */}
          <View style={s.topNav}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color={Colors.white} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Buscar Personal</Text>
            <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/(auth)/login')}>
              <Text style={s.loginBtnText}>Entrar</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.headerSub}>+500 profissionais certificados</Text>

          {/* Search bar */}
          <View style={[s.searchBox, focused && s.searchBoxFocused]}>
            <Search size={17} color={focused ? Colors.primary[600] : Colors.neutral[400]} />
            <TextInput
              style={s.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Nome, cidade, especialidade..."
              placeholderTextColor={Colors.neutral[400]}
              autoCapitalize="none"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={15} color={Colors.neutral[400]} />
              </TouchableOpacity>
            )}
          </View>

          {/* Modality + filter row */}
          <View style={s.controlRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillScroll}>
              {(['all', 'online', 'in_person'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[s.pill, filters.modality === m && s.pillActive]}
                  onPress={() => setFilters((p) => ({ ...p, modality: m }))}
                >
                  <Text style={[s.pillText, filters.modality === m && s.pillTextActive]}>
                    {m === 'all' ? 'Todos' : m === 'online' ? 'Online' : 'Presencial'}
                  </Text>
                </TouchableOpacity>
              ))}
              {CATEGORY_PILLS.map((cat) => {
                const matchedSp = specialties.find((sp) => sp.name === cat);
                const isActive  = matchedSp ? filters.specialties.includes(matchedSp.id) : false;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[s.pill, isActive && s.pillActive]}
                    onPress={() => {
                      if (matchedSp) {
                        setFilters((p) => ({
                          ...p,
                          specialties: p.specialties.includes(matchedSp.id)
                            ? p.specialties.filter((x) => x !== matchedSp.id)
                            : [...p.specialties, matchedSp.id],
                        }));
                      } else {
                        setQuery(cat);
                      }
                    }}
                  >
                    <Text style={[s.pillText, isActive && s.pillTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[s.filterBtn, activeCount > 0 && s.filterBtnActive]}
              onPress={openFilters}
            >
              <SlidersHorizontal size={16} color={activeCount > 0 ? Colors.primary[700] : Colors.primary[100]} />
              {activeCount > 0 && <Text style={s.filterCount}>{activeCount}</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Results */}
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* Count bar */}
        <View style={s.countBar}>
          <Text style={s.countText}>
            {loading
              ? 'Buscando...'
              : `${results.length} personal${results.length !== 1 ? 'is' : ''} encontrado${results.length !== 1 ? 's' : ''}`}
          </Text>
          {activeCount > 0 && (
            <TouchableOpacity onPress={clearModal}>
              <Text style={s.clearText}>Limpar filtros</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Featured section */}
        {!isSearching && featured.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionTitleRow}>
                <Zap size={14} color={Colors.warning[600]} fill={Colors.warning[300]} />
                <Text style={s.sectionTitle}>Em destaque</Text>
              </View>
            </View>
            {featured.map((t) => <TrainerCard key={t.id} trainer={t} onWhatsApp={openWhatsApp} />)}
          </View>
        )}

        {isSearching && results.length > 0 && (
          results.map((t) => <TrainerCard key={t.id} trainer={t} onWhatsApp={openWhatsApp} />)
        )}
        {!isSearching && featured.length === 0 && results.length > 0 && (
          results.map((t) => <TrainerCard key={t.id} trainer={t} onWhatsApp={openWhatsApp} />)
        )}
        {!isSearching && featured.length > 0 && regular.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Todos os personais</Text>
            </View>
            {regular.map((t) => <TrainerCard key={t.id} trainer={t} onWhatsApp={openWhatsApp} />)}
          </View>
        )}

        {!loading && results.length === 0 && (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}><Search size={28} color={Colors.neutral[400]} /></View>
            <Text style={s.emptyTitle}>Nenhum resultado</Text>
            <Text style={s.emptyDesc}>Tente ajustar os filtros ou buscar por outro termo.</Text>
          </View>
        )}

        {/* CTA for registration */}
        <View style={s.ctaBanner}>
          <Text style={s.ctaBannerTitle}>Encontrou o seu personal?</Text>
          <Text style={s.ctaBannerSub}>Crie sua conta grátis para entrar em contato e agendar.</Text>
          <TouchableOpacity style={s.ctaBannerBtn} onPress={() => router.push('/(auth)/register?role=student')}>
            <Text style={s.ctaBannerBtnText}>Criar conta grátis</Text>
            <ChevronRight size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Filter modal */}
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
            <ScrollView
              style={s.modalScroll}
              contentContainerStyle={s.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <FilterSection title="Nota mínima">
                {MIN_RATINGS.map((r) => (
                  <Chip key={r} label={`${r}+ ★`} active={pending.minRating === r} onPress={() => setPending((p) => ({ ...p, minRating: p.minRating === r ? 0 : r }))} />
                ))}
              </FilterSection>
              <FilterSection title="Faixa de preço">
                {PRICE_RANGES.map((pr) => (
                  <Chip key={pr.label} label={pr.label} active={pending.priceKey === pr.label} onPress={() => setPending((p) => ({ ...p, priceKey: p.priceKey === pr.label ? null : pr.label }))} />
                ))}
              </FilterSection>
              <FilterSection title="Especialidades">
                {specialties.map((sp) => (
                  <Chip key={sp.id} label={sp.name} active={pending.specialties.includes(sp.id)} onPress={() => toggle('specialties', sp.id)} />
                ))}
              </FilterSection>
              <FilterSection title="Público atendido">
                {TARGET_AUDIENCE_OPTIONS.map((a) => (
                  <Chip key={a} label={a} active={pending.audience.includes(a)} onPress={() => toggle('audience', a)} />
                ))}
              </FilterSection>
              <FilterSection title="Objetivo">
                {OBJECTIVES_OPTIONS.map((o) => (
                  <Chip key={o} label={o} active={pending.objectives.includes(o)} onPress={() => toggle('objectives', o)} />
                ))}
              </FilterSection>
              <FilterSection title="Localização">
                <Chip label="Atendimento em casa" active={pending.acceptsHome} onPress={() => setPending((p) => ({ ...p, acceptsHome: !p.acceptsHome }))} />
              </FilterSection>
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
    </View>
  );
}

function TrainerCard({
  trainer: t,
  onWhatsApp,
}: {
  trainer: TrainerWithProfile;
  onWhatsApp: (w: string) => void;
}) {
  const cover  = t.cover_photo_url ?? COVER_PH;
  const avatar = t.profile.avatar_url ?? AVATAR_PH;
  const loc    = [t.profile.city, t.neighborhood].filter(Boolean).join(', ');
  const mod    = t.accepts_online && t.accepts_in_person
    ? 'Online + Presencial'
    : t.accepts_online ? 'Online' : 'Presencial';

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => {
        if (!t.id) { Alert.alert('Aviso', 'Perfil indisponível no momento.'); return; }
        router.push(`/trainer/${t.id}`);
      }}
      activeOpacity={0.92}
    >
      <View style={s.coverWrap}>
        <Image source={{ uri: cover }} style={s.cover} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(11,31,111,0.72)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0.3 }} end={{ x: 0, y: 1 }}
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
            <View>
              <Text style={s.coverPrice}>R$ {t.hourly_rate}</Text>
              <Text style={s.coverPriceUnit}>/h</Text>
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

        <View style={s.cardMeta}>
          <View style={s.metaItem}>
            {t.accepts_online
              ? <Monitor size={12} color={Colors.primary[500]} />
              : <Users size={12} color={Colors.neutral[500]} />}
            <Text style={s.metaText}>{mod}</Text>
          </View>
          {t.experience_years > 0 && (
            <View style={s.expTag}>
              <Text style={s.expText}>{t.experience_years} anos exp.</Text>
            </View>
          )}
        </View>

        <View style={s.cardActions}>
          <TouchableOpacity style={s.btnView} onPress={() => {
            if (!t.id) { Alert.alert('Aviso', 'Perfil indisponível no momento.'); return; }
            router.push(`/trainer/${t.id}`);
          }}>
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
    <View style={{ marginBottom: 22 }}>
      <Text style={s.filterSectionTitle}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
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
  headerInner: { paddingHorizontal: Spacing.lg, paddingBottom: 16, paddingTop: 4 },
  topNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: { flex: 1, fontSize: FontSizes.xl, fontWeight: '800', color: Colors.white },
  loginBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  loginBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 14 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 13,
    borderWidth: 2, borderColor: 'transparent',
    ...Shadows.md,
  },
  searchBoxFocused: { borderColor: Colors.primary[300] },
  searchInput: { flex: 1, fontSize: FontSizes.md, color: Colors.neutral[900] },

  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  pillScroll: { gap: 7, paddingRight: 4 },
  pill: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999,
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

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 4 },

  countBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
  },
  countText: { fontSize: FontSizes.sm, color: Colors.neutral[500], fontWeight: '600' },
  clearText: { fontSize: FontSizes.sm, color: Colors.primary[600], fontWeight: '700' },

  section: { marginBottom: 4 },
  sectionHeader: { paddingHorizontal: Spacing.lg, marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[800] },

  ctaBanner: {
    marginHorizontal: Spacing.lg, marginTop: 8, marginBottom: 8,
    backgroundColor: Colors.primary[900], borderRadius: 20,
    padding: Spacing.lg, gap: 8,
  },
  ctaBannerTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.white },
  ctaBannerSub: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },
  ctaBannerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary[500], borderRadius: 12,
    paddingVertical: 11, paddingHorizontal: 16, alignSelf: 'flex-start', marginTop: 4,
  },
  ctaBannerBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },

  card: {
    marginHorizontal: Spacing.lg, marginBottom: 18,
    backgroundColor: Colors.white, borderRadius: 22, overflow: 'hidden',
    shadowColor: '#1E3BBD', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 22, elevation: 8,
  },
  coverWrap: { height: 220, position: 'relative' },
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
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2.5, borderColor: Colors.white, backgroundColor: Colors.neutral[200],
  },
  coverName: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white, letterSpacing: -0.2 },
  coverLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  coverLocText: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  coverPrice: { fontSize: FontSizes.lg, fontWeight: '800', color: '#4ADE80', textAlign: 'right' },
  coverPriceUnit: { fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'right' },

  cardBody: { padding: 14, gap: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: {
    backgroundColor: Colors.primary[50], paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1, borderColor: Colors.primary[100],
  },
  tagTxt: { fontSize: 10, fontWeight: '700', color: Colors.primary[700] },
  tagMore: { fontSize: 10, color: Colors.neutral[400], alignSelf: 'center' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FontSizes.sm, color: Colors.neutral[600], fontWeight: '500' },
  expTag: { backgroundColor: Colors.neutral[100], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  expText: { fontSize: 10, fontWeight: '600', color: Colors.neutral[600] },
  cardActions: {
    flexDirection: 'row', gap: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.neutral[100],
  },
  btnView: {
    flex: 1, backgroundColor: Colors.primary[600], borderRadius: 12, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  btnViewTxt: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
  btnWa: {
    flex: 1, backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnWaTxt: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },

  emptyState: { padding: 64, alignItems: 'center', gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[700] },
  emptyDesc: { fontSize: FontSizes.md, color: Colors.neutral[500], textAlign: 'center', lineHeight: 22 },

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
  modalScroll: { paddingHorizontal: Spacing.lg },
  modalScrollContent: { paddingTop: Spacing.md },
  modalActions: { flexDirection: 'row', gap: 10, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.neutral[100] },
  clearBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.neutral[100], alignItems: 'center' },
  clearBtnTxt: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[700] },
  applyBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.primary[600], alignItems: 'center' },
  applyBtnTxt: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
  filterSectionTitle: {
    fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[500],
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.neutral[200],
  },
  chipActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  chipTxt: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[700] },
  chipTxtActive: { color: Colors.white },
});
