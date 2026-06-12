import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Redirect, Tabs, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LayoutDashboard, User, CalendarDays, CreditCard, MessageSquare, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

type TrialState = 'loading' | 'ok' | 'warning' | 'expired';

export default function TrainerAppLayout() {
  const { user, profile, loading } = useAuth();
  const [trialState, setTrialState] = useState<TrialState>('loading');
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    if (!profile || profile.role !== 'trainer') return;
    supabase
      .from('trainers')
      .select('subscription_status, subscription_plan, trial_ends_at')
      .eq('id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setTrialState('ok'); return; }
        if (data.subscription_status === 'active') { setTrialState('ok'); return; }
        const trialEnd = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
        if (!trialEnd) { setTrialState('ok'); return; }
        const msLeft = trialEnd.getTime() - Date.now();
        const days = Math.ceil(msLeft / 86400000);
        if (days <= 0) setTrialState('expired');
        else if (days <= 3) { setTrialState('warning'); setDaysLeft(days); }
        else setTrialState('ok');
      });
  }, [profile]);

  if (loading || trialState === 'loading') return <LoadingScreen />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (profile && profile.role !== 'trainer' && profile.role !== 'admin') return <Redirect href="/" />;

  if (trialState === 'expired') {
    return (
      <SafeAreaView style={exp.safe}>
        <View style={exp.card}>
          <View style={exp.iconWrap}>
            <AlertTriangle size={40} color={Colors.error[600]} />
          </View>
          <Text style={exp.title}>Período de teste encerrado</Text>
          <Text style={exp.desc}>
            Seu período de teste gratuito de 15 dias expirou. Assine um plano para continuar recebendo alunos e aparecer nas buscas.
          </Text>
          <TouchableOpacity
            style={exp.btn}
            onPress={() => router.push('/trainer/(app)/assinatura')}
          >
            <CreditCard size={18} color={Colors.white} />
            <Text style={exp.btnText}>Ver planos e assinar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={exp.logoutBtn} onPress={() => router.replace('/')}>
            <Text style={exp.logoutText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {trialState === 'warning' && (
        <View style={warn.banner}>
          <AlertTriangle size={14} color={Colors.warning[700]} />
          <Text style={warn.text}>
            Teste expira em {daysLeft} dia{daysLeft !== 1 ? 's' : ''}.{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/trainer/(app)/assinatura')}>
            <Text style={warn.link}>Assinar agora</Text>
          </TouchableOpacity>
        </View>
      )}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary[600],
          tabBarInactiveTintColor: Colors.neutral[400],
          tabBarStyle: {
            borderTopColor: Colors.neutral[200],
            backgroundColor: Colors.white,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen name="dashboard"    options={{ title: 'Painel',      tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }} />
        <Tabs.Screen name="availability" options={{ title: 'Agenda',      tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} /> }} />
        <Tabs.Screen name="contacts"     options={{ title: 'Contatos',    tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} /> }} />
        <Tabs.Screen name="profile"      options={{ title: 'Perfil',      tabBarIcon: ({ color, size }) => <User size={size} color={color} /> }} />
        <Tabs.Screen
          name="assinatura"
          options={{
            title: 'Assinatura',
            tabBarIcon: ({ color, size }) => <CreditCard size={size} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const exp = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50], justifyContent: 'center', alignItems: 'center' },
  card: {
    margin: Spacing.xl, backgroundColor: Colors.white, borderRadius: BorderRadii.xl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, ...Shadows.md,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.error[50],
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  title: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.neutral[900], textAlign: 'center' },
  desc: { fontSize: FontSizes.md, color: Colors.neutral[500], textAlign: 'center', lineHeight: 22 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary[600], borderRadius: BorderRadii.lg,
    paddingVertical: 14, paddingHorizontal: Spacing.xl, width: '100%', justifyContent: 'center',
  },
  btnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
  logoutBtn: { paddingVertical: 8 },
  logoutText: { fontSize: FontSizes.sm, color: Colors.neutral[400] },
});

const warn = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.warning[50], paddingHorizontal: Spacing.lg, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.warning[100],
  },
  text: { fontSize: FontSizes.sm, color: Colors.warning[700], flex: 1 },
  link: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.warning[700], textDecorationLine: 'underline' },
});
