import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, FontSizes, Spacing, Shadows } from '@/constants/theme';

const FALLBACK_PRIVACY = `Política de Privacidade — 99 Personal

Última atualização: Setembro de 2026

1. INTRODUÇÃO

A 99 Personal ("nós", "nosso" ou "plataforma") valoriza a privacidade dos seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais quando você utiliza nosso aplicativo e serviços.

2. DADOS QUE COLETAMOS

Dados fornecidos por você: nome completo, e-mail, telefone, foto de perfil, cidade, estado, especialidades, biografia e informações de perfil profissional (para personal trainers).

Dados de uso: páginas visitadas, interações com o aplicativo, horários de acesso, tipo de dispositivo e navegador.

Dados de pagamento: processados de forma segura por terceiros (Stripe, Apple App Store, Google Play). Não armazenamos dados de cartão de crédito.

3. COMO USAMOS SEUS DADOS

- Para criar e gerenciar sua conta;
- Para conectar alunos a personal trainers;
- Para processar pagamentos e assinaturas;
- Para melhorar a experiência do usuário e o desempenho da plataforma;
- Para enviar comunicações relacionadas ao serviço;
- Para cumprir obrigações legais.

4. COMPARTILHAMENTO DE DADOS

Compartilhamos dados apenas quando necessário:
- Com personal trainers (para agendamento de aulas, quando o aluno faz contato);
- Com processadores de pagamento (Stripe, Apple, Google);
- Para cumprir exigências legais ou judiciais.

Nunca vendemos seus dados pessoais a terceiros.

5. ARMAZENAMENTO E SEGURANÇA

Seus dados são armazenados de forma segura utilizando criptografia e controles de acesso rigorosos. Utilizamos provedores de infraestrutura reconhecidos no mercado.

6. SEUS DIREITOS

Você pode, a qualquer momento:
- Acessar seus dados pessoais através do perfil no aplicativo;
- Corrigir ou atualizar suas informações;
- Solicitar a exclusão definitiva da sua conta e dados, através de Perfil > Privacidade e segurança > Excluir minha conta;
- Revogar consentimentos previamente concedidos.

7. COOKIES E TECNOLOGIAS SIMILARES

Utilizamos tecnologias padrão para melhorar a experiência de navegação e analisar o uso da plataforma.

8. ALTERAÇÕES NESTA POLÍTICA

Podemos atualizar esta política periodicamente. Alterações significativas serão comunicadas no aplicativo.

9. CONTATO

Para dúvidas sobre privacidade: contato@99personal.com.br

10. ASSINATURAS E COMPRAS NO APLICATIVO

As assinaturas são processadas pela Apple App Store, Google Play ou Stripe, conforme a plataforma utilizada. Ao assinar, você concorda com os termos de pagamento da respectiva loja. A exclusão da conta no 99 Personal não cancela automaticamente cobranças da Apple ou do Google — você deve gerenciar assinaturas diretamente nas configurações da sua conta Apple ou Google.`;

export default function PrivacyScreen() {
  const [text, setText] = useState<string | null>(null);
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

  const content = text || FALLBACK_PRIVACY;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={s.backBtn} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary[600]} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.card}>
            <Text style={s.body}>{content}</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.neutral[50] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

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
