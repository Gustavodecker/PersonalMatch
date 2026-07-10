import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Check, Zap, Crown } from 'lucide-react-native';
import { StripeProduct } from '@/src/stripe-config';

interface PlanCardProps {
  product: StripeProduct;
  isCurrentPlan: boolean;
  loading: boolean;
  onSelect: () => void;
}

const COLORS = {
  pro: { bg: '#EEF2FF', border: '#6366F1', badge: '#6366F1', text: '#4338CA' },
  premium: { bg: '#FFF7ED', border: '#F59E0B', badge: '#F59E0B', text: '#B45309' },
};

export default function PlanCard({ product, isCurrentPlan, loading, onSelect }: PlanCardProps) {
  const isPremium = product.name.toLowerCase() === 'premium';
  const colors = isPremium ? COLORS.premium : COLORS.pro;
  const Icon = isPremium ? Crown : Zap;

  return (
    <View style={[styles.card, { borderColor: colors.border }, isCurrentPlan && styles.currentCard]}>
      {isCurrentPlan && (
        <View style={[styles.currentBadge, { backgroundColor: colors.badge }]}>
          <Text style={styles.currentBadgeText}>Plano atual</Text>
        </View>
      )}

      <View style={[styles.iconWrapper, { backgroundColor: colors.bg }]}>
        <Icon size={28} color={colors.badge} />
      </View>

      <Text style={styles.planName}>{product.name}</Text>
      <Text style={styles.planDesc}>{product.description}</Text>

      <View style={styles.priceRow}>
        <Text style={styles.currency}>{product.currencySymbol}</Text>
        <Text style={styles.price}>{product.price.toFixed(2).replace('.', ',')}</Text>
        <Text style={styles.period}>/mês</Text>
      </View>

      <View style={styles.features}>
        {product.features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Check size={16} color="#22C55E" strokeWidth={2.5} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: isCurrentPlan ? '#E5E7EB' : colors.badge },
        ]}
        onPress={onSelect}
        disabled={isCurrentPlan || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.buttonText, isCurrentPlan && styles.buttonTextDisabled]}>
            {isCurrentPlan ? 'Plano ativo' : `Assinar ${product.name}`}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  currentCard: {
    shadowOpacity: 0.12,
  },
  currentBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  currency: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    marginRight: 2,
  },
  price: {
    fontSize: 40,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 44,
  },
  period: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 6,
    marginLeft: 4,
  },
  features: {
    gap: 10,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
  },
});