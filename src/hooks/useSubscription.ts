import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { getProductByPriceId, StripeProduct } from '../stripe-config';

export interface SubscriptionData {
  customer_id: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean | null;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

export interface UseSubscriptionReturn {
  loading: boolean;
  subscription: SubscriptionData | null;
  product: StripeProduct | null;
  isActive: boolean;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [product, setProduct] = useState<StripeProduct | null>(null);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      setSubscription(data ?? null);
      setProduct(data?.price_id ? (getProductByPriceId(data.price_id) ?? null) : null);
    } catch {
      setSubscription(null);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isActive =
    subscription?.subscription_status === 'active' ||
    subscription?.subscription_status === 'trialing';

  return { loading, subscription, product, isActive, refetch: fetchSubscription };
}