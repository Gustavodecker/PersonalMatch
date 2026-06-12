import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { Star } from 'lucide-react-native';

type StarRatingProps = {
  rating: number;
  size?: number;
  showValue?: boolean;
  showCount?: boolean;
  count?: number;
};

export function StarRating({
  rating,
  size = 14,
  showValue = true,
  showCount,
  count,
}: StarRatingProps) {
  const rounded = Math.round(rating);
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          color={n <= rounded ? Colors.warning[500] : Colors.neutral[300]}
          fill={n <= rounded ? Colors.warning[500] : 'transparent'}
        />
      ))}
      {showValue && rating > 0 ? (
        <Text style={styles.value}>{rating.toFixed(1)}</Text>
      ) : null}
      {showCount && count !== undefined ? (
        <Text style={styles.count}>({count})</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  value: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[700],
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },
  count: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[500],
    marginLeft: 2,
  },
});
