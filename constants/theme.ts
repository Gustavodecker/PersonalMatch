export const Colors = {
  primary: {
    50:  '#E8F2FF',
    100: '#C5DCFF',
    200: '#8AB8FF',
    300: '#50A0F5',
    400: '#3688E8',
    500: '#2E72D8',
    600: '#255EC4',
    700: '#1E48B0',
    800: '#163490',
    900: '#0E2270',
  },
  // Teal accent — matches the top-right of the 99 Personal gradient logo
  teal: {
    50:  '#E8FDF9',
    100: '#C0F7EF',
    200: '#80EEE0',
    300: '#45E4CF',
    400: '#26D9C4',
    500: '#1ECBB6',
    600: '#18B8A4',
    700: '#139A8A',
    800: '#0E7A6E',
    900: '#095A52',
  },
  secondary: {
    50:  '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  accent: {
    50:  '#E8FDF9',
    100: '#C0F7EF',
    200: '#80EEE0',
    300: '#45E4CF',
    400: '#26D9C4',
    500: '#1ECBB6',
    600: '#18B8A4',
    700: '#139A8A',
    800: '#0E7A6E',
    900: '#095A52',
  },
  success: {
    50:  '#F0FDF4',
    100: '#DCFCE7',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
  },
  warning: {
    50:  '#FFFBEB',
    100: '#FEF3C7',
    300: '#FCD34D',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  error: {
    50:  '#FFF1F2',
    100: '#FFE4E6',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
  },
  neutral: {
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  white: '#FFFFFF',
  black: '#000000',
  // kept for backward compat
  green: {
    50:  '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0', 300: '#86EFAC',
    400: '#4ADE80', 500: '#22C55E', 600: '#16A34A', 700: '#15803D',
    800: '#166534', 900: '#14532D',
  },
} as const;

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
} as const;

export const FontSizes = {
  xs:   10,
  sm:   12,
  md:   14,
  lg:   16,
  xl:   18,
  xxl:  22,
  xxxl: 28,
  huge: 36,
} as const;

export const BorderRadii = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  full: 9999,
} as const;

export const BorderRadius = BorderRadii;

export const Shadows = {
  xs: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
