import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Check, Star } from 'lucide-react-native';
import type { StripeProduct } from '../stripe-config';

interface Props {
  product: StripeProduct;
  isCurrentPlan: boolean;
  isFeatured?: boolean;
  loadingId: string | null;
  onSelect: (product: StripeProduct) => void;
}

export function PlanCard({
  product,
  isCurrentPlan,
  isFeatured = false,
  loadingId,
  onSelect,
}: Props) {
  const accent = isFeatured ? '#7C3AED' : '#2563EB';
  const isLoading = loadingId === product.priceId;
  const anyLoading = loadingId !== null;
  const formattedPrice = product.price.toFixed(2).replace('.', ',');

  return (
    <View style={[styles.card, isFeatured && styles.cardFeatured, isFeatured && { borderColor: accent }]}>
      {isFeatured && (
        <View style={[styles.badge, { backgroundColor: accent }]}>
          <Star size={11} color="#fff" fill="#fff" />
          <Text style={styles.badgeText}>Mais Popular</Text>
        </View>
      )}

      <Text style={[styles.planName, { color: accent }]}>{product.name}</Text>
      <Text style={styles.description}>{product.description}</Text>

      <View style={styles.priceRow}>
        <Text style={[styles.currency, { color: accent }]}>{product.currencySymbol}</Text>
        <Text style={[styles.price, { color: accent }]}>{formattedPrice}</Text>
        <Text style={styles.period}>/mês</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.featuresList}>
        {product.features.map((f, i) => (
          <View key={i} style={styles.featureItem}>
            <View style={[styles.checkCircle, { backgroundColor: `${accent}15` }]}>
              <Check size={12} color={accent} strokeWidth={3} />
            </View>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          isCurrentPlan
            ? styles.buttonCurrent
            : { backgroundColor: accent },
        ]}
        onPress={() => !isCurrentPlan && !anyLoading && onSelect(product)}
        disabled={isCurrentPlan || anyLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.buttonText, isCurrentPlan && styles.buttonTextCurrent]}>
            {isCurrentPlan ? 'Plano Atual' : 'Assinar Agora'}
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
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
    overflow: 'visible',
  },
  cardFeatured: {
    borderWidth: 2,
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  planName: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  description: { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 20 },
  currency: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  price: { fontSize: 42, fontWeight: '800', lineHeight: 48 },
  period: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 20 },
  featuresList: { gap: 12, marginBottom: 24 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 14, color: '#374151', flex: 1, lineHeight: 20 },
  button: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  buttonCurrent: { backgroundColor: '#F3F4F6' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  buttonTextCurrent: { color: '#9CA3AF' },
});