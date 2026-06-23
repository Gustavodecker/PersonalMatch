export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  currencySymbol: string;
  mode: 'subscription' | 'payment';
  features: string[];
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'prod_Ug8CEtM8Mg8lPy',
    priceId: 'price_1TglwS2cJEMqtkzYOVP6WWTE',
    name: 'Pro',
    description: 'Ideal para personal trainers que querem expandir sua base de clientes',
    price: 29.90,
    currencySymbol: 'R$',
    mode: 'subscription',
    features: [
      'Perfil destacado na busca',
      'Até 10 fotos na galeria',
      'Agenda de disponibilidade online',
      'Leads ilimitados',
      'Suporte por e-mail',
    ],
  },
  {
    id: 'prod_Ug8FadHaciIELP',
    priceId: 'price_1TglzK2cJEMqtkzYXz6Zhmd0',
    name: 'Premium',
    description: 'A solução completa para personal trainers que querem o máximo',
    price: 59.90,
    currencySymbol: 'R$',
    mode: 'subscription',
    features: [
      'Tudo do plano Pro',
      'Fotos ilimitadas na galeria',
      'Destaque no topo da busca',
      'Badge verificado no perfil',
      'Relatórios e estatísticas avançados',
      'Suporte prioritário',
    ],
  },
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined =>
  STRIPE_PRODUCTS.find((p) => p.priceId === priceId);

export const getProductByName = (name: string): StripeProduct | undefined =>
  STRIPE_PRODUCTS.find((p) => p.name.toLowerCase() === name.toLowerCase());

export const formatPrice = (product: StripeProduct): string =>
  `${product.currencySymbol} ${product.price.toFixed(2).replace('.', ',')}`;