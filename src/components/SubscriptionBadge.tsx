import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PLAN_COLORS, PLAN_LABELS } from '../stripe-config';
import { useSubscription } from '../hooks/useSubscription';

interface Props {
  userId: string | undefined | null;
}

export function SubscriptionBadge({ userId }: Props) {
  const { plan, loading } = useSubscription(userId);

  if (loading || !plan) return null;

  const label = PLAN_LABELS[plan] ?? plan;
  const color = PLAN_COLORS[plan] ?? '#6B7280';

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