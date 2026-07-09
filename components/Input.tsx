import { useState } from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadii } from '@/constants/theme';
import { AlertCircle } from 'lucide-react-native';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
};

export function Input({ label, error, helperText, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={Colors.neutral[400]}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        {...props}
      />
      {error && (
        <View style={styles.errorRow}>
          <AlertCircle size={13} color={Colors.error[500]} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {helperText && !error && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[700],
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  input: {
    fontSize: FontSizes.md,
    color: Colors.neutral[900],
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
    borderRadius: BorderRadii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  inputFocused: {
    borderColor: Colors.primary[500],
    borderWidth: 2,
    shadowColor: Colors.primary[500],
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  inputError: {
    borderColor: Colors.error[500],
    borderWidth: 1.5,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.error[600],
    fontWeight: '500',
  },
  helperText: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[500],
    marginTop: Spacing.xs,
  },
});
