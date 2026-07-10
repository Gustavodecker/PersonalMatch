import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle, ArrowRight } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export default function CheckoutSuccessScreen() {
  const router = useRouter();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 180 });
    opacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(200, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Animated.View style={[styles.iconWrapper, iconStyle]}>
          <CheckCircle size={64} color="#16A34A" strokeWidth={1.5} />
        </Animated.View>

        <Animated.View style={[styles.textContent, contentStyle]}>
          <Text style={styles.title}>Assinatura Confirmada!</Text>
          <Text style={styles.subtitle}>
            Seu plano foi ativado com sucesso. Agora você tem acesso a todos os
            recursos do seu novo plano.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Você receberá um e-mail de confirmação em breve com os detalhes da
              sua assinatura.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/')}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Ir para o Início</Text>
            <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.replace('/planos')}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>Ver meu plano</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 440,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  iconWrapper: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#BBF7D0',
  },
  textContent: { alignItems: 'center', width: '100%' },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkButton: { paddingVertical: 8 },
  linkText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
});