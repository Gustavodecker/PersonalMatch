import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { StripeMode } from '../stripe-config';

export async function createCheckoutSession(
  priceId: string,
  mode: StripeMode,
): Promise<{ url: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Você precisa estar autenticado para assinar um plano.');
  }

  const baseUrl =
    Platform.OS === 'web'
      ? window.location.origin
      : (process.env.EXPO_PUBLIC_APP_URL ?? '');

  const successUrl = `${baseUrl}/checkout-success`;
  const cancelUrl = `${baseUrl}/planos`;

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        price_id: priceId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        mode,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Erro ao criar sessão de pagamento.');
  }

  return response.json();
}