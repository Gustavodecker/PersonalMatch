import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { Star, MapPin, BadgeCheck, Zap, Monitor, Users } from 'lucide-react-native';
import { TrainerWithProfile } from '@/types/database';

const COVER_PLACEHOLDER = 'https://images.pexels.com/photos/1552249/pexels-photo-1552249.jpeg?auto=compress&cs=tinysrgb&w=600&h=300&fit=crop';
const AVATAR_PLACEHOLDER = 'https://images.pexels.com/photos/6551133/pexels-photo-6551133.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop';

export function TrainerCard({
  trainer,
  onPress,
}: {
  trainer: TrainerWithProfile;
  onPress?: () => void;
}) {
  const { profile, specialties } = trainer;
  const coverUrl = trainer.cover_photo_url ?? COVER_PLACEHOLDER;
  const avatarUrl = profile.avatar_url ?? AVATAR_PLACEHOLDER;
  const location = [profile.city, trainer.neighborhood].filter(Boolean).join(' · ');
  const modality =
    trainer.accepts_online && trainer.accepts_in_person
      ? 'Online + Presencial'
      : trainer.accepts_online
      ? 'Online'
      : 'Presencial';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Cover with gradient overlay */}
      <View style={styles.coverWrap}>
        <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(10,20,60,0.72)']}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Badges top-left */}
        <View style={styles.badges}>
          {trainer.is_featured && (
            <View style={styles.featuredBadge}>
              <Zap size={9} color="#B45309" fill="#F59E0B" />
              <Text style={styles.featuredText}>Destaque</Text>
            </View>
          )}
          {trainer.is_verified && (
            <View style={styles.verifiedBadge}>
              <BadgeCheck size={9} color={Colors.primary[600]} />
              <Text style={styles.verifiedText}>Verificado</Text>
            </View>
          )}
        </View>

        {/* Rating bottom-right */}
        {trainer.rating > 0 && (
          <View style={styles.ratingBubble}>
            <Star size={11} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>{trainer.rating.toFixed(1)}</Text>
            {trainer.review_count > 0 && (
              <Text style={styles.ratingCount}>{trainer.review_count}</Text>
            )}
          </View>
        )}

        {/* Avatar + name over gradient at cover bottom */}
        <View style={styles.coverBottom}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <View style={styles.nameBlock}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.full_name}
            </Text>
            {location ? (
              <View style={styles.locRow}>
                <MapPin size={10} color="rgba(255,255,255,0.7)" />
                <Text style={styles.locText} numberOfLines={1}>
                  {location}
                </Text>
              </View>
            ) : null}
          </View>
          {trainer.hourly_rate ? (
            <View style={styles.priceTag}>
              <Text style={styles.priceVal}>R${trainer.hourly_rate}</Text>
              <Text style={styles.priceUnit}>/h</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Card body */}
      <View style={styles.body}>
        {specialties && specialties.length > 0 && (
          <View style={styles.tags}>
            {specialties.slice(0, 3).map((s) => (
              <View key={s.id} style={styles.tag}>
                <Text style={styles.tagText}>{s.name}</Text>
              </View>
            ))}
            {specialties.length > 3 && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>+{specialties.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.modalityRow}>
            {trainer.accepts_online ? (
              <Monitor size={13} color={Colors.primary[500]} />
            ) : (
              <Users size={13} color={Colors.neutral[500]} />
            )}
            <Text style={styles.modalityText}>{modality}</Text>
          </View>
          {trainer.experience_years > 0 && (
            <View style={styles.expTag}>
              <Text style={styles.expText}>{trainer.experience_years} anos</Text>
            </View>
          )}
          {!trainer.hourly_rate && (
            <Text style={styles.consultText}>Consulte</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    ...Shadows.md,
    overflow: 'hidden',
  },

  coverWrap: { height: 190, position: 'relative' },
  cover: { width: '100%', height: '100%' },

  badges: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 5 },
  featuredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,251,235,0.96)', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 999,
  },
  featuredText: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(232,242,255,0.96)', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 999,
  },
  verifiedText: { fontSize: 10, fontWeight: '700', color: Colors.primary[600] },

  ratingBubble: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.97)', paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 999,
    ...Shadows.xs,
  },
  ratingText: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.neutral[900] },
  ratingCount: { fontSize: 10, color: Colors.neutral[500] },

  coverBottom: {
    position: 'absolute', bottom: 12, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: Colors.neutral[300],
    flexShrink: 0,
  },
  nameBlock: { flex: 1 },
  name: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white, letterSpacing: -0.2 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locText: { fontSize: 11, color: 'rgba(255,255,255,0.75)', flex: 1 },
  priceTag: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  priceVal: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.white },
  priceUnit: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },

  body: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 10 },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: {
    backgroundColor: Colors.primary[50], paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1, borderColor: Colors.primary[100],
  },
  tagText: { fontSize: 11, fontWeight: '600', color: Colors.primary[700] },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.neutral[100],
  },
  modalityRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  modalityText: { fontSize: FontSizes.sm, color: Colors.neutral[600], fontWeight: '500' },
  consultText: { fontSize: FontSizes.sm, color: Colors.neutral[400], fontStyle: 'italic' },
  expTag: {
    backgroundColor: Colors.neutral[100], paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999,
  },
  expText: { fontSize: 11, fontWeight: '600', color: Colors.neutral[600] },
});
