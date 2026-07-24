import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck as CheckCircle, ArrowRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useSubscription } from '@/src/hooks/useSubscription';

export default function SuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id);
      // Give webhook a moment to process
      setTimeout(() => setChecking(false), 2000);
    });
  }, []);

  const { planName } = useSubscription(userId);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <CheckCircle size={64} color="#22C55E" strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>Pagamento confirmado!</Text>
        <Text style={styles.subtitle}>
          Sua assinatura foi ativada com sucesso. Bem-vindo ao plano{' '}
          <Text style={styles.planName}>
            {checking ? '...' : planName.charAt(0).toUpperCase() + planName.slice(1)}
          </Text>
          !
        </Text>

        {checking && (
          <View style={styles.checkingRow}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={styles.checkingText}>Ativando seu plano...</Text>
          </View>
        )}

        <View style={styles.benefits}>
          <Text style={styles.benefitsTitle}>O que acontece agora?</Text>
          <Text style={styles.benefitItem}>✓ Seu perfil já está sendo destacado</Text>
          <Text style={styles.benefitItem}>✓ Novos recursos foram desbloqueados</Text>
          <Text style={styles.benefitItem}>✓ Você receberá um e-mail de confirmação</Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Ir para o início</Text>
          <ArrowRight size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/subscription')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Ver meu plano</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  iconWrapper: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  planName: {
    color: '#6366F1',
    fontWeight: '700',
  },
  checkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  checkingText: {
    fontSize: 14,
    color: '#6366F1',
  },
  benefits: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  benefitsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  benefitItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
});