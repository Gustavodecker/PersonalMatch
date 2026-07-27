import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { Review } from '@/types/database';
import {
  ChevronLeft, Star, MessageSquare, User,
} from 'lucide-react-native';

type ReviewRow = Review & { student?: { full_name: string; avatar_url: string | null } };

export default function ReviewsScreen() {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avg, setAvg] = useState(0);
  const [distribution, setDistribution] = useState<Record<number, number>>({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('reviews')
      .select('*, student:profiles!reviews_student_id_fkey(full_name, avatar_url)')
      .eq('trainer_id', profile.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    const rows = (data ?? []) as unknown as ReviewRow[];
    setReviews(rows);
    if (rows.length > 0) {
      const sum = rows.reduce((acc, r) => acc + r.rating, 0);
      setAvg(sum / rows.length);
      const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      rows.forEach((r) => { dist[r.rating] = (dist[r.rating] ?? 0) + 1; });
      setDistribution(dist);
    }
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <View style={s.headerTitleWrap}>
          <Text style={s.headerTitle}>Avaliações</Text>
          <Text style={s.headerSub}>{reviews.length} avaliaç{reviews.length !== 1 ? 'ões' : 'ão'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={s.scroll}
      >
        {/* Summary card */}
        <View style={s.summaryCard}>
          <View style={s.summaryLeft}>
            <Text style={s.summaryAvg}>{avg > 0 ? avg.toFixed(1) : '—'}</Text>
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={16}
                  color={n <= Math.round(avg) ? Colors.warning[500] : Colors.neutral[300]}
                  fill={n <= Math.round(avg) ? Colors.warning[500] : 'transparent'}
                />
              ))}
            </View>
            <Text style={s.summaryCount}>{reviews.length} avaliaç{reviews.length !== 1 ? 'ões' : 'ão'}</Text>
          </View>
          <View style={s.summaryRight}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star] ?? 0;
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <View key={star} style={s.distRow}>
                  <Text style={s.distStar}>{star}</Text>
                  <Star size={11} color={Colors.warning[500]} fill={Colors.warning[500]} />
                  <View style={s.distBar}>
                    <View style={[s.distBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={s.distCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Reviews list */}
        {loading ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyNote}>Carregando…</Text>
          </View>
        ) : reviews.length === 0 ? (
          <View style={s.emptyBox}>
            <View style={s.emptyIconWrap}>
              <MessageSquare size={28} color={Colors.neutral[300]} />
            </View>
            <Text style={s.emptyTitle}>Nenhuma avaliação ainda</Text>
            <Text style={s.emptyDesc}>
              Quando seus alunos avaliarem seu trabalho, as avaliações aparecerão aqui.
            </Text>
          </View>
        ) : (
          <View style={s.list}>
            {reviews.map((r) => {
              const name = r.student?.full_name ?? 'Aluno';
              const initial = name[0]?.toUpperCase() ?? '?';
              return (
                <View key={r.id} style={s.reviewCard}>
                  <View style={s.reviewHead}>
                    <View style={s.avatar}>
                      {r.student?.avatar_url ? null : <Text style={s.avatarText}>{initial}</Text>}
                    </View>
                    <View style={s.reviewInfo}>
                      <Text style={s.reviewName}>{name}</Text>
                      <View style={s.reviewMeta}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={11}
                            color={n <= r.rating ? Colors.warning[500] : Colors.neutral[300]}
                            fill={n <= r.rating ? Colors.warning[500] : 'transparent'}
                          />
                        ))}
                        <Text style={s.reviewDate}>{fmtDate(r.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                  {r.comment ? <Text style={s.reviewComment}>{r.comment}</Text> : null}
                </View>
              );
            })}
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

  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },

  summaryCard: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm,
  },
  summaryLeft: { alignItems: 'center', justifyContent: 'center', paddingRight: Spacing.lg },
  summaryAvg: { fontSize: 42, fontWeight: '800', color: Colors.neutral[900] },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 4 },
  summaryCount: { fontSize: FontSizes.xs, color: Colors.neutral[500], marginTop: 6, fontWeight: '600' },
  summaryRight: { flex: 1, justifyContent: 'center', gap: 4 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  distStar: { fontSize: FontSizes.xs, color: Colors.neutral[600], fontWeight: '700', width: 10 },
  distBar: { flex: 1, height: 7, borderRadius: 4, backgroundColor: Colors.neutral[100], overflow: 'hidden' },
  distBarFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.warning[500] },
  distCount: { fontSize: FontSizes.xs, color: Colors.neutral[500], fontWeight: '600', width: 22, textAlign: 'right' },

  list: { gap: 10 },

  reviewCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    padding: Spacing.md, ...Shadows.sm,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.secondary[100], alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.secondary[700] },
  reviewInfo: { flex: 1 },
  reviewName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  reviewDate: { fontSize: FontSizes.xs, color: Colors.neutral[400], marginLeft: 6 },
  reviewComment: {
    fontSize: FontSizes.sm, color: Colors.neutral[700], lineHeight: 20,
    marginTop: 10,
  },

  emptyBox: {
    marginTop: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: BorderRadii.xl,
    padding: Spacing.xl, ...Shadows.xs,
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyNote: { fontSize: FontSizes.md, color: Colors.neutral[400] },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[700], textAlign: 'center' },
  emptyDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20 },
});
