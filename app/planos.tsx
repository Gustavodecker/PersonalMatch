import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Zap } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { PlanCard } from '@/components/PlanCard';
import { PRODUCTS_LIST } from '@/stripe-config';
import type { StripeProduct } from '@/stripe-config';
import { createCheckoutSession } from '@/lib/checkout';

export default function PlanosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { plan: currentPlan } = useSubscription(user?.id);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = useCallback(
    async (product: StripeProduct) => {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      setError(null);
      setLoadingId(product.priceId);

      try {
        const { url } = await createCheckoutSession(product.priceId, product.mode);
        if (Platform.OS === 'web') {
          window.location.href = url;
        }
      } catch (e: any) {
        setError(e.message ?? 'Erro ao iniciar pagamento. Tente novamente.');
        if (Platform.OS !== 'web') {
          Alert.alert('Erro', e.message ?? 'Erro ao iniciar pagamento.');
        }
      } finally {
        setLoadingId(null);
      }
    },
    [user, router],
  );

  const isPlanCurrent = (product: StripeProduct) =>
    currentPlan?.toLowerCase() === product.name.toLowerCase();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planos</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.iconWrapper}>
            <Zap size={28} color="#2563EB" fill="#2563EB" />
          </View>
          <Text style={styles.title}>Escolha seu Plano</Text>
          <Text style={styles.subtitle}>
            Impulsione sua carreira e alcance mais alunos com os planos SuperShape
          </Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.cardsContainer}>
          {PRODUCTS_LIST.map((product) => (
            <PlanCard
              key={product.priceId}
              product={product}
              isCurrentPlan={isPlanCurrent(product)}
              isFeatured={product.name === 'Premium'}
              loadingId={loadingId}
              onSelect={handleSelect}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Cancele a qualquer momento. Sem fidelidade.
          </Text>
          <Text style={styles.footerText}>
            Pagamento processado com segurança via Stripe.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  content: { padding: 20, paddingBottom: 48 },
  heroSection: { alignItems: 'center', marginBottom: 32, marginTop: 8 },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, maxWidth: 300 },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  errorText: { color: '#B91C1C', fontSize: 14, textAlign: 'center' },
  cardsContainer: { gap: 16 },
  footer: { marginTop: 32, alignItems: 'center', gap: 6 },
  footerText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
});