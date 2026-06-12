import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { CheckCircle } from 'lucide-react-native';

export default function AssinaturaSucesso() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/trainer/assinatura'), 3500);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={s.root}>
      <CheckCircle size={64} color={Colors.secondary[500]} />
      <Text style={s.title}>Assinatura confirmada!</Text>
      <Text style={s.sub}>Seu plano foi ativado com sucesso. Redirecionando...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, gap: Spacing.md, padding: Spacing.xl },
  title: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.neutral[900], textAlign: 'center' },
  sub: { fontSize: FontSizes.md, color: Colors.neutral[500], textAlign: 'center', lineHeight: 22 },
});
