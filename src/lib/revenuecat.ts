import { Platform } from 'react-native';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
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
  await Purchases.logIn(appUserId);
}

export async function logoutRevenueCat() {
  if (Platform.OS === 'web' || !initialized) return;
  await Purchases.logOut();
}

export async function getOfferings(): Promise<PurchasesPackage[]> {
  if (Platform.OS === 'web') return [];
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  return current.availablePackages;
}

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> {
  if (Platform.OS === 'web') return null;
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
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
