import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import {
  ChevronLeft, Link2, MessageSquare, CheckCircle, Crown,
} from 'lucide-react-native';

export default function PremiumSettingsScreen() {
  const { profile } = useAuth();
  const [slug, setSlug] = useState('');
  const [autoReply, setAutoReply] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [originalReply, setOriginalReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('trainers')
      .select('profile_slug, auto_reply_message')
      .eq('id', profile.id)
      .maybeSingle();
    if (data) {
      setSlug(data.profile_slug ?? '');
      setAutoReply(data.auto_reply_message ?? '');
      setOriginalSlug(data.profile_slug ?? '');
      setOriginalReply(data.auto_reply_message ?? '');
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const validateSlug = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').slice(0, 30);
    setSlug(clean);
    setSlugError(null);
    setSaved(false);
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setSlugError(null);
    setSaved(false);

    const trimSlug = slug.trim() || null;
    const trimReply = autoReply.trim() || null;

    if (trimSlug && trimSlug !== originalSlug) {
      const { data: existing } = await supabase
        .from('trainers')
        .select('id')
        .eq('profile_slug', trimSlug)
        .neq('id', profile.id)
        .maybeSingle();
      if (existing) {
        setSlugError('Este link já está em uso. Escolha outro.');
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase.from('trainers').update({
      profile_slug: trimSlug,
      auto_reply_message: trimReply,
    }).eq('id', profile.id);

    setSaving(false);
    if (error) {
      setSlugError('Erro ao salvar. Tente novamente.');
    } else {
      setOriginalSlug(trimSlug ?? '');
      setOriginalReply(trimReply ?? '');
      setSaved(true);
    }
  };

  const hasChanges = slug !== originalSlug || autoReply !== originalReply;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Configurações Premium</Text>
          <Text style={s.headerSub}>Recursos exclusivos do seu plano</Text>
        </View>
        <View style={s.crownWrap}>
          <Crown size={18} color={Colors.warning[600]} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {loading ? (
          <View style={s.loadingBox}><Text style={s.loadingText}>Carregando...</Text></View>
        ) : (
          <>
            {/* Custom URL Section */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <View style={[s.sectionIcon, { backgroundColor: Colors.primary[50] }]}>
                  <Link2 size={18} color={Colors.primary[600]} />
                </View>
                <View style={s.sectionTitleWrap}>
                  <Text style={s.sectionTitle}>Link personalizado</Text>
                  <Text style={s.sectionDesc}>Compartilhe nas redes sociais um link fácil de lembrar</Text>
                </View>
              </View>

              <View style={s.slugRow}>
                <Text style={s.slugPrefix}>99personal.com.br/</Text>
                <TextInput
                  style={s.slugInput}
                  value={slug}
                  onChangeText={validateSlug}
                  placeholder="seu-nome"
                  placeholderTextColor={Colors.neutral[400]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {slugError && <Text style={s.errorText}>{slugError}</Text>}
              {slug.trim().length > 0 && !slugError && (
                <Text style={s.slugPreview}>Seu link: 99personal.com.br/{slug}</Text>
              )}
            </View>

            {/* Auto-reply Section */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <View style={[s.sectionIcon, { backgroundColor: Colors.secondary[50] }]}>
                  <MessageSquare size={18} color={Colors.secondary[600]} />
                </View>
                <View style={s.sectionTitleWrap}>
                  <Text style={s.sectionTitle}>Resposta automática</Text>
                  <Text style={s.sectionDesc}>Enviada automaticamente quando um aluno te contata</Text>
                </View>
              </View>

              <TextInput
                style={s.replyInput}
                value={autoReply}
                onChangeText={(v) => { setAutoReply(v); setSaved(false); }}
                placeholder="Ex: Oi! Obrigado pelo interesse. Respondo em até 2h. Enquanto isso, veja meus horários disponíveis..."
                placeholderTextColor={Colors.neutral[400]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={s.replyHint}>
                Deixe em branco para desativar a resposta automática.
              </Text>
            </View>

            {/* Save */}
            {saved && (
              <View style={s.savedBox}>
                <CheckCircle size={16} color={Colors.secondary[600]} />
                <Text style={s.savedText}>Configurações salvas com sucesso!</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.saveBtn, (!hasChanges || saving) && s.saveBtnDisabled]}
              onPress={save}
              disabled={!hasChanges || saving}
            >
              <Text style={s.saveBtnText}>{saving ? 'Salvando...' : 'Salvar alterações'}</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', ...Shadows.xs,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },
  headerSub: { fontSize: FontSizes.xs, color: Colors.neutral[500], marginTop: 1 },
  crownWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.warning[50],
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

  loadingBox: { marginTop: Spacing.xl, alignItems: 'center' },
  loadingText: { fontSize: FontSizes.md, color: Colors.neutral[400] },

  section: {
    backgroundColor: Colors.white, borderRadius: BorderRadii.xl,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm,
    borderWidth: 1, borderColor: Colors.neutral[100],
  },
  sectionHeader: { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
  sectionIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  sectionTitleWrap: { flex: 1 },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  sectionDesc: { fontSize: FontSizes.xs, color: Colors.neutral[500], marginTop: 2, lineHeight: 16 },

  slugRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.neutral[50], borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.neutral[200], overflow: 'hidden',
  },
  slugPrefix: {
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: Colors.neutral[100], fontSize: FontSizes.sm,
    color: Colors.neutral[500], fontWeight: '600',
  },
  slugInput: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: FontSizes.md, color: Colors.neutral[900],
  },
  slugPreview: {
    fontSize: FontSizes.xs, color: Colors.primary[600], fontWeight: '600', marginTop: 6,
  },
  errorText: { fontSize: FontSizes.xs, color: Colors.error[600], marginTop: 4 },

  replyInput: {
    backgroundColor: Colors.neutral[50], borderWidth: 1.5, borderColor: Colors.neutral[200],
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSizes.md, color: Colors.neutral[900], minHeight: 100,
  },
  replyHint: { fontSize: FontSizes.xs, color: Colors.neutral[400], marginTop: 6 },

  savedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.secondary[50], borderRadius: BorderRadii.lg,
    padding: 14, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.secondary[100],
  },
  savedText: { fontSize: FontSizes.sm, color: Colors.secondary[700], fontWeight: '600' },

  saveBtn: {
    backgroundColor: Colors.primary[600], paddingVertical: 15,
    borderRadius: BorderRadii.lg, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: Colors.neutral[300] },
  saveBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
});
