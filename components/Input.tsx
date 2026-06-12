import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadii } from '@/constants/theme';
import { AlertCircle } from 'lucide-react-native';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
};

export function Input({ label, error, helperText, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={Colors.neutral[400]}
        {...props}
      />
      {error && (
        <View style={styles.errorRow}>
          <AlertCircle size={14} color={Colors.error[500]} />
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
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.sm,
    color: Colors.neutral[700],
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.neutral[900],
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: BorderRadii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  inputError: {
    borderColor: Colors.error[500],
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.sm,
    color: Colors.error[500],
  },
  helperText: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.sm,
    color: Colors.neutral[500],
    marginTop: Spacing.xs,
  },
});
