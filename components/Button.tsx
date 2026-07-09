import type { ReactNode } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors, FontSizes, BorderRadii } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'teal';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = TouchableOpacityProps & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
};

const BG: Record<Variant, string> = {
  primary:   Colors.primary[600],
  secondary: Colors.secondary[500],
  teal:      Colors.teal[500],
  outline:   'transparent',
  ghost:     'transparent',
  danger:    Colors.error[600],
};
const FG: Record<Variant, string> = {
  primary:   Colors.white,
  secondary: Colors.white,
  teal:      Colors.white,
  outline:   Colors.primary[600],
  ghost:     Colors.primary[600],
  danger:    Colors.white,
};
const BORDERS: Record<Variant, number> = {
  primary: 0, secondary: 0, teal: 0, outline: 1.5, ghost: 0, danger: 0,
};

const SIZES: Record<Size, { px: number; py: number; r: number; fs: number; fw: '600' | '700' }> = {
  sm: { px: 16, py: 9,  r: BorderRadii.md, fs: FontSizes.sm, fw: '600' },
  md: { px: 22, py: 14, r: BorderRadii.lg, fs: FontSizes.md, fw: '600' },
  lg: { px: 28, py: 17, r: BorderRadii.lg, fs: FontSizes.lg, fw: '700' },
};

const SHADOWS: Partial<Record<Variant, object>> = {
  primary: {
    shadowColor: Colors.primary[700],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  teal: {
    shadowColor: Colors.teal[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
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
  const p = SIZES[size];
  const shadow = !disabled && !loading ? (SHADOWS[variant] ?? {}) : {};

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: BG[variant],
          borderWidth: BORDERS[variant],
          borderColor: variant === 'outline' ? Colors.primary[600] : 'transparent',
          paddingHorizontal: p.px,
          paddingVertical: p.py,
          borderRadius: p.r,
          opacity: disabled || loading ? 0.48 : 1,
          ...shadow,
        },
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.78}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} size="small" />
      ) : (
        <Text
          style={{
            color: FG[variant],
            fontSize: p.fs,
            fontWeight: p.fw,
            letterSpacing: size === 'lg' ? 0.1 : 0,
          }}
        >
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
    gap: 8,
  },
});
