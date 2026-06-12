import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, TextInput, Modal, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { TrainerAvailability, TrainerScheduleBlock } from '@/types/database';
import { ArrowLeft, Clock, Plus, Trash2, Check, X, Calendar, AlertCircle } from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';

const DAY_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const SESSION_DURATIONS = [30, 45, 60, 90];
const BUFFER_OPTIONS = [0, 15, 30];

type DayConfig = {
  is_active: boolean;
  start_time: string;
  end_time: string;
  session_duration: number;
  buffer_minutes: number;
  existingId: string | null;
};

const defaultDayConfig = (): DayConfig => ({
  is_active: false,
  start_time: '08:00',
  end_time: '18:00',
  session_duration: 60,
  buffer_minutes: 0,
  existingId: null,
});

type BlockForm = {
  block_date: string;
  is_full_day: boolean;
  start_time: string;
  end_time: string;
  reason: string;
};

const emptyBlockForm = (): BlockForm => ({
  block_date: '',
  is_full_day: false,
  start_time: '08:00',
  end_time: '18:00',
  reason: '',
});

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  if (IS_WEB) {
    return (
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1, padding: '8px 12px', borderRadius: 10,
          border: `1.5px solid ${Colors.neutral[200]}`, fontSize: 14,
          fontWeight: 600, color: Colors.neutral[900],
          backgroundColor: Colors.neutral[50], outline: 'none', minWidth: 0,
        } as any}
      />
    );
  }
  return (
    <TextInput
      style={s.timeInput} value={value} onChangeText={onChange}
      placeholder="08:00" placeholderTextColor={Colors.neutral[400]}
      keyboardType="numbers-and-punctuation"
    />
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  if (IS_WEB) {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1, padding: '8px 12px', borderRadius: 10,
          border: `1.5px solid ${Colors.neutral[200]}`, fontSize: 14,
          fontWeight: 600, color: Colors.neutral[900],
          backgroundColor: Colors.neutral[50], outline: 'none', minWidth: 0,
        } as any}
      />
    );
  }
  return (
    <TextInput
      style={s.timeInput} value={value} onChangeText={onChange}
      placeholder="AAAA-MM-DD" placeholderTextColor={Colors.neutral[400]}
    />
  );
}

