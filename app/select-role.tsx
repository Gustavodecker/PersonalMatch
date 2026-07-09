import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { Dumbbell, Search, ChevronRight } from 'lucide-react-native';

type Role = 'student' | 'trainer';

export default function SelectRoleScreen() {
  const { oauthUserMeta, completeOAuthSignup } = useAuth();
  const [selected, setSelected] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selected) return;
    setError(null);
    setLoading(true);
    const { error: err } = await completeOAuthSignup(selected);
    setLoading(false);
    if (err) {
      setError('Não foi possível criar seu perfil. Tente novamente.');
      return;
    }
    if (selected === 'trainer') {
      router.replace('/trainer/onboarding');
    } else {
      router.replace('/onboarding/student');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Dumbbell size={22} color={Colors.white} strokeWidth={2.5} />
          </View>
          <Text style={styles.appName}>99 Personal</Text>
        </View>

        {/* Avatar + greeting */}
        {oauthUserMeta && (
          <View style={styles.userRow}>
            {oauthUserMeta.avatarUrl ? (
              <Image source={{ uri: oauthUserMeta.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {oauthUserMeta.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userText}>
              <Text style={styles.greeting}>Olá, {oauthUserMeta.fullName.split(' ')[0]}!</Text>
              <Text style={styles.userEmail}>{oauthUserMeta.email}</Text>
            </View>
          </View>
        )}

        {/* Question */}
        <Text style={styles.question}>Como você deseja usar o 99 Personal?</Text>
        <Text style={styles.questionSub}>
          Escolha o perfil que melhor descreve você. Isso personaliza sua experiência.
        </Text>

        {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

        {/* Role cards */}
        <View style={styles.cards}>
          <TouchableOpacity
            style={[styles.card, selected === 'student' && styles.cardActive]}
            onPress={() => setSelected('student')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIcon, selected === 'student' && styles.cardIconActive]}>
              <Search size={28} color={selected === 'student' ? Colors.white : Colors.primary[600]} />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, selected === 'student' && styles.cardTitleActive]}>
                Quero encontrar um Personal
              </Text>
              <Text style={[styles.cardDesc, selected === 'student' && styles.cardDescActive]}>
                Busco um profissional qualificado para me ajudar a atingir meus objetivos.
              </Text>
            </View>
            <View style={[styles.radio, selected === 'student' && styles.radioActive]}>
              {selected === 'student' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, selected === 'trainer' && styles.cardActiveTrainer]}
            onPress={() => setSelected('trainer')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIcon, selected === 'trainer' && styles.cardIconActiveTrainer]}>
              <Dumbbell size={28} color={selected === 'trainer' ? Colors.white : Colors.secondary[600]} />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, selected === 'trainer' && styles.cardTitleActiveTrainer]}>
                Sou Personal Trainer
              </Text>
              <Text style={[styles.cardDesc, selected === 'trainer' && styles.cardDescActive]}>
                Quero criar meu perfil profissional, atrair alunos e expandir minha carteira.
              </Text>
            </View>
            <View style={[styles.radio, selected === 'trainer' && styles.radioActiveTrainer]}>
              {selected === 'trainer' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.btn, !selected && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!selected || loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.btnText}>Continuar</Text>
              <ChevronRight size={18} color={Colors.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary[700] },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.xxl,
  },
  logoWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primary[500],
    alignItems: 'center', justifyContent: 'center',
  },
  appName: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.white },

  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadii.lg, padding: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary[400],
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.white },
  userText: { flex: 1, gap: 2 },
  greeting: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white },
  userEmail: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.6)' },

  question: {
    fontSize: FontSizes.xxl, fontWeight: '900', color: Colors.white,
    letterSpacing: -0.5, marginBottom: Spacing.sm,
  },
  questionSub: {
    fontSize: FontSizes.md, color: 'rgba(255,255,255,0.6)',
    lineHeight: 22, marginBottom: Spacing.xl,
  },

  errorMsg: {
    backgroundColor: Colors.error[600],
    color: Colors.white,
    borderRadius: BorderRadii.md, padding: Spacing.md,
    fontSize: FontSizes.sm, marginBottom: Spacing.md,
  },

  cards: { gap: Spacing.md, marginBottom: Spacing.xl },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadii.xl, padding: Spacing.lg,
    borderWidth: 2.5, borderColor: 'transparent',
    ...Shadows.md,
  },
  cardActive: {
    borderColor: Colors.primary[400],
    backgroundColor: Colors.primary[50],
  },
  cardActiveTrainer: {
    borderColor: Colors.secondary[400],
    backgroundColor: Colors.secondary[50],
  },

  cardIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: Colors.primary[50],
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardIconActive: { backgroundColor: Colors.primary[600] },
  cardIconActiveTrainer: { backgroundColor: Colors.secondary[600] },

  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  cardTitleActive: { color: Colors.primary[800] },
  cardTitleActiveTrainer: { color: Colors.secondary[800] },
  cardDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], lineHeight: 19 },
  cardDescActive: { color: Colors.neutral[600] },

  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.neutral[300],
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  radioActive: { borderColor: Colors.primary[600] },
  radioActiveTrainer: { borderColor: Colors.secondary[600] },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary[600] },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    paddingVertical: 17,
    shadowColor: Colors.primary[900],
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.primary[700] },
});
