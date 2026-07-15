import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { STRIPE_PRODUCTS, StripeProduct } from '../../src/stripe-config';
import { createCheckoutSession } from '../../src/lib/checkout';
import { useSubscription } from '../../src/hooks/useSubscription';
import { PlanCard } from '../../components/subscription/PlanCard';
import { CurrentPlanBadge } from '../../components/subscription/CurrentPlanBadge';

export default function SubscriptionScreen() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { product: currentProduct, isActive } = useSubscription();

  const handleSelect = async (product: StripeProduct) => {
    setLoadingId(product.priceId);
    try {
      const { url } = await createCheckoutSession(product.priceId, product.mode);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = url;
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível iniciar o pagamento.');
      setLoadingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Escolha seu plano</Text>
          <Text style={styles.heroSubtitle}>
            Destaque seu perfil e conquiste mais alunos com os planos PersonalMatch
          </Text>
          {isActive && currentProduct && (
            <View style={styles.currentPlanRow}>
              <Text style={styles.currentPlanLabel}>Seu plano atual:</Text>
              <CurrentPlanBadge />
            </View>
          )}
        </View>

        {STRIPE_PRODUCTS.map((product) => (
          <PlanCard
            key={product.priceId}
            product={product}
            isCurrentPlan={isActive && currentProduct?.priceId === product.priceId}
            isPopular={product.name === 'Premium'}
            loadingId={loadingId}
            onSelect={handleSelect}
          />
        ))}

        <View style={styles.trustRow}>
          <ShieldCheck size={16} color="#6B7280" />
          <Text style={styles.trustText}>
            Pagamento seguro via Stripe · Cancele quando quiser
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#111827' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  heroSection: { marginBottom: 24 },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  currentPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currentPlanLabel: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#6B7280' },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  trustText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});