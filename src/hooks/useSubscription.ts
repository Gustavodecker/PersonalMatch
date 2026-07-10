import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SubscriptionInfo {
  plan: string | null;
  status: string | null;
  isActive: boolean;
  currentPeriodEnd: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const ACTIVE_STATUSES = ['active', 'trialing'];

export function useSubscription(userId: string | undefined | null): SubscriptionInfo {
  const [plan, setPlan] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    async function fetchData() {
      try {
        const { data, error: dbError } = await supabase
          .from('subscriptions')
          .select('plan, status, current_period_end')
          .eq('trainer_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isMounted) return;

        if (dbError) {
          setError(dbError.message);
        } else if (data) {
          setPlan(data.plan);
          setStatus(data.status);
          setCurrentPeriodEnd(data.current_period_end);
        } else {
          setPlan(null);
          setStatus(null);
          setCurrentPeriodEnd(null);
        }
      } catch {
        if (isMounted) setError('Erro ao carregar assinatura.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [userId, tick]);

  return {
    plan,
    status,
    isActive: ACTIVE_STATUSES.includes(status ?? ''),
    currentPeriodEnd,
    loading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}