import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator,
} from 'react-native';
import { Colors, FontSizes, Spacing, Shadows } from '@/constants/theme';
import { AlertTriangle } from 'lucide-react-native';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
};

export function ConfirmModal({
  visible, title, message, confirmLabel = 'Confirmar',
  onConfirm, onCancel, loading, danger = true,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={[s.iconWrap, danger && s.iconWrapDanger]}>
            <AlertTriangle size={24} color={danger ? Colors.error[600] : Colors.warning[600]} />
          </View>
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>
          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, danger && s.confirmBtnDanger, loading && s.btnDisabled]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={s.confirmText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white, borderRadius: 20,
    padding: Spacing.xl, width: '100%', maxWidth: 380,
    alignItems: 'center', gap: 12,
    ...Shadows.lg,
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.warning[50],
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapDanger: { backgroundColor: Colors.error[50] },
  title: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900], textAlign: 'center' },
  message: { fontSize: FontSizes.sm, color: Colors.neutral[600], textAlign: 'center', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: Colors.neutral[100], alignItems: 'center',
  },
  cancelText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[700] },
  confirmBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: Colors.primary[600], alignItems: 'center',
  },
  confirmBtnDanger: { backgroundColor: Colors.error[600] },
  btnDisabled: { opacity: 0.6 },
  confirmText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
});
