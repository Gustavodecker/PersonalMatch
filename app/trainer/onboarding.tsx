import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Image, Platform, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pickImage } from '@/lib/imagePicker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadii } from '@/constants/theme';
import { TARGET_AUDIENCE_OPTIONS, OBJECTIVES_OPTIONS, Specialty, TrainerClassType } from '@/types/database';
import {
  Dumbbell, ChevronRight, ChevronLeft, Check, Monitor, Users,
  MapPin, Home, Building2, Camera, Upload, FileText,
  Plus, Trash2, BookOpen, X, DollarSign,
} from 'lucide-react-native';

const STEPS = [
  { label: 'Dados básicos',   short: '1' },
  { label: 'Serviços',        short: '2' },
  { label: 'Especialidades',  short: '3' },
  { label: 'Contato',         short: '4' },
];

function ProgressBar({ step }: { step: number }) {
  const total = STEPS.length;
  return (
    <View style={pb.wrap}>
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <View key={i} style={pb.item}>
            <View style={[pb.dot, active && pb.dotActive, done && pb.dotDone]}>
              {done
                ? <Check size={11} color={Colors.white} />
                : <Text style={[pb.dotText, active && pb.dotTextActive]}>{i + 1}</Text>}
            </View>
            <Text style={[pb.label, active && pb.labelActive, done && pb.labelDone]} numberOfLines={1}>
              {s.label}
            </Text>
            {i < total - 1 && (
              <View style={[pb.line, (done || active) && pb.lineDone]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const pb = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
  },
  item: { flex: 1, alignItems: 'center' },
  dot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.neutral[200], alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  dotActive: { backgroundColor: Colors.primary[600] },
  dotDone:   { backgroundColor: Colors.secondary[600] },
  dotText:   { fontSize: 11, fontWeight: '700', color: Colors.neutral[500] },
  dotTextActive: { color: Colors.white },
  label: { fontSize: 9, fontWeight: '600', color: Colors.neutral[400], textAlign: 'center' },
  labelActive: { color: Colors.primary[600] },
  labelDone:   { color: Colors.secondary[700] },
  line: {
    position: 'absolute', top: 13, left: '50%', right: '-50%',
    height: 2, backgroundColor: Colors.neutral[200], zIndex: -1,
  },
  lineDone: { backgroundColor: Colors.secondary[400] },
});

function MultiChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress} activeOpacity={0.7}>
      {selected && <Check size={12} color={Colors.primary[700]} />}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function LabeledInput({ label, value, onChangeText, multiline, ...props }: {
  label: string; value: string; onChangeText: (v: string) => void; multiline?: boolean; [key: string]: any
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.textInput, multiline && styles.textInputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={Colors.neutral[400]}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
  );
}

export default function TrainerOnboarding() {
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allSpecialties, setAllSpecialties] = useState<Specialty[]>([]);

  // Photos
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<{ id: string; url: string }[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Step 0
  const [cref, setCref] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');

  // Step 1 — Modality + per-modality pricing
  const [acceptsOnline, setAcceptsOnline] = useState(false);
  const [acceptsInPerson, setAcceptsInPerson] = useState(true);
  const [acceptsHome, setAcceptsHome] = useState(false);
  const [acceptsGym, setAcceptsGym] = useState(false);
  const [inPersonRate, setInPersonRate] = useState('');
  const [onlineRate, setOnlineRate] = useState('');
  const [homeRate, setHomeRate] = useState('');
  const [gymRate, setGymRate] = useState('');
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<string[]>([]);

  // Step 1 — Class types
  const [classTypes, setClassTypes] = useState<TrainerClassType[]>([]);
  const [showClassModal, setShowClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [newClassDuration, setNewClassDuration] = useState('60');
  const [savingClass, setSavingClass] = useState(false);

  // Step 2 — Specialties
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  // Step 3 — Contact
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');

  useEffect(() => {
    supabase.from('specialties').select('*').order('name').then(({ data }) => {
      if (data) setAllSpecialties(data as Specialty[]);
    });
    if (profile) {
      supabase.from('trainers').select('*').eq('id', profile.id).maybeSingle().then(({ data }) => {
        if (!data) return;
        if (data.cref)               setCref(data.cref);
        if (data.experience_years)   setExperience(String(data.experience_years));
        if (data.monthly_rate)       setMonthlyRate(String(data.monthly_rate));
        if (data.neighborhood)       setNeighborhood(data.neighborhood);
        if (data.in_person_hourly_rate) setInPersonRate(String(data.in_person_hourly_rate));
        else if (data.hourly_rate)   setInPersonRate(String(data.hourly_rate));
        if (data.online_hourly_rate) setOnlineRate(String(data.online_hourly_rate));
        if (data.home_hourly_rate)   setHomeRate(String(data.home_hourly_rate));
        if (data.gym_hourly_rate)    setGymRate(String(data.gym_hourly_rate));
        setAcceptsOnline(data.accepts_online ?? false);
        setAcceptsInPerson(data.accepts_in_person ?? true);
        setAcceptsHome(data.accepts_home ?? false);
        setAcceptsGym(data.accepts_gym ?? false);
        if (data.target_audience)    setTargetAudience(data.target_audience);
        if (data.objectives)         setObjectives(data.objectives);
        if (data.whatsapp)           setWhatsapp(data.whatsapp);
        if (data.instagram)          setInstagram(data.instagram);
        if (data.cover_photo_url)    setCoverUri(data.cover_photo_url);
      });
      supabase.from('profiles').select('avatar_url, bio, city, state').eq('id', profile.id).maybeSingle().then(({ data }) => {
        if (data?.avatar_url) setAvatarUri(data.avatar_url);
        if (data?.bio)        setBio(data.bio);
        if (data?.city)       setCity(data.city);
        if (data?.state)      setState(data.state);
      });
      supabase.from('trainer_specialties').select('specialty_id').eq('trainer_id', profile.id).then(({ data }) => {
        if (data) setSelectedSpecialties(data.map((ts: any) => ts.specialty_id));
      });
      supabase.from('trainer_photos').select('id, url').eq('trainer_id', profile.id).eq('type', 'gallery').order('sort_order').then(({ data }) => {
        if (data) setGalleryPhotos(data as { id: string; url: string }[]);
      });
      supabase.from('trainer_class_types').select('*').eq('trainer_id', profile.id).eq('is_active', true).order('created_at').then(({ data }) => {
        if (data) setClassTypes(data as TrainerClassType[]);
      });
    }
  }, [profile]);

  const pickAndUploadImage = async (type: 'avatar' | 'cover', setUri: (u: string) => void, setUploading: (v: boolean) => void) => {
    if (!profile) return;
    setUploading(true); setError(null);
    try {
      const aspect: [number, number] = type === 'avatar' ? [1, 1] : [16, 9];
      const picked = await pickImage(aspect);
      if (!picked) return;
      const path = `${profile.id}/${type}-${Date.now()}.${picked.ext}`;
      const res  = await fetch(picked.uri);
      const blob = await res.blob();
      if (Platform.OS === 'web') URL.revokeObjectURL(picked.uri);
      const { error: upErr } = await supabase.storage.from('trainer-photos').upload(path, blob, { contentType: picked.mimeType, upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('trainer-photos').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      if (type === 'avatar') await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      else                   await supabase.from('trainers').update({ cover_photo_url: publicUrl }).eq('id', profile.id);
      setUri(publicUrl);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao fazer upload da foto');
    } finally { setUploading(false); }
  };

  const uploadGalleryPhoto = async () => {
    if (!profile) return;
    setUploadingGallery(true); setError(null);
    try {
      const picked = await pickImage([4, 3]);
      if (!picked) return;
      const path = `${profile.id}/gallery-${Date.now()}.${picked.ext}`;
      const res  = await fetch(picked.uri);
      const blob = await res.blob();
      if (Platform.OS === 'web') URL.revokeObjectURL(picked.uri);
      const { error: upErr } = await supabase.storage.from('trainer-photos').upload(path, blob, { contentType: picked.mimeType, upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('trainer-photos').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const { data: row, error: dbErr } = await supabase.from('trainer_photos').insert({
        trainer_id: profile.id, url: publicUrl, type: 'gallery', sort_order: galleryPhotos.length,
      }).select('id, url').single();
      if (dbErr) throw dbErr;
      if (row) setGalleryPhotos((prev) => [...prev, row as { id: string; url: string }]);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao enviar foto');
    } finally { setUploadingGallery(false); }
  };

  const deleteGalleryPhoto = async (photoId: string) => {
    await supabase.from('trainer_photos').delete().eq('id', photoId);
    setGalleryPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const saveClassType = async () => {
    if (!profile || !newClassName.trim()) return;
    setSavingClass(true);
    const { data, error: err } = await supabase.from('trainer_class_types').insert({
      trainer_id: profile.id,
      name: newClassName.trim(),
      description: newClassDesc.trim() || null,
      duration_minutes: parseInt(newClassDuration) || 60,
      is_active: true,
    }).select('*').single();
    setSavingClass(false);
    if (err) { setError(err.message); return; }
    if (data) setClassTypes((prev) => [...prev, data as TrainerClassType]);
    setShowClassModal(false);
    setNewClassName(''); setNewClassDesc(''); setNewClassDuration('60');
  };

  const deleteClassType = async (id: string) => {
    await supabase.from('trainer_class_types').update({ is_active: false }).eq('id', id);
    setClassTypes((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const toggleSpecialty = (id: string) => {
    setSelectedSpecialties((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const canProceed = () => {
    if (step === 1) return acceptsOnline || acceptsInPerson || acceptsHome || acceptsGym;
    return true;
  };

  const saveAndFinish = async () => {
    if (!profile) return;
    setSaving(true); setError(null);

    const inPersonRateVal = parseFloat(inPersonRate) || null;
    const { error: err } = await supabase.from('trainers').update({
      status: 'active',
      cref: cref.trim() || null,
      experience_years: parseInt(experience) || 0,
      monthly_rate: parseFloat(monthlyRate) || null,
      hourly_rate: inPersonRateVal,
      in_person_hourly_rate: inPersonRateVal,
      online_hourly_rate: parseFloat(onlineRate) || null,
      home_hourly_rate: parseFloat(homeRate) || null,
      gym_hourly_rate: parseFloat(gymRate) || null,
      neighborhood: neighborhood.trim() || null,
      accepts_online: acceptsOnline,
      accepts_in_person: acceptsInPerson,
      accepts_home: acceptsHome,
      accepts_gym: acceptsGym,
      target_audience: targetAudience,
      objectives: objectives,
      whatsapp: whatsapp.trim() || null,
      instagram: instagram.trim() || null,
    }).eq('id', profile.id);

    if (err) { setError(err.message); setSaving(false); return; }

    await supabase.from('profiles').update({
      bio: bio.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
    }).eq('id', profile.id);

    await supabase.from('trainer_specialties').delete().eq('trainer_id', profile.id);
    if (selectedSpecialties.length > 0) {
      await supabase.from('trainer_specialties').insert(
        selectedSpecialties.map((sid) => ({ trainer_id: profile.id, specialty_id: sid }))
      );
    }

    await refreshProfile();
    router.replace('/trainer/(app)/dashboard');
  };

  const next = () => { if (step < STEPS.length - 1) setStep(step + 1); else saveAndFinish(); };
  const back = () => { if (step > 0) setStep(step - 1); else router.back(); };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top nav */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={back} style={styles.backBtn}>
          <ChevronLeft size={22} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <View style={styles.topBrand}>
          <Dumbbell size={18} color={Colors.primary[600]} />
          <Text style={styles.topBrandText}>Configurar perfil</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace('/trainer/dashboard')}>
          <Text style={styles.skipText}>Depois</Text>
        </TouchableOpacity>
      </View>

      <ProgressBar step={step} />

      <View style={styles.stepHeadWrap}>
        <Text style={styles.stepHeadLabel}>Etapa {step + 1} de {STEPS.length}</Text>
        <Text style={styles.stepHeadTitle}>{STEPS[step].label}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Step 0: Basic info + Gallery ───────────── */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepDesc}>Essas informações aparecem no seu perfil público.</Text>

            {/* Avatar */}
            <Text style={styles.groupLabel}>Foto de perfil</Text>
            <View style={styles.photoRow}>
              <TouchableOpacity style={styles.avatarUpload} onPress={() => pickAndUploadImage('avatar', setAvatarUri, setUploadingAvatar)} disabled={uploadingAvatar}>
                {avatarUri
                  ? <Image source={{ uri: avatarUri }} style={styles.avatarPreview} />
                  : <View style={styles.avatarPlaceholder}><Camera size={26} color={Colors.neutral[400]} /></View>}
                <View style={styles.uploadBadge}><Upload size={12} color={Colors.white} /></View>
              </TouchableOpacity>
              <View style={styles.photoHint}>
                <Text style={styles.photoHintTitle}>{uploadingAvatar ? 'Enviando…' : 'Adicione sua foto'}</Text>
                <Text style={styles.photoHintDesc}>Uma boa foto aumenta as chances de contato em 3x</Text>
              </View>
            </View>

            {/* Cover */}
            <Text style={styles.groupLabel}>Foto de capa (opcional)</Text>
            <TouchableOpacity style={styles.coverUpload} onPress={() => pickAndUploadImage('cover', setCoverUri, setUploadingCover)} disabled={uploadingCover}>
              {coverUri
                ? <Image source={{ uri: coverUri }} style={styles.coverPreview} />
                : <View style={styles.coverPlaceholder}>
                    <Upload size={22} color={Colors.neutral[400]} />
                    <Text style={styles.coverPlaceholderText}>{uploadingCover ? 'Enviando…' : 'Adicionar foto de capa'}</Text>
                  </View>}
            </TouchableOpacity>

            {/* Gallery */}
            <Text style={styles.groupLabel}>Galeria de fotos</Text>
            <Text style={styles.subLabel}>Fotos do seu trabalho, academia ou transformações de alunos</Text>
            <View style={styles.galleryGrid}>
              {galleryPhotos.map((ph) => (
                <View key={ph.id} style={styles.galleryThumb}>
                  <Image source={{ uri: ph.url }} style={styles.galleryThumbImg} />
                  <TouchableOpacity style={styles.galleryDeleteBtn} onPress={() => deleteGalleryPhoto(ph.id)}>
                    <X size={10} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.galleryAddBtn} onPress={uploadGalleryPhoto} disabled={uploadingGallery}>
                {uploadingGallery
                  ? <Text style={styles.galleryAddText}>…</Text>
                  : <>
                      <Plus size={20} color={Colors.neutral[400]} />
                      <Text style={styles.galleryAddText}>Adicionar</Text>
                    </>}
              </TouchableOpacity>
            </View>

            {/* Bio */}
            <Text style={styles.groupLabel}>Apresentação</Text>
            <View style={styles.inputWrap}>
              <View style={styles.bioLabelRow}><FileText size={14} color={Colors.neutral[500]} /><Text style={styles.inputLabel}>Sobre você (opcional)</Text></View>
              <TextInput
                style={[styles.textInput, styles.textInputMulti]}
                value={bio} onChangeText={setBio}
                placeholder="Conte sua história, metodologia e diferenciais…"
                placeholderTextColor={Colors.neutral[400]}
                multiline textAlignVertical="top" maxLength={500}
              />
              <Text style={styles.charCount}>{bio.length}/500</Text>
            </View>

            <Text style={styles.groupLabel}>Informações profissionais</Text>
            <LabeledInput label="CREF (opcional)" value={cref} onChangeText={setCref} placeholder="000000-G/SP" autoCapitalize="characters" />
            <LabeledInput label="Anos de experiência" value={experience} onChangeText={setExperience} keyboardType="numeric" placeholder="Ex: 5" />
            <LabeledInput label="Estado" value={state} onChangeText={setState} placeholder="Ex: SP" autoCapitalize="characters" maxLength={2} />
            <LabeledInput label="Cidade" value={city} onChangeText={setCity} placeholder="Ex: São Paulo" autoCapitalize="words" />
            <LabeledInput label="Bairro" value={neighborhood} onChangeText={setNeighborhood} placeholder="Ex: Pinheiros" autoCapitalize="words" />
          </View>
        )}

        {/* ── Step 1: Services + Pricing + Class types ── */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <View style={styles.iconRow}><View style={styles.iconCircle}><Monitor size={26} color={Colors.primary[600]} /></View></View>
            <Text style={styles.stepDesc}>Configure suas modalidades, preços e as aulas que você oferece.</Text>

            {/* Modality */}
            <Text style={styles.groupLabel}>Modalidade de atendimento</Text>
            <View style={styles.modalityWrap}>
              {[
                { label: 'Presencial', icon: <Users    size={20} color={acceptsInPerson ? Colors.primary[600] : Colors.neutral[500]} />, val: acceptsInPerson, set: setAcceptsInPerson },
                { label: 'Online',     icon: <Monitor  size={20} color={acceptsOnline   ? Colors.primary[600] : Colors.neutral[500]} />, val: acceptsOnline,   set: setAcceptsOnline },
                { label: 'Domicílio',  icon: <Home     size={20} color={acceptsHome     ? Colors.primary[600] : Colors.neutral[500]} />, val: acceptsHome,     set: setAcceptsHome },
                { label: 'Academia',   icon: <Building2 size={20} color={acceptsGym     ? Colors.primary[600] : Colors.neutral[500]} />, val: acceptsGym,      set: setAcceptsGym },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.modalityOption, opt.val && styles.modalityOptionActive]}
                  onPress={() => opt.set(!opt.val)}
                >
                  {opt.icon}
                  <Text style={[styles.modalityOptionText, opt.val && styles.modalityOptionTextActive]}>{opt.label}</Text>
                  {opt.val && <View style={styles.modalityCheck}><Check size={12} color={Colors.white} /></View>}
                </TouchableOpacity>
              ))}
            </View>

            {/* Per-modality pricing */}
            <Text style={styles.groupLabel}>Preços por modalidade</Text>
            {acceptsInPerson && (
              <View style={styles.priceRow}>
                <View style={styles.priceIcon}><Users size={16} color={Colors.primary[600]} /></View>
                <View style={styles.priceFlex}>
                  <Text style={styles.priceLabel}>Presencial — R$/hora</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={inPersonRate} onChangeText={setInPersonRate}
                    placeholder="Ex: 120" placeholderTextColor={Colors.neutral[400]}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}
            {acceptsOnline && (
              <View style={styles.priceRow}>
                <View style={styles.priceIcon}><Monitor size={16} color={Colors.secondary[600]} /></View>
                <View style={styles.priceFlex}>
                  <Text style={styles.priceLabel}>Online — R$/hora</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={onlineRate} onChangeText={setOnlineRate}
                    placeholder="Ex: 90" placeholderTextColor={Colors.neutral[400]}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}
            {acceptsHome && (
              <View style={styles.priceRow}>
                <View style={styles.priceIcon}><Home size={16} color={Colors.accent[600]} /></View>
                <View style={styles.priceFlex}>
                  <Text style={styles.priceLabel}>Domicílio — R$/hora</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={homeRate} onChangeText={setHomeRate}
                    placeholder="Ex: 150" placeholderTextColor={Colors.neutral[400]}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}
            {(acceptsInPerson || acceptsHome || acceptsOnline || acceptsGym) && (
              <View style={styles.priceRow}>
                <View style={[styles.priceIcon, { backgroundColor: '#F5F3FF' }]}><Building2 size={16} color="#7C3AED" /></View>
                <View style={styles.priceFlex}>
                  <Text style={styles.priceLabel}>Em Academia — R$/hora (opcional)</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={gymRate} onChangeText={setGymRate}
                    placeholder="Ex: 130" placeholderTextColor={Colors.neutral[400]}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}
            {(acceptsInPerson || acceptsHome || acceptsOnline || acceptsGym) && (
              <View style={styles.priceRow}>
                <View style={[styles.priceIcon, { backgroundColor: '#F0F9FF' }]}><DollarSign size={16} color="#0369A1" /></View>
                <View style={styles.priceFlex}>
                  <Text style={styles.priceLabel}>Consultoria mensal — R$/mês (opcional)</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={monthlyRate} onChangeText={setMonthlyRate}
                    placeholder="Ex: 400" placeholderTextColor={Colors.neutral[400]}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}
            {!acceptsInPerson && !acceptsOnline && !acceptsHome && !acceptsGym && (
              <Text style={styles.emptyNote}>Selecione ao menos uma modalidade acima para definir preços.</Text>
            )}

            {/* Class types */}
            <View style={styles.classHeader}>
              <View>
                <Text style={styles.groupLabel}>Aulas oferecidas</Text>
                <Text style={styles.subLabel}>Defina os tipos de aula para que o aluno escolha ao agendar</Text>
              </View>
              <TouchableOpacity style={styles.addClassBtn} onPress={() => setShowClassModal(true)}>
                <Plus size={14} color={Colors.primary[600]} />
                <Text style={styles.addClassBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>

            {classTypes.length === 0 ? (
              <View style={styles.emptyClassBox}>
                <BookOpen size={24} color={Colors.neutral[300]} />
                <Text style={styles.emptyClassNote}>Nenhuma aula cadastrada ainda</Text>
              </View>
            ) : (
              classTypes.map((ct) => (
                <View key={ct.id} style={styles.classCard}>
                  <View style={styles.classInfo}>
                    <Text style={styles.className}>{ct.name}</Text>
                    {ct.description ? <Text style={styles.classDesc}>{ct.description}</Text> : null}
                    <Text style={styles.classDuration}>{ct.duration_minutes} min</Text>
                  </View>
                  <TouchableOpacity style={styles.classDeleteBtn} onPress={() => deleteClassType(ct.id)}>
                    <Trash2 size={15} color={Colors.error[500]} />
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Target audience */}
            <Text style={styles.groupLabel}>Público que você atende</Text>
            <View style={styles.chipsWrap}>
              {TARGET_AUDIENCE_OPTIONS.map((a) => (
                <MultiChip key={a} label={a} selected={targetAudience.includes(a)} onPress={() => toggleItem(targetAudience, setTargetAudience, a)} />
              ))}
            </View>

            <Text style={styles.groupLabel}>Objetivos que você trabalha</Text>
            <View style={styles.chipsWrap}>
              {OBJECTIVES_OPTIONS.map((o) => (
                <MultiChip key={o} label={o} selected={objectives.includes(o)} onPress={() => toggleItem(objectives, setObjectives, o)} />
              ))}
            </View>
          </View>
        )}

        {/* ── Step 2: Specialties ─────────────────────── */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <View style={styles.iconRow}><View style={styles.iconCircle}><Building2 size={26} color={Colors.primary[600]} /></View></View>
            <Text style={styles.stepDesc}>Selecione as áreas em que você tem formação ou experiência.</Text>
            <View style={styles.chipsWrap}>
              {allSpecialties.map((s) => (
                <MultiChip key={s.id} label={s.name} selected={selectedSpecialties.includes(s.id)} onPress={() => toggleSpecialty(s.id)} />
              ))}
              {allSpecialties.length === 0 && <Text style={styles.emptyNote}>Carregando especialidades…</Text>}
            </View>
          </View>
        )}

        {/* ── Step 3: Contact ─────────────────────────── */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <View style={styles.iconRow}><View style={styles.iconCircle}><MapPin size={26} color={Colors.primary[600]} /></View></View>
            <Text style={styles.stepDesc}>Seu WhatsApp aparece como botão direto no seu perfil público.</Text>

            <View style={styles.previewCard}>
              <View style={styles.previewAvatar}>
                {avatarUri
                  ? <Image source={{ uri: avatarUri }} style={styles.previewAvatarImg} />
                  : <View style={styles.previewAvatarPlaceholder}><Text style={styles.previewAvatarInitial}>{profile?.full_name?.[0] ?? 'P'}</Text></View>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewName}>{profile?.full_name ?? 'Seu nome'}</Text>
                {cref ? <Text style={styles.previewCref}>CREF {cref}</Text> : null}
                {neighborhood ? <Text style={styles.previewNeighborhood}>{[neighborhood, city, state].filter(Boolean).join(', ')}</Text> : null}
              </View>
            </View>

            <LabeledInput label="WhatsApp *" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" placeholder="(11) 99999-9999" />
            <LabeledInput label="Instagram (opcional)" value={instagram} onChangeText={setInstagram} autoCapitalize="none" placeholder="@seuperfil" />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, (!canProceed() || saving) && styles.nextBtnDisabled]}
          onPress={next}
          disabled={saving || !canProceed()}
        >
          <Text style={styles.nextText}>
            {step === STEPS.length - 1 ? (saving ? 'Salvando…' : 'Salvar perfil') : 'Próximo'}
          </Text>
          {step < STEPS.length - 1 && <ChevronRight size={20} color={Colors.white} />}
        </TouchableOpacity>
      </View>

      {/* Add class modal */}
      <Modal visible={showClassModal} transparent animationType="slide" onRequestClose={() => setShowClassModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova aula</Text>
              <TouchableOpacity onPress={() => setShowClassModal(false)}>
                <X size={22} color={Colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nome da aula *</Text>
              <TextInput
                style={styles.fieldInput}
                value={newClassName} onChangeText={setNewClassName}
                placeholder="Ex: Musculação, Funcional, Yoga…"
                placeholderTextColor={Colors.neutral[400]}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Descrição (opcional)</Text>
              <TextInput
                style={[styles.fieldInput, { minHeight: 72, textAlignVertical: 'top' }]}
                value={newClassDesc} onChangeText={setNewClassDesc}
                placeholder="Breve descrição do que é essa aula"
                placeholderTextColor={Colors.neutral[400]}
                multiline
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Duração (minutos)</Text>
              <TextInput
                style={styles.fieldInput}
                value={newClassDuration} onChangeText={setNewClassDuration}
                keyboardType="numeric" placeholder="60"
                placeholderTextColor={Colors.neutral[400]}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (!newClassName.trim() || savingClass) && { opacity: 0.5 }]}
              onPress={saveClassType}
              disabled={!newClassName.trim() || savingClass}
            >
              <Check size={18} color={Colors.white} />
              <Text style={styles.saveBtnText}>{savingClass ? 'Salvando…' : 'Adicionar aula'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },

  topNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topBrand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topBrandText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.primary[700] },
  skipText: { fontSize: FontSizes.md, color: Colors.neutral[500], fontWeight: '500' },

  stepHeadWrap: {
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
  },
  stepHeadLabel: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary[500], textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  stepHeadTitle: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.neutral[900] },

  scroll: { flexGrow: 1, paddingBottom: Spacing.xxl },
  stepContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },

  stepDesc: { fontSize: FontSizes.md, color: Colors.neutral[500], lineHeight: 22, marginBottom: Spacing.lg },
  subLabel: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginBottom: Spacing.sm },

  iconRow: { alignItems: 'center', marginBottom: Spacing.sm },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary[50], alignItems: 'center', justifyContent: 'center' },

  groupLabel: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[800], marginTop: Spacing.md, marginBottom: Spacing.sm },
  inputWrap: { marginBottom: Spacing.md },
  inputLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700], marginBottom: 6 },
  bioLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  textInput: {
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.neutral[200],
    borderRadius: BorderRadii.lg, paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontSize: FontSizes.md, color: Colors.neutral[900],
  },
  textInputMulti: { height: 110, paddingTop: 12 },
  charCount: { fontSize: FontSizes.xs, color: Colors.neutral[400], textAlign: 'right', marginTop: 4 },

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  avatarUpload: { position: 'relative' },
  avatarPreview: { width: 84, height: 84, borderRadius: 42 },
  avatarPlaceholder: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.neutral[100],
    borderWidth: 2, borderColor: Colors.neutral[200], borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadBadge: {
    position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  photoHint: { flex: 1, gap: 4 },
  photoHintTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[800] },
  photoHintDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], lineHeight: 18 },
  coverUpload: {
    height: 130, borderRadius: BorderRadii.lg, overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.neutral[200], borderStyle: 'dashed', marginBottom: Spacing.md,
  },
  coverPreview: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, gap: 6 },
  coverPlaceholderText: { fontSize: FontSizes.sm, color: Colors.neutral[500] },

  // Gallery
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  galleryThumb: { width: 88, height: 88, borderRadius: BorderRadii.md, overflow: 'hidden', position: 'relative' },
  galleryThumbImg: { width: '100%', height: '100%' },
  galleryDeleteBtn: {
    position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  galleryAddBtn: {
    width: 88, height: 88, borderRadius: BorderRadii.md,
    borderWidth: 1.5, borderColor: Colors.neutral[200], borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, gap: 4,
  },
  galleryAddText: { fontSize: FontSizes.xs, color: Colors.neutral[400], fontWeight: '600' },

  // Per-modality pricing
  priceRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg, padding: Spacing.md,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.neutral[200],
  },
  priceIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  priceFlex: { flex: 1 },
  priceLabel: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[700], marginBottom: 4 },
  priceInput: {
    backgroundColor: Colors.neutral[50], borderWidth: 1, borderColor: Colors.neutral[200],
    borderRadius: BorderRadii.md, paddingHorizontal: 10, paddingVertical: 8,
    fontSize: FontSizes.md, color: Colors.neutral[900],
  },

  // Modality
  modalityWrap: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  modalityOption: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: Spacing.md, borderRadius: BorderRadii.lg,
    borderWidth: 1.5, borderColor: Colors.neutral[200], backgroundColor: Colors.white, position: 'relative',
  },
  modalityOptionActive: { borderColor: Colors.primary[400], backgroundColor: Colors.primary[50] },
  modalityOptionText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[600] },
  modalityOptionTextActive: { color: Colors.primary[700] },
  modalityCheck: {
    position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center',
  },

  // Class types
  classHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: Spacing.md, marginBottom: Spacing.sm },
  addClassBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadii.full,
    backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[200],
  },
  addClassBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.primary[600] },
  emptyClassBox: { alignItems: 'center', gap: 6, padding: Spacing.lg, backgroundColor: Colors.neutral[50], borderRadius: BorderRadii.lg, marginBottom: Spacing.md },
  emptyClassNote: { fontSize: FontSizes.sm, color: Colors.neutral[400] },
  classCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: BorderRadii.lg, padding: Spacing.md, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.neutral[200],
  },
  classInfo: { flex: 1 },
  className: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  classDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], marginTop: 2 },
  classDuration: { fontSize: FontSizes.xs, color: Colors.primary[600], fontWeight: '600', marginTop: 3 },
  classDeleteBtn: { padding: 8 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadii.full,
    borderWidth: 1.5, borderColor: Colors.neutral[200], backgroundColor: Colors.white,
  },
  chipSelected: { borderColor: Colors.primary[400], backgroundColor: Colors.primary[50] },
  chipText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[700] },
  chipTextSelected: { color: Colors.primary[700] },

  emptyNote: { fontSize: FontSizes.md, color: Colors.neutral[400], marginBottom: Spacing.md },

  previewCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: BorderRadii.lg,
    padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.neutral[200],
  },
  previewAvatar: {},
  previewAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  previewAvatarPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary[100], alignItems: 'center', justifyContent: 'center' },
  previewAvatarInitial: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.primary[700] },
  previewName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[900] },
  previewCref: { fontSize: FontSizes.sm, color: Colors.neutral[500] },
  previewNeighborhood: { fontSize: FontSizes.sm, color: Colors.neutral[400] },

  errorText: { backgroundColor: Colors.error[50], color: Colors.error[700], padding: Spacing.md, borderRadius: BorderRadii.md, fontSize: FontSizes.sm, marginTop: Spacing.sm },

  footer: {
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, paddingBottom: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.neutral[100], backgroundColor: Colors.white,
  },
  nextBtn: {
    backgroundColor: Colors.primary[600], borderRadius: BorderRadii.lg,
    paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextText: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white },

  // Add class modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
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
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary[600], borderRadius: BorderRadii.lg, paddingVertical: 14,
  },
  saveBtnText: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white },
});
