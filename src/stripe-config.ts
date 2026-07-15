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

export function formatPrice(product: StripeProduct): string {
  return `${product.currencySymbol} ${product.price.toFixed(2).replace('.', ',')}`;
}

export type PlanId = 'free' | 'free_trial' | 'pro' | 'premium';

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  priceLabel: string;
  features: string[];
  badge?: string;
  highlight?: boolean;
  priceId?: string;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Grátis',
    description: 'Para começar a usar a plataforma',
    priceLabel: 'R$ 0',
    features: [
      'Perfil básico na plataforma',
      'Até 3 fotos na galeria',
      'Agendamentos limitados',
    ],
  },
  {
    id: 'free_trial',
    name: 'Teste Grátis',
    description: 'Experimente todos os recursos por 7 dias',
    priceLabel: 'Grátis por 7 dias',
    features: [
      'Todos os recursos do plano Pro',
      '7 dias gratuitos',
      'Sem cartão necessário',
    ],
    badge: 'Teste',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para treinadores que querem crescer e destacar seu perfil',
    priceLabel: 'R$ 29,90/mês',
    features: [
      'Perfil em destaque na busca',
      'Até 10 fotos na galeria',
      'Agendamentos ilimitados',
      'Badge Pro no perfil',
      'Suporte prioritário',
    ],
    badge: 'Mais Popular',
    highlight: true,
    priceId: 'price_1TlIhLGT3oj5YeOVfAEhPfpu',
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Para treinadores que querem o máximo de visibilidade',
    priceLabel: 'R$ 59,90/mês',
    features: [
      'Tudo do plano Pro',
      'Fotos ilimitadas na galeria',
      'Badge verificado no perfil',
      'Posição de topo na busca',
      'Relatórios e analytics',
      'Suporte 24/7',
    ],
    badge: 'Premium',
    priceId: 'price_1TlIhLGT3oj5YeOVEVxrxALk',
  },
];

export function getPlanById(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}