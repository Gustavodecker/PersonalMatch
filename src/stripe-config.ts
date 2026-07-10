export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  features: string[];
  price: number;
  currencySymbol: string;
  currency: string;
  mode: 'subscription' | 'payment';
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'prod_Ug8CEtM8Mg8lPy',
    priceId: 'price_1TlIhLGT3oj5YeOVfAEhPfpu',
    name: 'Pro',
    description: 'Para treinadores que querem crescer e destacar seu perfil',
    features: [
      'Perfil em destaque na busca',
      'Até 10 fotos na galeria',
      'Agendamentos ilimitados',
      'Badge Pro no perfil',
      'Suporte prioritário',
    ],
    price: 29.9,
    currencySymbol: 'R$',
    currency: 'brl',
    mode: 'subscription',
  },
  {
    id: 'prod_Ug8FadHaciIELP',
    priceId: 'price_1TlIhLGT3oj5YeOVEVxrxALk',
    name: 'Premium',
    description: 'Para treinadores que querem o máximo de visibilidade',
    features: [
      'Tudo do plano Pro',
      'Fotos ilimitadas na galeria',
      'Badge verificado no perfil',
      'Posição de topo na busca',
      'Relatórios e analytics',
      'Suporte 24/7',
    ],
    price: 59.9,
    currencySymbol: 'R$',
    currency: 'brl',
    mode: 'subscription',
  },
];

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return STRIPE_PRODUCTS.find((p) => p.priceId === priceId);
}

export function getProductByName(name: string): StripeProduct | undefined {
  return STRIPE_PRODUCTS.find((p) => p.name.toLowerCase() === name.toLowerCase());
}