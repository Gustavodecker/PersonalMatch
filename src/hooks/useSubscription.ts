import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { STRIPE_PRODUCTS, type StripeProduct } from '../stripe-config';

export interface SubscriptionInfo {
  plan: string;
  status: string;
  active: boolean;
  provider: 'stripe' | 'apple' | 'google' | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export function useSubscription(userId?: string) {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: rpcErr } = await supabase.rpc('get_effective_plan', {
        p_user_id: userId,
      });

      if (rpcErr) throw rpcErr;

      if (data) {
        const planData = typeof data === 'string' ? JSON.parse(data) : data;
        setSubscription({
          plan: planData.plan ?? 'free',
          status: planData.active ? 'active' : 'inactive',
          active: planData.active ?? false,
          provider: planData.provider ?? null,
          currentPeriodEnd: planData.expires_at ?? null,
          cancelAtPeriodEnd: false,
        });
      } else {
        setSubscription({
          plan: 'free',
          status: 'inactive',
          active: false,
          provider: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        });
      }
    } catch (err: any) {
      setError(err.message);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!userId) { setLoading(false); return; }
      try {
        const { data, error: rpcErr } = await supabase.rpc('get_effective_plan', {
          p_user_id: userId,
        });
        if (rpcErr) throw rpcErr;
        if (!mounted) return;

        if (data) {
          const planData = typeof data === 'string' ? JSON.parse(data) : data;
          setSubscription({
            plan: planData.plan ?? 'free',
            status: planData.active ? 'active' : 'inactive',
            active: planData.active ?? false,
            provider: planData.provider ?? null,
            currentPeriodEnd: planData.expires_at ?? null,
            cancelAtPeriodEnd: false,
          });
        } else {
          setSubscription({
            plan: 'free',
            status: 'inactive',
            active: false,
            provider: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          });
        }
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => { mounted = false; };
  }, [userId]);

  const isActive = subscription?.active ?? false;
  const planName = subscription?.plan ?? 'free';

  const product: StripeProduct | undefined = STRIPE_PRODUCTS.find(
    (p) => p.name.toLowerCase() === planName.toLowerCase()
  );

  const refetch = useCallback(() => {
    setLoading(true);
    fetchPlan();
  }, [fetchPlan]);

  return { subscription, loading, error, isActive, planName, product, refetch };
}