export default function AgendaConfigScreen() {
  const { profile } = useAuth();
  const [days, setDays] = useState<DayConfig[]>(Array.from({ length: 7 }, defaultDayConfig));
  const [blocks, setBlocks] = useState<TrainerScheduleBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [blockModal, setBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState<BlockForm>(emptyBlockForm());
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [deletingBlock, setDeletingBlock] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!profile) return;
    const today = new Date().toISOString().split('T')[0];
    const [availRes, blocksRes] = await Promise.all([
      supabase.from('trainer_availability').select('*').eq('trainer_id', profile.id),
      supabase.from('trainer_schedule_blocks').select('*').eq('trainer_id', profile.id)
        .gte('block_date', today).order('block_date'),
    ]);

    const next = Array.from({ length: 7 }, defaultDayConfig);
    if (availRes.data) {
      for (const row of availRes.data as TrainerAvailability[]) {
        next[row.day_of_week] = {
          is_active: row.is_active,
          start_time: row.start_time.slice(0, 5),
          end_time: row.end_time.slice(0, 5),
          session_duration: row.session_duration,
          buffer_minutes: row.buffer_minutes ?? 0,
          existingId: row.id,
        };
      }
    }
    setDays(next);
    if (blocksRes.data) setBlocks(blocksRes.data as TrainerScheduleBlock[]);
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const updateDay = (dow: number, patch: Partial<DayConfig>) => {
    setDays((prev) => { const next = [...prev]; next[dow] = { ...next[dow], ...patch }; return next; });
  };

  const applyWeekdays = () => {
    const mon = days[1];
    setDays((prev) => {
      const next = [...prev];
      for (let dow = 2; dow <= 5; dow++) next[dow] = { ...mon, existingId: prev[dow].existingId };
      return next;
    });
  };

  const saveAvailability = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    const now = new Date().toISOString();

    const buildRow = (d: DayConfig, dow: number) => ({
      trainer_id: profile.id,
      day_of_week: dow,
      is_active: d.is_active,
      start_time: d.start_time || '08:00',
      end_time: d.end_time || '18:00',
      session_duration: d.session_duration,
      buffer_minutes: d.buffer_minutes,
      modality: 'both',
      notes: null,
      updated_at: now,
    });

    // Split into new rows (INSERT) vs existing rows (UPDATE via upsert with id)
    const toInsert = days
      .map((d, dow) => ({ d, dow }))
      .filter(({ d }) => !d.existingId)
      .map(({ d, dow }) => buildRow(d, dow));

    const toUpdate = days
      .map((d, dow) => ({ d, dow }))
      .filter(({ d }) => !!d.existingId)
      .map(({ d, dow }) => ({ id: d.existingId as string, ...buildRow(d, dow) }));

    let newRows: { id: string; day_of_week: number }[] = [];

    if (toInsert.length > 0) {
      const { data, error } = await supabase
        .from('trainer_availability')
        .insert(toInsert)
        .select('id, day_of_week');
      if (error) { setSaveError(error.message); setSaving(false); return; }
      newRows = data ?? [];
    }

    if (toUpdate.length > 0) {
      const { error } = await supabase
        .from('trainer_availability')
        .upsert(toUpdate)
        .select('id, day_of_week');
      if (error) { setSaveError(error.message); setSaving(false); return; }
    }

    // Persist returned IDs for newly inserted rows
    if (newRows.length > 0) {
      setDays((prev) => {
        const next = [...prev];
        for (const row of newRows) next[row.day_of_week] = { ...next[row.day_of_week], existingId: row.id };
        return next;
      });
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    setSaving(false);
  };

  const saveBlock = async () => {
    if (!profile) return;
    if (!blockForm.block_date) { setBlockError('Informe a data.'); return; }
    setSavingBlock(true);
    setBlockError(null);
    const { data, error } = await supabase.from('trainer_schedule_blocks').insert({
      trainer_id: profile.id,
      block_date: blockForm.block_date,
      is_full_day: blockForm.is_full_day,
      start_time: blockForm.is_full_day ? null : blockForm.start_time,
      end_time: blockForm.is_full_day ? null : blockForm.end_time,
      reason: blockForm.reason.trim() || null,
    }).select().single();
    if (error) { setBlockError(error.message); setSavingBlock(false); return; }
    setBlocks((prev) => [...prev, data as TrainerScheduleBlock].sort((a, b) => a.block_date.localeCompare(b.block_date)));
    setBlockModal(false);
    setSavingBlock(false);
  };

  const deleteBlock = async (id: string) => {
    setDeletingBlock(id);
    await supabase.from('trainer_schedule_blocks').delete().eq('id', id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setDeletingBlock(null);
  };

  const fmtBlockDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.title}>Configurar agenda</Text>
          <Text style={s.subtitle}>Horários e bloqueios</Text>
        </View>
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={saveAvailability}
          disabled={saving}
        >
          {saveSuccess
            ? <Check size={16} color={Colors.white} />
            : <Text style={s.saveBtnText}>{saving ? 'Salvando…' : 'Salvar'}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={s.scroll}
      >
        {saveError ? (
          <View style={s.errorBanner}>
            <AlertCircle size={14} color={Colors.error[700]} />
            <Text style={s.errorBannerText}>{saveError}</Text>
          </View>
        ) : null}
        {/* ── Weekdays ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Horários de atendimento</Text>
          <TouchableOpacity style={s.applyBtn} onPress={applyWeekdays}>
            <Text style={s.applyBtnText}>Aplicar Seg–Sex</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.loadingBox}><Text style={s.loadingText}>Carregando…</Text></View>
        ) : (
          [1, 2, 3, 4, 5, 6, 0].map((dow) => {
            const d = days[dow];
            return (
              <View key={dow} style={[s.dayCard, d.is_active && s.dayCardActive]}>
                <View style={s.dayHeader}>
                  <View style={s.dayNameRow}>
                    <View style={[s.dayDot, d.is_active && s.dayDotActive]} />
                    <Text style={[s.dayName, d.is_active && s.dayNameActive]}>{DAY_FULL[dow]}</Text>
                    <Text style={s.dayShort}>({DAY_SHORT[dow]})</Text>
                  </View>
                  <Switch
                    value={d.is_active}
                    onValueChange={(v) => updateDay(dow, { is_active: v })}
                    trackColor={{ false: Colors.neutral[200], true: Colors.primary[200] }}
                    thumbColor={d.is_active ? Colors.primary[600] : Colors.neutral[400]}
                  />
                </View>

                {d.is_active ? (
                  <View style={s.dayConfig}>
                    <View style={s.timeRow}>
                      <View style={s.timeField}>
                        <Text style={s.fieldLabel}>Início</Text>
                        <TimeInput value={d.start_time} onChange={(v) => updateDay(dow, { start_time: v })} />
                      </View>
                      <View style={s.timeSep}><Text style={s.timeSepText}>até</Text></View>
                      <View style={s.timeField}>
                        <Text style={s.fieldLabel}>Fim</Text>
                        <TimeInput value={d.end_time} onChange={(v) => updateDay(dow, { end_time: v })} />
                      </View>
                    </View>

                    <Text style={s.fieldLabel}>Duração da sessão</Text>
                    <View style={s.chipRow}>
                      {SESSION_DURATIONS.map((min) => (
                        <TouchableOpacity
                          key={min}
                          style={[s.chip, d.session_duration === min && s.chipActive]}
                          onPress={() => updateDay(dow, { session_duration: min })}
                        >
                          <Text style={[s.chipText, d.session_duration === min && s.chipTextActive]}>{min} min</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={s.fieldLabel}>Intervalo entre sessões</Text>
                    <View style={s.chipRow}>
                      {BUFFER_OPTIONS.map((min) => (
                        <TouchableOpacity
                          key={min}
                          style={[s.chip, d.buffer_minutes === min && s.chipActive]}
                          onPress={() => updateDay(dow, { buffer_minutes: min })}
                        >
                          <Text style={[s.chipText, d.buffer_minutes === min && s.chipTextActive]}>
                            {min === 0 ? 'Sem intervalo' : `${min} min`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={s.preview}>
                      <Clock size={12} color={Colors.primary[600]} />
                      <Text style={s.previewText}>
                        {d.start_time} – {d.end_time} · {d.session_duration} min
                        {d.buffer_minutes > 0 ? ` + ${d.buffer_minutes} min intervalo` : ''}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={s.inactiveNote}>Indisponível para agendamento</Text>
                )}
              </View>
            );
          })
        )}

        {/* ── Blocks ── */}
        <View style={[s.sectionHeader, { marginTop: Spacing.xl }]}>
          <Text style={s.sectionTitle}>Bloqueios</Text>
          <TouchableOpacity style={s.addBlockBtn} onPress={() => { setBlockForm(emptyBlockForm()); setBlockError(null); setBlockModal(true); }}>
            <Plus size={14} color={Colors.white} />
            <Text style={s.addBlockText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {blocks.length === 0 ? (
          <View style={s.emptyBlocks}>
            <Calendar size={28} color={Colors.neutral[300]} />
            <Text style={s.emptyBlocksText}>Nenhum bloqueio futuro</Text>
          </View>
        ) : (
          <View style={s.blockList}>
            {blocks.map((block) => (
              <View key={block.id} style={s.blockCard}>
                <View style={s.blockIcon}><AlertCircle size={16} color={Colors.warning[600]} /></View>
                <View style={s.blockInfo}>
                  <Text style={s.blockDate}>{fmtBlockDate(block.block_date)}</Text>
                  <Text style={s.blockTime}>
                    {block.is_full_day ? 'Dia inteiro' : `${block.start_time?.slice(0, 5)} – ${block.end_time?.slice(0, 5)}`}
                  </Text>
                  {block.reason ? <Text style={s.blockReason}>{block.reason}</Text> : null}
                </View>
                <TouchableOpacity
                  style={s.blockDelBtn}
                  onPress={() => deleteBlock(block.id)}
                  disabled={deletingBlock === block.id}
                >
                  <Trash2 size={15} color={Colors.error[600]} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Block modal */}
      <Modal visible={blockModal} transparent animationType="slide">
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Novo bloqueio</Text>
              <TouchableOpacity onPress={() => setBlockModal(false)}><X size={22} color={Colors.neutral[600]} /></TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Data</Text>
            <DateInput value={blockForm.block_date} onChange={(v) => setBlockForm({ ...blockForm, block_date: v })} />

            <View style={s.fullDayRow}>
              <Text style={s.fieldLabel}>Dia inteiro</Text>
              <Switch
                value={blockForm.is_full_day}
                onValueChange={(v) => setBlockForm({ ...blockForm, is_full_day: v })}
                trackColor={{ false: Colors.neutral[200], true: Colors.primary[200] }}
                thumbColor={blockForm.is_full_day ? Colors.primary[600] : Colors.neutral[400]}
              />
            </View>

            {!blockForm.is_full_day && (
              <View style={s.timeRow}>
                <View style={s.timeField}>
                  <Text style={s.fieldLabel}>Início</Text>
                  <TimeInput value={blockForm.start_time} onChange={(v) => setBlockForm({ ...blockForm, start_time: v })} />
                </View>
                <View style={s.timeSep}><Text style={s.timeSepText}>até</Text></View>
                <View style={s.timeField}>
                  <Text style={s.fieldLabel}>Fim</Text>
                  <TimeInput value={blockForm.end_time} onChange={(v) => setBlockForm({ ...blockForm, end_time: v })} />
                </View>
              </View>
            )}

            <Text style={s.fieldLabel}>Motivo (opcional)</Text>
            <TextInput
              style={s.reasonInput}
              value={blockForm.reason}
              onChangeText={(v) => setBlockForm({ ...blockForm, reason: v })}
              placeholder="Ex: Compromisso pessoal, viagem…"
              placeholderTextColor={Colors.neutral[400]}
              multiline
            />

            {blockError ? <Text style={s.errorText}>{blockError}</Text> : null}

            <TouchableOpacity
              style={[s.modalSaveBtn, savingBlock && s.saveBtnDisabled]}
              onPress={saveBlock}
              disabled={savingBlock}
            >
              <Check size={16} color={Colors.white} />
              <Text style={s.modalSaveBtnText}>{savingBlock ? 'Salvando…' : 'Salvar bloqueio'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[900] },
  subtitle: { fontSize: FontSizes.xs, color: Colors.neutral[500] },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primary[600], borderRadius: BorderRadii.lg,
    paddingHorizontal: 14, paddingVertical: 9, minWidth: 70, justifyContent: 'center',
    ...Shadows.sm,
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },

  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.error[50], borderRadius: BorderRadii.lg,
    borderWidth: 1, borderColor: Colors.error[100],
    paddingHorizontal: Spacing.md, paddingVertical: 10, marginBottom: Spacing.sm,
  },
  errorBannerText: { flex: 1, fontSize: FontSizes.sm, color: Colors.error[700], fontWeight: '600' },
  loadingBox: { paddingVertical: Spacing.xl, alignItems: 'center' },
  loadingText: { fontSize: FontSizes.md, color: Colors.neutral[400] },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },

  applyBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadii.lg,
    backgroundColor: Colors.primary[50], borderWidth: 1.5, borderColor: Colors.primary[200],
  },
  applyBtnText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary[700] },

  dayCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadii.xl, marginBottom: 10,
    borderWidth: 1.5, borderColor: Colors.neutral[200], overflow: 'hidden', ...Shadows.xs,
  },
  dayCardActive: { borderColor: Colors.primary[200] },
  dayHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  dayNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.neutral[300] },
  dayDotActive: { backgroundColor: Colors.primary[500] },
  dayName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[600] },
  dayNameActive: { color: Colors.neutral[900] },
  dayShort: { fontSize: FontSizes.xs, color: Colors.neutral[400] },
  inactiveNote: {
    fontSize: FontSizes.xs, color: Colors.neutral[400],
    paddingHorizontal: Spacing.md, paddingBottom: 12,
  },
  dayConfig: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.neutral[100],
  },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  timeField: { flex: 1, gap: 4 },
  timeSep: { paddingBottom: 9 },
  timeSepText: { fontSize: FontSizes.xs, color: Colors.neutral[400] },
  timeInput: {
    flex: 1, backgroundColor: Colors.neutral[50], borderWidth: 1.5, borderColor: Colors.neutral[200],
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[900],
  },
  fieldLabel: {
    fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[600],
    textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadii.full,
    borderWidth: 1.5, borderColor: Colors.neutral[200], backgroundColor: Colors.neutral[50],
  },
  chipActive: { borderColor: Colors.primary[400], backgroundColor: Colors.primary[50] },
  chipText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.neutral[600] },
  chipTextActive: { color: Colors.primary[700] },
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary[50], borderRadius: 8, padding: 8, marginTop: 4,
  },
  previewText: { fontSize: FontSizes.xs, color: Colors.primary[700], fontWeight: '600', flex: 1 },

  addBlockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primary[600], borderRadius: BorderRadii.lg,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  addBlockText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.white },
  emptyBlocks: {
    alignItems: 'center', gap: 8, padding: Spacing.xl,
    backgroundColor: Colors.white, borderRadius: BorderRadii.xl,
    borderWidth: 1, borderColor: Colors.neutral[200], ...Shadows.xs,
  },
  emptyBlocksText: { fontSize: FontSizes.md, color: Colors.neutral[400] },
  blockList: { gap: 8 },
  blockCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    borderWidth: 1, borderColor: Colors.warning[100],
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: Spacing.md, ...Shadows.xs,
  },
  blockIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.warning[50], alignItems: 'center', justifyContent: 'center',
  },
  blockInfo: { flex: 1, gap: 2 },
  blockDate: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[900] },
  blockTime: { fontSize: FontSizes.xs, color: Colors.neutral[600], fontWeight: '600' },
  blockReason: { fontSize: FontSizes.xs, color: Colors.neutral[500] },
  blockDelBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.error[50], alignItems: 'center', justifyContent: 'center',
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, gap: Spacing.sm, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[900] },
  fullDayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reasonInput: {
    backgroundColor: Colors.neutral[50], borderWidth: 1.5, borderColor: Colors.neutral[200],
    borderRadius: 10, paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontSize: FontSizes.md, color: Colors.neutral[900], minHeight: 56,
  },
  errorText: { fontSize: FontSizes.sm, color: Colors.error[600], fontWeight: '600' },
  modalSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary[600], borderRadius: BorderRadii.lg, paddingVertical: 14,
  },
  modalSaveBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
});
