import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl, TextInput, Alert,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { PLANS, getPlanById, type PlanId, type Plan } from '@/src/stripe-config';
import {
  CheckCircle, Crown, Zap, Star, ArrowRight,
  RefreshCw, XCircle, AlertCircle, BadgeCheck, Info,
  Tag, RotateCcw,
} from 'lucide-react-native';
import {
  initRevenueCat,
  getOfferings,
  purchasePackage,
  restorePurchases,
  getCustomerInfo,
  getActiveEntitlement,
} from '@/src/lib/revenuecat';
import type { PurchasesPackage } from 'react-native-purchases';

type Subscription = {
  plan: PlanId;
  status: string;
  active: boolean;
  provider: 'stripe' | 'apple' | 'google' | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

const PLAN_ICONS: Record<PlanId, React.ElementType> = {
  free: Zap,
  free_trial: Zap,
  pro: Star,
  premium: Crown,
};

const PLAN_COLORS: Record<PlanId, { bg: string; border: string; icon: string; text: string }> = {
  free:       { bg: Colors.neutral[50],  border: Colors.neutral[200],  icon: Colors.neutral[500],  text: Colors.neutral[700] },
  free_trial: { bg: Colors.primary[50],  border: Colors.primary[200],  icon: Colors.primary[600],  text: Colors.primary[800] },
  pro:        { bg: Colors.primary[50],  border: Colors.primary[200],  icon: Colors.primary[600],  text: Colors.primary[800] },
  premium:    { bg: '#FFFBEB',           border: '#FCD34D',            icon: '#D97706',            text: '#92400E' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:             { label: 'Ativo',             color: Colors.secondary[600] },
  past_due:           { label: 'Pagamento pendente', color: Colors.warning[600] },
  canceled:           { label: 'Cancelado',          color: Colors.error[600] },
  trialing:           { label: 'Período de teste',   color: Colors.primary[600] },
  incomplete:         { label: 'Incompleto',         color: Colors.warning[600] },
  incomplete_expired: { label: 'Expirado',           color: Colors.error[600] },
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function AssinaturaScreen() {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isWeb = Platform.OS === 'web';
  const currentPlanId: PlanId = subscription?.plan ?? 'free';
  const currentPlan = getPlanById(currentPlanId);

  // Voucher state (web only)
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherData, setVoucherData] = useState<{ id: string; type: string; discount_value: number; description: string | null } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  const applyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) return;
    setVoucherLoading(true);
    setVoucherError(null);
    setVoucherData(null);
    const { data, error } = await supabase.rpc('lookup_voucher', { p_code: code });

    if (error) console.error('lookup_voucher failed', error);

    const found = Array.isArray(data) ? data[0] : data;

    if (error || !found) {
      setVoucherError('Voucher não encontrado ou inválido.');
      setVoucherLoading(false);
      return;
    }
    setVoucherData({
      id: code,
      type: found.voucher_type,
      discount_value: Number(found.discount_value),
      description: found.description ?? null,
    });
    setVoucherLoading(false);
  };

  const clearVoucher = () => {
    setVoucherCode('');
    setVoucherData(null);
    setVoucherError(null);
  };

  // RevenueCat state (mobile only)
  const [rcPackages, setRcPackages] = useState<PurchasesPackage[]>([]);
  const [rcLoading, setRcLoading] = useState(false);

  const loadSubscription = useCallback(async () => {
    if (!user) { setLoading(false); setRefreshing(false); return; }
    try {
      const { data } = await supabase.rpc('get_effective_plan', { p_user_id: user.id });
      const planData = data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
      if (planData && planData.plan !== 'free') {
        setSubscription({
          plan: planData.plan as PlanId,
          status: planData.active ? 'active' : 'canceled',
          active: planData.active,
          provider: planData.provider,
          current_period_end: planData.expires_at,
          cancel_at_period_end: false,
          stripe_subscription_id: null,
        });
      } else {
        setSubscription(null);
      }
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Initialize RevenueCat on mobile
  useEffect(() => {
    if (isWeb || !user) return;
    (async () => {
      try {
        await initRevenueCat(user.id);
        const pkgs = await getOfferings();
        setRcPackages(pkgs);
      } catch (e) {
        console.warn('RevenueCat init failed:', e);
      }
    })();
  }, [user]);

  useEffect(() => { loadSubscription(); }, [loadSubscription]);

  // ── Purchase via RevenueCat (mobile) ─────────────────────────────────────
  const handleMobilePurchase = async (plan: Plan) => {
    if (!user) return;

    // Free trial goes through our backend
    if (plan.id === 'free_trial') {
      setActionLoading(plan.id);
      setError(null);
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ action: 'start_trial' }),
        });
        const data = await res.json();
        if (data.success) { await loadSubscription(); }
        else { setError(data.error ?? 'Erro ao ativar teste grátis.'); }
      } catch { setError('Não foi possível concluir a operação.'); }
      finally { setActionLoading(null); }
      return;
    }

    // Map plan to RevenueCat package identifier
    const rcIdentifier = plan.id === 'premium' ? 'premium' : 'pro';
    const pkg = rcPackages.find(
      (p) => p.identifier.toLowerCase().includes(rcIdentifier)
    );
    if (!pkg) {
      setError('Produto não disponível. Tente novamente mais tarde.');
      return;
    }

    setActionLoading(plan.id);
    setError(null);
    try {
      const info = await purchasePackage(pkg);
      if (info) {
        await loadSubscription();
      }
    } catch (e: any) {
      if (e.userCancelled) { /* user cancelled, no error */ }
      else { setError('Não foi possível completar a compra.'); }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async () => {
    setRcLoading(true);
    setError(null);
    try {
      const info = await restorePurchases();
      const ent = getActiveEntitlement(info);
      if (ent !== 'free') {
        await loadSubscription();
      } else {
        setError('Nenhuma assinatura encontrada para restaurar.');
      }
    } catch {
      setError('Não foi possível restaurar compras.');
    } finally {
      setRcLoading(false);
    }
  };

  // ── Purchase via Stripe (web) ─────────────────────────────────────────────
  const handleCheckout = async (plan: Plan) => {
    if (!session?.access_token) return;

    if (plan.id === 'free_trial') {
      setActionLoading(plan.id);
      setError(null);
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'start_trial' }),
        });
        const data = await res.json();
        if (data.success) { await loadSubscription(); }
        else { setError(data.error ?? 'Erro ao ativar teste grátis.'); }
      } catch { setError('Não foi possível concluir a operação.'); }
      finally { setActionLoading(null); }
      return;
    }

    setActionLoading(plan.id);
    setError(null);
    try {
      const successUrl = `${window.location.origin}/trainer/assinatura-sucesso`;
      const cancelUrl = `${window.location.origin}/trainer/assinatura`;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: 'checkout',
          planId: plan.id,
          trainerId: user?.id,
          voucherCode: voucherData ? voucherCode.trim().toUpperCase() : undefined,
          successUrl,
          cancelUrl,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Erro ao iniciar checkout.');
      }
    } catch { setError('Não foi possível concluir a operação.'); }
    finally { setActionLoading(null); }
  };

  const handleManageSubscription = async () => {
    if (!subscription) return;
    const provider = subscription.provider;

    if (provider === 'apple') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
      return;
    }
    if (provider === 'google') {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
      return;
    }

    // Stripe portal (web)
    if (!session?.access_token) return;
    setActionLoading('portal');
    setError(null);
    try {
      const cancelUrl = isWeb
        ? `${window.location.origin}/trainer/assinatura`
        : 'personal99://trainer/assinatura';
      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'portal', cancelUrl }),
      });
      const data = await res.json();
      if (data.url) {
        if (isWeb) {
          window.location.href = data.url;
        } else {
          await WebBrowser.openAuthSessionAsync(data.url, 'personal99://');
        }
      } else {
        setError(data.error ?? 'Erro ao abrir portal.');
      }
    } catch {
      setError('Não foi possível concluir a operação.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    const provider = subscription.provider;

    // For Apple/Google, redirect to their management screens
    if (provider === 'apple') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
      return;
    }
    if (provider === 'google') {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
      return;
    }

    // Stripe cancellation
    if (!session?.access_token) return;
    const confirmMsg = 'Deseja cancelar sua assinatura? Você continuará com acesso até o final do período já pago, mas não será cobrado novamente.';
    const doCancel = async () => {
      setActionLoading('cancel');
      setError(null);
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'cancel_subscription' }),
        });
        const data = await res.json();
        if (data.success) { await loadSubscription(); }
        else { setError(data.error ?? 'Erro ao cancelar assinatura.'); }
      } catch { setError('Não foi possível concluir a operação.'); }
      finally { setActionLoading(null); }
    };
    if (isWeb) {
      if (window.confirm(confirmMsg)) doCancel();
    } else {
      Alert.alert('Cancelar assinatura', confirmMsg, [
        { text: 'Não, manter', style: 'cancel' },
        { text: 'Sim, cancelar', style: 'destructive', onPress: doCancel },
      ]);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator color={Colors.primary[600]} size="large" /></View>
      </SafeAreaView>
    );
  }

  const PlanIcon = PLAN_ICONS[currentPlanId];
  const planColors = PLAN_COLORS[currentPlanId];
  const subStatus = subscription?.status
    ? (STATUS_LABELS[subscription.status] ?? { label: subscription.status, color: Colors.neutral[600] })
    : null;
  const isPaid = currentPlanId !== 'free';
  const isTrialing = subscription?.status === 'trialing';

  // ── MOBILE ──────────────────────────────────────────────────────────────────
  if (!isWeb) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSubscription(); }} tintColor={Colors.primary[600]} />}
          contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        >
          <View style={s.header}>
            <Text style={s.headerTitle}>Assinatura</Text>
            <Text style={s.headerSub}>Seu plano e faturamento</Text>
          </View>

          {/* Current plan */}
          <View style={[s.mobileCard, { backgroundColor: planColors.bg, borderColor: planColors.border }]}>
            <View style={s.mobileCardRow}>
              <View style={[s.mobileIconWrap, { backgroundColor: planColors.border }]}>
                <PlanIcon size={20} color={planColors.icon} />
              </View>
              <View style={s.mobileCardInfo}>
                <Text style={s.mobileCardLabel}>Plano atual</Text>
                <Text style={[s.mobileCardPlan, { color: planColors.text }]}>{currentPlan.name}</Text>
              </View>
              {subStatus && (
                <View style={[s.statusPill, { backgroundColor: `${subStatus.color}18` }]}>
                  <View style={[s.statusDot, { backgroundColor: subStatus.color }]} />
                  <Text style={[s.statusText, { color: subStatus.color }]}>{subStatus.label}</Text>
                </View>
              )}
            </View>

            {isTrialing && subscription?.current_period_end && (
              <View style={s.mobileRow}>
                <Text style={s.mobileRowLabel}>Teste grátis ate</Text>
                <Text style={[s.mobileRowValue, { color: Colors.primary[700] }]}>
                  {formatDate(subscription.current_period_end)}
                </Text>
              </View>
            )}

            {isPaid && !isTrialing && subscription?.current_period_end && (
              <View style={s.mobileRow}>
                <Text style={s.mobileRowLabel}>
                  {subscription.cancel_at_period_end ? 'Cancela em' : 'Renova em'}
                </Text>
                <Text style={[s.mobileRowValue, { color: subscription.cancel_at_period_end ? Colors.warning[700] : planColors.text }]}>
                  {formatDate(subscription.current_period_end)}
                </Text>
              </View>
            )}
          </View>

          {error && (
            <View style={s.errorBanner}>
              <XCircle size={16} color={Colors.error[600]} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {isPaid && (
            <TouchableOpacity
              style={s.mobileManageBtn}
              onPress={handleManageSubscription}
              disabled={actionLoading === 'portal'}
              activeOpacity={0.85}
            >
              {actionLoading === 'portal'
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <>
                    <RefreshCw size={16} color={Colors.white} />
                    <Text style={s.mobileManageBtnText}>Gerenciar assinatura</Text>
                  </>}
            </TouchableOpacity>
          )}

          {!isPaid && !isWeb && (
            <TouchableOpacity
              style={[s.mobileManageBtn, { backgroundColor: Colors.neutral[600] }]}
              onPress={handleRestore}
              disabled={rcLoading}
              activeOpacity={0.85}
            >
              {rcLoading
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <>
                    <RotateCcw size={16} color={Colors.white} />
                    <Text style={s.mobileManageBtnText}>Restaurar compras</Text>
                  </>}
            </TouchableOpacity>
          )}

          {isPaid && !subscription?.cancel_at_period_end && (
            <TouchableOpacity
              style={[s.mobileManageBtn, { backgroundColor: Colors.error[600], marginTop: 10 }]}
              onPress={handleCancelSubscription}
              disabled={actionLoading === 'cancel'}
              activeOpacity={0.85}
            >
              {actionLoading === 'cancel'
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <>
                    <XCircle size={16} color={Colors.white} />
                    <Text style={s.mobileManageBtnText}>Cancelar assinatura</Text>
                  </>}
            </TouchableOpacity>
          )}

          {isWeb && <View style={s.voucherSection}>
            <Text style={s.voucherTitle}>Voucher de desconto</Text>
            {voucherData ? (
              <View style={s.voucherApplied}>
                <Tag size={16} color={Colors.secondary[600]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.voucherAppliedCode}>{voucherCode.trim().toUpperCase()}</Text>
                  <Text style={s.voucherAppliedDesc}>
                    {voucherData.type === 'percentage'
                      ? `${voucherData.discount_value}% de desconto aplicado`
                      : `R$ ${Number(voucherData.discount_value).toFixed(2)} de desconto aplicado`}
                    {voucherData.description ? ` · ${voucherData.description}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={clearVoucher} style={s.voucherRemove}>
                  <XCircle size={18} color={Colors.error[500]} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.voucherRow}>
                <TextInput
                  style={s.voucherInput}
                  value={voucherCode}
                  onChangeText={(t) => { setVoucherCode(t.toUpperCase()); setVoucherError(null); }}
                  placeholder="Ex: PROMO20"
                  placeholderTextColor={Colors.neutral[400]}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[s.voucherApplyBtn, (!voucherCode.trim() || voucherLoading) && s.voucherApplyBtnDisabled]}
                  onPress={applyVoucher}
                  disabled={!voucherCode.trim() || voucherLoading}
                >
                  {voucherLoading
                    ? <ActivityIndicator size="small" color={Colors.white} />
                    : <Text style={s.voucherApplyBtnText}>Aplicar</Text>}
                </TouchableOpacity>
              </View>
            )}
            {voucherError && (
              <View style={s.voucherErrRow}>
                <AlertCircle size={13} color={Colors.error[600]} />
                <Text style={s.voucherErrText}>{voucherError}</Text>
              </View>
            )}
          </View>}

          {isPaid && subscription?.provider && subscription.provider !== 'stripe' && (
            <View style={[s.errorBanner, { backgroundColor: Colors.primary[50], borderColor: Colors.primary[100] }]}>
              <Info size={16} color={Colors.primary[600]} />
              <Text style={[s.errorText, { color: Colors.primary[700] }]}>
                Voce ja possui uma assinatura ativa. Os beneficios do seu plano estao disponiveis nesta conta.
              </Text>
            </View>
          )}

          {/* Plans overview (read-only) */}
          <Text style={s.plansTitle}>Planos disponíveis</Text>
          <View style={s.mobilePlansWrap}>
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              const Icon = PLAN_ICONS[plan.id];
              const pc = PLAN_COLORS[plan.id];
              return (
                <View key={plan.id} style={[s.mobilePlanCard, isCurrent && { borderColor: pc.border, borderWidth: 2 }]}>
                  {plan.badge && (
                    <View style={[s.planBadge, { backgroundColor: plan.highlight ? Colors.primary[600] : '#D97706' }]}>
                      <Text style={s.planBadgeText}>{plan.badge}</Text>
                    </View>
                  )}
                  <View style={s.mobilePlanTop}>
                    <View style={[s.planIconWrap, { backgroundColor: pc.bg }]}>
                      <Icon size={18} color={pc.icon} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.planName}>{plan.name}</Text>
                      <Text style={[s.planPrice, plan.highlight && { color: Colors.primary[700] }]}>{plan.priceLabel}</Text>
                    </View>
                    {isCurrent && (
                      <View style={[s.currentBadge, { paddingHorizontal: 8, paddingVertical: 4 }]}>
                        <BadgeCheck size={12} color={Colors.secondary[600]} />
                        <Text style={[s.currentBadgeText, { fontSize: FontSizes.xs }]}>Atual</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.featureList}>
                    {plan.features.map((f) => (
                      <View key={f} style={s.featureRow}>
                        <CheckCircle size={12} color={Colors.secondary[500]} />
                        <Text style={s.featureText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                  {!isCurrent && plan.id !== 'free' && (
                    <TouchableOpacity
                      style={[s.mobilePlanBtn, plan.highlight && { backgroundColor: Colors.primary[600] }]}
                      onPress={() => handleMobilePurchase(plan)}
                      disabled={!!actionLoading}
                      activeOpacity={0.85}
                    >
                      {actionLoading === plan.id
                        ? <ActivityIndicator size="small" color={Colors.white} />
                        : <>
                            <Text style={s.mobilePlanBtnText}>
                              {plan.id === 'free_trial' ? 'Ativar teste grátis' : 'Assinar agora'}
                            </Text>
                            <ArrowRight size={14} color={Colors.white} />
                          </>}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── WEB ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSubscription(); }} tintColor={Colors.primary[600]} />}
      >
        <View style={s.header}>
          <Text style={s.headerTitle}>Assinatura</Text>
          <Text style={s.headerSub}>Gerencie seu plano e faturamento</Text>
        </View>

        {/* Current plan card */}
        <View style={[s.currentCard, { backgroundColor: planColors.bg, borderColor: planColors.border }]}>
          <View style={s.currentTop}>
            <View style={[s.currentIconWrap, { backgroundColor: planColors.border }]}>
              <PlanIcon size={22} color={planColors.icon} />
            </View>
            <View style={s.currentInfo}>
              <Text style={[s.currentPlanName, { color: planColors.text }]}>Plano {currentPlan.name}</Text>
              <Text style={[s.currentPlanPrice, { color: planColors.icon }]}>{currentPlan.priceLabel}</Text>
            </View>
            {subStatus && (
              <View style={[s.statusPill, { backgroundColor: `${subStatus.color}18` }]}>
                <View style={[s.statusDot, { backgroundColor: subStatus.color }]} />
                <Text style={[s.statusText, { color: subStatus.color }]}>{subStatus.label}</Text>
              </View>
            )}
          </View>

          {isPaid && (
            <View style={s.currentMeta}>
              {subscription?.cancel_at_period_end ? (
                <View style={s.metaRow}>
                  <AlertCircle size={13} color={Colors.warning[600]} />
                  <Text style={s.metaTextWarn}>Cancela em {formatDate(subscription.current_period_end)}</Text>
                </View>
              ) : (
                <View style={s.metaRow}>
                  <RefreshCw size={13} color={planColors.icon} />
                  <Text style={[s.metaText, { color: planColors.text }]}>Renova em {formatDate(subscription?.current_period_end ?? null)}</Text>
                </View>
              )}
            </View>
          )}

          {isPaid && (
            <TouchableOpacity style={s.manageBtn} onPress={handleManageSubscription} disabled={actionLoading === 'portal'}>
              {actionLoading === 'portal'
                ? <ActivityIndicator size="small" color={planColors.icon} />
                : <Text style={[s.manageBtnText, { color: planColors.icon }]}>Gerenciar assinatura</Text>
              }
            </TouchableOpacity>
          )}

          {isPaid && !subscription?.cancel_at_period_end && (
            <TouchableOpacity
              style={[s.manageBtn, { borderColor: Colors.error[200], marginTop: 10 }]}
              onPress={handleCancelSubscription}
              disabled={actionLoading === 'cancel'}
            >
              {actionLoading === 'cancel'
                ? <ActivityIndicator size="small" color={Colors.error[600]} />
                : <Text style={[s.manageBtnText, { color: Colors.error[600] }]}>Cancelar assinatura</Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {error && (
          <View style={s.errorBanner}>
            <XCircle size={16} color={Colors.error[600]} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* Voucher field */}
        <View style={s.voucherSection}>
          <Text style={s.voucherTitle}>Voucher de desconto</Text>
          {voucherData ? (
            <View style={s.voucherApplied}>
              <Tag size={16} color={Colors.secondary[600]} />
              <View style={{ flex: 1 }}>
                <Text style={s.voucherAppliedCode}>{voucherCode.trim().toUpperCase()}</Text>
                <Text style={s.voucherAppliedDesc}>
                  {voucherData.type === 'percentage'
                    ? `${voucherData.discount_value}% de desconto aplicado`
                    : `R$ ${Number(voucherData.discount_value).toFixed(2)} de desconto aplicado`}
                  {voucherData.description ? ` · ${voucherData.description}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={clearVoucher} style={s.voucherRemove}>
                <XCircle size={18} color={Colors.error[500]} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.voucherRow}>
              <TextInput
                style={s.voucherInput}
                value={voucherCode}
                onChangeText={(t) => { setVoucherCode(t.toUpperCase()); setVoucherError(null); }}
                placeholder="Ex: PROMO20"
                placeholderTextColor={Colors.neutral[400]}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[s.voucherApplyBtn, (!voucherCode.trim() || voucherLoading) && s.voucherApplyBtnDisabled]}
                onPress={applyVoucher}
                disabled={!voucherCode.trim() || voucherLoading}
              >
                {voucherLoading
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Text style={s.voucherApplyBtnText}>Aplicar</Text>}
              </TouchableOpacity>
            </View>
          )}
          {voucherError && (
            <View style={s.voucherErrRow}>
              <AlertCircle size={13} color={Colors.error[600]} />
              <Text style={s.voucherErrText}>{voucherError}</Text>
            </View>
          )}
        </View>

        <Text style={s.plansTitle}>Planos disponíveis</Text>

        <View style={s.plansWrap}>
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const Icon = PLAN_ICONS[plan.id];
            const pc = PLAN_COLORS[plan.id];
            const isLoading = actionLoading === plan.id;

            return (
              <View
                key={plan.id}
                style={[s.planCard, plan.highlight && s.planCardHighlight, isCurrent && { borderColor: pc.border, borderWidth: 2 }]}
              >
                {plan.badge && (
                  <View style={[s.planBadge, { backgroundColor: plan.highlight ? Colors.primary[600] : '#D97706' }]}>
                    <Text style={s.planBadgeText}>{plan.badge}</Text>
                  </View>
                )}

                <View style={s.planTop}>
                  <View style={[s.planIconWrap, { backgroundColor: pc.bg }]}>
                    <Icon size={20} color={pc.icon} />
                  </View>
                  <View style={s.planNameWrap}>
                    <Text style={s.planName}>{plan.name}</Text>
                    <Text style={s.planDesc}>{plan.description}</Text>
                  </View>
                  <Text style={[s.planPrice, plan.highlight && { color: Colors.primary[700] }]}>{plan.priceLabel}</Text>
                </View>

                <View style={s.featureList}>
                  {plan.features.map((f) => (
                    <View key={f} style={s.featureRow}>
                      <CheckCircle size={14} color={Colors.secondary[500]} />
                      <Text style={s.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>

                {!isCurrent && plan.id !== 'free' && (
                  <TouchableOpacity
                    style={[s.selectBtn, plan.highlight && s.selectBtnHighlight]}
                    onPress={() => handleCheckout(plan)}
                    disabled={!!actionLoading}
                  >
                    {isLoading
                      ? <ActivityIndicator size="small" color={Colors.white} />
                      : <>
                          <Text style={s.selectBtnText}>
                            {currentPlanId === 'free' ? 'Assinar' : currentPlanId === 'pro' && plan.id === 'premium' ? 'Fazer upgrade' : 'Mudar para este plano'}
                          </Text>
                          <ArrowRight size={15} color={Colors.white} />
                        </>
                    }
                  </TouchableOpacity>
                )}

                {isCurrent && (
                  <View style={s.currentBadge}>
                    <BadgeCheck size={15} color={Colors.secondary[600]} />
                    <Text style={s.currentBadgeText}>Plano atual</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  headerTitle: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.neutral[900] },
  headerSub: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginTop: 2 },

  // Mobile styles
  mobileCard: {
    marginHorizontal: Spacing.lg, borderRadius: 20, borderWidth: 1.5,
    padding: Spacing.md, marginBottom: Spacing.md, gap: 14,
  },
  mobileCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mobileIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mobileCardInfo: { flex: 1 },
  mobileCardLabel: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.4 },
  mobileCardPlan: { fontSize: FontSizes.xl, fontWeight: '800', marginTop: 2 },
  mobileRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 10,
  },
  mobileRowLabel: { fontSize: FontSizes.sm, color: Colors.neutral[500], fontWeight: '500' },
  mobileRowValue: { fontSize: FontSizes.sm, fontWeight: '700' },

  mobileManageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.neutral[800], borderRadius: 14,
    paddingVertical: 14,
  },
  mobileManageBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
  mobilePlanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.neutral[800], borderRadius: 10,
    paddingVertical: 10,
  },
  mobilePlanBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },

  mobilePlansWrap: { paddingHorizontal: Spacing.lg, gap: 10, marginBottom: Spacing.md },
  mobilePlanCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.neutral[200], gap: 10,
    ...Shadows.xs, position: 'relative', overflow: 'hidden',
  },
  mobilePlanTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Web / current plan card styles
  currentCard: {
    marginHorizontal: Spacing.lg, borderRadius: 20, borderWidth: 1.5,
    padding: Spacing.md, marginBottom: Spacing.md, gap: 12,
  },
  currentTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  currentInfo: { flex: 1 },
  currentPlanName: { fontSize: FontSizes.lg, fontWeight: '700' },
  currentPlanPrice: { fontSize: FontSizes.sm, fontWeight: '600', marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadii.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FontSizes.xs, fontWeight: '700' },
  currentMeta: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: FontSizes.sm, fontWeight: '500' },
  metaTextWarn: { fontSize: FontSizes.sm, color: Colors.warning[700], fontWeight: '500' },
  manageBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 2 },
  manageBtnText: { fontSize: FontSizes.sm, fontWeight: '700', textDecorationLine: 'underline' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.lg, marginBottom: 12,
    backgroundColor: Colors.error[50], borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: Colors.error[100],
  },
  errorText: { fontSize: FontSizes.sm, color: Colors.error[700], flex: 1 },

  plansTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900], marginHorizontal: Spacing.lg, marginBottom: 12 },
  plansWrap: { paddingHorizontal: Spacing.lg, gap: 14 },

  planCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.neutral[200], gap: 14,
    ...Shadows.sm, position: 'relative', overflow: 'hidden',
  },
  planCardHighlight: { borderColor: Colors.primary[300], ...Shadows.md },
  planBadge: {
    position: 'absolute', top: 0, right: 0,
    paddingHorizontal: 12, paddingVertical: 4,
    borderBottomLeftRadius: 12, borderTopRightRadius: 18,
  },
  planBadgeText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.white, letterSpacing: 0.3 },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  planIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  planNameWrap: { flex: 1 },
  planName: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.neutral[900] },
  planDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginTop: 1 },
  planPrice: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[700] },
  featureList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: FontSizes.sm, color: Colors.neutral[700], flex: 1 },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.neutral[800], borderRadius: 14, paddingVertical: 14,
  },
  selectBtnHighlight: { backgroundColor: Colors.primary[600] },
  selectBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
  currentBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.secondary[50], borderRadius: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.secondary[200],
  },
  currentBadgeText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.secondary[700] },

  // Voucher styles
  voucherSection: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.neutral[200], gap: 10, ...Shadows.xs,
  },
  voucherTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700], textTransform: 'uppercase', letterSpacing: 0.4 },
  voucherRow: { flexDirection: 'row', gap: 8 },
  voucherInput: {
    flex: 1, backgroundColor: Colors.neutral[50], borderWidth: 1.5, borderColor: Colors.neutral[200],
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900], letterSpacing: 1,
  },
  voucherApplyBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center',
  },
  voucherApplyBtnDisabled: { opacity: 0.5 },
  voucherApplyBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
  voucherApplied: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.secondary[50], borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: Colors.secondary[200],
  },
  voucherAppliedCode: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.secondary[700], letterSpacing: 1 },
  voucherAppliedDesc: { fontSize: FontSizes.sm, color: Colors.secondary[600], marginTop: 1 },
  voucherRemove: { padding: 2 },
  voucherErrRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voucherErrText: { fontSize: FontSizes.xs, color: Colors.error[600], fontWeight: '600', flex: 1 },
});
