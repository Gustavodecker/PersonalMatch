import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSubscription } from '../hooks/useSubscription';

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratuito',
  free_trial: 'Teste grátis',
  pro: 'Pro',
  premium: 'Premium',
};

const PLAN_COLORS: Record<string, string> = {
  free: '#6B7280',
  free_trial: '#2563EB',
  pro: '#2563EB',
  premium: '#D97706',
};

interface Props {
  userId: string | undefined | null;
}

export function SubscriptionBadge({ userId }: Props) {
  const { planName, loading } = useSubscription(userId);

  if (loading || !planName) return null;

  const label = PLAN_LABELS[planName] ?? planName;
  const color = PLAN_COLORS[planName] ?? '#6B7280';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: `${color}18`, borderColor: `${color}40` },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});