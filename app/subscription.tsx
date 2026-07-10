import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { STRIPE_PRODUCTS } from '@/stripe-config';
import { createCheckoutSession, redirectToCheckout } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { useSubscription } from '@/hooks/useSubscription';
import PlanCard from '@/components/subscription/PlanCard';

export default function SubscriptionScreen() {
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = React.useState<string | undefined>(undefined);
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id);
    });
  }, []);

  const { planName, loading: subLoading } = useSubscription(userId);

  async function handleSelectPlan(priceId: string, mode: 'subscription' | 'payment') {
    setError(null);
    setLoadingPriceId(priceId);
    try {
      const url = await createCheckoutSession(priceId, mode);
      redirectToCheckout(url);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar pagamento');
    } finally {
      setLoadingPriceId(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planos</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Shield size={32} color="#6366F1" />
          </View>
          <Text style={styles.heroTitle}>Escolha seu plano</Text>
          <Text style={styles.heroSubtitle}>
            Aumente sua visibilidade e conquiste mais alunos com os planos SuperShape.
          </Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {STRIPE_PRODUCTS.map((product) => (
          <PlanCard
            key={product.priceId}
            product={product}
            isCurrentPlan={planName.toLowerCase() === product.name.toLowerCase()}
            loading={loadingPriceId === product.priceId}
            onSelect={() => handleSelectPlan(product.priceId, product.mode)}
          />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Cancele quando quiser • Cobrança mensal automática • Pagamento seguro via Stripe
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});