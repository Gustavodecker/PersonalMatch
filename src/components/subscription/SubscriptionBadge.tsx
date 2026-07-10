import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Zap, Crown, Shield } from 'lucide-react-native';

interface SubscriptionBadgeProps {
  plan: string;
  size?: 'sm' | 'md';
}

const PLAN_CONFIG: Record<string, { label: string; bg: string; color: string; Icon: any }> = {
  pro: { label: 'Pro', bg: '#EEF2FF', color: '#6366F1', Icon: Zap },
  premium: { label: 'Premium', bg: '#FFF7ED', color: '#F59E0B', Icon: Crown },
  free: { label: 'Free', bg: '#F3F4F6', color: '#6B7280', Icon: Shield },
  free_trial: { label: 'Trial', bg: '#F0FDF4', color: '#22C55E', Icon: Shield },
};

export default function SubscriptionBadge({ plan, size = 'md' }: SubscriptionBadgeProps) {
  const config = PLAN_CONFIG[plan?.toLowerCase()] ?? PLAN_CONFIG.free;
  const { label, bg, color, Icon } = config;
  const iconSize = size === 'sm' ? 12 : 14;
  const fontSize = size === 'sm' ? 11 : 13;
  const paddingH = size === 'sm' ? 8 : 10;
  const paddingV = size === 'sm' ? 3 : 4;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, paddingHorizontal: paddingH, paddingVertical: paddingV },
      ]}
    >
      <Icon size={iconSize} color={color} strokeWidth={2.5} />
      <Text style={[styles.label, { color, fontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    gap: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '700',
  },
});