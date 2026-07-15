import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { STRIPE_PRODUCTS, type StripeProduct } from '../stripe-config';

export interface SubscriptionInfo {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  subscription_status: string;
}

export function useSubscription(userId?: string) {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: dbErr } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end, cancel_at_period_end')
        .eq('trainer_id', userId)
        .maybeSingle();

      if (dbErr) throw dbErr;

      setSubscription(
        data
          ? {
              plan: data.plan,
              status: data.status,
              currentPeriodEnd: data.current_period_end,
              cancelAtPeriodEnd: data.cancel_at_period_end,
              subscription_status: data.status,
            }
          : null
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const { data, error: dbErr } = await supabase
          .from('subscriptions')
          .select('plan, status, current_period_end, cancel_at_period_end')
          .eq('trainer_id', userId)
          .maybeSingle();

        if (dbErr) throw dbErr;

        if (mounted) {
          setSubscription(
            data
              ? {
                  plan: data.plan,
                  status: data.status,
                  currentPeriodEnd: data.current_period_end,
                  cancelAtPeriodEnd: data.cancel_at_period_end,
                  subscription_status: data.status,
                }
              : null
          );
        }
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const planName = subscription?.plan ?? 'free';

  const product: StripeProduct | undefined = STRIPE_PRODUCTS.find(
    (p) => p.name.toLowerCase() === planName.toLowerCase()
  );

  const refetch = useCallback(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  return { subscription, loading, error, isActive, planName, product, refetch };
}
