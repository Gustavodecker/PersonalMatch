export type StripeMode = 'subscription' | 'payment';

export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  features: string[];
  price: number;
  currencySymbol: string;
  currency: string;
  mode: StripeMode;
}

export const STRIPE_PRODUCTS = {
  pro: {
    id: 'prod_Ug8CEtM8Mg8lPy',
    priceId: 'price_1TglwS2cJEMqtkzYOVP6WWTE',
    name: 'Pro',
    description: 'Ideal para personal trainers em crescimento',
    features: [
      'Perfil destacado nas buscas',
      'Até 10 fotos na galeria',
      'Agendamento online ilimitado',
      'Estatísticas de perfil',
      'Suporte prioritário',
    ],
    price: 29.90,
    currencySymbol: 'R$',
    currency: 'brl',
    mode: 'subscription' as StripeMode,
  },
  premium: {
    id: 'prod_Ug8FadHaciIELP',
    priceId: 'price_1TglzK2cJEMqtkzYXz6Zhmd0',
    name: 'Premium',
    description: 'Para personal trainers que querem se destacar',
    features: [
      'Tudo do plano Pro',
      'Fotos ilimitadas na galeria',
      'Destaque no topo das buscas',
      'Selo verificado no perfil',
      'Análises avançadas de performance',
      'Suporte VIP 24/7',
    ],
    price: 59.90,
    currencySymbol: 'R$',
    currency: 'brl',
    mode: 'subscription' as StripeMode,
  },
} satisfies Record<string, StripeProduct>;

export const PRODUCTS_LIST: StripeProduct[] = Object.values(STRIPE_PRODUCTS);

export const PLAN_LABELS: Record<string, string> = {
  free_trial: 'Teste Grátis',
  free: 'Grátis',
  pro: 'Pro',
  premium: 'Premium',
};

export const PLAN_COLORS: Record<string, string> = {
  free_trial: '#6B7280',
  free: '#6B7280',
  pro: '#2563EB',
  premium: '#7C3AED',
};

export function getPlanByPriceId(priceId: string): StripeProduct | undefined {
  return PRODUCTS_LIST.find((p) => p.priceId === priceId);
}