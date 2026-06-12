import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  TextInput, Modal, Linking, Platform, Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/Button';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { Colors, Spacing, FontSizes, Shadows } from '@/constants/theme';
import { TrainerWithProfile, Review, TrainerAvailability, TrainerScheduleBlock, TrainerClassType, DAY_NAMES } from '@/types/database';
import {
  ArrowLeft, MapPin, Clock, Star, BadgeCheck, Zap,
  MessageSquare, Monitor, Users, Heart,
  DollarSign, Target, CheckCircle, Phone, Calendar, LogIn,
  Home, Building2, ShieldCheck, Eye, Lock, Award,
  ChevronRight, Image as ImageIcon, ChevronLeft,
} from 'lucide-react-native';

const COVER_PLACEHOLDER = 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1200&h=500&fit=crop';
const AVATAR_PLACEHOLDER = 'https://images.pexels.com/photos/6551133/pexels-photo-6551133.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop';

const GALLERY_FALLBACK = [
  'https://images.pexels.com/photos/4162487/pexels-photo-4162487.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  'https://images.pexels.com/photos/3076509/pexels-photo-3076509.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  'https://images.pexels.com/photos/416809/pexels-photo-416809.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  'https://images.pexels.com/photos/2827392/pexels-photo-2827392.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
];

const IS_WEB = Platform.OS === 'web';
const SCREEN_WIDTH = Dimensions.get('window').width;
const IS_DESKTOP = IS_WEB && SCREEN_WIDTH >= 1024;

interface TrainerPhoto {
  id: string;
  url: string;
  type: 'profile' | 'cover' | 'gallery';
  sort_order: number;
}

interface ServiceOption {
  label: string;
  description: string;
  priceLabel: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  available: boolean;
}

