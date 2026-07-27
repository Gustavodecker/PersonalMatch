import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Platform,
  ScrollView,
} from 'react-native';
import { ChevronLeft, ChevronRight, Check, X, Calendar } from 'lucide-react-native';
import { Colors, FontSizes, BorderRadii, Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (date: string) => void;
  title?: string;
  minDate?: string;
};

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const IS_WEB = Platform.OS === 'web';

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function toDateParts(iso: string | null) {
  if (!iso) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export default function DatePickerModal({ visible, value, onClose, onConfirm, title = 'Selecionar data', minDate }: Props) {
  const initial = useMemo(() => toDateParts(value || null), [value, visible]);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [selected, setSelected] = useState<string>(value || '');

  const minParts = minDate ? toDateParts(minDate) : null;
  const todayISO = toISO(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isDisabled = (day: number) => {
    if (!minParts) return false;
    const cellISO = toISO(viewYear, viewMonth, day);
    return cellISO < toISO(minParts.year, minParts.month, minParts.day);
  };

  const handleConfirm = () => {
    onConfirm(selected);
    onClose();
  };

  const fmtDisplay = (iso: string) => {
    if (!iso) return '—';
    const { year, month, day } = toDateParts(iso);
    return `${pad(day)}/${pad(month + 1)}/${year}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Calendar size={18} color={Colors.primary[600]} />
              <Text style={s.title}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <X size={20} color={Colors.neutral[500]} />
            </TouchableOpacity>
          </View>

          <View style={s.navRow}>
            <TouchableOpacity onPress={goPrevMonth} style={s.navBtn}>
              <ChevronLeft size={22} color={Colors.neutral[700]} />
            </TouchableOpacity>
            <Text style={s.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={goNextMonth} style={s.navBtn}>
              <ChevronRight size={22} color={Colors.neutral[700]} />
            </TouchableOpacity>
          </View>

          <View style={s.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <View key={i} style={s.weekCell}>
                <Text style={s.weekText}>{w}</Text>
              </View>
            ))}
          </View>

          <View style={s.dayGrid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={i} style={s.dayCell} />;
              const iso = toISO(viewYear, viewMonth, day);
              const isSelected = selected === iso;
              const isToday = todayISO === iso;
              const disabled = isDisabled(day);
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.dayCell,
                    isSelected && s.dayCellSelected,
                    disabled && s.dayCellDisabled,
                  ]}
                  onPress={() => !disabled && setSelected(iso)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      s.dayText,
                      isToday && !isSelected && s.dayTextToday,
                      isSelected && s.dayTextSelected,
                      disabled && s.dayTextDisabled,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selected ? (
            <View style={s.selectedRow}>
              <Text style={s.selectedLabel}>Data selecionada:</Text>
              <Text style={s.selectedValue}>{fmtDisplay(selected)}</Text>
            </View>
          ) : null}

          <View style={s.actionRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, !selected && s.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!selected}
            >
              <Check size={16} color={Colors.white} />
              <Text style={s.confirmText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center',
    alignItems: 'center', padding: IS_WEB ? 24 : 16,
  },
  card: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 20,
    width: '100%', maxWidth: 380, ...({ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' } as any),
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  navRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral[50], alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[400], textTransform: 'uppercase' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: Colors.primary[600], borderRadius: 999,
  },
  dayCellDisabled: { opacity: 0.3 },
  dayText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[800] },
  dayTextToday: { color: Colors.primary[600], fontWeight: '800' },
  dayTextSelected: { color: Colors.white, fontWeight: '800' },
  dayTextDisabled: { color: Colors.neutral[300] },
  selectedRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.primary[50], borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 12,
  },
  selectedLabel: { fontSize: FontSizes.sm, color: Colors.neutral[600], fontWeight: '600' },
  selectedValue: { fontSize: FontSizes.md, color: Colors.primary[700], fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: Colors.neutral[100],
  },
  cancelText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[600] },
  confirmBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.primary[600],
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
});
