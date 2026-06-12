import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
};

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  iconContainer: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: FontSizes.lg,
    color: Colors.neutral[700],
    textAlign: 'center',
    fontWeight: '700',
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.neutral[500],
    textAlign: 'center',
    maxWidth: 280,
  },
});
