import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, Spacing, FontSizes, Shadows } from '@/constants/theme';
import { TrainerWithProfile, Lead } from '@/types/database';
import {
  Search, Clock, ChevronRight, Dumbbell, ArrowRight,
  Heart, Star, MapPin, MessageCircle, BadgeCheck,
} from 'lucide-react-native';

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' }> = {
  pending:   { label: 'Aguardando',   variant: 'warning' },
  contacted: { label: 'Respondido',   variant: 'info' },
  converted: { label: 'Conectado',    variant: 'success' },
  lost:      { label: 'Sem resposta', variant: 'neutral' },
};

const CATEGORIES = [
  { id: 'emagrecimento', label: 'Emagrecimento', photo: 'https://images.pexels.com/photos/3757954/pexels-photo-3757954.jpeg?auto=compress&cs=tinysrgb&w=400&h=240&fit=crop', color: '#EF4444' },
  { id: 'hipertrofia',   label: 'Hipertrofia',   photo: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=400&h=240&fit=crop', color: Colors.primary[600] },
  { id: 'online',        label: 'Online',         photo: 'https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg?auto=compress&cs=tinysrgb&w=400&h=240&fit=crop', color: Colors.secondary[600] },
  { id: 'corrida',       label: 'Corrida',        photo: 'https://images.pexels.com/photos/2402777/pexels-photo-2402777.jpeg?auto=compress&cs=tinysrgb&w=400&h=240&fit=crop', color: '#F97316' },
  { id: 'terceira-idade', label: 'Terceira Idade', photo: 'https://images.pexels.com/photos/3823488/pexels-photo-3823488.jpeg?auto=compress&cs=tinysrgb&w=400&h=240&fit=crop', color: '#8B5CF6' },
  { id: 'pos-parto',     label: 'Pós-parto',      photo: 'https://images.pexels.com/photos/4056529/pexels-photo-4056529.jpeg?auto=compress&cs=tinysrgb&w=400&h=240&fit=crop', color: '#EC4899' },
];

type FavoriteTrainer = {
  id: string;
  trainer_id: string;
  trainer: { profile: { full_name: string; avatar_url: string | null }; rating: number; profile_city?: string };
};

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [trainers, setTrainers] = useState<TrainerWithProfile[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [favorites, setFavorites] = useState<FavoriteTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (!profile) return;
    const [trainersRes, leadsRes, favRes] = await Promise.all([
      supabase
        .from('trainers')
        .select('*, profile:profiles!trainers_id_fkey(*), specialties:trainer_specialties(specialty:specialties(*))')
        .eq('status', 'active')
        .order('is_featured', { ascending: false })
        .order('rating', { ascending: false })
        .limit(8),
      supabase
        .from('leads')
        .select('*, trainer:profiles!leads_trainer_id_fkey(*)')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('favorites')
        .select('id, trainer_id, trainer:trainers!favorites_trainer_id_fkey(rating, profile:profiles!trainers_id_fkey(full_name, avatar_url))')
        .eq('student_id', profile.id)
        .limit(6),
    ]);

    if (trainersRes.data) {
      setTrainers(trainersRes.data.map((t: any) => ({
        ...t,
        profile: t.profile,
        specialties: t.specialties?.map((ts: any) => ts.specialty).filter(Boolean) ?? [],
      })));
    }
    if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
    if (favRes.data) setFavorites(favRes.data as any);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };
  const firstName = profile?.full_name?.split(' ')[0] ?? '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />}
      >
        {/* Gradient hero header */}
        <LinearGradient
          colors={[Colors.primary[900], Colors.primary[700]]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroTop}>
            <View style={{ flex: 1 }}>
              <View style={s.logoRow}>
                <Dumbbell size={14} color="rgba(255,255,255,0.6)" />
                <Text style={s.logoText}>SuperShape</Text>
              </View>
              <Text style={s.greeting}>{greeting}, {firstName}!</Text>
              <Text style={s.heroSub}>Encontre seu personal ideal</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/student/profile')} style={s.avatarBtn}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarInitial}>{profile?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <TouchableOpacity style={s.searchBar} onPress={() => router.push('/student/search')} activeOpacity={0.9}>
            <Search size={17} color={Colors.neutral[500]} />
            <Text style={s.searchPlaceholder}>Nome, cidade, especialidade...</Text>
            <View style={s.searchArrowWrap}>
              <ArrowRight size={15} color={Colors.white} />
            </View>
          </TouchableOpacity>

          {/* Quick stats row */}
          <View style={s.quickRow}>
            <TouchableOpacity style={s.quickChip} onPress={() => router.push('/student/search')} activeOpacity={0.8}>
              <BadgeCheck size={12} color="rgba(255,255,255,0.8)" />
              <Text style={s.quickChipText}>Verificados</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.quickChip} onPress={() => router.push('/student/search')} activeOpacity={0.8}>
              <Star size={12} color="rgba(255,255,255,0.8)" fill="rgba(255,255,255,0.8)" />
              <Text style={s.quickChipText}>Mais bem avaliados</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.quickChip} onPress={() => router.push('/student/search')} activeOpacity={0.8}>
              <MapPin size={12} color="rgba(255,255,255,0.8)" />
              <Text style={s.quickChipText}>Perto de mim</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Objectives */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Explorar por objetivo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={s.catCard}
                onPress={() => router.push('/student/search')}
                activeOpacity={0.88}
              >
                <Image source={{ uri: cat.photo }} style={s.catImg} resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.72)']}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0.3 }} end={{ x: 0, y: 1 }}
                />
                <Text style={s.catLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recommended trainers */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Personais recomendados</Text>
          <TouchableOpacity style={s.seeAllBtn} onPress={() => router.push('/student/search')}>
            <Text style={s.seeAllText}>Ver todos</Text>
            <ChevronRight size={14} color={Colors.primary[600]} />
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={s.loadingRow}><Text style={s.loadingText}>Carregando personais...</Text></View>
        ) : trainers.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.trainerScroll}>
            {trainers.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={s.trainerCard}
                onPress={() => {
                  if (!t.id) { Alert.alert('Aviso', 'Perfil indisponível no momento.'); return; }
                  router.push(`/trainer/${t.id}`);
                }}
                activeOpacity={0.9}
              >
                <View style={s.trainerCardCover}>
                  <Image
                    source={{ uri: t.profile.avatar_url ?? 'https://images.pexels.com/photos/6551133/pexels-photo-6551133.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop' }}
                    style={s.trainerCardAvatar}
                  />
                  {t.is_featured && (
                    <View style={s.featuredBadge}>
                      <Text style={s.featuredBadgeText}>Destaque</Text>
                    </View>
                  )}
                  {t.rating > 0 && (
                    <View style={s.ratingBadge}>
                      <Star size={10} color="#F59E0B" fill="#F59E0B" />
                      <Text style={s.ratingText}>{t.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                <View style={s.trainerCardBody}>
                  <Text style={s.trainerCardName} numberOfLines={1}>{t.profile.full_name}</Text>
                  {t.profile.city ? (
                    <View style={s.trainerLocRow}>
                      <MapPin size={10} color={Colors.neutral[400]} />
                      <Text style={s.trainerLocText} numberOfLines={1}>{t.profile.city}</Text>
                    </View>
                  ) : null}
                  {t.specialties && t.specialties.length > 0 && (
                    <Text style={s.trainerSpec} numberOfLines={1}>
                      {t.specialties.slice(0, 2).map((sp) => sp.name).join(' · ')}
                    </Text>
                  )}
                  {t.hourly_rate ? (
                    <Text style={s.trainerPrice}>R$ {t.hourly_rate}<Text style={s.trainerPriceUnit}>/h</Text></Text>
                  ) : null}
                </View>
                <View style={s.trainerCardActions}>
                  <TouchableOpacity
                    style={s.trainerWaBtn}
                    onPress={() => {
                      if (!t.id) { Alert.alert('Aviso', 'Perfil indisponível no momento.'); return; }
                      router.push(`/trainer/${t.id}`);
                    }}
                  >
                    <MessageCircle size={13} color={Colors.white} />
                    <Text style={s.trainerWaBtnText}>Ver perfil</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={s.emptyBox}>
            <Dumbbell size={32} color={Colors.neutral[300]} />
            <Text style={s.emptyTitle}>Nenhum personal disponível ainda</Text>
            <Text style={s.emptyDesc}>Em breve teremos profissionais na plataforma.</Text>
          </View>
        )}

        {/* Favorites */}
        {favorites.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>Meus favoritos</Text>
              <TouchableOpacity style={s.seeAllBtn} onPress={() => router.push('/student/favorites')}>
                <Text style={s.seeAllText}>Ver todos</Text>
                <ChevronRight size={14} color={Colors.primary[600]} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: Spacing.lg, paddingTop: 8 }}>
              {favorites.map((fav) => {
                const p = (fav as any).trainer?.profile;
                const rating = (fav as any).trainer?.rating ?? 0;
                return (
                  <TouchableOpacity
                    key={fav.id}
                    style={s.favCard}
                    onPress={() => router.push(`/trainer/${fav.trainer_id}`)}
                    activeOpacity={0.88}
                  >
                    {p?.avatar_url ? (
                      <Image source={{ uri: p.avatar_url }} style={s.favAvatar} />
                    ) : (
                      <View style={[s.favAvatar, s.favAvatarFallback]}>
                        <Text style={s.favInitial}>{p?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                      </View>
                    )}
                    <Heart size={14} color={Colors.error[500]} fill={Colors.error[500]} style={s.favHeart as any} />
                    <Text style={s.favName} numberOfLines={2}>{p?.full_name ?? '—'}</Text>
                    {rating > 0 && (
                      <View style={s.favRating}>
                        <Star size={9} color="#F59E0B" fill="#F59E0B" />
                        <Text style={s.favRatingText}>{rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Recent contacts */}
        {leads.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Meus contatos enviados</Text>
            <View style={s.leadsList}>
              {leads.map((lead) => {
                const trainer = lead.trainer as any;
                const st = statusMap[lead.status] ?? statusMap.pending;
                return (
                  <TouchableOpacity
                    key={lead.id}
                    style={s.leadCard}
                    onPress={() => {
                      if (!lead.trainer_id) { Alert.alert('Aviso', 'Perfil indisponível.'); return; }
                      router.push(`/trainer/${lead.trainer_id}`);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={s.leadAvatar}>
                      <Text style={s.leadAvatarText}>
                        {trainer?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={s.leadInfo}>
                      <Text style={s.leadName}>{trainer?.full_name ?? '—'}</Text>
                      <View style={s.leadMeta}>
                        <Clock size={11} color={Colors.neutral[400]} />
                        <Text style={s.leadDate}>
                          {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                        </Text>
                      </View>
                    </View>
                    <StatusBadge label={st.label} variant={st.variant} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Empty state for contacts */}
        {leads.length === 0 && !loading && (
          <View style={[s.section, s.emptyBox]}>
            <MessageCircle size={32} color={Colors.neutral[300]} />
            <Text style={s.emptyTitle}>Nenhuma solicitação de contato ainda</Text>
            <Text style={s.emptyDesc}>Explore os personais e envie sua primeira mensagem.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/student/search')}>
              <Search size={14} color={Colors.white} />
              <Text style={s.emptyBtnText}>Buscar personais</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },

  // Hero
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  logoText: { fontSize: FontSizes.xs, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase' },
  greeting: { fontSize: 26, fontWeight: '800', color: Colors.white, letterSpacing: -0.4 },
  heroSub: { fontSize: FontSizes.md, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  avatarBtn: {},
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.5)' },
  avatarFallback: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.primary[500], borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: Colors.white, fontWeight: '700', fontSize: FontSizes.lg },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: 14,
    paddingLeft: Spacing.md, paddingRight: 6, paddingVertical: 6,
    marginBottom: 12, ...Shadows.md,
  },
  searchPlaceholder: { flex: 1, fontSize: FontSizes.md, color: Colors.neutral[400] },
  searchArrowWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center',
  },
  quickRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  quickChipText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.82)' },

  // Sections
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: 12,
  },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: FontSizes.sm, color: Colors.primary[600], fontWeight: '600' },

  // Categories
  catScroll: { gap: 10, paddingTop: 10, paddingBottom: 4 },
  catCard: {
    width: 120, height: 76, borderRadius: 14, overflow: 'hidden',
    position: 'relative',
  },
  catImg: { width: '100%', height: '100%' },
  catLabel: {
    position: 'absolute', bottom: 7, left: 9, right: 4,
    fontSize: 11, fontWeight: '700', color: Colors.white,
  },

  // Trainer cards (horizontal scroll)
  trainerScroll: { paddingHorizontal: Spacing.lg, gap: 14, paddingBottom: 8, paddingTop: 4 },
  trainerCard: {
    width: 160, backgroundColor: Colors.white, borderRadius: 18, overflow: 'hidden',
    ...Shadows.md,
  },
  trainerCardCover: { height: 110, position: 'relative' },
  trainerCardAvatar: { width: '100%', height: '100%' },
  featuredBadge: {
    position: 'absolute', top: 7, left: 7,
    backgroundColor: 'rgba(254,243,199,0.96)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
  },
  featuredBadgeText: { fontSize: 9, fontWeight: '700', color: '#B45309' },
  ratingBadge: {
    position: 'absolute', top: 7, right: 7,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
  },
  ratingText: { fontSize: 10, fontWeight: '800', color: Colors.white },
  trainerCardBody: { padding: 10, gap: 3 },
  trainerCardName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  trainerLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trainerLocText: { fontSize: 10, color: Colors.neutral[400] },
  trainerSpec: { fontSize: 10, color: Colors.neutral[500], marginTop: 1 },
  trainerPrice: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.secondary[600], marginTop: 3 },
  trainerPriceUnit: { fontSize: 10, color: Colors.neutral[500], fontWeight: '500' },
  trainerCardActions: { paddingHorizontal: 10, paddingBottom: 10 },
  trainerWaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: Colors.primary[600], borderRadius: 10, paddingVertical: 8,
  },
  trainerWaBtnText: { fontSize: 11, fontWeight: '700', color: Colors.white },

  // Favorites
  favCard: {
    width: 100, alignItems: 'center', gap: 6,
    backgroundColor: Colors.white, borderRadius: 16, padding: 12, ...Shadows.sm,
    position: 'relative',
  },
  favAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.neutral[200] },
  favAvatarFallback: { backgroundColor: Colors.primary[100], alignItems: 'center', justifyContent: 'center' },
  favInitial: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.primary[700] },
  favHeart: { position: 'absolute', top: 8, right: 8 },
  favName: { fontSize: 10, fontWeight: '600', color: Colors.neutral[800], textAlign: 'center', lineHeight: 14 },
  favRating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  favRatingText: { fontSize: 10, fontWeight: '700', color: Colors.neutral[600] },

  // Leads
  leadsList: { gap: 10, marginTop: 10 },
  leadCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    ...Shadows.sm,
  },
  leadAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary[100], alignItems: 'center', justifyContent: 'center',
  },
  leadAvatarText: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.primary[700] },
  leadInfo: { flex: 1 },
  leadName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  leadMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  leadDate: { fontSize: FontSizes.xs, color: Colors.neutral[400] },

  // Loading / empty
  loadingRow: { padding: Spacing.xl, alignItems: 'center' },
  loadingText: { color: Colors.neutral[500], fontSize: FontSizes.md },
  emptyBox: {
    marginHorizontal: Spacing.lg, backgroundColor: Colors.white,
    borderRadius: 20, padding: 32, alignItems: 'center', gap: 10, ...Shadows.sm,
  },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[700], textAlign: 'center' },
  emptyDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary[600], borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18, marginTop: 4,
  },
  emptyBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
});
