import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { CircleCheck as CheckCircle, ArrowRight } from 'lucide-react-native';
import { useSubscription } from '../../src/hooks/useSubscription';
import { CurrentPlanBadge } from '../../components/subscription/CurrentPlanBadge';

export default function SubscriptionSuccessScreen() {
  const { product, refetch } = useSubscription();

  useEffect(() => {
    refetch();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <CheckCircle size={72} color="#10B981" strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>Pagamento confirmado!</Text>
        <Text style={styles.subtitle}>
          Seu plano foi ativado com sucesso. Aproveite todos os recursos disponíveis.
        </Text>

        {product && (
          <View style={styles.planBox}>
            <Text style={styles.planBoxLabel}>Plano ativo</Text>
            <CurrentPlanBadge />
          </View>
        )}

        <View style={styles.benefitsBox}>
          <Text style={styles.benefitsTitle}>O que acontece agora?</Text>
          {[
            'Seu perfil já está com o novo plano ativo',
            'Novos recursos estão disponíveis imediatamente',
            'Você receberá um e-mail de confirmação do Stripe',
          ].map((item, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={styles.dot} />
              <Text style={styles.benefitText}>{item}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Ir para o início</Text>
          <ArrowRight size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/subscription')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Ver detalhes do plano</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginBottom: 24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  planBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  planBoxLabel: { fontSize: 13, fontFamily: 'Inter-Regular', color: '#6B7280' },
  benefitsBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },
  benefitsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#065F46',
    marginBottom: 4,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginTop: 6,
  },
  benefitText: { fontSize: 13, fontFamily: 'Inter-Regular', color: '#065F46', flex: 1, lineHeight: 20 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },
  secondaryButton: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: { fontSize: 14, fontFamily: 'Inter-Medium', color: '#6B7280' },
});