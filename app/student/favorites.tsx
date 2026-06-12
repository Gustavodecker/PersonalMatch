import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { Heart, Star, MapPin, Search, Dumbbell, MessageCircle } from 'lucide-react-native';

type FavoriteRow = {
  id: string;
  trainer_id: string;
  trainer: {
    rating: number;
    hourly_rate: number | null;
    neighborhood: string | null;
    profile: { full_name: string; avatar_url: string | null };
  } | null;
};

export default function FavoritesScreen() {
  const { profile } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('favorites')
      .select('id, trainer_id, trainer:trainers!favorites_trainer_id_fkey(rating, hourly_rate, neighborhood, profile:profiles!trainers_id_fkey(full_name, avatar_url))')
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false });
    setFavorites((data ?? []) as unknown as FavoriteRow[]);
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  const removeFavorite = async (id: string) => {
    await supabase.from('favorites').delete().eq('id', id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const onRefresh = () => { setRefreshing(true); loadFavorites(); };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Meus favoritos</Text>
        <Text style={s.headerCount}>{favorites.length} {favorites.length === 1 ? 'personal' : 'personais'}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary[600]} />}
        contentContainerStyle={s.scroll}
      >
        {loading ? (
          <View style={s.centerBox}>
            <Text style={s.loadingText}>Carregando favoritos...</Text>
          </View>
        ) : favorites.length === 0 ? (
          <View style={s.emptyBox}>
            <View style={s.emptyIconWrap}>
              <Heart size={36} color={Colors.neutral[300]} />
            </View>
            <Text style={s.emptyTitle}>Nenhum personal favorito ainda</Text>
            <Text style={s.emptyDesc}>
              Ao visitar um perfil, toque no coração para salvar seus personais favoritos aqui.
            </Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/student/search')}>
              <Search size={15} color={Colors.white} />
              <Text style={s.emptyBtnText}>Explorar personais</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.grid}>
            {favorites.map((fav) => {
              const t = fav.trainer;
              const p = t?.profile;
              return (
                <TouchableOpacity
                  key={fav.id}
                  style={s.card}
                  onPress={() => router.push(`/trainer/${fav.trainer_id}`)}
                  activeOpacity={0.88}
                >
                  {/* Avatar */}
                  <View style={s.avatarWrap}>
                    {p?.avatar_url ? (
                      <Image source={{ uri: p.avatar_url }} style={s.avatar} />
                    ) : (
                      <View style={[s.avatar, s.avatarFallback]}>
                        <Text style={s.avatarInitial}>{p?.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={s.heartBtn}
                      onPress={() => removeFavorite(fav.id)}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      <Heart size={16} color={Colors.error[500]} fill={Colors.error[500]} />
                    </TouchableOpacity>
                  </View>

                  {/* Info */}
                  <Text style={s.name} numberOfLines={2}>{p?.full_name ?? '—'}</Text>

                  {t?.neighborhood ? (
                    <View style={s.locRow}>
                      <MapPin size={10} color={Colors.neutral[400]} />
                      <Text style={s.locText} numberOfLines={1}>{t.neighborhood}</Text>
                    </View>
                  ) : null}

                  {(t?.rating ?? 0) > 0 ? (
                    <View style={s.ratingRow}>
                      <Star size={11} color="#F59E0B" fill="#F59E0B" />
                      <Text style={s.ratingText}>{(t!.rating).toFixed(1)}</Text>
                    </View>
                  ) : null}

                  {t?.hourly_rate ? (
                    <Text style={s.price}>R$ {t.hourly_rate}<Text style={s.priceUnit}>/h</Text></Text>
                  ) : null}

                  <TouchableOpacity
                    style={s.profileBtn}
                    onPress={() => router.push(`/trainer/${fav.trainer_id}`)}
                  >
                    <MessageCircle size={12} color={Colors.primary[600]} />
                    <Text style={s.profileBtnText}>Ver perfil</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_WIDTH = '47%';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  headerTitle: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.neutral[900] },
  headerCount: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginTop: 2 },

  scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  loadingText: { color: Colors.neutral[500], fontSize: FontSizes.md },

  emptyBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.xxxl, paddingHorizontal: Spacing.xl,
  },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[700], textAlign: 'center', marginBottom: 6 },
  emptyDesc: { fontSize: FontSizes.md, color: Colors.neutral[500], textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.primary[600], borderRadius: BorderRadii.lg,
    paddingVertical: 12, paddingHorizontal: 20,
  },
  emptyBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  card: {
    width: CARD_WIDTH as any,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 5,
    ...Shadows.md,
  },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarFallback: {
    backgroundColor: Colors.primary[100],
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.primary[700] },
  heartBtn: {
    position: 'absolute', bottom: -2, right: -4,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    ...Shadows.sm,
  },
  name: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900], textAlign: 'center', lineHeight: 20 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locText: { fontSize: 10, color: Colors.neutral[500] },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700] },
  price: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.secondary[600] },
  priceUnit: { fontSize: 10, color: Colors.neutral[500], fontWeight: '500' },
  profileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: Colors.primary[200],
    borderRadius: BorderRadii.md, paddingVertical: 6, paddingHorizontal: 12, marginTop: 4,
  },
  profileBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.primary[600] },
});