export default function TrainerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();

  const [trainer, setTrainer]       = useState<TrainerWithProfile | null>(null);
  const [reviews, setReviews]       = useState<Review[]>([]);
  const [photos, setPhotos]         = useState<TrainerPhoto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  const [authModal, setAuthModal]   = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  const [contactModal, setContactModal] = useState(false);
  const [leadName, setLeadName]         = useState('');
  const [leadPhone, setLeadPhone]       = useState('');
  const [leadGoal, setLeadGoal]         = useState('');
  const [message, setMessage]           = useState('');
  const [sending, setSending]           = useState(false);
  const [sent, setSent]                 = useState(false);

  const [bookModal, setBookModal]       = useState(false);
  const [bookDate, setBookDate]         = useState('');
  const [bookStartTime, setBookStartTime] = useState('');
  const [bookEndTime, setBookEndTime]   = useState('');
  const [bookModality, setBookModality] = useState<'online' | 'in_person'>('in_person');
  const [bookStudentName, setBookStudentName] = useState('');
  const [bookStudentPhone, setBookStudentPhone] = useState('');
  const [bookObjective, setBookObjective] = useState('');
  const [bookMessage, setBookMessage]   = useState('');
  const [booking, setBooking]           = useState(false);
  const [bookError, setBookError]       = useState<string | null>(null);
  const [booked, setBooked]             = useState(false);

  const [availSlots, setAvailSlots]     = useState<TrainerAvailability[]>([]);
  const [blocks, setBlocks]             = useState<TrainerScheduleBlock[]>([]);
  const [takenTimes, setTakenTimes]     = useState<{ date: string; start: string }[]>([]);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [classTypes, setClassTypes]     = useState<TrainerClassType[]>([]);
  const [selectedClassTypeId, setSelectedClassTypeId] = useState<string | null>(null);

  const [galleryExpanded, setGalleryExpanded] = useState(false);

  useEffect(() => { if (id) loadTrainer(); }, [id]);

  const loadTrainer = async () => {
    const [trainerRes, reviewsRes, photosRes] = await Promise.all([
      supabase
        .from('trainers')
        .select('*, profile:profiles!trainers_id_fkey(*), specialties:trainer_specialties(specialty:specialties(*))')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('reviews')
        .select('*, student:profiles!reviews_student_id_fkey(*)')
        .eq('trainer_id', id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('trainer_photos')
        .select('id, url, type, sort_order')
        .eq('trainer_id', id)
        .eq('type', 'gallery')
        .order('sort_order', { ascending: true }),
    ]);

    if (trainerRes.data) {
      const t = {
        ...trainerRes.data,
        profile: trainerRes.data.profile,
        specialties: trainerRes.data.specialties?.map((ts: any) => ts.specialty).filter(Boolean) ?? [],
      };
      setTrainer(t);
      await supabase.from('profile_views').insert({ trainer_id: id, viewer_id: profile?.id ?? null });

      if (profile?.role === 'student') {
        const { data: fav } = await supabase
          .from('favorites').select('id')
          .eq('student_id', profile.id).eq('trainer_id', id).maybeSingle();
        setIsFavorite(!!fav);
      }
    }
    if (reviewsRes.data) setReviews(reviewsRes.data as Review[]);
    if (photosRes.data) setPhotos(photosRes.data as TrainerPhoto[]);
    setLoading(false);
  };

  const toggleFavorite = async () => {
    if (!profile || profile.role !== 'student') return;
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('student_id', profile.id).eq('trainer_id', id);
      setIsFavorite(false);
    } else {
      await supabase.from('favorites').insert({ student_id: profile.id, trainer_id: id });
      setIsFavorite(true);
    }
  };

  const openWhatsApp = () => {
    if (!trainer?.whatsapp) return;
    Linking.openURL(`https://wa.me/55${trainer.whatsapp.replace(/\D/g, '')}`);
  };

  const sendContact = async () => {
    if (!profile || !trainer || !message.trim()) return;
    setSending(true);
    await supabase.from('leads').insert({
      student_id: profile.id, trainer_id: trainer.id,
      message: [
        leadName ? `Nome: ${leadName}` : '',
        leadPhone ? `Telefone: ${leadPhone}` : '',
        leadGoal ? `Objetivo: ${leadGoal}` : '',
        message.trim(),
      ].filter(Boolean).join('\n'),
      status: 'pending',
    });
    setSending(false);
    setSent(true);
    setContactModal(false);
    setMessage(''); setLeadName(''); setLeadPhone(''); setLeadGoal('');
  };

  const requestBooking = async () => {
    if (!trainer) return;
    setBookError(null);
    if (!bookDate || !bookStartTime) {
      setBookError('Escolha uma data e horário.'); return;
    }
    if (!bookStudentName.trim()) {
      setBookError('Informe seu nome.'); return;
    }
    setBooking(true);
    const selectedCT = classTypes.find((c) => c.id === selectedClassTypeId) ?? null;
    const { error } = await supabase.from('appointments').insert({
      student_id: profile?.id ?? null,
      trainer_id: trainer.id,
      appointment_date: bookDate,
      start_time: bookStartTime,
      end_time: bookEndTime,
      modality: bookModality,
      status: 'requested',
      student_name: bookStudentName.trim(),
      student_phone: bookStudentPhone.trim() || null,
      student_goal: bookObjective.trim() || null,
      objective: bookObjective.trim() || null,
      message: bookMessage.trim() || null,
      class_type_id: selectedClassTypeId,
      class_type_name: selectedCT?.name ?? null,
    });
    setBooking(false);
    if (error) { setBookError(error.message); return; }
    setBooked(true);
    setBookModal(false);
  };

  const openBookModal = async () => {
    setBookError(null);
    setBooked(false);
    setBookDate('');
    setBookStartTime('');
    setBookEndTime('');
    setBookStudentName(profile?.full_name ?? '');
    setBookStudentPhone('');
    setBookObjective('');
    setBookMessage('');
    setSelectedDateIdx(0);
    setSelectedClassTypeId(null);

    if (id) {
      const today = new Date().toISOString().split('T')[0];
      const twoWeeksOut = new Date();
      twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
      const twoWeeksStr = twoWeeksOut.toISOString().split('T')[0];

      const [slotsRes, blocksRes, takenRes, classTypesRes] = await Promise.all([
        supabase.from('trainer_availability').select('*').eq('trainer_id', id).eq('is_active', true),
        supabase.from('trainer_schedule_blocks').select('*').eq('trainer_id', id)
          .gte('block_date', today).lte('block_date', twoWeeksStr),
        supabase.from('appointments').select('appointment_date, start_time')
          .eq('trainer_id', id).in('status', ['requested', 'confirmed'])
          .gte('appointment_date', today),
        supabase.from('trainer_class_types').select('*').eq('trainer_id', id).eq('is_active', true).order('created_at'),
      ]);
      setAvailSlots((slotsRes.data ?? []) as TrainerAvailability[]);
      setBlocks((blocksRes.data ?? []) as TrainerScheduleBlock[]);
      setTakenTimes((takenRes.data ?? []).map((r: any) => ({
        date: r.appointment_date,
        start: r.start_time.slice(0, 5),
      })));
      setClassTypes((classTypesRes.data ?? []) as TrainerClassType[]);
    }
    setBookModal(true);
  };

  // Convert "HH:MM" to minutes from midnight
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const fromMinutes = (m: number) => {
    const h = Math.floor(m / 60).toString().padStart(2, '0');
    const min = (m % 60).toString().padStart(2, '0');
    return `${h}:${min}`;
  };

  // Generate time slots for a given date based on availability config
  const generateSlotsForDate = (date: Date): { start: string; end: string }[] => {
    const dow = date.getDay();
    const dateStr = date.toISOString().split('T')[0];
    const avail = availSlots.find((s) => s.day_of_week === dow);
    if (!avail || !avail.is_active) return [];

    // Check full-day blocks
    const isFullDayBlocked = blocks.some(
      (b) => b.block_date === dateStr && b.is_full_day
    );
    if (isFullDayBlocked) return [];

    const startMin = toMinutes(avail.start_time.slice(0, 5));
    const endMin   = toMinutes(avail.end_time.slice(0, 5));
    const step     = avail.session_duration + (avail.buffer_minutes ?? 0);

    const slots: { start: string; end: string }[] = [];
    for (let cur = startMin; cur + avail.session_duration <= endMin; cur += step) {
      const slotStart = fromMinutes(cur);
      const slotEnd   = fromMinutes(cur + avail.session_duration);

      // Skip if time-range blocked
      const isTimeBlocked = blocks.some((b) => {
        if (b.block_date !== dateStr || b.is_full_day) return false;
        const bStart = toMinutes(b.start_time!.slice(0, 5));
        const bEnd   = toMinutes(b.end_time!.slice(0, 5));
        return cur < bEnd && cur + avail.session_duration > bStart;
      });
      if (isTimeBlocked) continue;

      // Skip if already taken
      const isTaken = takenTimes.some(
        (t) => t.date === dateStr && t.start === slotStart
      );
      if (isTaken) continue;

      slots.push({ start: slotStart, end: slotEnd });
    }
    return slots;
  };

  // Build next 14 days date list
  const next14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const selectedDate    = next14Days[selectedDateIdx];
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const slotsForSelected = generateSlotsForDate(selectedDate);

  if (loading) return <LoadingScreen />;
  if (!trainer) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.notFound}>Personal não encontrado.</Text>
          <Button onPress={() => router.back()} variant="outline">Voltar</Button>
        </View>
      </SafeAreaView>
    );
  }

  const { profile: p, specialties } = trainer;
  const coverUrl  = trainer.cover_photo_url ?? COVER_PLACEHOLDER;
  const avatarUrl = p.avatar_url ?? AVATAR_PLACEHOLDER;
  const location  = [p.city, trainer.neighborhood, p.state].filter(Boolean).join(', ');

  const isStudent = !!user && profile?.role === 'student';

  const galleryImages = photos.length > 0
    ? photos.map((ph) => ph.url)
    : GALLERY_FALLBACK;
  const displayedGallery = galleryExpanded ? galleryImages : galleryImages.slice(0, 6);

  const services: ServiceOption[] = [
    {
      label: 'Aula Presencial',
      description: 'Treino personalizado no local combinado, com supervisão direta.',
      priceLabel: ((trainer as any).in_person_hourly_rate ?? trainer.hourly_rate)
        ? `R$ ${(trainer as any).in_person_hourly_rate ?? trainer.hourly_rate}/hora` : 'Consulte',
      icon: <Users size={18} color={Colors.primary[600]} />,
      color: Colors.primary[700],
      bgColor: Colors.primary[50],
      borderColor: Colors.primary[100],
      available: !!trainer.accepts_in_person,
    },
    {
      label: 'Aula Online',
      description: 'Treino ao vivo por videochamada, de onde você estiver.',
      priceLabel: ((trainer as any).online_hourly_rate ?? trainer.hourly_rate)
        ? `R$ ${(trainer as any).online_hourly_rate ?? trainer.hourly_rate}/hora` : 'Consulte',
      icon: <Monitor size={18} color={Colors.secondary[600]} />,
      color: Colors.secondary[700],
      bgColor: Colors.secondary[50],
      borderColor: Colors.secondary[100],
      available: !!trainer.accepts_online,
    },
    {
      label: 'Atendimento em Casa',
      description: 'O personal vai até a sua residência com equipamentos.',
      priceLabel: ((trainer as any).home_hourly_rate ?? trainer.hourly_rate)
        ? `R$ ${(trainer as any).home_hourly_rate ?? trainer.hourly_rate}/hora` : 'Consulte',
      icon: <Home size={18} color={Colors.accent[600]} />,
      color: Colors.accent[700],
      bgColor: Colors.accent[50],
      borderColor: Colors.accent[100],
      available: !!(trainer as any).accepts_home,
    },
    {
      label: 'Em Academia',
      description: 'Treino personalizado em academia parceira ou do aluno.',
      priceLabel: ((trainer as any).gym_hourly_rate ?? trainer.hourly_rate)
        ? `R$ ${(trainer as any).gym_hourly_rate ?? trainer.hourly_rate}/hora` : 'Consulte',
      icon: <Building2 size={18} color='#8B5CF6' />,
      color: '#6D28D9',
      bgColor: '#F5F3FF',
      borderColor: '#EDE9FE',
      available: !!(trainer as any).accepts_gym,
    },
    {
      label: 'Consultoria Mensal',
      description: 'Planejamento de treino e acompanhamento via app por mês.',
      priceLabel: (trainer as any).monthly_rate ? `R$ ${(trainer as any).monthly_rate}/mês` : 'Consulte',
      icon: <Calendar size={18} color='#0EA5E9' />,
      color: '#0369A1',
      bgColor: '#F0F9FF',
      borderColor: '#BAE6FD',
      available: !!(trainer as any).monthly_rate,
    },
  ].filter((sv) => sv.available || sv.label === 'Aula Presencial');

  const ratingDist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) ratingDist[r.rating]++; });

  const ContactCard = () => (
    <View style={[s.contactCard, IS_DESKTOP && s.contactCardDesktop]}>
      <View style={s.contactCardHeader}>
        <View>
          {trainer.hourly_rate ? (
            <View style={s.contactPriceRow}>
              <Text style={s.contactPriceVal}>R$ {trainer.hourly_rate}</Text>
              <Text style={s.contactPriceUnit}>/hora</Text>
            </View>
          ) : (
            <Text style={s.contactPriceConsulte}>Preço sob consulta</Text>
          )}
          {(trainer as any).monthly_rate ? (
            <Text style={s.contactMonthly}>ou R$ {(trainer as any).monthly_rate}/mês</Text>
          ) : null}
        </View>
        {trainer.rating > 0 && (
          <View style={s.contactRating}>
            <Star size={14} color="#F59E0B" fill="#F59E0B" />
            <Text style={s.contactRatingNum}>{trainer.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <View style={s.contactFormFields}>
        <TextInput
          style={s.contactField}
          placeholder="Seu nome"
          placeholderTextColor={Colors.neutral[400]}
          value={leadName}
          onChangeText={setLeadName}
        />
        <TextInput
          style={s.contactField}
          placeholder="WhatsApp ou e-mail"
          placeholderTextColor={Colors.neutral[400]}
          value={leadPhone}
          onChangeText={setLeadPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={s.contactField}
          placeholder="Seu principal objetivo"
          placeholderTextColor={Colors.neutral[400]}
          value={leadGoal}
          onChangeText={setLeadGoal}
        />
        <TextInput
          style={[s.contactField, s.contactFieldMulti]}
          placeholder="Mensagem (opcional)"
          placeholderTextColor={Colors.neutral[400]}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {sent ? (
        <View style={s.successBox}>
          <CheckCircle size={16} color={Colors.secondary[600]} />
          <Text style={s.successText}>Mensagem enviada! O personal entrará em contato em breve.</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[s.ctaSendBtn, (!message.trim() && !leadName.trim()) && s.ctaSendBtnDisabled]}
          onPress={() => {
            if (!user) {
              setAuthMessage('Crie sua conta grátis ou faça login para entrar em contato com este personal.');
              setAuthModal(true);
              return;
            }
            sendContact();
          }}
          disabled={sending}
        >
          <Text style={s.ctaSendBtnText}>{sending ? 'Enviando...' : 'Solicitar contato'}</Text>
        </TouchableOpacity>
      )}

      {trainer.whatsapp && (
        <TouchableOpacity style={s.ctaWaBtn} onPress={openWhatsApp}>
          <Phone size={15} color="#16A34A" />
          <Text style={s.ctaWaBtnText}>Chamar no WhatsApp</Text>
        </TouchableOpacity>
      )}

      <View style={s.trustMiniRow}>
        <Lock size={11} color={Colors.neutral[400]} />
        <Text style={s.trustMiniText}>Seus dados estão protegidos</Text>
      </View>
    </View>
  );

  return (
    <View style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: IS_DESKTOP ? 40 : 100 }}>

        {/* Hero cover */}
        <View style={s.coverWrap}>
          <Image source={{ uri: coverUrl }} style={s.cover} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(11,31,111,0.05)', 'rgba(11,31,111,0.65)']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          />
          <SafeAreaView edges={['top']} style={s.coverNav}>
            <TouchableOpacity style={s.navBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={s.navBtn} onPress={() => {
              if (!user) {
                setAuthMessage('Faça login para salvar personais nos seus favoritos.');
                setAuthModal(true);
                return;
              }
              toggleFavorite();
            }}>
              <Heart size={20} color={Colors.white} fill={isFavorite && !!user ? Colors.error[500] : 'transparent'} />
            </TouchableOpacity>
          </SafeAreaView>

          <View style={s.coverBadges}>
            {trainer.is_featured && (
              <View style={s.featuredBadge}>
                <Zap size={10} color={Colors.warning[700]} fill={Colors.warning[500]} />
                <Text style={s.featuredText}>Destaque</Text>
              </View>
            )}
            {trainer.is_verified && (
              <View style={s.verifiedBadge}>
                <BadgeCheck size={10} color={Colors.primary[700]} />
                <Text style={s.verifiedText}>Verificado</Text>
              </View>
            )}
          </View>

          {trainer.rating > 0 && (
            <View style={s.coverRating}>
              <Star size={13} color="#F59E0B" fill="#F59E0B" />
              <Text style={s.coverRatingNum}>{trainer.rating.toFixed(1)}</Text>
              {trainer.review_count > 0 && (
                <Text style={s.coverRatingCnt}>{trainer.review_count} avaliações</Text>
              )}
            </View>
          )}
        </View>

        {/* Profile card */}
        <View style={s.profileCard}>
          <View style={s.profileTop}>
            <Image source={{ uri: avatarUrl }} style={s.avatar} />
            <View style={s.profileRight}>
              {trainer.hourly_rate ? (
                <View style={s.pricePill}>
                  <Text style={s.priceVal}>R$ {trainer.hourly_rate}</Text>
                  <Text style={s.priceUnit}>/hora</Text>
                </View>
              ) : (
                <View style={s.pricePillGhost}>
                  <Text style={s.priceConsulte}>Consulte</Text>
                </View>
              )}
              {(trainer as any).monthly_rate ? (
                <Text style={s.monthlyRate}>R$ {(trainer as any).monthly_rate}/mês</Text>
              ) : null}
            </View>
          </View>

          <Text style={s.trainerName}>{p.full_name}</Text>

          {location ? (
            <View style={s.infoRow}>
              <MapPin size={13} color={Colors.primary[500]} />
              <Text style={s.infoText}>{location}</Text>
            </View>
          ) : null}

          {trainer.cref ? (
            <View style={s.infoRow}>
              <BadgeCheck size={13} color={Colors.primary[500]} />
              <Text style={s.infoText}>CREF {trainer.cref}</Text>
            </View>
          ) : null}

          <View style={s.statsStrip}>
            {trainer.experience_years > 0 && (
              <>
                <View style={s.stripItem}>
                  <Clock size={15} color={Colors.primary[600]} />
                  <Text style={s.stripVal}>{trainer.experience_years} anos</Text>
                  <Text style={s.stripLbl}>experiência</Text>
                </View>
                <View style={s.stripDivider} />
              </>
            )}
            <View style={s.stripItem}>
              <Users size={15} color={Colors.primary[600]} />
              <Text style={s.stripVal} numberOfLines={1}>
                {[
                  trainer.accepts_online ? 'Online' : '',
                  trainer.accepts_in_person ? 'Presencial' : '',
                ].filter(Boolean).join(' + ') || 'Presencial'}
              </Text>
              <Text style={s.stripLbl}>modalidade</Text>
            </View>
            {trainer.rating > 0 && (
              <>
                <View style={s.stripDivider} />
                <View style={s.stripItem}>
                  <Star size={15} color="#F59E0B" fill="#F59E0B" />
                  <Text style={s.stripVal}>{trainer.rating.toFixed(1)}</Text>
                  <Text style={s.stripLbl}>avaliação</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Desktop two-column layout */}
        <View style={[s.body, IS_DESKTOP && s.bodyDesktop]}>

          {/* Main content column */}
          <View style={IS_DESKTOP ? s.mainCol : undefined}>

            {/* Bio */}
            {p.bio ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Sobre</Text>
                <Text style={s.bioText}>{p.bio}</Text>
              </View>
            ) : null}

            {/* Specialties */}
            {specialties && specialties.length > 0 ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Especialidades</Text>
                <View style={s.tagsWrap}>
                  {specialties.map((sp) => (
                    <View key={sp.id} style={s.tagPrimary}>
                      <Text style={s.tagPrimaryText}>{sp.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Target audience */}
            {trainer.target_audience && trainer.target_audience.length > 0 ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Público atendido</Text>
                <View style={s.tagsWrap}>
                  {trainer.target_audience.map((a) => (
                    <View key={a} style={s.tagGreen}>
                      <CheckCircle size={11} color={Colors.secondary[600]} />
                      <Text style={s.tagGreenText}>{a}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Objectives */}
            {trainer.objectives && trainer.objectives.length > 0 ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Objetivos que trabalho</Text>
                <View style={s.tagsWrap}>
                  {trainer.objectives.map((o) => (
                    <View key={o} style={s.tagAccent}>
                      <Target size={11} color={Colors.accent[700]} />
                      <Text style={s.tagAccentText}>{o}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Service Options */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Modalidades de atendimento</Text>
              <View style={s.servicesGrid}>
                {services.map((sv) => (
                  <View key={sv.label} style={[s.serviceCard, { backgroundColor: sv.bgColor, borderColor: sv.borderColor }]}>
                    <View style={[s.serviceIconWrap, { backgroundColor: sv.bgColor }]}>
                      {sv.icon}
                    </View>
                    <View style={s.serviceInfo}>
                      <Text style={[s.serviceLabel, { color: sv.color }]}>{sv.label}</Text>
                      <Text style={s.serviceDesc} numberOfLines={2}>{sv.description}</Text>
                    </View>
                    <Text style={[s.servicePrice, { color: sv.color }]}>{sv.priceLabel}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Photo Gallery */}
            <View style={s.section}>
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionTitle}>Fotos</Text>
                {galleryImages.length > 6 && (
                  <TouchableOpacity onPress={() => setGalleryExpanded((v) => !v)}>
                    <Text style={s.seeAllText}>{galleryExpanded ? 'Ver menos' : `Ver todas (${galleryImages.length})`}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={s.galleryGrid}>
                {displayedGallery.map((url, idx) => (
                  <View key={idx} style={[s.galleryCell, idx === 0 && s.galleryCellLarge]}>
                    <Image source={{ uri: url }} style={s.galleryImg} resizeMode="cover" />
                    {idx === 5 && !galleryExpanded && galleryImages.length > 6 && (
                      <View style={s.galleryMoreOverlay}>
                        <ImageIcon size={20} color={Colors.white} />
                        <Text style={s.galleryMoreText}>+{galleryImages.length - 6}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Reviews */}
            {reviews.length > 0 ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Avaliações</Text>

                {/* Rating summary */}
                <View style={s.ratingSummary}>
                  <View style={s.ratingBig}>
                    <Text style={s.ratingBigNum}>{trainer.rating.toFixed(1)}</Text>
                    <View style={s.ratingBigStars}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} size={14} color="#F59E0B" fill={i < Math.round(trainer.rating) ? '#F59E0B' : 'transparent'} />
                      ))}
                    </View>
                    <Text style={s.ratingBigCount}>{reviews.length} avaliações</Text>
                  </View>
                  <View style={s.ratingBars}>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingDist[star] ?? 0;
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <View key={star} style={s.ratingBarRow}>
                          <Text style={s.ratingBarLabel}>{star}</Text>
                          <Star size={10} color="#F59E0B" fill="#F59E0B" />
                          <View style={s.ratingBarTrack}>
                            <View style={[s.ratingBarFill, { width: `${pct}%` as any }]} />
                          </View>
                          <Text style={s.ratingBarCount}>{count}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Review cards */}
                {reviews.map((r) => (
                  <View key={r.id} style={s.reviewCard}>
                    <View style={s.reviewTop}>
                      <View style={s.reviewAvatar}>
                        <Text style={s.reviewAvatarText}>
                          {(r.student as any)?.full_name?.[0]?.toUpperCase() ?? '?'}
                        </Text>
                      </View>
                      <View style={s.reviewMeta}>
                        <View style={s.reviewNameRow}>
                          <Text style={s.reviewerName}>{(r.student as any)?.full_name ?? 'Aluno'}</Text>
                          <View style={s.verifiedStudentBadge}>
                            <BadgeCheck size={10} color={Colors.secondary[600]} />
                            <Text style={s.verifiedStudentText}>Aluno verificado</Text>
                          </View>
                        </View>
                        <View style={s.starsRow}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} size={12} color="#F59E0B" fill={i < r.rating ? '#F59E0B' : 'transparent'} />
                          ))}
                        </View>
                      </View>
                      <Text style={s.reviewDate}>
                        {new Date(r.created_at).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                    {r.comment ? <Text style={s.reviewComment}>{r.comment}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}

            {/* Trust section */}
            <View style={s.trustSection}>
              <Text style={s.sectionTitle}>Por que confiar?</Text>
              <View style={s.trustGrid}>
                {[
                  { icon: <ShieldCheck size={20} color={Colors.secondary[600]} />, title: 'CREF verificado', desc: 'Registro profissional conferido pela equipe.' },
                  { icon: <Eye size={20} color={Colors.primary[600]} />, title: 'Perfil revisado', desc: 'Informações verificadas antes da publicação.' },
                  { icon: <Lock size={20} color={Colors.accent[600]} />, title: 'Contato seguro', desc: 'Seus dados não são compartilhados sem permissão.' },
                  { icon: <Award size={20} color='#8B5CF6' />, title: 'Sem taxa de contato', desc: 'Solicitar contato é sempre gratuito.' },
                ].map((t) => (
                  <View key={t.title} style={s.trustCard}>
                    <View style={s.trustIconWrap}>{t.icon}</View>
                    <Text style={s.trustTitle}>{t.title}</Text>
                    <Text style={s.trustDesc}>{t.desc}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Success feedback */}
            {booked && (
              <View style={[s.successBox, { marginTop: Spacing.md }]}>
                <CheckCircle size={18} color={Colors.secondary[600]} />
                <Text style={s.successText}>Sessão solicitada com sucesso!</Text>
              </View>
            )}
          </View>

          {/* Desktop sticky sidebar */}
          {IS_DESKTOP ? (
            <View style={s.sidebarCol}>
              <View style={s.sidebarSticky}>
                <ContactCard />
                {isStudent && (
                  <TouchableOpacity style={s.sidebarBookBtn} onPress={openBookModal} disabled={booked}>
                    <Calendar size={16} color={Colors.primary[700]} />
                    <Text style={s.sidebarBookBtnText}>{booked ? 'Sessão solicitada' : 'Agendar sessão'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : null}
        </View>

      </ScrollView>

      {/* Sticky CTA bar — mobile only */}
      {!IS_DESKTOP && (
        <View style={s.stickyBar}>
          {trainer.whatsapp && (
            <TouchableOpacity style={s.waBtn} onPress={openWhatsApp}>
              <Phone size={16} color={Colors.white} />
              <Text style={s.waBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          {isStudent ? (
            <>
              <TouchableOpacity
                style={s.contactBtn}
                onPress={() => setContactModal(true)}
                disabled={sent}
              >
                <MessageSquare size={16} color={Colors.white} />
                <Text style={s.contactBtnText}>{sent ? 'Enviado!' : 'Solicitar contato'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.bookBtn}
                onPress={openBookModal}
                disabled={booked}
              >
                <Calendar size={16} color={Colors.primary[700]} />
                <Text style={s.bookBtnText}>{booked ? 'Solicitado' : 'Agendar'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[s.contactBtn, { flex: 1 }]}
              onPress={() => {
                setAuthMessage('Crie sua conta grátis ou faça login para entrar em contato e agendar sessões com este personal.');
                setAuthModal(true);
              }}
            >
              <LogIn size={16} color={Colors.white} />
              <Text style={s.contactBtnText}>Entrar para contato</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Contact modal (mobile quick form) */}
      <Modal visible={contactModal} transparent animationType="slide">
        <View style={s.modalBg}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setContactModal(false)} />
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Solicitar contato</Text>
            <Text style={s.modalSub}>com {p.full_name}</Text>

            <Text style={s.fieldLabel}>Seu nome</Text>
            <TextInput style={s.fieldInput} value={leadName} onChangeText={setLeadName} placeholder="Ex: João Silva" placeholderTextColor={Colors.neutral[400]} />

            <Text style={s.fieldLabel}>WhatsApp ou e-mail</Text>
            <TextInput style={s.fieldInput} value={leadPhone} onChangeText={setLeadPhone} placeholder="(11) 99999-9999" placeholderTextColor={Colors.neutral[400]} keyboardType="phone-pad" />

            <Text style={s.fieldLabel}>Objetivo principal</Text>
            <TextInput style={s.fieldInput} value={leadGoal} onChangeText={setLeadGoal} placeholder="Ex: Emagrecimento, Hipertrofia..." placeholderTextColor={Colors.neutral[400]} />

            <Text style={s.fieldLabel}>Mensagem</Text>
            <TextInput
              style={[s.fieldInput, { minHeight: 90, textAlignVertical: 'top' }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Apresente-se e conte mais sobre seus objetivos..."
              placeholderTextColor={Colors.neutral[400]}
              multiline
              numberOfLines={4}
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setContactModal(false)}>
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sendBtn, (!message.trim() || sending) && s.sendBtnDisabled]}
                onPress={sendContact}
                disabled={!message.trim() || sending}
              >
                <Text style={s.sendBtnText}>{sending ? 'Enviando...' : 'Enviar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AuthPromptModal
        visible={authModal}
        onClose={() => setAuthModal(false)}
        message={authMessage}
      />

      {/* Booking modal */}
      <Modal visible={bookModal} transparent animationType="slide">
        <View style={s.modalBg}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.modalCard}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>Solicitar sessão</Text>
              <Text style={s.modalSub}>com {p.full_name}</Text>

              {/* Class type selector — shown whenever trainer has class types */}
              {classTypes.length > 0 && (
                <>
                  <Text style={s.fieldLabel}>Tipo de aula</Text>
                  <View style={s.slotGrid}>
                    {classTypes.map((ct) => {
                      const isSel = selectedClassTypeId === ct.id;
                      return (
                        <TouchableOpacity
                          key={ct.id}
                          style={[s.classChip, isSel && s.classChipActive]}
                          onPress={() => setSelectedClassTypeId(isSel ? null : ct.id)}
                        >
                          <Text style={[s.classChipText, isSel && s.classChipTextActive]}>{ct.name}</Text>
                          {ct.duration_minutes !== 60 && (
                            <Text style={[s.classChipDur, isSel && s.classChipDurActive]}>{ct.duration_minutes}min</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Date picker */}
              <Text style={s.fieldLabel}>Escolha um dia</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.datePicker}>
                {next14Days.map((date, idx) => {
                  const dow = date.getDay();
                  const hasConfig = availSlots.some((sl) => sl.day_of_week === dow && sl.is_active);
                  const label  = date.toLocaleDateString('pt-BR', { weekday: 'short' });
                  const dayNum = date.toLocaleDateString('pt-BR', { day: '2-digit' });
                  const isSelected = idx === selectedDateIdx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[s.dateTile, isSelected && s.dateTileActive, !hasConfig && s.dateTileDisabled]}
                      onPress={() => { setSelectedDateIdx(idx); setBookDate(''); setBookStartTime(''); setBookEndTime(''); }}
                      disabled={!hasConfig}
                    >
                      <Text style={[s.dateTileDow, isSelected && s.dateTileTextActive, !hasConfig && s.dateTileTextDisabled]}>{label}</Text>
                      <Text style={[s.dateTileDay, isSelected && s.dateTileTextActive, !hasConfig && s.dateTileTextDisabled]}>{dayNum}</Text>
                      {hasConfig && !isSelected && <View style={s.dateTileDot} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Time slots */}
              {availSlots.length === 0 ? (
                <View style={s.noSlotsBox}>
                  <Text style={s.noSlotsNote}>Este personal ainda não configurou horários disponíveis.</Text>
                </View>
              ) : slotsForSelected.length === 0 ? (
                <View style={s.noSlotsBox}>
                  <Text style={s.noSlotsNote}>Nenhum horário disponível neste dia.</Text>
                </View>
              ) : (
                <>
                  <Text style={s.fieldLabel}>Horários disponíveis</Text>
                  <View style={s.slotGrid}>
                    {slotsForSelected.map((slot) => {
                      const isSel = bookDate === selectedDateStr && bookStartTime === slot.start;
                      return (
                        <TouchableOpacity
                          key={slot.start}
                          style={[s.slotChip, isSel && s.slotChipActive]}
                          onPress={() => {
                            setBookDate(selectedDateStr);
                            setBookStartTime(slot.start);
                            setBookEndTime(slot.end);
                            setBookModality(trainer.accepts_in_person ? 'in_person' : 'online');
                          }}
                        >
                          <Clock size={12} color={isSel ? Colors.primary[700] : Colors.neutral[500]} />
                          <Text style={[s.slotChipTime, isSel && s.slotChipTimeActive]}>{slot.start}</Text>
                          <Text style={[s.slotChipDur, isSel && s.slotChipDurActive]}>→ {slot.end}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Modality — only show when slot selected */}
              {bookStartTime && (trainer.accepts_in_person || trainer.accepts_online) ? (
                <>
                  <Text style={s.fieldLabel}>Modalidade</Text>
                  <View style={s.modalityOptRow}>
                    {trainer.accepts_in_person && (
                      <TouchableOpacity
                        style={[s.modalityOpt, bookModality === 'in_person' && s.modalityOptActive]}
                        onPress={() => setBookModality('in_person')}
                      >
                        <Users size={15} color={bookModality === 'in_person' ? Colors.primary[700] : Colors.neutral[500]} />
                        <Text style={[s.modalityOptText, bookModality === 'in_person' && s.modalityOptTextActive]}>Presencial</Text>
                      </TouchableOpacity>
                    )}
                    {trainer.accepts_online && (
                      <TouchableOpacity
                        style={[s.modalityOpt, bookModality === 'online' && s.modalityOptActive]}
                        onPress={() => setBookModality('online')}
                      >
                        <Monitor size={15} color={bookModality === 'online' ? Colors.primary[700] : Colors.neutral[500]} />
                        <Text style={[s.modalityOptText, bookModality === 'online' && s.modalityOptTextActive]}>Online</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              ) : null}

              {/* Student info */}
              <Text style={s.fieldLabel}>Seu nome *</Text>
              <TextInput style={s.fieldInput} value={bookStudentName} onChangeText={setBookStudentName} placeholder="Nome completo" placeholderTextColor={Colors.neutral[400]} />

              <Text style={s.fieldLabel}>WhatsApp (opcional)</Text>
              <TextInput style={s.fieldInput} value={bookStudentPhone} onChangeText={setBookStudentPhone} placeholder="(11) 99999-9999" placeholderTextColor={Colors.neutral[400]} keyboardType="phone-pad" />

              <Text style={s.fieldLabel}>Objetivo (opcional)</Text>
              <TextInput style={s.fieldInput} value={bookObjective} onChangeText={setBookObjective} placeholder="Ex: Emagrecimento, Hipertrofia..." placeholderTextColor={Colors.neutral[400]} />

              <Text style={s.fieldLabel}>Mensagem (opcional)</Text>
              <TextInput style={[s.fieldInput, { minHeight: 72, textAlignVertical: 'top' }]} value={bookMessage} onChangeText={setBookMessage} placeholder="Conte sobre você e suas metas..." placeholderTextColor={Colors.neutral[400]} multiline numberOfLines={3} />

              {bookError ? <Text style={s.bookError}>{bookError}</Text> : null}

              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setBookModal(false); setBookError(null); }}>
                  <Text style={s.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.sendBtn, (!bookDate || !bookStartTime || !bookStudentName.trim()) && s.sendBtnDisabled]}
                  onPress={requestBooking}
                  disabled={booking || !bookDate || !bookStartTime || !bookStudentName.trim()}
                >
                  <Text style={s.sendBtnText}>{booking ? 'Enviando...' : 'Solicitar sessão'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  notFound: { fontSize: FontSizes.xl, color: Colors.neutral[600] },

  coverWrap: { height: 320, position: 'relative' },
  cover: { width: '100%', height: '100%' },
  coverNav: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.md,
  },
  navBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.36)', alignItems: 'center', justifyContent: 'center',
  },
  coverBadges: { position: 'absolute', bottom: 80, left: 16, flexDirection: 'row', gap: 6 },
  featuredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(254,243,199,0.97)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  featuredText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.warning[700] },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(224,231,255,0.97)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  verifiedText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary[700] },
  coverRating: {
    position: 'absolute', bottom: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  coverRatingNum: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.white },
  coverRatingCnt: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.8)' },

  profileCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: -52,
    borderRadius: 24,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    ...Shadows.lg,
    gap: 8,
    shadowColor: '#1E3BBD',
  },
  profileTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 4, borderColor: Colors.white,
    backgroundColor: Colors.neutral[200],
    marginTop: -64,
  },
  profileRight: { alignItems: 'flex-end', gap: 4, paddingBottom: 4 },
  pricePill: {
    flexDirection: 'row', alignItems: 'baseline', gap: 2,
    backgroundColor: Colors.secondary[50], paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: Colors.secondary[100],
  },
  priceVal: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.secondary[700] },
  priceUnit: { fontSize: FontSizes.sm, color: Colors.secondary[500] },
  pricePillGhost: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: Colors.neutral[100],
  },
  priceConsulte: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[500] },
  monthlyRate: { fontSize: FontSizes.xs, color: Colors.neutral[500], fontWeight: '500' },

  trainerName: { fontSize: 24, fontWeight: '800', color: Colors.neutral[900], letterSpacing: -0.4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoText: { fontSize: FontSizes.sm, color: Colors.neutral[600], fontWeight: '500' },

  statsStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary[50], borderRadius: 16, padding: 14, marginTop: 6,
  },
  stripItem: { flex: 1, alignItems: 'center', gap: 3 },
  stripVal: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.primary[900], textAlign: 'center' },
  stripLbl: { fontSize: 10, color: Colors.primary[500], textAlign: 'center' },
  stripDivider: { width: 1, height: 36, backgroundColor: Colors.primary[100] },

  // Layout
  body: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  bodyDesktop: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 32,
    maxWidth: 1100, alignSelf: 'center', width: '100%', paddingHorizontal: 32,
  },
  mainCol: { flex: 1, minWidth: 0 },
  sidebarCol: { width: 360, flexShrink: 0 },
  sidebarSticky: { position: 'sticky' as any, top: 24, gap: 12 },
  sidebarBookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary[50], paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.primary[200],
  },
  sidebarBookBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.primary[700] },

  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSizes.xs, fontWeight: '700', color: Colors.neutral[400],
    textTransform: 'uppercase', letterSpacing: 1.0, marginBottom: 14,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  seeAllText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.primary[600] },
  bioText: { fontSize: FontSizes.md, color: Colors.neutral[700], lineHeight: 24 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tagPrimary: {
    backgroundColor: Colors.primary[50], paddingHorizontal: 13, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: Colors.primary[100],
  },
  tagPrimaryText: { fontSize: FontSizes.sm, color: Colors.primary[700], fontWeight: '600' },
  tagGreen: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.secondary[50], paddingHorizontal: 13, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: Colors.secondary[100],
  },
  tagGreenText: { fontSize: FontSizes.sm, color: Colors.secondary[700], fontWeight: '600' },
  tagAccent: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accent[50], paddingHorizontal: 13, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: Colors.accent[100],
  },
  tagAccentText: { fontSize: FontSizes.sm, color: Colors.accent[700], fontWeight: '600' },

  // Service cards
  servicesGrid: { gap: 10 },
  serviceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 16, borderWidth: 1.5,
  },
  serviceIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceInfo: { flex: 1 },
  serviceLabel: { fontSize: FontSizes.md, fontWeight: '700', marginBottom: 2 },
  serviceDesc: { fontSize: FontSizes.sm, color: Colors.neutral[500], lineHeight: 18 },
  servicePrice: { fontSize: FontSizes.sm, fontWeight: '700', textAlign: 'right' },

  // Gallery
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  galleryCell: {
    width: '31.5%', aspectRatio: 1,
    borderRadius: 12, overflow: 'hidden',
    backgroundColor: Colors.neutral[200],
  },
  galleryCellLarge: { width: '65%' },
  galleryImg: { width: '100%', height: '100%' },
  galleryMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  galleryMoreText: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.white },

  // Rating summary
  ratingSummary: {
    flexDirection: 'row', gap: 20, alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: Colors.neutral[100],
    marginBottom: 16, ...Shadows.sm,
  },
  ratingBig: { alignItems: 'center', gap: 4 },
  ratingBigNum: { fontSize: 40, fontWeight: '800', color: Colors.neutral[900], lineHeight: 44 },
  ratingBigStars: { flexDirection: 'row', gap: 2 },
  ratingBigCount: { fontSize: FontSizes.xs, color: Colors.neutral[400], marginTop: 2 },
  ratingBars: { flex: 1, gap: 6 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingBarLabel: { fontSize: FontSizes.sm, color: Colors.neutral[600], width: 10, textAlign: 'right' },
  ratingBarTrack: { flex: 1, height: 6, backgroundColor: Colors.neutral[100], borderRadius: 3, overflow: 'hidden' },
  ratingBarFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 3 },
  ratingBarCount: { fontSize: FontSizes.xs, color: Colors.neutral[400], width: 16, textAlign: 'right' },

  // Review cards
  reviewCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    marginBottom: 10, gap: 10,
    borderWidth: 1, borderColor: Colors.neutral[100], ...Shadows.xs,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary[100], alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.primary[700] },
  reviewMeta: { flex: 1 },
  reviewNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  reviewerName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[800] },
  verifiedStudentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.secondary[50], paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 999, borderWidth: 1, borderColor: Colors.secondary[100],
  },
  verifiedStudentText: { fontSize: 9, fontWeight: '700', color: Colors.secondary[700] },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  reviewDate: { fontSize: FontSizes.xs, color: Colors.neutral[400] },
  reviewComment: { fontSize: FontSizes.sm, color: Colors.neutral[600], lineHeight: 20 },

  // Trust section
  trustSection: {
    marginBottom: Spacing.xl,
    backgroundColor: Colors.primary[900],
    borderRadius: 24, padding: Spacing.lg,
  },
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  trustCard: {
    width: '47%', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 14,
  },
  trustIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  trustTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
  trustDesc: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.6)', lineHeight: 16 },

  // Contact card (shared between desktop sidebar and mobile section)
  mobileContactSection: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  contactCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.neutral[100], gap: 12, ...Shadows.md,
  },
  contactCardDesktop: { ...Shadows.lg },
  contactCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  contactPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  contactPriceVal: { fontSize: 26, fontWeight: '800', color: Colors.neutral[900] },
  contactPriceUnit: { fontSize: FontSizes.md, color: Colors.neutral[500] },
  contactPriceConsulte: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.neutral[500] },
  contactMonthly: { fontSize: FontSizes.sm, color: Colors.neutral[400], marginTop: 2 },
  contactRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactRatingNum: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.neutral[800] },

  contactFormFields: { gap: 8 },
  contactField: {
    backgroundColor: Colors.neutral[50], borderWidth: 1.5, borderColor: Colors.neutral[200],
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: FontSizes.md, color: Colors.neutral[900],
  },
  contactFieldMulti: { minHeight: 72, textAlignVertical: 'top' },

  ctaSendBtn: {
    backgroundColor: Colors.secondary[500], paddingVertical: 15,
    borderRadius: 14, alignItems: 'center',
  },
  ctaSendBtnDisabled: { backgroundColor: Colors.neutral[300] },
  ctaSendBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },
  ctaWaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F0FDF4', paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#BBF7D0',
  },
  ctaWaBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: '#16A34A' },
  trustMiniRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  trustMiniText: { fontSize: FontSizes.xs, color: Colors.neutral[400] },

  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.secondary[50], borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.secondary[100],
  },
  successText: { flex: 1, fontSize: FontSizes.sm, color: Colors.secondary[700], fontWeight: '600' },

  // Sticky bar (mobile)
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: 12, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: Colors.neutral[100], ...Shadows.lg,
  },
  waBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#22C55E', paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14,
  },
  waBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary[600], paddingVertical: 13, borderRadius: 14,
  },
  contactBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary[50], paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.primary[200],
  },
  bookBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.primary[700] },

  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.xl, paddingTop: 16, gap: 14,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.neutral[200], alignSelf: 'center', marginBottom: 8 },
  modalTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.neutral[900] },
  modalSub: { fontSize: FontSizes.md, color: Colors.neutral[500], marginTop: -8 },

  fieldLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700], marginBottom: 5 },
  fieldInput: {
    backgroundColor: Colors.neutral[50], borderWidth: 1.5, borderColor: Colors.neutral[200],
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: FontSizes.md, color: Colors.neutral[900], marginBottom: 2,
  },
  timeRow: { flexDirection: 'row', gap: 12 },
  modalityOptRow: { flexDirection: 'row', gap: 10, marginBottom: 2 },
  modalityOpt: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.neutral[200], backgroundColor: Colors.neutral[50],
  },
  modalityOptActive: { borderColor: Colors.primary[400], backgroundColor: Colors.primary[50] },
  modalityOptText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[600] },
  modalityOptTextActive: { color: Colors.primary[700] },
  bookError: {
    backgroundColor: Colors.error[50], color: Colors.error[700],
    padding: 12, borderRadius: 10, fontSize: FontSizes.sm,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.neutral[200], alignItems: 'center',
  },
  cancelBtnText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[700] },
  sendBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.primary[600], alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.neutral[300] },
  sendBtnText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },

  // slot picker
  datePicker: { marginBottom: 4 },
  dateTile: {
    width: 52, paddingVertical: 10, marginRight: 8, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.neutral[100], borderWidth: 1.5, borderColor: Colors.neutral[200],
    gap: 2,
  },
  dateTileActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  dateTileDisabled: { opacity: 0.35 },
  dateTileDow: { fontSize: 10, fontWeight: '600', color: Colors.neutral[500], textTransform: 'capitalize' },
  dateTileDay: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.neutral[800] },
  dateTileTextActive: { color: Colors.white },
  dateTileTextDisabled: { color: Colors.neutral[400] },
  dateTileDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary[400], marginTop: 2 },

  noSlotsBox: {
    backgroundColor: Colors.neutral[100], borderRadius: 10, padding: 14, alignItems: 'center',
  },
  noSlotsNote: { fontSize: FontSizes.sm, color: Colors.neutral[500], textAlign: 'center', marginBottom: 10 },

  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  slotChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.neutral[100], borderWidth: 1.5, borderColor: Colors.neutral[200],
  },
  slotChipActive: { backgroundColor: Colors.primary[50], borderColor: Colors.primary[400] },
  slotChipTime: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700] },
  slotChipTimeActive: { color: Colors.primary[700] },
  slotChipDur: { fontSize: FontSizes.xs, color: Colors.neutral[400] },
  slotChipDurActive: { color: Colors.primary[500] },

  classChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.neutral[100], borderWidth: 1.5, borderColor: Colors.neutral[200],
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  classChipActive: { backgroundColor: Colors.secondary[50], borderColor: Colors.secondary[400] },
  classChipText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.neutral[700] },
  classChipTextActive: { color: Colors.secondary[700] },
  classChipDur: { fontSize: FontSizes.xs, color: Colors.neutral[400] },
  classChipDurActive: { color: Colors.secondary[500] },
});
