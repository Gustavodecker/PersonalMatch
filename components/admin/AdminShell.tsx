import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  useWindowDimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontSizes, Spacing, Shadows } from '@/constants/theme';
import {
  LayoutDashboard, Users, Dumbbell, TrendingUp, Star,
  Tag, Settings, LogOut, Menu, X, Shield,
} from 'lucide-react-native';

const DESKTOP_BREAKPOINT = 900;

const NAV_ITEMS = [
  { href: '/painel-restrito/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/painel-restrito/users',     label: 'Usuários',    icon: Users },
  { href: '/painel-restrito/trainers',  label: 'Treinadores', icon: Dumbbell },
  { href: '/painel-restrito/leads',     label: 'Leads',       icon: TrendingUp },
  { href: '/painel-restrito/reviews',   label: 'Avaliações',  icon: Star },
  { href: '/painel-restrito/vouchers',  label: 'Vouchers',    icon: Tag },
  { href: '/painel-restrito/settings',  label: 'Configurações', icon: Settings },
];

type Props = {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
};

export function AdminShell({ children, title, actions }: Props) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { signOut, profile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  if (isDesktop) {
    return (
      <View style={s.desktopRoot}>
        <SidebarContent onSignOut={handleSignOut} profile={profile} />
        <View style={s.desktopContent}>
          <View style={s.desktopHeader}>
            <Text style={s.desktopTitle}>{title}</Text>
            {actions ? <View style={s.headerActions}>{actions}</View> : null}
          </View>
          <ScrollView style={s.desktopScroll} contentContainerStyle={s.desktopScrollContent}>
            {children}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.mobileRoot} edges={['top']}>
      <View style={s.mobileHeader}>
        <TouchableOpacity style={s.mobileMenuBtn} onPress={() => setDrawerOpen(true)}>
          <Menu size={22} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <Text style={s.mobileTitle}>{title}</Text>
        {actions ? <View>{actions}</View> : <View style={{ width: 40 }} />}
      </View>
      {children}

      <Modal visible={drawerOpen} transparent animationType="slide">
        <View style={s.drawerOverlay}>
          <TouchableOpacity style={s.drawerBackdrop} activeOpacity={1} onPress={() => setDrawerOpen(false)} />
          <View style={s.drawerPanel}>
            <View style={s.drawerTop}>
              <View style={s.sidebarBrand}>
                <Shield size={18} color={Colors.primary[400]} />
                <Text style={s.sidebarBrandText}>SuperShape</Text>
              </View>
              <TouchableOpacity onPress={() => setDrawerOpen(false)}>
                <X size={22} color={Colors.neutral[400]} />
              </TouchableOpacity>
            </View>
            <NavItems onPress={() => setDrawerOpen(false)} />
            <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
              <LogOut size={16} color={Colors.neutral[400]} />
              <Text style={s.signOutText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SidebarContent({ onSignOut, profile }: { onSignOut: () => void; profile: any }) {
  return (
    <View style={s.sidebar}>
      <View style={s.sidebarBrandRow}>
        <Shield size={20} color={Colors.primary[400]} />
        <Text style={s.sidebarBrandText}>SuperShape</Text>
        <Text style={s.sidebarAdminBadge}>Admin</Text>
      </View>
      <ScrollView style={s.sidebarScroll} showsVerticalScrollIndicator={false}>
        <NavItems />
      </ScrollView>
      <View style={s.sidebarFooter}>
        <View style={s.sidebarUser}>
          <View style={s.sidebarAvatar}>
            <Text style={s.sidebarAvatarText}>{profile?.full_name?.[0]?.toUpperCase() ?? 'A'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sidebarUserName} numberOfLines={1}>{profile?.full_name ?? 'Admin'}</Text>
            <Text style={s.sidebarUserEmail} numberOfLines={1}>{profile?.email ?? ''}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.signOutBtn} onPress={onSignOut}>
          <LogOut size={15} color={Colors.neutral[400]} />
          <Text style={s.signOutText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NavItems({ onPress }: { onPress?: () => void }) {
  const pathname = usePathname();
  return (
    <View style={s.navList}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <TouchableOpacity
            key={item.href}
            style={[s.navItem, active && s.navItemActive]}
            onPress={() => { router.push(item.href as any); onPress?.(); }}
            activeOpacity={0.75}
          >
            {active && <View style={s.navActiveBar} />}
            <Icon size={18} color={active ? Colors.white : Colors.neutral[400]} />
            <Text style={[s.navLabel, active && s.navLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const SIDEBAR_W = 248;

const s = StyleSheet.create({
  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: Colors.neutral[100] },
  sidebar: {
    width: SIDEBAR_W, backgroundColor: Colors.neutral[900],
    borderRightWidth: 1, borderRightColor: Colors.neutral[800],
    flexDirection: 'column',
  },
  sidebarBrandRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[800],
  },
  sidebarBrandText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.white, flex: 1 },
  sidebarAdminBadge: {
    fontSize: 9, fontWeight: '700', color: Colors.primary[400],
    backgroundColor: Colors.primary[900], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  sidebarScroll: { flex: 1 },
  sidebarFooter: {
    borderTopWidth: 1, borderTopColor: Colors.neutral[800],
    paddingHorizontal: 12, paddingVertical: 12, gap: 8,
  },
  sidebarUser: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sidebarAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.primary[700], alignItems: 'center', justifyContent: 'center',
  },
  sidebarAvatarText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
  sidebarUserName: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[200] },
  sidebarUserEmail: { fontSize: FontSizes.xs, color: Colors.neutral[500] },

  navList: { paddingVertical: 12, paddingHorizontal: 12, gap: 2 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    position: 'relative',
  },
  navItemActive: { backgroundColor: Colors.primary[700] },
  navActiveBar: {
    position: 'absolute', left: 0, top: 6, bottom: 6,
    width: 3, borderRadius: 2, backgroundColor: Colors.primary[400],
  },
  navLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[400] },
  navLabelActive: { color: Colors.white },

  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  signOutText: { fontSize: FontSizes.sm, color: Colors.neutral[500] },

  desktopContent: { flex: 1, flexDirection: 'column' },
  desktopHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: 18,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[200],
    ...Shadows.xs,
  },
  desktopTitle: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.neutral[900] },
  headerActions: { flexDirection: 'row', gap: 10 },
  desktopScroll: { flex: 1 },
  desktopScrollContent: { padding: Spacing.xl, gap: 20 },

  mobileRoot: { flex: 1, backgroundColor: Colors.neutral[50] },
  mobileHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[200],
    ...Shadows.xs,
    gap: 12,
  },
  mobileMenuBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center',
  },
  mobileTitle: { flex: 1, fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[900] },

  drawerOverlay: { flex: 1, flexDirection: 'row' },
  drawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawerPanel: {
    width: 280, backgroundColor: Colors.neutral[900],
    paddingVertical: 20, flexDirection: 'column',
  },
  drawerTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[800],
    marginBottom: 8,
  },
  sidebarBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
