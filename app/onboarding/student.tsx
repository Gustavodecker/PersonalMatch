import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSizes, BorderRadii } from '@/constants/theme';

const GOALS = ['Emagrecer', 'Ganhar massa', 'Condicionamento', 'Reabilitação', 'Saúde geral', 'Esportes'];
const LEVELS = [
  { key: 'beginner', label: 'Iniciante', desc: 'Pouca ou nenhuma experiência' },
  { key: 'intermediate', label: 'Intermediário', desc: 'Pratico há algum tempo' },
  { key: 'advanced', label: 'Avançado', desc: 'Treino regularmente há anos' },
] as const;
const MODALITIES = [
  { key: 'online', label: 'Online' },
  { key: 'in_person', label: 'Presencial' },
  { key: 'both', label: 'Ambos' },
] as const;

export default function StudentOnboarding() {
  const { profile, refreshProfile } = useAuth();
  const [goals, setGoals] = useState<string[]>([]);
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced' | null>(null);
  const [modality, setModality] = useState<'online' | 'in_person' | 'both' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGoal = (g: string) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    const { error: err } = await supabase
      .from('students')
      .update({ goals, fitness_level: level, preferred_modality: modality })
      .eq('id', profile.id);
    if (err) { setError(err.message); setSaving(false); return; }
    await refreshProfile();
    router.replace('/student/dashboard');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Vamos personalizar sua experiência</Text>
        <Text style={styles.subtitle}>Conte um pouco sobre seus objetivos</Text>

        <Text style={styles.label}>Seus objetivos</Text>
        <View style={styles.optionsGrid}>
          {GOALS.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.option, goals.includes(g) && styles.optionActive]}
              onPress={() => toggleGoal(g)}
            >
              <Text style={[styles.optionText, goals.includes(g) && styles.optionTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Nível de condicionamento</Text>
        <View style={styles.optionsList}>
          {LEVELS.map((l) => (
            <TouchableOpacity
              key={l.key}
              style={[styles.levelOption, level === l.key && styles.levelOptionActive]}
              onPress={() => setLevel(l.key)}
            >
              <Text style={[styles.levelLabel, level === l.key && styles.levelLabelActive]}>{l.label}</Text>
              <Text style={[styles.levelDesc, level === l.key && styles.levelDescActive]}>{l.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Modalidade preferida</Text>
        <View style={styles.modalityRow}>
          {MODALITIES.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.modalityBtn, modality === m.key && styles.modalityBtnActive]}
              onPress={() => setModality(m.key)}
            >
              <Text style={[styles.modalityText, modality === m.key && styles.modalityTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button size="lg" loading={saving} onPress={save}>Começar</Button>
          <TouchableOpacity onPress={() => router.replace('/student/dashboard')}>
            <Text style={styles.skip}>Pular por agora</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  scroll: { padding: Spacing.xl, gap: Spacing.sm },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.neutral[900], marginBottom: 4 },
  subtitle: { fontSize: FontSizes.md, color: Colors.neutral[500], marginBottom: Spacing.lg },
  label: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[800], marginTop: Spacing.md, marginBottom: Spacing.sm },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  option: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadii.full, borderWidth: 1.5, borderColor: Colors.neutral[300],
  },
  optionActive: { borderColor: Colors.primary[600], backgroundColor: Colors.primary[50] },
  optionText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[700] },
  optionTextActive: { color: Colors.primary[700] },
  optionsList: { gap: Spacing.sm },
  levelOption: {
    padding: Spacing.md, borderRadius: BorderRadii.lg, borderWidth: 1.5, borderColor: Colors.neutral[300],
  },
  levelOptionActive: { borderColor: Colors.primary[600], backgroundColor: Colors.primary[50] },
  levelLabel: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[700] },
  levelLabelActive: { color: Colors.primary[700] },
  levelDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginTop: 2 },
  levelDescActive: { color: Colors.primary[500] },
  modalityRow: { flexDirection: 'row', gap: Spacing.sm },
  modalityBtn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadii.lg,
    borderWidth: 1.5, borderColor: Colors.neutral[300], alignItems: 'center',
  },
  modalityBtnActive: { borderColor: Colors.primary[600], backgroundColor: Colors.primary[50] },
  modalityText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[700] },
  modalityTextActive: { color: Colors.primary[700] },
  error: { backgroundColor: Colors.error[50], color: Colors.error[700], padding: Spacing.md, borderRadius: BorderRadii.md, fontSize: FontSizes.sm },
  actions: { gap: Spacing.md, marginTop: Spacing.lg },
  skip: { textAlign: 'center', fontSize: FontSizes.md, color: Colors.neutral[500], paddingVertical: Spacing.sm },
});
