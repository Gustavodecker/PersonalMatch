import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Crown, Zap } from 'lucide-react-native';
import { useSubscription } from '../../src/hooks/useSubscription';

interface CurrentPlanBadgeProps {
  compact?: boolean;
}

export function CurrentPlanBadge({ compact = false }: CurrentPlanBadgeProps) {
  const { loading, product, isActive, subscription } = useSubscription();

  if (loading) return null;

  const isPremium = product?.name === 'Premium';
  const isPro = product?.name === 'Pro';

  if (!isActive || !product) {
    if (compact) return null;
    return (
      <View style={styles.freeBadge}>
        <Text style={styles.freeText}>Plano Gratuito</Text>
      </View>
    );
  }

  const Icon = isPremium ? Crown : Zap;
  const badgeStyle = isPremium ? styles.premiumBadge : styles.proBadge;
  const textStyle = isPremium ? styles.premiumText : styles.proText;

  return (
    <View style={[badgeStyle, compact && styles.compact]}>
      <Icon size={compact ? 12 : 14} color={isPremium ? '#B45309' : '#4C1D95'} />
      <Text style={[textStyle, compact && styles.compactText]}>
        {product.name}
        {!compact && subscription?.subscription_status === 'trialing' ? ' (Trial)' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  freeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  freeText: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#6B7280' },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  premiumText: { fontSize: 12, fontFamily: 'Inter-SemiBold', color: '#B45309' },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  proText: { fontSize: 12, fontFamily: 'Inter-SemiBold', color: '#4C1D95' },
  compact: { paddingHorizontal: 8, paddingVertical: 3 },
  compactText: { fontSize: 11 },
});