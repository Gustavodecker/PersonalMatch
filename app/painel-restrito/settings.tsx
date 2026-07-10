import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/admin/AdminShell';
import { Colors, FontSizes, Spacing, Shadows } from '@/constants/theme';
import { AppSettings } from '@/types/database';
import { Save, CheckCircle } from 'lucide-react-native';

type FormState = {
  marketplace_name: string;
  primary_color: string;
  support_whatsapp: string;
  support_email: string;
  institutional_text: string;
  terms_text: string;
  privacy_text: string;
};

const EMPTY: FormState = {
  marketplace_name: '',
  primary_color: '',
  support_whatsapp: '',
  support_email: '',
  institutional_text: '',
  terms_text: '',
  privacy_text: '',
};

type Section = { title: string; fields: Array<{ key: keyof FormState; label: string; placeholder: string; multiline?: boolean; rows?: number }> };

const SECTIONS: Section[] = [
  {
    title: 'Identidade',
    fields: [
      { key: 'marketplace_name', label: 'Nome do marketplace', placeholder: 'Ex: SuperShape' },
      { key: 'primary_color',    label: 'Cor primária (hex)', placeholder: '#2D4EDE' },
    ],
  },
  {
    title: 'Suporte',
    fields: [
      { key: 'support_whatsapp', label: 'WhatsApp de suporte', placeholder: '+55 11 99999-9999' },
      { key: 'support_email',    label: 'E-mail de suporte',   placeholder: 'suporte@supershape.com.br' },
    ],
  },
  {
    title: 'Textos institucionais',
    fields: [
      { key: 'institutional_text', label: 'Texto institucional', placeholder: 'Apresentação do marketplace...', multiline: true, rows: 4 },
      { key: 'terms_text',         label: 'Termos de uso',       placeholder: 'Conteúdo dos termos de uso...', multiline: true, rows: 6 },
      { key: 'privacy_text',       label: 'Política de privacidade', placeholder: 'Conteúdo da política...', multiline: true, rows: 6 },
    ],
  },
];

export default function AdminSettings() {
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (data) {
      const s = data as AppSettings;
      setForm({
        marketplace_name:    s.marketplace_name ?? '',
        primary_color:       s.primary_color ?? '',
        support_whatsapp:    s.support_whatsapp ?? '',
        support_email:       s.support_email ?? '',
        institutional_text:  s.institutional_text ?? '',
        terms_text:          s.terms_text ?? '',
        privacy_text:        s.privacy_text ?? '',
      });
    }
    setLoading(false);
  };

  const setField = (key: keyof FormState, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const save = async () => {
    setError('');
    if (!form.marketplace_name.trim()) { setError('O nome do marketplace é obrigatório.'); return; }
    setSaving(true);
    const { error: err } = await supabase.from('app_settings').update({
      marketplace_name:   form.marketplace_name.trim(),
      primary_color:      form.primary_color.trim() || null,
      support_whatsapp:   form.support_whatsapp.trim() || null,
      support_email:      form.support_email.trim() || null,
      institutional_text: form.institutional_text.trim() || null,
      terms_text:         form.terms_text.trim() || null,
      privacy_text:       form.privacy_text.trim() || null,
      updated_at:         new Date().toISOString(),
    }).eq('id', 1);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AdminShell title="Configurações">
      {loading ? (
        <ActivityIndicator color={Colors.primary[600]} size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={s.content}>
          {SECTIONS.map((section) => (
            <View key={section.title} style={s.section}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              <View style={s.sectionCard}>
                {section.fields.map((field, idx) => (
                  <View key={field.key} style={[s.fieldWrap, idx < section.fields.length - 1 && s.fieldDivider]}>
                    <Text style={s.fieldLabel}>{field.label}</Text>
                    <TextInput
                      style={[s.fieldInput, field.multiline && { minHeight: (field.rows ?? 3) * 22, textAlignVertical: 'top' }]}
                      value={form[field.key]}
                      onChangeText={(t) => setField(field.key, t)}
                      placeholder={field.placeholder}
                      placeholderTextColor={Colors.neutral[400]}
                      multiline={field.multiline}
                      numberOfLines={field.rows}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {saved ? (
            <View style={s.savedBox}>
              <CheckCircle size={16} color={Colors.secondary[600]} />
              <Text style={s.savedText}>Configurações salvas com sucesso!</Text>
            </View>
          ) : null}

          <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
            {saving ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <Save size={16} color={Colors.white} />
                <Text style={s.saveBtnText}>Salvar configurações</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </AdminShell>
  );
}

const s = StyleSheet.create({
  content: { gap: 24 },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[500],
    textTransform: 'uppercase', letterSpacing: 0.7,
  },
  sectionCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.neutral[200], ...Shadows.sm, overflow: 'hidden',
  },
  fieldWrap: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  fieldDivider: { borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  fieldLabel: {
    fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[500],
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: Colors.neutral[50], borderWidth: 1.5, borderColor: Colors.neutral[200],
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: FontSizes.md, color: Colors.neutral[900],
  },
  errorBox: {
    backgroundColor: Colors.error[50], borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.error[100],
  },
  errorText: { fontSize: FontSizes.sm, color: Colors.error[600], fontWeight: '600' },
  savedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.secondary[50], borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.secondary[100],
  },
  savedText: { fontSize: FontSizes.sm, color: Colors.secondary[700], fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary[600], borderRadius: 14, paddingVertical: 16,
  },
  saveBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
});
