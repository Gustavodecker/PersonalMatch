import type { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadii, Shadows } from '@/constants/theme';

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: keyof typeof Spacing | number;
};

export function Card({ children, onPress, style, padding = 'lg' }: CardProps) {
  const paddingValue = typeof padding === 'number' ? padding : Spacing[padding];
  const cardStyle: ViewStyle[] = [styles.card, { padding: paddingValue }, style as ViewStyle];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.75}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadii.lg,
    ...Shadows.sm,
  },
});
