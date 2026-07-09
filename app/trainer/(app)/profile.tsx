import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  TextInput, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, Spacing, FontSizes, BorderRadii, Shadows } from '@/constants/theme';
import { Mail, MapPin, ExternalLink, Edit2, Check, X, Camera, BadgeCheck, ShieldAlert, Plus, Trash2, ImageIcon } from 'lucide-react-native';

export default function TrainerProfile() {
  const { profile, refreshProfile, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [editModal, setEditModal] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [state, setState] = useState(profile?.state ?? '');
  const [neighborhood, setNeighborhood] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<{ id: string; url: string }[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('trainers')
      .select('is_verified, neighborhood, cover_photo_url')
      .eq('id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setIsVerified(data.is_verified ?? false);
          if (data.neighborhood) setNeighborhood(data.neighborhood);
          if (data.cover_photo_url) setCoverUrl(data.cover_photo_url);
        }
      });
    supabase
      .from('trainer_photos')
      .select('id, url')
      .eq('trainer_id', profile.id)
      .eq('type', 'gallery')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setGalleryPhotos(data as { id: string; url: string }[]);
      });
  }, [profile?.id]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const openEdit = () => {
    setFullName(profile?.full_name ?? '');
    setBio(profile?.bio ?? '');
    setCity(profile?.city ?? '');
    setState(profile?.state ?? '');
    setSaveError(null);
    setEditModal(true);
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
      })
      .eq('id', profile.id);

    if (error) { setSaveError(error.message); setSaving(false); return; }

    if (neighborhood.trim()) {
      await supabase.from('trainers').update({ neighborhood: neighborhood.trim() }).eq('id', profile.id);
    }

    await refreshProfile();
    setSaving(false);
    setEditModal(false);
  };

  const pickAvatar = async () => {
    if (!profile) return;

    // Use a hidden HTML file input (works on web without expo-image-picker)
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploadingAvatar(true);
      try {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();

        const { error: upErr } = await supabase.storage
          .from('trainer-photos')
          .upload(path, arrayBuffer, { contentType: file.type || 'image/jpeg', upsert: true });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from('trainer-photos').getPublicUrl(path);
        await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', profile.id);
        await refreshProfile();
      } catch (e: any) {
        setSaveError(e.message);
      } finally {
        setUploadingAvatar(false);
      }
    };
    input.click();
  };

  const pickCover = async () => {
    if (!profile) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploadingCover(true);
      try {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${profile.id}/cover-${Date.now()}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();
        const { error: upErr } = await supabase.storage
          .from('trainer-photos')
          .upload(path, arrayBuffer, { contentType: file.type || 'image/jpeg', upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('trainer-photos').getPublicUrl(path);
        await supabase.from('trainers').update({ cover_photo_url: urlData.publicUrl }).eq('id', profile.id);
        setCoverUrl(urlData.publicUrl);
      } catch (e: any) {
        setSaveError(e.message);
      } finally {
        setUploadingCover(false);
      }
    };
    input.click();
  };

  const addGalleryPhoto = async () => {
    if (!profile) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploadingGallery(true);
      try {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${profile.id}/gallery-${Date.now()}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();
        const { error: upErr } = await supabase.storage
          .from('trainer-photos')
          .upload(path, arrayBuffer, { contentType: file.type || 'image/jpeg', upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('trainer-photos').getPublicUrl(path);
        const { data: row, error: dbErr } = await supabase
          .from('trainer_photos')
          .insert({ trainer_id: profile.id, url: urlData.publicUrl, type: 'gallery', sort_order: galleryPhotos.length })
          .select('id, url')
          .single();
        if (dbErr) throw dbErr;
        if (row) setGalleryPhotos((prev) => [...prev, row as { id: string; url: string }]);
      } catch (e: any) {
        setSaveError(e.message);
      } finally {
        setUploadingGallery(false);
      }
    };
    input.click();
  };

  const deleteGalleryPhoto = async (photoId: string) => {
    await supabase.from('trainer_photos').delete().eq('id', photoId);
    setGalleryPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} disabled={uploadingAvatar}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{profile.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Camera size={13} color={Colors.white} />
            </View>
          </TouchableOpacity>
          {uploadingAvatar && <Text style={styles.uploadingText}>Enviando foto…</Text>}
          <Text style={styles.name}>{profile.full_name}</Text>
          <StatusBadge label="Personal Trainer" variant="info" />
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
            <Edit2 size={15} color={Colors.primary[600]} />
            <Text style={styles.editBtnText}>Editar perfil</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Mail size={18} color={Colors.primary[500]} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>E-mail</Text>
                <Text style={styles.infoValue}>{profile.email}</Text>
              </View>
            </View>
            {profile.city ? (
              <View style={styles.infoRow}>
                <MapPin size={18} color={Colors.primary[500]} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Localização</Text>
                  <Text style={styles.infoValue}>
                    {profile.city}{profile.state ? `, ${profile.state}` : ''}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* Foto de capa */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foto de Capa</Text>
          <TouchableOpacity style={styles.coverWrap} onPress={pickCover} disabled={uploadingCover} activeOpacity={0.8}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.coverImg} resizeMode="cover" />
            ) : (
              <View style={styles.coverPlaceholder}>
                <ImageIcon size={22} color={Colors.neutral[400]} />
                <Text style={styles.coverPlaceholderText}>{uploadingCover ? 'Enviando…' : 'Adicionar foto de capa'}</Text>
              </View>
            )}
            {coverUrl && (
              <View style={styles.coverEditBadge}>
                <Camera size={13} color={Colors.white} />
              </View>
            )}
            {uploadingCover && (
              <View style={styles.coverUploadingOverlay}>
                <Text style={styles.coverUploadingText}>Enviando…</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Galeria de fotos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Galeria</Text>
          {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
          <View style={styles.galleryGrid}>
            {galleryPhotos.map((ph) => (
              <View key={ph.id} style={styles.galleryThumb}>
                <Image source={{ uri: ph.url }} style={styles.galleryThumbImg} resizeMode="cover" />
                <TouchableOpacity style={styles.galleryDeleteBtn} onPress={() => deleteGalleryPhoto(ph.id)}>
                  <Trash2 size={11} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.galleryAddBtn} onPress={addGalleryPhoto} disabled={uploadingGallery} activeOpacity={0.7}>
              {uploadingGallery ? (
                <Text style={styles.galleryAddText}>…</Text>
              ) : (
                <>
                  <Plus size={20} color={Colors.neutral[400]} />
                  <Text style={styles.galleryAddText}>Adicionar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.galleryHint}>Fotos do seu trabalho, academia ou transformações de alunos</Text>
        </View>

        {/* Verification status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verificacao</Text>
          {isVerified ? (
            <View style={[styles.verifyCard, styles.verifyCardActive]}>
              <View style={styles.verifyIconWrap}>
                <BadgeCheck size={22} color={Colors.secondary[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.verifyTitle}>Perfil verificado</Text>
                <Text style={styles.verifyDesc}>
                  Seu perfil possui o selo de verificado. Ele aparece com destaque para os alunos.
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.verifyCard, styles.verifyCardPending]}>
              <View style={[styles.verifyIconWrap, { backgroundColor: Colors.warning[50] }]}>
                <ShieldAlert size={22} color={Colors.warning[600]} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[styles.verifyTitle, { color: Colors.neutral[800] }]}>Ainda nao verificado</Text>
                <Text style={styles.verifyDesc}>
                  A verificacao e feita manualmente pela equipe. Para solicitar, garanta que seu perfil esteja completo com CREF, foto e bio, e entre em contato pelo suporte.
                </Text>
                <View style={styles.verifySteps}>
                  {['Preencha o CREF no perfil profissional', 'Adicione foto de perfil', 'Entre em contato com o suporte'].map((step, i) => (
                    <View key={i} style={styles.verifyStep}>
                      <View style={styles.verifyStepNum}>
                        <Text style={styles.verifyStepNumText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.verifyStepText}>{step}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={() => router.push('/trainer/onboarding')}
                >
                  <Edit2 size={13} color={Colors.primary[600]} />
                  <Text style={styles.verifyBtnText}>Completar perfil profissional</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.publicLink}
            onPress={() => router.push(`/trainer/${profile.id}`)}
          >
            <ExternalLink size={18} color={Colors.primary[600]} />
            <Text style={styles.publicLinkText}>Ver meu perfil público</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.editFullBtn}
            onPress={() => router.push('/trainer/onboarding')}
          >
            <Edit2 size={18} color={Colors.neutral[700]} />
            <Text style={styles.editFullBtnText}>Editar informações profissionais</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <Button variant="outline" onPress={handleSignOut}>Sair da conta</Button>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, Spacing.xl) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar perfil</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <X size={22} color={Colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nome completo</Text>
              <TextInput
                style={styles.fieldInput}
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor={Colors.neutral[400]}
                placeholder="Seu nome"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputMulti]}
                value={bio}
                onChangeText={setBio}
                placeholder="Conte sobre sua experiência e diferenciais..."
                placeholderTextColor={Colors.neutral[400]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Cidade</Text>
              <TextInput
                style={styles.fieldInput}
                value={city}
                onChangeText={setCity}
                placeholder="Ex: São Paulo"
                placeholderTextColor={Colors.neutral[400]}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Estado</Text>
              <TextInput
                style={styles.fieldInput}
                value={state}
                onChangeText={setState}
                placeholder="Ex: SP"
                placeholderTextColor={Colors.neutral[400]}
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Bairro</Text>
              <TextInput
                style={styles.fieldInput}
                value={neighborhood}
                onChangeText={setNeighborhood}
                placeholder="Ex: Pinheiros"
                placeholderTextColor={Colors.neutral[400]}
                autoCapitalize="words"
              />
            </View>

            {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={saveProfile}
              disabled={saving}
            >
              <Check size={18} color={Colors.white} />
              <Text style={styles.saveBtnText}>{saving ? 'Salvando…' : 'Salvar alterações'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },
  heroCard: {
    backgroundColor: Colors.white, margin: Spacing.lg, borderRadius: BorderRadii.xl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, ...Shadows.sm,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primary[600],
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: Colors.white, fontWeight: '700', fontSize: FontSizes.xxxl },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  uploadingText: { fontSize: FontSizes.sm, color: Colors.neutral[500] },
  name: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.neutral[900] },
  bio: { fontSize: FontSizes.md, color: Colors.neutral[600], textAlign: 'center' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadii.full,
    borderWidth: 1.5, borderColor: Colors.primary[200], backgroundColor: Colors.primary[50],
    marginTop: 4,
  },
  editBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.primary[600] },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[500],
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm,
  },
  infoCard: { backgroundColor: Colors.white, borderRadius: BorderRadii.xl, overflow: 'hidden', ...Shadows.xs },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: FontSizes.xs, color: Colors.neutral[500], fontWeight: '600' },
  infoValue: { fontSize: FontSizes.md, color: Colors.neutral[900], marginTop: 1 },
  publicLink: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary[50], borderRadius: BorderRadii.lg,
    padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary[200],
    justifyContent: 'center',
  },
  publicLinkText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.primary[600] },
  editFullBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.neutral[200],
    justifyContent: 'center', ...Shadows.xs,
  },
  editFullBtnText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[700] },

  // Gallery & Cover
  coverWrap: {
    height: 140, borderRadius: BorderRadii.xl, overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.neutral[200], position: 'relative',
  },
  coverImg: { width: '100%', height: '100%' },
  coverPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, gap: 6, borderStyle: 'dashed',
  },
  coverPlaceholderText: { fontSize: FontSizes.sm, color: Colors.neutral[500] },
  coverEditBadge: {
    position: 'absolute', bottom: 8, right: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.white,
  },
  coverUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  coverUploadingText: { color: Colors.white, fontWeight: '700', fontSize: FontSizes.sm },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  galleryThumb: {
    width: 88, height: 88, borderRadius: BorderRadii.md, overflow: 'hidden', position: 'relative',
  },
  galleryThumbImg: { width: '100%', height: '100%' },
  galleryDeleteBtn: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  galleryAddBtn: {
    width: 88, height: 88, borderRadius: BorderRadii.md,
    borderWidth: 1.5, borderColor: Colors.neutral[200], borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, gap: 4,
  },
  galleryAddText: { fontSize: FontSizes.xs, color: Colors.neutral[400], fontWeight: '600' },
  galleryHint: { fontSize: FontSizes.xs, color: Colors.neutral[400] },

  // Verification
  verifyCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 16, padding: Spacing.md, borderWidth: 1.5,
  },
  verifyCardActive: { backgroundColor: Colors.secondary[50], borderColor: Colors.secondary[200] },
  verifyCardPending: { backgroundColor: Colors.neutral[50], borderColor: Colors.neutral[200] },
  verifyIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.secondary[100], alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  verifyTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.secondary[700] },
  verifyDesc: { fontSize: FontSizes.sm, color: Colors.neutral[600], lineHeight: 20 },
  verifySteps: { gap: 8, marginTop: 4 },
  verifyStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  verifyStepNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primary[100], alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  verifyStepNumText: { fontSize: 10, fontWeight: '800', color: Colors.primary[700] },
  verifyStepText: { fontSize: FontSizes.sm, color: Colors.neutral[700], flex: 1, lineHeight: 18 },
  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary[50], borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: Colors.primary[100],
  },
  verifyBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.primary[600] },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadii.xxl, borderTopRightRadius: BorderRadii.xxl,
    padding: Spacing.xl, gap: Spacing.md,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.neutral[900] },
  field: { gap: 6 },
  fieldLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700] },
  fieldInput: {
    backgroundColor: Colors.neutral[50], borderWidth: 1.5, borderColor: Colors.neutral[200],
    borderRadius: BorderRadii.lg, paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontSize: FontSizes.md, color: Colors.neutral[900],
  },
  fieldInputMulti: { minHeight: 90, textAlignVertical: 'top' },
  errorText: {
    backgroundColor: Colors.error[50], color: Colors.error[700],
    padding: Spacing.md, borderRadius: BorderRadii.md, fontSize: FontSizes.sm,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary[600], borderRadius: BorderRadii.lg, paddingVertical: 14,
  },
  saveBtnText: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white },
});
