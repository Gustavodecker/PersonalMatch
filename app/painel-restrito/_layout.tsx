import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function AdminLayout() {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (profile && profile.role !== 'admin') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
