import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Colors, FontSizes, BorderRadii } from '@/constants/theme';
import { Star, MapPin, BadgeCheck, Zap, Monitor, Users } from 'lucide-react-native';
import { TrainerWithProfile } from '@/types/database';

const COVER_PLACEHOLDER = 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=600&h=300&fit=crop';
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
  const location = [profile.city, trainer.neighborhood].filter(Boolean).join(', ');
  const modality = trainer.accepts_online && trainer.accepts_in_person
    ? 'Online + Presencial'
    : trainer.accepts_online ? 'Online' : 'Presencial';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.93}>
      {/* Cover */}
      <View style={styles.coverWrap}>
        <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
        <View style={styles.coverGradient} />
        <View style={styles.badges}>
          {trainer.is_featured && (
            <View style={styles.featuredBadge}>
              <Zap size={9} color={Colors.warning[700]} fill={Colors.warning[500]} />
              <Text style={styles.featuredText}>Destaque</Text>
            </View>
          )}
          {trainer.is_verified && (
            <View style={styles.verifiedBadge}>
              <BadgeCheck size={9} color={Colors.primary[700]} />
              <Text style={styles.verifiedText}>Verificado</Text>
            </View>
          )}
        </View>
        {trainer.rating > 0 && (
          <View style={styles.ratingBubble}>
            <Star size={11} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>{trainer.rating.toFixed(1)}</Text>
            {trainer.review_count > 0 && (
              <Text style={styles.ratingCount}>({trainer.review_count})</Text>
            )}
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <View style={styles.nameBlock}>
            <Text style={styles.name} numberOfLines={1}>{profile.full_name}</Text>
            {location ? (
              <View style={styles.locRow}>
                <MapPin size={11} color={Colors.neutral[400]} />
                <Text style={styles.locText} numberOfLines={1}>{location}</Text>
              </View>
            ) : null}
          </View>
          {trainer.hourly_rate ? (
            <View style={styles.priceTag}>
              <Text style={styles.priceVal}>R$ {trainer.hourly_rate}</Text>
              <Text style={styles.priceUnit}>/h</Text>
            </View>
          ) : null}
        </View>

        {specialties && specialties.length > 0 && (
          <View style={styles.tags}>
            {specialties.slice(0, 3).map((s) => (
              <View key={s.id} style={styles.tag}>
                <Text style={styles.tagText}>{s.name}</Text>
              </View>
            ))}
            {specialties.length > 3 && (
              <Text style={styles.tagMore}>+{specialties.length - 3}</Text>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.modalityRow}>
            {trainer.accepts_online
              ? <Monitor size={12} color={Colors.primary[500]} />
              : <Users size={12} color={Colors.neutral[500]} />}
            <Text style={styles.modalityText}>{modality}</Text>
          </View>
          {!trainer.hourly_rate && (
            <Text style={styles.consultText}>Consulte</Text>
          )}
          {trainer.experience_years > 0 && (
            <View style={styles.expTag}>
              <Text style={styles.expText}>{trainer.experience_years} anos exp.</Text>
            </View>
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
    overflow: 'hidden',
    shadowColor: '#1E3BBD',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
    elevation: 7,
  },
  coverWrap: { height: 170, position: 'relative' },
  cover: { width: '100%', height: '100%' },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,31,111,0.20)',
  },
  badges: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 5 },
  featuredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(254,243,199,0.97)', paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 999,
  },
  featuredText: { fontSize: 10, fontWeight: '700', color: Colors.warning[700] },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(224,231,255,0.97)', paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 999,
  },
  verifiedText: { fontSize: 10, fontWeight: '700', color: Colors.primary[700] },
  ratingBubble: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.97)', paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
  },
  ratingText: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.neutral[900] },
  ratingCount: { fontSize: 10, color: Colors.neutral[500] },

  body: { padding: 14, paddingTop: 12, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    borderWidth: 3, borderColor: Colors.white,
    backgroundColor: Colors.neutral[200],
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4,
    elevation: 3,
  },
  nameBlock: { flex: 1 },
  name: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locText: { fontSize: FontSizes.xs, color: Colors.neutral[500] },
  priceTag: { alignItems: 'flex-end' },
  priceVal: { fontSize: FontSizes.lg, fontWeight: '800', color: '#15803D' },
  priceUnit: { fontSize: 10, color: Colors.neutral[400] },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: {
    backgroundColor: Colors.primary[50], paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1, borderColor: Colors.primary[100],
  },
  tagText: { fontSize: 10, fontWeight: '700', color: Colors.primary[700] },
  tagMore: { fontSize: 10, color: Colors.neutral[400], alignSelf: 'center', paddingHorizontal: 4 },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.neutral[100],
  },
  modalityRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  modalityText: { fontSize: FontSizes.xs, color: Colors.neutral[600], fontWeight: '500' },
  consultText: { fontSize: FontSizes.xs, color: Colors.neutral[400], fontStyle: 'italic' },
  expTag: {
    backgroundColor: Colors.neutral[100], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  expText: { fontSize: 10, fontWeight: '600', color: Colors.neutral[600] },
});
