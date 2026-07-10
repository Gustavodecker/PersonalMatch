import { supabase } from './supabase';

export async function createCheckoutSession(
  priceId: string,
  mode: 'subscription' | 'payment'
): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error('Usuário não autenticado');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_id: priceId,
        success_url: `${origin}/success`,
        cancel_url: `${origin}/subscription`,
        mode,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Falha ao criar sessão de pagamento');
  }

  const data = await response.json();

  if (!data.url) throw new Error('URL de checkout não retornada');

  return data.url;
}

export function redirectToCheckout(url: string) {
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
}