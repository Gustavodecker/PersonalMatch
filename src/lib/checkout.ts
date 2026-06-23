import { supabase } from '../../lib/supabase';

export async function createCheckoutSession(
  priceId: string,
  mode: 'subscription' | 'payment'
): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error('Usuário não autenticado');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const successUrl = `${origin}/subscription/success`;
  const cancelUrl = `${origin}/subscription`;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
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
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Falha ao criar sessão de pagamento');
  }

  const data = await response.json();
  return data.url;
}