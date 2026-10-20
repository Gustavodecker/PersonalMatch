import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MailCheck } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSizes, BorderRadii } from '@/constants/theme';

const COOLDOWN_SECONDS = 60;

type Props = {
  email: string;
  onBack: () => void;
  backLabel?: string;
};

export function ConfirmEmailNotice({ email, onBack, backLabel = 'Ir para o login' }: Props) {
  const { resendConfirmation } = useAuth();
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    setSending(true);
    setMessage(null);
    const { error } = await resendConfirmation(email);
    setSending(false);
    if (error) {
      setMessage({ text: error, ok: false });
    } else {
      setMessage({ text: 'Enviamos um novo e-mail de confirmação.', ok: true });
      setCooldown(COOLDOWN_SECONDS);
    }
  };

  return (
    <View style={s.wrap}>
      <View style={s.iconCircle}>
        <MailCheck size={32} color={Colors.primary[600]} />
      </View>
      <Text style={s.title}>Confirme seu e-mail</Text>
      <Text style={s.body}>
        Enviamos um link de confirmação para{'\n'}
        <Text style={s.email}>{email}</Text>
      </Text>
      <Text style={s.hint}>
        Abra o e-mail e toque no link para ativar sua conta. Se não encontrar, olhe também na caixa de spam.
      </Text>

      {message ? (
        <Text style={[s.message, message.ok ? s.messageOk : s.messageError]}>{message.text}</Text>
      ) : null}

      <View style={s.actions}>
        <Button onPress={handleResend} loading={sending} disabled={cooldown > 0} variant="outline" size="lg">
          {cooldown > 0 ? `Reenviar e-mail (${cooldown}s)` : 'Reenviar e-mail'}
        </Button>
        <Button onPress={onBack} size="lg">{backLabel}</Button>
      </View>
      <Text style={s.hint}>E-mail errado? Volte e crie a conta novamente com o endereço correto.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.neutral[900], textAlign: 'center' },
  body: { fontSize: FontSizes.md, color: Colors.neutral[600], textAlign: 'center', lineHeight: 24 },
  email: { fontWeight: '700', color: Colors.neutral[900] },
  hint: { fontSize: FontSizes.sm, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20 },
  message: { fontSize: FontSizes.sm, borderRadius: BorderRadii.md, padding: Spacing.md, alignSelf: 'stretch', textAlign: 'center' },
  messageOk: { backgroundColor: Colors.secondary[50], color: Colors.secondary[700] },
  messageError: { backgroundColor: Colors.error[50], color: Colors.error[700] },
  actions: { alignSelf: 'stretch', gap: Spacing.sm, marginTop: Spacing.sm },
});
