import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, Spacing, FontSizes, BorderRadii } from '@/constants/theme';
import { Mail, MapPin, LogOut, ChevronRight } from 'lucide-react-native';

export default function StudentProfile() {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{profile.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <Text style={styles.name}>{profile.full_name}</Text>
          <StatusBadge label="Aluno" variant="success" />
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Mail size={18} color={Colors.primary[500]} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>E-mail</Text>
                <Text style={styles.infoValue}>{profile.email}</Text>
              </View>
            </View>
            {profile.city ? (
              <View style={styles.infoRow}>
                <MapPin size={18} color={Colors.primary[500]} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Localização</Text>
                  <Text style={styles.infoValue}>
                    {profile.city}{profile.state ? `, ${profile.state}` : ''}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Button variant="outline" onPress={handleSignOut}>Sair da conta</Button>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },
  heroCard: {
    backgroundColor: Colors.white, margin: Spacing.lg, borderRadius: BorderRadii.xl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
  },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: Spacing.sm },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primary[600],
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  avatarInitial: { color: Colors.white, fontWeight: '700', fontSize: FontSizes.xxxl },
  name: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.neutral[900] },
  bio: { fontSize: FontSizes.md, color: Colors.neutral[600], textAlign: 'center', marginTop: Spacing.xs },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[500],
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm,
  },
  infoCard: { backgroundColor: Colors.white, borderRadius: BorderRadii.xl, overflow: 'hidden' },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: FontSizes.xs, color: Colors.neutral[500], fontWeight: '600' },
  infoValue: { fontSize: FontSizes.md, color: Colors.neutral[900], marginTop: 1 },
});
