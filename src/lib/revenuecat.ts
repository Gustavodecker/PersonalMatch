import { Platform } from 'react-native';

let Purchases: any = null;
let PURCHASES_ERROR_CODE: any = null;
let rcLoaded = false;

function loadRC() {
  if (rcLoaded) return;
  if (Platform.OS === 'web') { rcLoaded = true; return; }
  try {
    const mod = require('react-native-purchases');
    Purchases = mod.default ?? mod;
    PURCHASES_ERROR_CODE = mod.PURCHASES_ERROR_CODE;
    rcLoaded = true;
  } catch (e) {
    console.warn('react-native-purchases not available:', e);
    rcLoaded = true;
  }
}

const RC_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

let initialized = false;

export async function initRevenueCat(appUserId: string) {
  if (Platform.OS === 'web' || initialized) return;
  loadRC();
  if (!Purchases) return;

  const apiKey = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (!apiKey) return;

  try {
    const LOG_LEVEL = require('react-native-purchases').LOG_LEVEL;
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  } catch {}
  await Purchases.configure({ apiKey, appUserID: appUserId });
  initialized = true;
}

export async function loginRevenueCat(appUserId: string) {
  if (Platform.OS === 'web') return;
  if (!initialized) await initRevenueCat(appUserId);
  else if (Purchases) await Purchases.logIn(appUserId);
}

export async function logoutRevenueCat() {
  if (Platform.OS === 'web' || !initialized || !Purchases) return;
  try {
    await Purchases.logOut();
  } catch {
    // Ignore logout errors
  }
  initialized = false;
}

export interface OfferingPackages {
  proMonthly: any | null;
  premiumMonthly: any | null;
  all: any[];
}

export async function getOfferingPackages(): Promise<OfferingPackages> {
  if (Platform.OS === 'web' || !Purchases || !initialized) {
    return { proMonthly: null, premiumMonthly: null, all: [] };
  }

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return { proMonthly: null, premiumMonthly: null, all: [] };

  const all = current.availablePackages;
  const proMonthly = all.find((p: any) => p.identifier === 'pro_monthly') ?? null;
  const premiumMonthly = all.find((p: any) => p.identifier === 'premium_monthly') ?? null;

  return { proMonthly, premiumMonthly, all };
}

export interface PurchaseResult {
  success: boolean;
  customerInfo: any | null;
  cancelled: boolean;
  error: string | null;
}

export async function purchasePackage(pkg: any): Promise<PurchaseResult> {
  if (Platform.OS === 'web' || !Purchases) {
    return { success: false, customerInfo: null, cancelled: false, error: 'Not supported' };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo, cancelled: false, error: null };
  } catch (e: any) {
    if (e.userCancelled) {
      return { success: false, customerInfo: null, cancelled: true, error: null };
    }
    if (PURCHASES_ERROR_CODE && e.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
      const info = await Purchases.getCustomerInfo();
      return { success: true, customerInfo: info, cancelled: false, error: null };
    }
    if (PURCHASES_ERROR_CODE && e.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
      return { success: false, customerInfo: null, cancelled: false, error: 'Pagamento pendente. Aguarde a confirmação.' };
    }
    return { success: false, customerInfo: null, cancelled: false, error: e.message ?? 'Erro ao processar compra.' };
  }
}

export async function restorePurchases(): Promise<any | null> {
  if (Platform.OS === 'web' || !Purchases || !initialized) return null;
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
}

export async function getCustomerInfo(): Promise<any | null> {
  if (Platform.OS === 'web' || !Purchases || !initialized) return null;
  const info = await Purchases.getCustomerInfo();
  return info;
}

export function hasEntitlement(
  info: any | null,
  entitlement: 'pro' | 'premium'
): boolean {
  if (!info) return false;
  return info.entitlements?.active?.[entitlement] !== undefined;
}

export function getActiveEntitlement(
  info: any | null
): 'free' | 'pro' | 'premium' {
  if (!info) return 'free';
  if (info.entitlements?.active?.['premium']) return 'premium';
  if (info.entitlements?.active?.['pro']) return 'pro';
  return 'free';
}
