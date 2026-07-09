import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { getDashboardRoute } from '@/lib/role-routes';

export default function AuthLayout() {
  const { user, profile, loading, needsRoleSelection } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user && profile) {
    const dest = getDashboardRoute(profile.role);
    return <Redirect href={dest as any} />;
  }
  if (user && !profile && needsRoleSelection) return <Redirect href="/select-role" />;
  if (user && !profile) return <LoadingScreen />;
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
