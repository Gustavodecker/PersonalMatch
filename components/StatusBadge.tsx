import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadii } from '@/constants/theme';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, any> = {
  success: { backgroundColor: Colors.success[50], color: Colors.success[700] },
  warning: { backgroundColor: Colors.warning[50], color: Colors.warning[700] },
  error: { backgroundColor: Colors.error[50], color: Colors.error[700] },
  info: { backgroundColor: Colors.primary[50], color: Colors.primary[700] },
  neutral: { backgroundColor: Colors.neutral[100], color: Colors.neutral[700] },
};

export function StatusBadge({ label, variant = 'neutral' }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: variantStyles[variant].backgroundColor }]}>
      <Text style={[styles.text, { color: variantStyles[variant].color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadii.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
});
