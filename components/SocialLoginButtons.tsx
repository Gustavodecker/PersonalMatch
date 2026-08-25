import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Provider } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii } from '@/constants/theme';

const providers: { id: Provider; label: string; color: string; bgColor: string; icon: string }[] = [
  { id: 'google', label: 'Google', color: '#1f1f1f', bgColor: '#ffffff', icon: 'G' },
  { id: 'facebook', label: 'Facebook', color: '#ffffff', bgColor: '#1877F2', icon: 'f' },
  { id: 'apple', label: 'Apple', color: '#ffffff', bgColor: '#000000', icon: '\uF8FF' },
];

export function SocialLoginButtons() {
  const { signInWithProvider } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePress = async (provider: Provider) => {
    setError(null);
    setLoadingProvider(provider);
    const { error: err } = await signInWithProvider(provider);
    setLoadingProvider(null);
    if (err) setError(err);
  };

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou continue com</Text>
        <View style={styles.dividerLine} />
      </View>

      {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

      <View style={styles.buttonsRow}>
        {providers.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.socialBtn, { backgroundColor: p.bgColor, borderColor: p.id === 'google' ? Colors.neutral[300] : p.bgColor }]}
            onPress={() => handlePress(p.id)}
            disabled={loadingProvider !== null}
          >
            {loadingProvider === p.id ? (
              <ActivityIndicator size="small" color={p.color} />
            ) : (
              <>
                <Text style={[styles.socialIcon, { color: p.color, fontFamily: p.id === 'apple' ? (Platform.OS === 'ios' ? 'System' : undefined) : undefined }]}>
                  {p.icon}
                </Text>
                <Text style={[styles.socialLabel, { color: p.color }]}>{p.label}</Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md, marginTop: Spacing.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.neutral[200] },
  dividerText: { fontSize: FontSizes.sm, color: Colors.neutral[500] },
  errorMsg: {
    backgroundColor: Colors.error[50], color: Colors.error[700],
    borderRadius: BorderRadii.md, padding: Spacing.sm, fontSize: FontSizes.sm, textAlign: 'center',
  },
  buttonsRow: { flexDirection: 'row', gap: Spacing.sm },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: BorderRadii.md, borderWidth: 1, gap: 6, minHeight: 48,
  },
  socialIcon: { fontSize: 18, fontWeight: '700' },
  socialLabel: { fontSize: FontSizes.sm, fontWeight: '600' },
});
