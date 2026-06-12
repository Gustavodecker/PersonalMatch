export type PlanId = "free" | "pro" | "premium";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  priceLabel: string;
  priceId: string;
  description: string;
  features: string[];
  limits: {
    leads: number | null;
    photos: number;
    featured: boolean;
    badge: boolean;
    analytics: boolean;
  };
  highlight?: boolean;
  badge?: string;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Gratuito",
    price: 0,
    priceLabel: "R$ 0/mês",
    priceId: "",
    description: "Para começar no marketplace",
    features: [
      "Perfil básico",
      "Até 5 leads por mês",
      "3 fotos no perfil",
      "Visível na busca",
    ],
    limits: { leads: 5, photos: 3, featured: false, badge: false, analytics: false },
  },
  {
    id: "pro",
    name: "Pro",
    price: 2990,
    priceLabel: "R$ 29,90/mês",
    priceId: process.env.EXPO_PUBLIC_STRIPE_PRICE_PRO ?? "",
    description: "Para personais em crescimento",
    features: [
      "Leads ilimitados",
      "Badge de verificado",
      "8 fotos no perfil",
      "Visível na busca",
      "Suporte prioritário",
    ],
    limits: { leads: null, photos: 8, featured: false, badge: true, analytics: false },
    highlight: true,
    badge: "Mais popular",
  },
  {
    id: "premium",
    name: "Premium",
    price: 5990,
    priceLabel: "R$ 59,90/mês",
    priceId: process.env.EXPO_PUBLIC_STRIPE_PRICE_PREMIUM ?? "",
    description: "Para quem quer se destacar",
    features: [
      "Leads ilimitados",
      "Badge de verificado",
      "20 fotos no perfil",
      "Destaque nos resultados de busca",
      "Destaque na página inicial",
      "Analytics avançado",
      "Suporte prioritário",
    ],
    limits: { leads: null, photos: 20, featured: true, badge: true, analytics: true },
    badge: "Melhor custo-benefício",
  },
];

export function getPlanById(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
