import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CircleCheck as CheckCircle, Hop as Home, CreditCard } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function SuccessScreen() {
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Wait a moment for webhook to process, then fetch subscription
    const timer = setTimeout(() => {
      fetchSubscriptionInfo();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const fetchSubscriptionInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('subscription_status, price_id, current_period_end')
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
      } else {
        setSubscriptionInfo(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEndDate = (timestamp: number | null) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString('pt-BR');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <CheckCircle size={80} color="#10b981" fill="#10b981" />
        </View>

        <Text style={styles.title}>Pagamento Confirmado!</Text>
        <Text style={styles.subtitle}>
          Sua assinatura foi ativada com sucesso
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>
              Processando sua assinatura...
            </Text>
          </View>
        ) : subscriptionInfo?.subscription_status === 'active' ? (
          <View style={styles.subscriptionInfo}>
            <Text style={styles.subscriptionTitle}>
              Assinatura Ativa
            </Text>
            <Text style={styles.subscriptionDetails}>
              Válida até {formatEndDate(subscriptionInfo.current_period_end)}
            </Text>
            <Text style={styles.successMessage}>
              Agora você tem acesso completo a todos os recursos da plataforma!
            </Text>
          </View>
        ) : (
          <View style={styles.processingInfo}>
            <Text style={styles.processingTitle}>
              Processamento em Andamento
            </Text>
            <Text style={styles.processingText}>
              Sua assinatura está sendo processada. Você receberá uma confirmação em breve.
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/')}
          >
            <Home size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Ir para Início</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/pricing')}
            >
              <CreditCard size={20} color="#2563eb" />
              <Text style={styles.secondaryButtonText}>Ver Meus Planos</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.supportInfo}>
          <Text style={styles.supportTitle}>Precisa de Ajuda?</Text>
          <Text style={styles.supportText}>
            Entre em contato com nosso suporte através do email:{'\n'}
            <Text style={styles.supportEmail}>suporte@supershape.com.br</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  subscriptionInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  subscriptionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 8,
  },
  subscriptionDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 20,
  },
  processingInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 12,
  },
  processingText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  supportInfo: {
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  supportEmail: {
    color: '#2563eb',
    fontWeight: '600',
  },
});