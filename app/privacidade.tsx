import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, FontSizes, Spacing, Shadows } from '@/constants/theme';

export default function PrivacidadeScreen() {
  const [text, setText]       = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('privacy_text')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        setText(data?.privacy_text ?? null);
        setLoading(false);
      });
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Política de Privacidade</Text>
        <View style={s.backBtn} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary[600]} size="large" />
        </View>
      ) : !text ? (
        <View style={s.center}>
          <Shield size={40} color={Colors.neutral[300]} />
          <Text style={s.empty}>Política de privacidade não disponível no momento.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.card}>
            <Text style={s.body}>{text}</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.neutral[50] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  empty:  { fontSize: FontSizes.md, color: Colors.neutral[400], textAlign: 'center', marginTop: 8 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
    ...Shadows.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadows.sm,
  },
  body: {
    fontSize: FontSizes.md,
    lineHeight: 24,
    color: Colors.neutral[700],
  },
});
