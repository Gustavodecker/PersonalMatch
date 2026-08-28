import { Platform } from 'react-native';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';

const RC_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

let initialized = false;

export async function initRevenueCat(appUserId: string) {
  if (Platform.OS === 'web' || initialized) return;

  const apiKey = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (!apiKey) return;

  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  await Purchases.configure({ apiKey, appUserID: appUserId });
  initialized = true;
}

export async function loginRevenueCat(appUserId: string) {
  if (Platform.OS === 'web') return;
  if (!initialized) await initRevenueCat(appUserId);
  else await Purchases.logIn(appUserId);
}

export async function logoutRevenueCat() {
  if (Platform.OS === 'web' || !initialized) return;
  try {
    await Purchases.logOut();
  } catch {
    // Ignore logout errors (e.g. already anonymous)
  }
  initialized = false;
}

export interface OfferingPackages {
  proMonthly: PurchasesPackage | null;
  premiumMonthly: PurchasesPackage | null;
  all: PurchasesPackage[];
}

export async function getOfferingPackages(): Promise<OfferingPackages> {
  if (Platform.OS === 'web') return { proMonthly: null, premiumMonthly: null, all: [] };

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return { proMonthly: null, premiumMonthly: null, all: [] };

  const all = current.availablePackages;
  const proMonthly = all.find((p) => p.identifier === 'pro_monthly') ?? null;
  const premiumMonthly = all.find((p) => p.identifier === 'premium_monthly') ?? null;

  return { proMonthly, premiumMonthly, all };
}

export interface PurchaseResult {
  success: boolean;
  customerInfo: CustomerInfo | null;
  cancelled: boolean;
  error: string | null;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  if (Platform.OS === 'web') return { success: false, customerInfo: null, cancelled: false, error: 'Not supported on web' };

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo, cancelled: false, error: null };
  } catch (e: any) {
    if (e.userCancelled) {
      return { success: false, customerInfo: null, cancelled: true, error: null };
    }
    if (e.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
      const info = await Purchases.getCustomerInfo();
      return { success: true, customerInfo: info, cancelled: false, error: null };
    }
    if (e.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
      return { success: false, customerInfo: null, cancelled: false, error: 'Pagamento pendente. Aguarde a confirmação.' };
    }
    return { success: false, customerInfo: null, cancelled: false, error: e.message ?? 'Erro ao processar compra.' };
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (Platform.OS === 'web') return null;
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (Platform.OS === 'web') return null;
  const info = await Purchases.getCustomerInfo();
  return info;
}

export function hasEntitlement(
  info: CustomerInfo | null,
  entitlement: 'pro' | 'premium'
): boolean {
  if (!info) return false;
  return info.entitlements.active[entitlement] !== undefined;
}

export function getActiveEntitlement(
  info: CustomerInfo | null
): 'free' | 'pro' | 'premium' {
  if (!info) return 'free';
  if (info.entitlements.active['premium']) return 'premium';
  if (info.entitlements.active['pro']) return 'pro';
  return 'free';
}
