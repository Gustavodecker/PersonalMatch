import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Loader, Star, Monitor, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { PLANS, Plan } from '@/src/stripe-config';
import { router } from 'expo-router';

const IS_WEB = Platform.OS === 'web';

interface UserSubscription {
  subscription_status: string | null;
  price_id: string | null;
  current_period_end: number | null;
}

export default function PricingScreen() {
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);

  useEffect(() => {
    fetchUserSubscription();
  }, []);

  const fetchUserSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('stripe_user_subscriptions')
        .select('subscription_status, price_id, current_period_end')
        .maybeSingle();
      setUserSubscription(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (product: Plan) => {
    if (!IS_WEB) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setCheckoutLoading(product.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        Alert.alert('Erro', 'Sessão inválida. Faça login novamente.');
        return;
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.EXPO_PUBLIC_WEB_URL ?? '');

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'checkout',
            planId: product.id,
            successUrl: `${origin}/success`,
            cancelUrl: `${origin}/pricing`,
          }),
        }
      );

      const result = await response.json();
      if (result.error) { Alert.alert('Erro', result.error); return; }
      if (result.url && IS_WEB) {
        (window as any).location.href = result.url;
      }
    } catch (err) {
      Alert.alert('Erro', 'Falha ao iniciar checkout. Tente novamente.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const isCurrentPlan = (priceId: string) =>
    userSubscription?.price_id === priceId &&
    userSubscription?.subscription_status === 'active';

  const formatEndDate = (timestamp: number | null) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString('pt-BR');
  };

  if (!IS_WEB) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
        </View>
        <View style={styles.mobileOnlyWrap}>
          <Monitor size={40} color="#6b7280" />
          <Text style={styles.mobileOnlyTitle}>Assinatura disponível na web</Text>
          <Text style={styles.mobileOnlyText}>
            Para assinar ou gerenciar sua assinatura, acesse a versão web.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Carregando planos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Escolha seu Plano</Text>
          <Text style={styles.subtitle}>
            Escolha o plano ideal para o seu negócio de personal trainer
          </Text>
        </View>

        {userSubscription?.subscription_status === 'active' && (
          <View style={styles.currentPlanBanner}>
            <Star size={20} color="#f59e0b" fill="#f59e0b" />
            <Text style={styles.currentPlanText}>
              Plano ativo até {formatEndDate(userSubscription.current_period_end)}
            </Text>
          </View>
        )}

        <View style={styles.plansContainer}>
          {PLANS.filter((p) => p.id !== 'free' && p.id !== 'free_trial').map((product: Plan, index: number) => {
            const isCurrent = isCurrentPlan(product.priceId ?? '');
            const isLoading = checkoutLoading === product.id;

            return (
              <View
                key={product.id}
                style={[
                  styles.planCard,
                  index === 0 && styles.popularCard,
                  isCurrent && styles.currentCard,
                ]}
              >
                {index === 0 && !isCurrent && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>MAIS POPULAR</Text>
                  </View>
                )}
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentText}>PLANO ATUAL</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{product.name}</Text>
                  <Text style={styles.planDescription}>{product.description}</Text>
                </View>

                <View style={styles.priceContainer}>
                  <Text style={styles.price}>{product.priceLabel}</Text>
                </View>

                <View style={styles.featuresContainer}>
                  {product.features.map((feature: string, idx: number) => (
                    <View key={idx} style={styles.feature}>
                      <Check size={16} color="#10b981" />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {IS_WEB ? (
                  <TouchableOpacity
                    style={[
                      styles.subscribeButton,
                      index === 0 && styles.popularButton,
                      isCurrent && styles.currentButton,
                      isLoading && styles.loadingButton,
                    ]}
                    onPress={() => !isCurrent && !isLoading && handleSubscribe(product)}
                    disabled={isCurrent || isLoading}
                  >
                    {isLoading ? (
                      <View style={styles.loadingButtonContent}>
                        <Loader size={20} color="#ffffff" />
                        <Text style={styles.loadingButtonText}>Processando...</Text>
                      </View>
                    ) : isCurrent ? (
                      <Text style={styles.currentButtonText}>Plano Ativo</Text>
                    ) : (
                      <Text style={[styles.subscribeButtonText, index === 0 && styles.popularButtonText]}>
                        Assinar Agora
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.mobileNotice}>
                    <Monitor size={14} color="#6b7280" />
                    <Text style={styles.mobileNoticeText}>
                      Para assinar ou gerenciar sua assinatura, acesse a versão web.
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            • Cancelamento a qualquer momento{'\n'}
            • Suporte 24/7{'\n'}
            • Garantia de satisfação
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6b7280' },
  topBar: { paddingHorizontal: 16, paddingTop: 8 },
  backBtn: { padding: 8, alignSelf: 'flex-start' },
  header: { padding: 24, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 24 },
  currentPlanBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fef3c7', marginHorizontal: 24, paddingVertical: 12,
    paddingHorizontal: 16, borderRadius: 12, marginBottom: 24,
  },
  currentPlanText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#92400e' },
  plansContainer: { paddingHorizontal: 24, gap: 16 },
  planCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#e5e7eb', position: 'relative',
  },
  popularCard: { borderColor: '#2563eb', borderWidth: 2 },
  currentCard: { borderColor: '#10b981', borderWidth: 2, backgroundColor: '#f0fdf4' },
  popularBadge: {
    position: 'absolute', top: -12, left: 24,
    backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },
  popularText: { fontSize: 12, fontWeight: 'bold', color: '#ffffff' },
  currentBadge: {
    position: 'absolute', top: -12, left: 24,
    backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },
  currentText: { fontSize: 12, fontWeight: 'bold', color: '#ffffff' },
  planHeader: { marginBottom: 16 },
  planName: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  planDescription: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  priceContainer: { marginBottom: 24 },
  price: { fontSize: 36, fontWeight: 'bold', color: '#1f2937' },
  featuresContainer: { marginBottom: 32, gap: 12 },
  feature: { flexDirection: 'row', alignItems: 'center' },
  featureText: { marginLeft: 12, fontSize: 14, color: '#374151', flex: 1, lineHeight: 20 },
  subscribeButton: {
    backgroundColor: '#f3f4f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center',
  },
  popularButton: { backgroundColor: '#2563eb' },
  currentButton: { backgroundColor: '#10b981' },
  loadingButton: { backgroundColor: '#9ca3af' },
  loadingButtonContent: { flexDirection: 'row', alignItems: 'center' },
  loadingButtonText: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#ffffff' },
  subscribeButtonText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  popularButtonText: { color: '#ffffff' },
  currentButtonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  footer: { padding: 24, alignItems: 'center' },
  footerText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  mobileNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f3f4f6', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
  },
  mobileNoticeText: { flex: 1, fontSize: 13, color: '#6b7280', lineHeight: 18 },
  mobileOnlyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 16,
  },
  mobileOnlyTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937', textAlign: 'center' },
  mobileOnlyText: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
});
