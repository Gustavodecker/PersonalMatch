import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { ArrowLeft, Bell, Menu } from 'lucide-react-native';
import { router } from 'expo-router';

type HeaderProps = {
  title: string;
  showBack?: boolean;
  showNotification?: boolean;
  onMenuPress?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
};

export function Header({ title, showBack, showNotification, onMenuPress, rightAction, transparent }: HeaderProps) {
  return (
    <SafeAreaView style={[styles.safeArea, transparent && styles.transparentSafe]} edges={['top']}>
      <View style={[styles.container, transparent && styles.transparentContainer]}>
        <View style={styles.left}>
          {showBack ? (
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
              <ArrowLeft size={22} color={transparent ? Colors.white : Colors.primary[800]} />
            </TouchableOpacity>
          ) : onMenuPress ? (
            <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
              <Menu size={22} color={Colors.primary[800]} />
            </TouchableOpacity>
          ) : null}
          <Text style={[styles.title, transparent && styles.titleLight]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={styles.right}>
          {showNotification && (
            <TouchableOpacity style={styles.iconButton}>
              <Bell size={22} color={transparent ? Colors.white : Colors.primary[800]} />
            </TouchableOpacity>
          )}
          {rightAction}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.white,
  },
  transparentSafe: {
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    height: 56,
  },
  transparentContainer: {
    backgroundColor: 'transparent',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: FontSizes.xl,
    color: Colors.primary[800],
    fontWeight: '700',
    flex: 1,
  },
  titleLight: {
    color: Colors.white,
  },
  iconButton: {
    padding: Spacing.sm,
    borderRadius: 999,
  },
});
