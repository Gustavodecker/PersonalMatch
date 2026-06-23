import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Check, Zap } from 'lucide-react-native';
import { StripeProduct, formatPrice } from '../../src/stripe-config';

interface PlanCardProps {
  product: StripeProduct;
  isCurrentPlan: boolean;
  isPopular?: boolean;
  loadingId: string | null;
  onSelect: (product: StripeProduct) => void;
}

export function PlanCard({
  product,
  isCurrentPlan,
  isPopular,
  loadingId,
  onSelect,
}: PlanCardProps) {
  const isLoading = loadingId === product.priceId;
  const isDisabled = !!loadingId || isCurrentPlan;

  return (
    <View style={[styles.card, isPopular && styles.popularCard]}>
      {isPopular && (
        <View style={styles.popularBadge}>
          <Zap size={12} color="#fff" />
          <Text style={styles.popularText}>Mais Popular</Text>
        </View>
      )}

      <Text style={[styles.planName, isPopular && styles.popularPlanName]}>
        {product.name}
      </Text>
      <Text style={styles.description}>{product.description}</Text>

      <View style={styles.priceRow}>
        <Text style={[styles.price, isPopular && styles.popularPrice]}>
          {formatPrice(product)}
        </Text>
        <Text style={styles.period}>/mês</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.features}>
        {product.features.map((feature, i) => (
          <View key={i} style={styles.featureRow}>
            <Check size={15} color={isPopular ? '#6C63FF' : '#10B981'} strokeWidth={2.5} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          isPopular && styles.popularButton,
          isCurrentPlan && styles.currentButton,
        ]}
        onPress={() => onSelect(product)}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>
            {isCurrentPlan ? 'Plano Atual' : 'Assinar agora'}
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
    padding: 24,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  popularCard: {
    borderColor: '#6C63FF',
    borderWidth: 2,
    shadowColor: '#6C63FF',
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6C63FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
  },
  popularText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.3,
  },
  planName: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 6,
  },
  popularPlanName: { color: '#6C63FF' },
  description: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 16,
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 16 },
  price: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  popularPrice: { color: '#6C63FF' },
  period: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#9CA3AF', marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 16 },
  features: { gap: 10, marginBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#374151', flex: 1 },
  button: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  popularButton: { backgroundColor: '#6C63FF' },
  currentButton: { backgroundColor: '#D1D5DB' },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
  },
});