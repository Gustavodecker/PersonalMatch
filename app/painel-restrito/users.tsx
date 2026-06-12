import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/admin/AdminShell';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { Colors, FontSizes, Spacing, Shadows } from '@/constants/theme';
import { Profile } from '@/types/database';
import { Search, X, ChevronDown, Shield, User, Dumbbell, Lock, Unlock, Trash2, Edit2 } from 'lucide-react-native';

type RoleFilter = 'all' | 'student' | 'trainer' | 'admin';

const ROLE_LABELS: Record<string, string> = { student: 'Aluno', trainer: 'Personal', admin: 'Admin' };
const ROLE_COLORS: Record<string, string> = {
  student: Colors.primary[600], trainer: Colors.secondary[600], admin: Colors.error[600],
};

export default function AdminUsers() {
  const [users, setUsers]         = useState<Profile[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [roleDropdown, setRoleDropdown] = useState(false);

  const [confirmBlock, setConfirmBlock]   = useState<Profile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null);
  const [roleModal, setRoleModal]         = useState<Profile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setUsers(data as Profile[]);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let r = [...users];
    if (roleFilter !== 'all') r = r.filter((u) => u.role === roleFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return r;
  }, [users, query, roleFilter]);

  const toggleBlock = async () => {
    if (!confirmBlock) return;
    setActionLoading(true);
    await supabase.from('profiles').update({ is_blocked: !confirmBlock.is_blocked }).eq('id', confirmBlock.id);
    setActionLoading(false);
    setConfirmBlock(null);
    fetchUsers();
  };

  const deleteUser = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    await supabase.from('profiles').delete().eq('id', confirmDelete.id);
    setActionLoading(false);
    setConfirmDelete(null);
    fetchUsers();
  };

  const changeRole = async (user: Profile, newRole: 'student' | 'trainer' | 'admin') => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
    setRoleModal(null);
    fetchUsers();
  };

  const ROLE_OPTIONS: Array<'all' | 'student' | 'trainer' | 'admin'> = ['all', 'student', 'trainer', 'admin'];

  return (
    <AdminShell
      title="Usuários"
      actions={
        <View style={s.filterRow}>
          <TouchableOpacity style={s.roleDropBtn} onPress={() => setRoleDropdown(!roleDropdown)}>
            <Text style={s.roleDropBtnText}>
              {roleFilter === 'all' ? 'Todos os tipos' : ROLE_LABELS[roleFilter]}
            </Text>
            <ChevronDown size={14} color={Colors.neutral[600]} />
          </TouchableOpacity>
        </View>
      }
    >
      {/* Search + filter */}
      <View style={s.filterBar}>
        <View style={s.searchBox}>
          <Search size={16} color={Colors.neutral[400]} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nome ou e-mail..."
            placeholderTextColor={Colors.neutral[400]}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={15} color={Colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.rolePills}>
          {ROLE_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[s.pill, roleFilter === r && s.pillActive]}
              onPress={() => setRoleFilter(r)}
            >
              <Text style={[s.pillText, roleFilter === r && s.pillTextActive]}>
                {r === 'all' ? 'Todos' : ROLE_LABELS[r]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={s.countText}>{filtered.length} usuário{filtered.length !== 1 ? 's' : ''}</Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary[600]} size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={s.table}>
          {/* Header */}
          <View style={[s.row, s.headerRow]}>
            <Text style={[s.cell, s.cellFlex, s.headerCell]}>Usuário</Text>
            <Text style={[s.cell, s.cellMd, s.headerCell]}>Tipo</Text>
            <Text style={[s.cell, s.cellMd, s.headerCell]}>Status</Text>
            <Text style={[s.cell, s.cellSm, s.headerCell]}>Ações</Text>
          </View>
          {filtered.map((user, idx) => (
            <View key={user.id} style={[s.row, idx % 2 === 0 && s.rowAlt]}>
              <View style={[s.cell, s.cellFlex]}>
                <View style={s.userAvatar}>
                  <Text style={s.userAvatarText}>{user.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.userName} numberOfLines={1}>{user.full_name}</Text>
                  <Text style={s.userEmail} numberOfLines={1}>{user.email}</Text>
                </View>
              </View>
              <View style={[s.cell, s.cellMd]}>
                <TouchableOpacity
                  style={[s.roleBadge, { backgroundColor: (ROLE_COLORS[user.role] ?? Colors.neutral[400]) + '18' }]}
                  onPress={() => setRoleModal(user)}
                >
                  {user.role === 'admin' ? <Shield size={11} color={ROLE_COLORS[user.role]} /> :
                   user.role === 'trainer' ? <Dumbbell size={11} color={ROLE_COLORS[user.role]} /> :
                   <User size={11} color={ROLE_COLORS[user.role]} />}
                  <Text style={[s.roleBadgeText, { color: ROLE_COLORS[user.role] ?? Colors.neutral[600] }]}>
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Text>
                  <Edit2 size={9} color={ROLE_COLORS[user.role]} />
                </TouchableOpacity>
              </View>
              <View style={[s.cell, s.cellMd]}>
                <View style={[s.statusBadge, user.is_blocked && s.statusBadgeBlocked]}>
                  <Text style={[s.statusBadgeText, user.is_blocked && s.statusBadgeTextBlocked]}>
                    {user.is_blocked ? 'Bloqueado' : 'Ativo'}
                  </Text>
                </View>
              </View>
              <View style={[s.cell, s.cellSm, { flexDirection: 'row', gap: 6 }]}>
                <TouchableOpacity style={s.iconBtn} onPress={() => setConfirmBlock(user)}>
                  {user.is_blocked
                    ? <Unlock size={15} color={Colors.secondary[600]} />
                    : <Lock size={15} color={Colors.warning[600]} />}
                </TouchableOpacity>
                <TouchableOpacity style={[s.iconBtn, s.iconBtnDanger]} onPress={() => setConfirmDelete(user)}>
                  <Trash2 size={15} color={Colors.error[600]} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {filtered.length === 0 && (
            <View style={s.emptyRow}>
              <Text style={s.emptyText}>Nenhum usuário encontrado.</Text>
            </View>
          )}
        </View>
      )}

      {/* Role change modal */}
      <Modal visible={!!roleModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Alterar tipo de conta</Text>
            <Text style={s.modalSub}>{roleModal?.full_name}</Text>
            {(['student', 'trainer', 'admin'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.roleOption, roleModal?.role === r && s.roleOptionActive]}
                onPress={() => roleModal && changeRole(roleModal, r)}
              >
                <Text style={[s.roleOptionText, roleModal?.role === r && s.roleOptionTextActive]}>
                  {ROLE_LABELS[r]}
                </Text>
                {roleModal?.role === r && <View style={s.roleOptionCheck} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.modalCancelBtn} onPress={() => setRoleModal(null)}>
              <Text style={s.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!confirmBlock}
        title={confirmBlock?.is_blocked ? 'Desbloquear usuário?' : 'Bloquear usuário?'}
        message={confirmBlock?.is_blocked
          ? `${confirmBlock?.full_name} poderá acessar a plataforma novamente.`
          : `${confirmBlock?.full_name} não conseguirá acessar a plataforma.`}
        confirmLabel={confirmBlock?.is_blocked ? 'Desbloquear' : 'Bloquear'}
        danger={!confirmBlock?.is_blocked}
        onConfirm={toggleBlock}
        onCancel={() => setConfirmBlock(null)}
        loading={actionLoading}
      />
      <ConfirmModal
        visible={!!confirmDelete}
        title="Excluir usuário?"
        message={`Esta ação é irreversível. O usuário ${confirmDelete?.full_name} e todos os seus dados serão removidos.`}
        confirmLabel="Excluir"
        onConfirm={deleteUser}
        onCancel={() => setConfirmDelete(null)}
        loading={actionLoading}
      />
    </AdminShell>
  );
}

const s = StyleSheet.create({
  filterBar: { gap: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  roleDropBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.neutral[200],
  },
  roleDropBtnText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[700] },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1.5, borderColor: Colors.neutral[200],
  },
  searchInput: { flex: 1, fontSize: FontSizes.md, color: Colors.neutral[900] },
  rolePills: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 13, paddingVertical: 6, borderRadius: 999,
    backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.neutral[200],
  },
  pillActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  pillText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[600] },
  pillTextActive: { color: Colors.white },

  countText: { fontSize: FontSizes.sm, color: Colors.neutral[500], fontWeight: '600' },

  table: {
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.neutral[200],
    overflow: 'hidden', ...Shadows.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, minHeight: 56 },
  rowAlt: { backgroundColor: Colors.neutral[50] },
  headerRow: { backgroundColor: Colors.neutral[100], minHeight: 42 },
  cell: { paddingHorizontal: 8, paddingVertical: 8, justifyContent: 'center' },
  cellFlex: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cellMd: { width: 110 },
  cellSm: { width: 80 },
  headerCell: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.5 },

  userAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.primary[100], alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  userAvatarText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.primary[700] },
  userName: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[900] },
  userEmail: { fontSize: FontSizes.xs, color: Colors.neutral[500] },

  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  roleBadgeText: { fontSize: FontSizes.xs, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: Colors.secondary[50], alignSelf: 'flex-start',
  },
  statusBadgeBlocked: { backgroundColor: Colors.error[50] },
  statusBadgeText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.secondary[700] },
  statusBadgeTextBlocked: { color: Colors.error[700] },

  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center',
  },
  iconBtnDanger: { backgroundColor: Colors.error[50] },

  emptyRow: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: FontSizes.md, color: Colors.neutral[500] },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.white, borderRadius: 20,
    padding: Spacing.xl, width: '100%', maxWidth: 340, gap: 10,
    ...Shadows.lg,
  },
  modalTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.neutral[900] },
  modalSub: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginBottom: 4 },
  roleOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.neutral[200],
  },
  roleOptionActive: { borderColor: Colors.primary[400], backgroundColor: Colors.primary[50] },
  roleOptionText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[700] },
  roleOptionTextActive: { color: Colors.primary[700] },
  roleOptionCheck: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary[600] },
  modalCancelBtn: { paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.neutral[100], alignItems: 'center', marginTop: 4 },
  modalCancelText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[700] },
});
