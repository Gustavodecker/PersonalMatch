import { Platform } from 'react-native';
import { supabase } from './supabase';

let tracked = new Set<string>();

export async function trackPageVisit(pagePath: string, userId?: string | null) {
  const key = `${pagePath}:${Date.now().toString(36).slice(0, -2)}`;
  if (tracked.has(key)) return;
  tracked.add(key);

  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return;

    const sessionId =
      Platform.OS + '_' + Math.random().toString(36).slice(2, 10);

    await fetch(`${supabaseUrl}/functions/v1/track-visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page_path: pagePath,
        referrer: Platform.OS === 'web' ? (typeof document !== 'undefined' ? document.referrer : null) : null,
        user_agent: Platform.OS === 'web' ? (typeof navigator !== 'undefined' ? navigator.userAgent : null) : `PersonalMatch/${Platform.OS}`,
        visitor_id: userId || null,
        session_id: sessionId,
      }),
    });
  } catch {
    // Silently fail — analytics should not break the app
  }
}
