import type { ReactNode } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  StyleSheet,
  Text,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadii } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = TouchableOpacityProps & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
};

const bgColors: Record<Variant, string> = {
  primary:   Colors.primary[600],
  secondary: Colors.secondary[500],
  outline:   'transparent',
  ghost:     'transparent',
  danger:    Colors.error[600],
};
const textColors: Record<Variant, string> = {
  primary:   Colors.white,
  secondary: Colors.white,
  outline:   Colors.primary[600],
  ghost:     Colors.primary[600],
  danger:    Colors.white,
};
const borderWidths: Record<Variant, number> = {
  primary: 0, secondary: 0, outline: 1.5, ghost: 0, danger: 0,
};
const paddings: Record<Size, { px: number; py: number; r: number; fs: number }> = {
  sm: { px: 14, py: 8,  r: BorderRadii.sm, fs: FontSizes.sm },
  md: { px: 20, py: 13, r: BorderRadii.md, fs: FontSizes.md },
  lg: { px: 28, py: 16, r: BorderRadii.md, fs: FontSizes.lg },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const p = paddings[size];
  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: bgColors[variant],
          borderWidth: borderWidths[variant],
          borderColor: variant === 'outline' ? Colors.primary[600] : 'transparent',
          paddingHorizontal: p.px,
          paddingVertical: p.py,
          borderRadius: p.r,
          opacity: disabled || loading ? 0.5 : 1,
        },
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.75}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <Text style={{ color: textColors[variant], fontSize: p.fs, fontWeight: '600' }}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
