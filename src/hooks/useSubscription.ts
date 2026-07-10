import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface SubscriptionInfo {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export function useSubscription(userId?: string) {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetch() {
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

    fetch();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const planName = subscription?.plan ?? 'free';

  return { subscription, loading, error, isActive, planName };
}