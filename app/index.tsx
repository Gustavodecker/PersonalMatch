import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Platform, Dimensions, TextInput, Alert, FlatList,
  NativeScrollEvent, NativeSyntheticEvent, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { TrainerCard } from '@/components/TrainerCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Colors, Spacing, FontSizes, Shadows } from '@/constants/theme';
import { TrainerWithProfile } from '@/types/database';
import {
  Dumbbell, ChevronRight, CheckCircle, Star, BadgeCheck,
  ArrowRight, Search, MapPin, Monitor, Heart,
  MessageSquare, Phone, TrendingUp, Zap, Shield,
  Settings as _Settings, Award, Lock, Target, Users, Sparkles,
} from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP = IS_WEB && SCREEN_WIDTH >= 1024;

const HERO_PHOTO = 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=800&h=960&fit=crop';
const TRAINER_SECTION_PHOTO = 'https://images.pexels.com/photos/3836861/pexels-photo-3836861.jpeg?auto=compress&cs=tinysrgb&w=700&h=800&fit=crop';

const CATEGORIES = [
  { id: 'emagrecimento', label: 'Emagrecimento', photo: 'https://images.pexels.com/photos/3757954/pexels-photo-3757954.jpeg?auto=compress&cs=tinysrgb&w=400&h=340&fit=crop' },
  { id: 'hipertrofia', label: 'Hipertrofia', photo: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=400&h=340&fit=crop' },
  { id: 'online', label: 'Treino Online', photo: 'https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg?auto=compress&cs=tinysrgb&w=400&h=340&fit=crop' },
  { id: 'corrida', label: 'Corrida', photo: 'https://images.pexels.com/photos/2402777/pexels-photo-2402777.jpeg?auto=compress&cs=tinysrgb&w=400&h=340&fit=crop' },
  { id: 'terceira-idade', label: 'Terceira Idade', photo: 'https://images.pexels.com/photos/3823488/pexels-photo-3823488.jpeg?auto=compress&cs=tinysrgb&w=400&h=340&fit=crop' },
  { id: 'pos-parto', label: 'Pós-parto', photo: 'https://images.pexels.com/photos/4056529/pexels-photo-4056529.jpeg?auto=compress&cs=tinysrgb&w=400&h=340&fit=crop' },
  { id: 'condicionamento', label: 'Condicionamento', photo: 'https://images.pexels.com/photos/416809/pexels-photo-416809.jpeg?auto=compress&cs=tinysrgb&w=400&h=340&fit=crop' },
  { id: 'treino-casa', label: 'Treino em Casa', photo: 'https://images.pexels.com/photos/4162487/pexels-photo-4162487.jpeg?auto=compress&cs=tinysrgb&w=400&h=340&fit=crop' },
];

const HOW_IT_WORKS = [
  { n: '1', icon: Search, title: 'Busque por objetivo', desc: 'Filtre por cidade, especialidade, modalidade e faixa de preço.' },
  { n: '2', icon: Users, title: 'Compare profissionais', desc: 'Veja avaliações, fotos, experiência e preços lado a lado.' },
  { n: '3', icon: Phone, title: 'Fale direto no WhatsApp', desc: 'Contato imediato com o personal, sem intermediários.' },
  { n: '4', icon: Dumbbell, title: 'Comece a treinar', desc: 'Agende sua primeira sessão e inicie sua transformação.' },
];

const TRUST_ITEMS = [
  { icon: BadgeCheck, label: 'CREF verificado' },
  { icon: Star, label: 'Avaliações reais' },
  { icon: Shield, label: 'Sem pagamento antecipado' },
  { icon: MessageSquare, label: 'Contato direto' },
];

const TRAINER_BENEFITS = [
  { icon: TrendingUp, title: 'Mais visibilidade', desc: 'Seu perfil encontrado por alunos que já buscam o que você oferece.' },
  { icon: MessageSquare, title: 'Leads qualificados', desc: 'Alunos interessados entram em contato diretamente com você.' },
  { icon: BadgeCheck, title: 'CREF em destaque', desc: 'Credenciais validadas e exibidas com destaque no seu perfil.' },
  { icon: Award, title: 'Portfólio completo', desc: 'Fotos, avaliações, especialidades e resultados num só lugar.' },
  { icon: Zap, title: 'Destaque na busca', desc: 'Apareça no topo e na home com os planos Pro e Premium.' },
  { icon: Target, title: 'Filtros inteligentes', desc: 'Seja encontrado por objetivo, região e modalidade.' },
];

const PLANS = [
  {
    id: 'trial',
    name: 'Teste Grátis',
    highlight: false,
    badge: '15 DIAS GRÁTIS',
    price: 'Grátis',
    period: 'por 15 dias',
    desc: 'Sem cartão de crédito',
    features: ['Perfil público ativo', 'Até 5 leads por mês', 'Aparece na busca', 'Sem compromisso'],
    cta: 'Começar grátis',
    ctaRoute: '/(auth)/register?role=trainer',
    accent: Colors.neutral[600],
    accentBg: Colors.neutral[50],
  },
  {
    id: 'pro',
    highlight: true,
    badge: 'MAIS POPULAR',
    name: 'Pro',
    price: 'R$ 29,90',
    period: '/mês',
    desc: 'Para personais em crescimento',
    features: [
      'Leads ilimitados',
      '8 fotos no perfil',
      'Selo verificado no perfil',
      'Melhor posicionamento na busca',
      'Suporte prioritário via WhatsApp',
    ],
    cta: 'Assinar Pro',
    ctaRoute: '/(auth)/register?role=trainer',
    accent: Colors.primary[600],
    accentBg: Colors.primary[50],
  },
  {
    id: 'premium',
    highlight: false,
    badge: 'MELHOR VALOR',
    name: 'Premium',
    price: 'R$ 59,90',
    period: '/mês',
    desc: 'Para quem quer se destacar',
    features: [
      'Leads ilimitados',
      '20 fotos no perfil',
      'Destaque na busca',
      'Destaque na home da plataforma',
      'Métricas avançadas de perfil',
    ],
    cta: 'Assinar Premium',
    ctaRoute: '/(auth)/register?role=trainer',
    accent: Colors.warning[600],
    accentBg: Colors.warning[50],
  },
];

// ─── Mobile welcome / onboarding carousel ─────────────────────────────────────

const { width: SW, height: SH } = Dimensions.get('window');

const SLIDES = [
  {
    photo: 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=800&h=1200&fit=crop',
    tag:   'Para alunos',
    title: 'O personal trainer certo para você',
    body:  'Compare profissionais verificados com CREF, avaliações reais e preços transparentes.',
    accent: Colors.primary[400],
  },
  {
    photo: 'https://images.pexels.com/photos/3253501/pexels-photo-3253501.jpeg?auto=compress&cs=tinysrgb&w=800&h=1200&fit=crop',
    tag:   'Qualquer objetivo',
    title: 'Emagrecimento, hipertrofia, corrida e mais',
    body:  'Filtre por objetivo, modalidade e localização e encontre o profissional ideal em segundos.',
    accent: Colors.secondary[400],
  },
  {
    photo: 'https://images.pexels.com/photos/3836861/pexels-photo-3836861.jpeg?auto=compress&cs=tinysrgb&w=800&h=1200&fit=crop',
    tag:   'Para personais',
    title: 'Transforme seu perfil em uma vitrine de clientes',
    body:  'Apareça nas buscas, receba leads qualificados e cresça sua carteira de alunos.',
    accent: Colors.accent[400],
  },
];

const MobileWelcome: React.FC = () => {
  const flatRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setActiveIndex(idx);
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={ww.root}>
      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={ww.slide}>
            <Image source={{ uri: item.photo }} style={ww.slidePhoto} resizeMode="cover" />
            <LinearGradient
              colors={['rgba(5,10,30,0.05)', 'rgba(5,10,30,0.35)', 'rgba(5,10,30,0.92)', '#050A1E']}
              style={StyleSheet.absoluteFillObject}
              locations={[0, 0.35, 0.72, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          </View>
        )}
      />

      {/* Fixed overlay content */}
      <SafeAreaView style={ww.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        {/* Top: logo centralizado + entrar absoluto */}
        <View style={ww.topBar}>
          <View style={ww.logoWrap}>
            <Image
              source={require('@/assets/images/logo-icon.png')}
              style={ww.logoIconImg}
              resizeMode="contain"
            />
            <Text style={ww.logoText}>Personal</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={ww.skipBtn}
          >
            <Text style={ww.skipText}>Entrar</Text>
          </TouchableOpacity>
        </View>

        {/* Spacer to push content to bottom */}
        <View style={{ flex: 1 }} pointerEvents="none" />

        {/* Bottom content area */}
        <View style={ww.bottomContent}>
          {/* Tag pill */}
          <View style={[ww.tagPill, { borderColor: SLIDES[activeIndex].accent + '55' }]}>
            <View style={[ww.tagDot, { backgroundColor: SLIDES[activeIndex].accent }]} />
            <Text style={[ww.tagText, { color: SLIDES[activeIndex].accent }]}>
              {SLIDES[activeIndex].tag}
            </Text>
          </View>

          {/* Title */}
          <Text style={ww.slideTitle}>{SLIDES[activeIndex].title}</Text>
          <Text style={ww.slideBody}>{SLIDES[activeIndex].body}</Text>

          {/* Pagination dots */}
          <View style={ww.dotsRow}>
            {SLIDES.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  flatRef.current?.scrollToIndex({ index: i, animated: true });
                  setActiveIndex(i);
                }}
              >
                <View style={[
                  ww.dot,
                  i === activeIndex && ww.dotActive,
                  i === activeIndex && { backgroundColor: SLIDES[activeIndex].accent },
                ]} />
              </TouchableOpacity>
            ))}
          </View>

          {/* CTA buttons */}
          {isLast ? (
            <View style={ww.ctasLast}>
              <TouchableOpacity
                style={ww.btnPrimary}
                onPress={() => router.push('/(auth)/register?role=student')}
                activeOpacity={0.88}
              >
                <Text style={ww.btnPrimaryText}>Começar como aluno</Text>
                <ArrowRight size={18} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={ww.btnOutline}
                onPress={() => router.push('/(auth)/login')}
                activeOpacity={0.88}
              >
                <Text style={ww.btnOutlineText}>Já tenho conta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register?role=trainer')}
                activeOpacity={0.8}
                style={ww.trainerRow}
              >
                <Dumbbell size={13} color="rgba(255,255,255,0.5)" />
                <Text style={ww.trainerLink}>Sou personal trainer — cadastrar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={ww.ctasSlide}>
              <TouchableOpacity
                style={[ww.btnNext, { backgroundColor: SLIDES[activeIndex].accent }]}
                onPress={() => {
                  const next = activeIndex + 1;
                  flatRef.current?.scrollToIndex({ index: next, animated: true });
                  setActiveIndex(next);
                }}
                activeOpacity={0.88}
              >
                <Text style={ww.btnNextText}>Continuar</Text>
                <ArrowRight size={18} color={Colors.primary[900]} />
              </TouchableOpacity>
            </View>
          )}

          {/* Social proof strip */}
          <View style={ww.proofStrip}>
            <View style={ww.proofAvatarStack}>
              {[
                'https://images.pexels.com/photos/1547971/pexels-photo-1547971.jpeg?auto=compress&cs=tinysrgb&w=60&h=60&fit=crop',
                'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&w=60&h=60&fit=crop',
                'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=60&h=60&fit=crop',
              ].map((uri, i) => (
                <Image key={i} source={{ uri }} style={[ww.proofAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 3 - i }]} />
              ))}
            </View>
            <View style={{ gap: 1 }}>
              <View style={ww.starsRow}>
                {[0,1,2,3,4].map(i => <Star key={i} size={11} color="#F59E0B" fill="#F59E0B" />)}
              </View>
              <Text style={ww.proofText}>Plataforma em crescimento</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const ww = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050A1E' },

  slide: { width: SW, height: SH, position: 'relative' },
  slidePhoto: { width: '100%', height: '100%' },

  overlay: {
    ...StyleSheet.absoluteFillObject as any,
    zIndex: 10,
  },

  topBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    position: 'relative',
  },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  logoImg: { width: 140, height: 40 },
  logoIconImg: { width: 170, height: 170 },
  logoIconGrad: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  logoIconNum: { fontSize: 17, fontWeight: '900', color: Colors.white, letterSpacing: 0 },
  logoIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.primary[600],
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 48, fontWeight: '900', color: Colors.white, letterSpacing: -1.5 },
  skipBtn: {
    position: 'absolute', right: 20, top: '50%',
    paddingHorizontal: 16, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  skipText: { fontSize: 13, fontWeight: '600', color: Colors.white },

  bottomContent: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 0,
  },

  tagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 99, borderWidth: 1,
    marginBottom: 14,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  slideTitle: {
    fontSize: 32, fontWeight: '900', color: Colors.white,
    letterSpacing: -0.8, lineHeight: 40, marginBottom: 12,
  },
  slideBody: {
    fontSize: 15, color: 'rgba(255,255,255,0.62)',
    lineHeight: 23, marginBottom: 24,
  },

  dotsRow: { flexDirection: 'row', gap: 7, marginBottom: 24, alignItems: 'center' },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: { width: 22, height: 6, borderRadius: 3 },

  ctasSlide: { marginBottom: 20 },
  btnNext: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 17,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 6,
    shadowColor: '#000',
  },
  btnNextText: { fontSize: 17, fontWeight: '800', color: Colors.primary[900] },

  ctasLast: { gap: 12, marginBottom: 16 },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary[500], borderRadius: 16, paddingVertical: 17,
    shadowColor: Colors.primary[800], shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 6,
  },
  btnPrimaryText: { fontSize: 17, fontWeight: '800', color: Colors.white },
  btnOutline: {
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  btnOutlineText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  trainerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4,
  },
  trainerLink: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textAlign: 'center' },

  proofStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 16, paddingBottom: 4,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.09)',
    marginTop: 4,
  },
  proofAvatarStack: { flexDirection: 'row' },
  proofAvatar: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, borderColor: '#050A1E',
  },
  starsRow: { flexDirection: 'row', gap: 1 },
  proofText: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
});

// ─── Public landing page ──────────────────────────────────────────────────────

const PublicHome: React.FC = () => {
  const [featuredTrainers, setFeaturedTrainers] = useState<TrainerWithProfile[]>([]);
  const [loadingTrainers, setLoadingTrainers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

  const scrollToSection = (key: string) => {
    const y = sectionOffsets.current[key];
    if (y !== undefined) scrollRef.current?.scrollTo({ y, animated: true });
  };

  useEffect(() => { fetchFeaturedTrainers(); }, []);

  const fetchFeaturedTrainers = async () => {
    try {
      const { data } = await supabase
        .from('trainers')
        .select('*, profile:profiles!trainers_id_fkey(*), specialties:trainer_specialties(specialty:specialties(*))')
        .eq('status', 'active')
        .order('rating', { ascending: false })
        .limit(6);
      setFeaturedTrainers(
        (data || []).map((t: any) => ({
          ...t,
          specialties: t.specialties?.map((ts: any) => ts.specialty).filter(Boolean) ?? [],
        }))
      );
    } catch { /* silent */ }
    finally { setLoadingTrainers(false); }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={s.root}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[0]}
    >
      {/* ── 1. HEADER ────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerInner}>
          <TouchableOpacity
            style={s.logo}
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          >
            <Image
              source={require('@/assets/images/logo-horizontal.png')}
              style={s.logoHorizontal}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {IS_DESKTOP && (
            <View style={s.headerNav}>
              {[
                { label: 'Buscar personal', action: () => router.push('/search' as any) },
                { label: 'Como funciona',   action: () => scrollToSection('como-funciona') },
                { label: 'Para alunos',     action: () => scrollToSection('para-alunos') },
                { label: 'Para personais',  action: () => scrollToSection('para-personais') },
                { label: 'Planos',          action: () => scrollToSection('planos') },
              ].map((item) => (
                <TouchableOpacity key={item.label} onPress={item.action}>
                  <Text style={s.navLink}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={s.headerCtas}>
            <TouchableOpacity
              style={s.btnLogin}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={s.btnLoginText}>Entrar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.btnSignup}
              onPress={() => router.push('/(auth)/register?role=trainer')}
            >
              <Text style={s.btnSignupText}>
                {IS_DESKTOP ? 'Cadastrar como personal' : 'Sou Personal'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── 2. HERO ──────────────────────────────────────────────────────── */}
      {IS_DESKTOP ? (
        <View style={s.heroDesktop}>
          {/* Left: text content */}
          <View style={s.heroLeft}>
            <View style={s.heroLeftInner}>
              <View style={s.heroPill}>
                <Sparkles size={12} color={Colors.primary[600]} />
                <Text style={s.heroPillText}>Marketplace de Personal Trainers</Text>
              </View>

              <Text style={s.heroH1}>
                Encontre o personal ideal para transformar seus resultados
              </Text>

              <Text style={s.heroBody}>
                Compare profissionais verificados, veja avaliações reais, escolha por objetivo e localização, e fale direto com o personal certo para você.
              </Text>

              <View style={s.heroSearch}>
                <MapPin size={17} color={Colors.neutral[400]} />
                <TextInput
                  style={s.heroSearchInput}
                  placeholder="Digite sua cidade, bairro ou objetivo..."
                  placeholderTextColor={Colors.neutral[400]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => router.push('/search')}
                />
                <TouchableOpacity
                  style={s.heroSearchBtn}
                  onPress={() => router.push('/search')}
                >
                  <Search size={15} color={Colors.white} />
                  <Text style={s.heroSearchBtnText}>Buscar</Text>
                </TouchableOpacity>
              </View>

              <View style={s.heroQuickPills}>
                {['Emagrecimento', 'Hipertrofia', 'Online', 'Corrida', 'Pós-parto'].map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={s.quickPill}
                    onPress={() => router.push('/search')}
                  >
                    <Text style={s.quickPillText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.heroActions}>
                <TouchableOpacity
                  style={s.heroBtnPrimary}
                  onPress={() => router.push('/search')}
                >
                  <Text style={s.heroBtnPrimaryText}>Encontrar personal</Text>
                  <ArrowRight size={16} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.heroBtnSecondary}
                  onPress={() => router.push('/(auth)/register?role=trainer')}
                >
                  <Text style={s.heroBtnSecondaryText}>Sou personal trainer</Text>
                </TouchableOpacity>
              </View>

              <View style={s.heroTrustRow}>
                {TRUST_ITEMS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <View key={t.label} style={s.heroTrustItem}>
                      <Icon size={14} color={Colors.secondary[600]} />
                      <Text style={s.heroTrustText}>{t.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Right: photo */}
          <View style={s.heroRight}>
            <Image
              source={{ uri: HERO_PHOTO }}
              style={s.heroPhoto}
              resizeMode="cover"
            />
          </View>
        </View>
      ) : (
        /* Mobile hero */
        <View style={s.heroMobile}>
          <Image source={{ uri: HERO_PHOTO }} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(15,23,42,0.18)', 'rgba(15,23,42,0.62)', 'rgba(15,23,42,0.94)']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={s.heroMobileInner}>
            <View style={s.heroPill}>
              <Sparkles size={11} color="rgba(255,255,255,0.9)" />
              <Text style={[s.heroPillText, { color: 'rgba(255,255,255,0.9)' }]}>Marketplace de Personal Trainers</Text>
            </View>
            <Text style={s.heroH1Mobile}>
              Encontre o personal ideal para você
            </Text>
            <Text style={s.heroBodyMobile}>
              Compare profissionais, veja avaliações e fale direto com o personal certo.
            </Text>
            <View style={s.heroSearchMobile}>
              <MapPin size={16} color={Colors.neutral[400]} />
              <TextInput
                style={s.heroSearchInputMobile}
                placeholder="Cidade, bairro ou objetivo..."
                placeholderTextColor={Colors.neutral[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => router.push('/search')}
              />
            </View>
            <TouchableOpacity
              style={s.heroMobileSearchBtn}
              onPress={() => router.push('/search')}
            >
              <Search size={17} color={Colors.white} />
              <Text style={s.heroMobileSearchBtnText}>Buscar personal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.heroMobileSecBtn}
              onPress={() => router.push('/(auth)/register?role=trainer')}
            >
              <Text style={s.heroMobileSecBtnText}>Sou personal trainer →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── 3. TRUST STRIP ───────────────────────────────────────────────── */}
      <View style={s.trustStrip}>
        <View style={s.pageInner}>
          <View style={s.trustStripRow}>
            {[
              { icon: BadgeCheck, color: Colors.primary[600], bg: Colors.primary[50], title: 'Profissionais verificados', desc: 'CREF validado pela equipe' },
              { icon: Target, color: Colors.secondary[600], bg: Colors.secondary[50], title: 'Busca inteligente', desc: 'Por objetivo, cidade e modalidade' },
              { icon: Monitor, color: '#7C3AED', bg: '#F5F3FF', title: 'Online e presencial', desc: 'Você escolhe como treinar' },
              { icon: Star, color: Colors.warning[600], bg: Colors.warning[50], title: 'Avaliações reais', desc: 'De alunos cadastrados' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <React.Fragment key={item.title}>
                  {idx > 0 && IS_DESKTOP && <View style={s.trustStripDivider} />}
                  <View style={s.trustStripItem}>
                    <View style={[s.trustStripIcon, { backgroundColor: item.bg }]}>
                      <Icon size={18} color={item.color} />
                    </View>
                    <View style={s.trustStripText}>
                      <Text style={s.trustStripTitle}>{item.title}</Text>
                      <Text style={s.trustStripDesc}>{item.desc}</Text>
                    </View>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </View>

      {/* ── 4. COMO FUNCIONA ─────────────────────────────────────────────── */}
      <View style={s.howSection} onLayout={(e) => { sectionOffsets.current['como-funciona'] = e.nativeEvent.layout.y; }}>
        <View style={s.pageInner}>
          <View style={s.sectionLabel}>
            <Text style={s.sectionLabelText}>PROCESSO SIMPLES</Text>
          </View>
          <Text style={s.sectionTitleLight}>Como funciona</Text>
          <Text style={s.sectionSubLight}>Do cadastro ao primeiro treino em poucos passos</Text>

          <View style={s.stepsRow}>
            {HOW_IT_WORKS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <View key={step.n} style={s.stepCard}>
                  <View style={s.stepNumber}>
                    <Text style={s.stepNumberText}>{step.n}</Text>
                  </View>
                  <View style={s.stepIconBox}>
                    <Icon size={22} color={Colors.primary[300]} />
                  </View>
                  <Text style={s.stepTitle}>{step.title}</Text>
                  <Text style={s.stepDesc}>{step.desc}</Text>
                  {idx < HOW_IT_WORKS.length - 1 && IS_DESKTOP && (
                    <View style={s.stepArrow}>
                      <ArrowRight size={16} color="rgba(255,255,255,0.15)" />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* ── 5. OBJETIVOS / CATEGORIAS ────────────────────────────────────── */}
      <View style={s.catSection} onLayout={(e) => { sectionOffsets.current['para-alunos'] = e.nativeEvent.layout.y; }}>
        <View style={s.pageInner}>
          <View style={s.sectionHeader}>
            <View>
              <View style={s.sectionPill}>
                <Text style={s.sectionPillText}>Para alunos</Text>
              </View>
              <Text style={s.sectionTitle}>Explore por objetivo</Text>
              <Text style={s.sectionSub}>Encontre o acompanhamento certo para o seu objetivo.</Text>
            </View>
            <TouchableOpacity style={s.seeAll} onPress={() => router.push('/search')}>
              <Text style={s.seeAllText}>Ver todos</Text>
              <ChevronRight size={14} color={Colors.primary[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.catScroll}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={s.catCard}
                onPress={() => router.push('/search')}
                activeOpacity={0.88}
              >
                <Image source={{ uri: cat.photo }} style={s.catPhoto} resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(15,23,42,0.82)']}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0.3 }}
                  end={{ x: 0, y: 1 }}
                />
                <Text style={s.catLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={s.sectionCta}
            onPress={() => router.push('/(auth)/register?role=student')}
          >
            <Text style={s.sectionCtaText}>Criar conta grátis como aluno</Text>
            <ArrowRight size={15} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 6. PERSONAIS EM DESTAQUE ─────────────────────────────────────── */}
      <View style={s.trainersFeatSection}>
        <View style={s.pageInner}>
          <View style={s.sectionHeader}>
            <View>
              <View style={s.sectionPill}>
                <Text style={s.sectionPillText}>Destaques</Text>
              </View>
              <Text style={s.sectionTitle}>Personais em destaque</Text>
            </View>
            <TouchableOpacity style={s.seeAll} onPress={() => router.push('/search')}>
              <Text style={s.seeAllText}>Ver todos</Text>
              <ChevronRight size={14} color={Colors.primary[600]} />
            </TouchableOpacity>
          </View>

          {loadingTrainers ? (
            <View style={s.loadingBox}>
              <Text style={s.loadingText}>Carregando profissionais...</Text>
            </View>
          ) : featuredTrainers.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.trainersScroll}
            >
              {featuredTrainers.map((t) => (
                <View key={t.id} style={s.trainerCardWrap}>
                  <TrainerCard trainer={t} onPress={() => {
                    if (!t.id) { Alert.alert('Aviso', 'Perfil indisponível no momento.'); return; }
                    router.push(`/trainer/${t.id}`);
                  }} />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Dumbbell size={26} color={Colors.primary[400]} />
              </View>
              <Text style={s.emptyTitle}>Em breve por aqui</Text>
              <Text style={s.emptyDesc}>
                Ainda estamos selecionando os primeiros profissionais da plataforma.
              </Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => router.push('/search')}
              >
                <Text style={s.emptyBtnText}>Ver todos os personais</Text>
                <ChevronRight size={13} color={Colors.primary[600]} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ── 7. PARA PERSONAL TRAINERS ────────────────────────────────────── */}
      <View style={s.forTrainersSection} onLayout={(e) => { sectionOffsets.current['para-personais'] = e.nativeEvent.layout.y; }}>
        <View style={s.pageInner}>
          {IS_DESKTOP ? (
            <View style={s.forTrainersDesktop}>
              <View style={s.forTrainersLeft}>
                <View style={[s.sectionPill, { backgroundColor: Colors.secondary[50], borderColor: Colors.secondary[100] }]}>
                  <Text style={[s.sectionPillText, { color: Colors.secondary[700] }]}>Para personal trainers</Text>
                </View>
                <Text style={s.sectionTitle}>
                  Transforme seu perfil em uma vitrine de clientes
                </Text>
                <Text style={s.sectionSub}>
                  Crie uma página profissional, apareça nas buscas orgânicas e receba contatos de alunos que já buscam o que você oferece.
                </Text>

                <View style={s.benefitsList}>
                  {TRAINER_BENEFITS.map((b) => {
                    const Icon = b.icon;
                    return (
                      <View key={b.title} style={s.benefitRow}>
                        <View style={s.benefitDot}>
                          <Icon size={15} color={Colors.secondary[600]} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.benefitTitle}>{b.title}</Text>
                          <Text style={s.benefitDesc}>{b.desc}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={s.ctaGreen}
                  onPress={() => router.push('/(auth)/register?role=trainer')}
                >
                  <Dumbbell size={16} color={Colors.white} />
                  <Text style={s.ctaGreenText}>Cadastrar como personal</Text>
                </TouchableOpacity>
              </View>

              <View style={s.forTrainersRight}>
                <Image
                  source={{ uri: TRAINER_SECTION_PHOTO }}
                  style={s.trainerSectionPhoto}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(240,253,244,0.6)']}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0.5, y: 0.5 }}
                  end={{ x: 0, y: 1 }}
                />
              </View>
            </View>
          ) : (
            /* Mobile */
            <>
              <View style={[s.sectionPill, { backgroundColor: Colors.secondary[50], borderColor: Colors.secondary[100] }]}>
                <Text style={[s.sectionPillText, { color: Colors.secondary[700] }]}>Para personal trainers</Text>
              </View>
              <Text style={s.sectionTitle}>Transforme seu perfil em uma vitrine de clientes</Text>
              <Text style={s.sectionSub}>
                Apareça nas buscas e receba contatos de alunos que buscam o que você oferece.
              </Text>
              <View style={s.benefitsGrid}>
                {TRAINER_BENEFITS.map((b) => {
                  const Icon = b.icon;
                  return (
                    <View key={b.title} style={s.benefitCard}>
                      <View style={s.benefitCardIcon}>
                        <Icon size={18} color={Colors.secondary[600]} />
                      </View>
                      <Text style={s.benefitTitle}>{b.title}</Text>
                      <Text style={s.benefitDesc}>{b.desc}</Text>
                    </View>
                  );
                })}
              </View>
              <TouchableOpacity
                style={s.ctaGreen}
                onPress={() => router.push('/(auth)/register?role=trainer')}
              >
                <Dumbbell size={16} color={Colors.white} />
                <Text style={s.ctaGreenText}>Cadastrar como personal</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* ── 8. PLANOS (web only — no payment on mobile) ──────────────────── */}
      {IS_WEB && (
        <View style={s.plansSection} onLayout={(e) => { sectionOffsets.current['planos'] = e.nativeEvent.layout.y; }}>
          <View style={s.pageInner}>
            <View style={s.plansSectionHead}>
              <View style={s.sectionPill}>
                <Text style={s.sectionPillText}>Para personais</Text>
              </View>
              <Text style={s.sectionTitle}>Planos e preços</Text>
              <Text style={s.sectionSub}>Comece grátis. Escale no seu ritmo.</Text>
            </View>

            <View style={s.plansGrid}>
              {PLANS.map((plan) => {
                const isHighlight = plan.highlight;
                return (
                  <View
                    key={plan.id}
                    style={[s.planCard, isHighlight && s.planCardHighlight]}
                  >
                    <View style={[s.planBadge, { backgroundColor: plan.accentBg }]}>
                      <Text style={[s.planBadgeText, { color: plan.accent }]}>{plan.badge}</Text>
                    </View>
                    <Text style={[s.planName, isHighlight && { color: Colors.white }]}>
                      {plan.name}
                    </Text>
                    <Text style={[s.planDesc, isHighlight && { color: 'rgba(255,255,255,0.65)' }]}>
                      {plan.desc}
                    </Text>
                    <View style={s.planPriceBlock}>
                      <Text style={[s.planPrice, isHighlight && { color: Colors.white }]}>
                        {plan.price}
                      </Text>
                      <Text style={[s.planPeriod, isHighlight && { color: 'rgba(255,255,255,0.5)' }]}>
                        {plan.period}
                      </Text>
                    </View>
                    <View style={[s.planDivider, isHighlight && { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
                    <View style={s.planFeatures}>
                      {plan.features.map((f) => (
                        <View key={f} style={s.planFeatureRow}>
                          <CheckCircle
                            size={14}
                            color={isHighlight ? Colors.secondary[400] : Colors.secondary[600]}
                          />
                          <Text style={[s.planFeatureText, isHighlight && { color: 'rgba(255,255,255,0.82)' }]}>
                            {f}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={[
                        s.planCta,
                        isHighlight ? s.planCtaHighlight : { borderColor: plan.accent },
                      ]}
                      onPress={() => router.push(plan.ctaRoute as any)}
                      activeOpacity={0.86}
                    >
                      <Text style={[
                        s.planCtaText,
                        isHighlight ? { color: Colors.white } : { color: plan.accent },
                      ]}>
                        {plan.cta}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* ── 9. CONFIANÇA ─────────────────────────────────────────────────── */}
      <View style={s.trustSection}>
        <View style={s.pageInner}>
          <View style={s.sectionHeaderCenter}>
            <View style={s.sectionPill}>
              <Text style={s.sectionPillText}>Transparência</Text>
            </View>
            <Text style={s.sectionTitle}>Por que confiar no 99 Personal?</Text>
            <Text style={s.sectionSub}>
              Uma plataforma onde alunos e profissionais se conectam com segurança.
            </Text>
          </View>
          <View style={s.trustGrid}>
            {[
              { icon: BadgeCheck, title: 'CREF verificado', desc: 'Cada perfil exibe o registro CREF validado pela nossa equipe editorial.' },
              { icon: Star, title: 'Avaliações autênticas', desc: 'Apenas alunos que realizaram aulas podem deixar avaliações na plataforma.' },
              { icon: MessageSquare, title: 'Contato direto', desc: 'Fale com o personal via WhatsApp ou chat, sem nenhum intermediário.' },
              { icon: Shield, title: 'Sem pagamento via plataforma', desc: 'Valores combinados diretamente entre aluno e personal, sem tarifas ocultas.' },
              { icon: Lock, title: 'Dados protegidos', desc: 'Sua privacidade garantida com criptografia e conformidade com a LGPD.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <View key={item.title} style={s.trustCard}>
                  <View style={s.trustCardIcon}>
                    <Icon size={20} color={Colors.primary[600]} />
                  </View>
                  <Text style={s.trustCardTitle}>{item.title}</Text>
                  <Text style={s.trustCardDesc}>{item.desc}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* ── 10. MISSÃO ───────────────────────────────────────────────────── */}
      <View style={s.missionSection}>
        <View style={s.pageInner}>
          <View style={s.missionCard}>
            <LinearGradient
              colors={[Colors.primary[50], Colors.white]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={s.missionIcon}>
              <Heart size={26} color={Colors.primary[600]} />
            </View>
            <Text style={s.missionTitle}>Nossa missão</Text>
            <Text style={s.missionText}>
              Estamos construindo uma rede de personal trainers qualificados para ajudar brasileiros a encontrarem acompanhamento profissional personalizado. Acreditamos que um bom personal trainer muda vidas — e que encontrá-lo não precisa ser difícil.
            </Text>
            <View style={s.missionLine} />
            <Text style={s.missionSub}>
              Cada perfil revisado. Cada avaliação verificada. Cada contato direto com o profissional.
            </Text>
          </View>
        </View>
      </View>

      {/* ── 11. CTA FINAL ────────────────────────────────────────────────── */}
      <View style={s.ctaSection}>
        <LinearGradient
          colors={[Colors.primary[900], '#152b8a', Colors.primary[800]]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={s.pageInner}>
          <Text style={s.ctaTitle}>
            Pronto para encontrar o personal certo?
          </Text>
          <Text style={s.ctaSub}>Cadastro gratuito. Sem cartão de crédito.</Text>
          <View style={s.ctaBtns}>
            <TouchableOpacity
              style={s.ctaBtnPrimary}
              onPress={() => router.push('/search')}
            >
              <Search size={16} color={Colors.primary[900]} />
              <Text style={s.ctaBtnPrimaryText}>Buscar personal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.ctaBtnOutline}
              onPress={() => router.push('/(auth)/register?role=trainer')}
            >
              <Dumbbell size={16} color={Colors.white} />
              <Text style={s.ctaBtnOutlineText}>Cadastrar como personal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── 12. FOOTER ───────────────────────────────────────────────────── */}
      <View style={s.footer}>
        <View style={s.pageInner}>
          <View style={IS_DESKTOP ? s.footerDesktop : undefined}>
            {/* Brand */}
            <View style={s.footerBrand}>
              <View style={s.footerLogoRow}>
                <Image
                  source={require('@/assets/images/logo-icon.png')}
                  style={s.footerLogoBadge}
                  resizeMode="contain"
                />
                <Text style={s.footerLogoName}>99 Personal</Text>
              </View>
            </View>
            {IS_DESKTOP && (
              <Text style={[s.footerTagline, { marginTop: 8, marginBottom: 0 }]}>
                O marketplace de personal trainers do Brasil
              </Text>
            )}
            {!IS_DESKTOP && (
              <Text style={s.footerTagline}>O marketplace de personal trainers do Brasil</Text>
            )}

            {/* Links */}
            <View style={[s.footerLinks, IS_DESKTOP && s.footerLinksDesktop]}>
              <View style={s.footerCol}>
                <Text style={s.footerColHead}>Plataforma</Text>
                <TouchableOpacity onPress={() => router.push('/search')}>
                  <Text style={s.footerLink}>Buscar personal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => scrollToSection('como-funciona')}>
                  <Text style={s.footerLink}>Como funciona</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => scrollToSection('para-personais')}>
                  <Text style={s.footerLink}>Para personais</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => scrollToSection('planos')}>
                  <Text style={s.footerLink}>Planos</Text>
                </TouchableOpacity>
              </View>
              <View style={s.footerCol}>
                <Text style={s.footerColHead}>Conta</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={s.footerLink}>Entrar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/(auth)/register?role=student')}>
                  <Text style={s.footerLink}>Cadastrar como aluno</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/(auth)/register?role=trainer')}>
                  <Text style={s.footerLink}>Cadastrar como personal</Text>
                </TouchableOpacity>
              </View>
              <View style={s.footerCol}>
                <Text style={s.footerColHead}>Suporte</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://wa.me/5547992222949?text=Oi%2C%20preciso%20de%20suporte%20no%2099%20Personal')}>
                  <Text style={s.footerLink}>Falar com suporte</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/termos')}><Text style={s.footerLink}>Termos de uso</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/privacidade')}><Text style={s.footerLink}>Privacidade</Text></TouchableOpacity>
              </View>
              <View style={s.footerCol}>
                <Text style={s.footerColHead}>Aplicativo</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://apps.apple.com/app/99personal')}>
                  <Text style={s.footerLink}>Download iOS</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.99personal')}>
                  <Text style={s.footerLink}>Download Android</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={s.footerBottom}>
            <Text style={s.footerCopy}>© 2026 99 Personal. Todos os direitos reservados.</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

// ─── Auth redirect ─────────────────────────────────────────────────────────────

const TrainerRedirect: React.FC<{ userId: string }> = ({ userId }) => {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('trainers').select('cref, experience_years, whatsapp')
          .eq('id', userId).maybeSingle();
        if (error || !data) { router.replace('/trainer/onboarding'); return; }
        if (!data.cref && !data.whatsapp && data.experience_years === 0) {
          router.replace('/trainer/onboarding');
        } else {
          router.replace('/trainer/(app)/dashboard');
        }
      } catch { router.replace('/trainer/(app)/dashboard'); }
      finally { setChecked(true); }
    })();
  }, [userId]);
  if (!checked) return <LoadingScreen />;
  return null;
};

// ─── Root export ───────────────────────────────────────────────────────────────

const Index: React.FC = () => {
  const { user, profile, loading, needsRoleSelection } = useAuth();
  const [loadingRedirect, setLoadingRedirect] = useState(true);
  useEffect(() => { if (!loading) setLoadingRedirect(false); }, [loading]);
  if (loading || loadingRedirect) return <LoadingScreen />;
  if (user && !profile && needsRoleSelection) return <Redirect href="/select-role" />;
  if (user && profile) {
    if (profile.role === 'student') return <Redirect href="/student/dashboard" />;
    if (profile.role === 'trainer') return <TrainerRedirect userId={user.id} />;
    if (profile.role === 'admin')   return <Redirect href="/painel-restrito/dashboard" />;
  }
  // Mobile without auth → dedicated welcome screen
  if (Platform.OS !== 'web' && !user) return <MobileWelcome />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }} edges={[]}>
      <PublicHome />
    </SafeAreaView>
  );
};

export default Index;

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },

  // ── Layout helper ─────────────────────────────────────────────────────────
  pageInner: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: IS_DESKTOP ? 56 : 20,
  },

  // ── HEADER ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
    zIndex: 100,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerInner: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: IS_DESKTOP ? 56 : 20,
    paddingVertical: 14,
    maxWidth: 1200, alignSelf: 'center', width: '100%',
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoHorizontal: { width: IS_DESKTOP ? 180 : 140, height: IS_DESKTOP ? 56 : 44 },
  logoMark: { width: 42, height: 42 },
  logoMarkNum: { fontSize: 17, fontWeight: '900', color: Colors.white, letterSpacing: 0 },
  logoText: {
    fontSize: 20, fontWeight: '800', color: Colors.neutral[900], letterSpacing: -0.4,
  },
  headerNav: { flexDirection: 'row', alignItems: 'center', gap: 30 },
  navLink: { fontSize: 14, fontWeight: '500', color: Colors.neutral[600] },
  headerCtas: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnLogin: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1.5, borderColor: Colors.neutral[200],
  },
  btnLoginText: { fontSize: 14, fontWeight: '600', color: Colors.neutral[700] },
  btnSignup: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 10, backgroundColor: Colors.primary[700],
  },
  btnSignupText: { fontSize: 14, fontWeight: '700', color: Colors.white },

  // ── HERO DESKTOP ──────────────────────────────────────────────────────────
  heroDesktop: {
    flexDirection: 'row',
    minHeight: 680,
    backgroundColor: Colors.white,
  },
  heroLeft: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  heroLeftInner: {
    width: '100%',
    maxWidth: 600,
    paddingVertical: 72,
    paddingLeft: 56,
    paddingRight: 48,
    gap: 0,
  },
  heroH1: {
    fontSize: IS_DESKTOP ? 54 : 34,
    fontWeight: '900',
    color: Colors.neutral[900],
    letterSpacing: -1.5,
    lineHeight: IS_DESKTOP ? 62 : 42,
    marginTop: 14,
    marginBottom: 18,
  },
  heroBody: {
    fontSize: 16,
    color: Colors.neutral[500],
    lineHeight: 26,
    marginBottom: 28,
    maxWidth: 500,
  },

  // Search bar (desktop)
  heroSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white,
    borderWidth: 2, borderColor: Colors.neutral[200],
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 6,
    marginBottom: 12,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  heroSearchInput: {
    flex: 1, fontSize: 15, color: Colors.neutral[900],
    paddingVertical: 11,
    outlineStyle: 'none' as any,
  },
  heroSearchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.secondary[600],
    paddingHorizontal: 18, paddingVertical: 13,
    borderRadius: 10,
  },
  heroSearchBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },

  // Quick pills
  heroQuickPills: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24,
  },
  quickPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.neutral[50],
    borderWidth: 1, borderColor: Colors.neutral[200],
    borderRadius: 999,
  },
  quickPillText: { fontSize: 13, fontWeight: '500', color: Colors.neutral[700] },

  // Actions
  heroActions: { flexDirection: 'row', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  heroBtnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary[700],
    paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: Colors.primary[700],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  heroBtnPrimaryText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  heroBtnSecondary: {
    paddingVertical: 14, paddingHorizontal: 22,
    borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.neutral[300],
  },
  heroBtnSecondaryText: { fontSize: 15, fontWeight: '600', color: Colors.neutral[700] },

  // Trust row (desktop)
  heroTrustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  heroTrustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroTrustText: { fontSize: 12, color: Colors.neutral[500], fontWeight: '500' },

  // Hero right photo
  heroRight: { flex: 1, position: 'relative', overflow: 'hidden' },
  heroPhoto: { width: '100%', height: '100%' },

  // Hero pill (shared)
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary[50],
    borderWidth: 1, borderColor: Colors.primary[100],
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, alignSelf: 'flex-start',
  },
  heroPillText: {
    fontSize: 11, fontWeight: '700', color: Colors.primary[700],
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // ── HERO MOBILE ───────────────────────────────────────────────────────────
  heroMobile: { position: 'relative', overflow: 'hidden' },
  heroMobileInner: {
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 44, gap: 0,
  },
  heroH1Mobile: {
    fontSize: 36, fontWeight: '900', color: Colors.white,
    letterSpacing: -1, lineHeight: 44,
    marginTop: 12, marginBottom: 14,
  },
  heroBodyMobile: {
    fontSize: 15, color: 'rgba(255,255,255,0.75)',
    lineHeight: 24, marginBottom: 20,
  },
  heroSearchMobile: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },
  heroSearchInputMobile: {
    flex: 1, fontSize: 14, color: Colors.neutral[900],
    outlineStyle: 'none' as any,
  },
  heroMobileSearchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.secondary[600], borderRadius: 14,
    paddingVertical: 15, marginBottom: 8,
    shadowColor: Colors.secondary[700], shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  heroMobileSearchBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  heroMobileSecBtn: { alignItems: 'center', paddingVertical: 8 },
  heroMobileSecBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },

  // ── TRUST STRIP ───────────────────────────────────────────────────────────
  trustStrip: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
    paddingVertical: 20,
  },
  trustStripRow: {
    flexDirection: IS_DESKTOP ? 'row' : 'column',
    gap: IS_DESKTOP ? 0 : 14,
    alignItems: IS_DESKTOP ? 'center' : 'flex-start',
  },
  trustStripDivider: {
    width: 1, height: 40, backgroundColor: Colors.neutral[100],
  },
  trustStripItem: {
    flex: IS_DESKTOP ? 1 : undefined,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: IS_DESKTOP ? 20 : 0,
  },
  trustStripIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  trustStripText: { flex: 1 },
  trustStripTitle: { fontSize: 13, fontWeight: '700', color: Colors.neutral[800] },
  trustStripDesc: { fontSize: 12, color: Colors.neutral[500], marginTop: 1 },

  // ── HOW IT WORKS ──────────────────────────────────────────────────────────
  howSection: {
    backgroundColor: Colors.primary[900],
    paddingVertical: IS_DESKTOP ? 80 : 52,
  },
  sectionLabel: { alignSelf: 'center', marginBottom: 10 },
  sectionLabelText: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2,
  },
  sectionTitleLight: {
    fontSize: IS_DESKTOP ? 40 : 28, fontWeight: '900', color: Colors.white,
    textAlign: 'center', letterSpacing: -0.8, marginBottom: 10,
  },
  sectionSubLight: {
    fontSize: 15, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', marginBottom: 40,
  },
  stepsRow: {
    flexDirection: IS_DESKTOP ? 'row' : 'column',
    gap: IS_DESKTOP ? 12 : 14,
    position: 'relative',
  },
  stepCard: {
    flex: IS_DESKTOP ? 1 : undefined,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22, padding: 24, gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  stepNumber: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primary[700],
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumberText: { fontSize: 16, fontWeight: '900', color: Colors.white },
  stepIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepTitle: { fontSize: 15, fontWeight: '700', color: Colors.white, marginTop: 4 },
  stepDesc: { fontSize: 13, color: 'rgba(255,255,255,0.50)', lineHeight: 20 },
  stepArrow: {
    position: 'absolute', right: -14, top: '50%',
    zIndex: 2,
  },

  // ── SECTIONS ──────────────────────────────────────────────────────────────
  catSection: {
    backgroundColor: Colors.white,
    paddingVertical: IS_DESKTOP ? 80 : 52,
  },
  trainersFeatSection: {
    backgroundColor: Colors.neutral[50],
    paddingVertical: IS_DESKTOP ? 80 : 52,
  },
  forTrainersSection: {
    backgroundColor: Colors.secondary[50],
    paddingVertical: IS_DESKTOP ? 80 : 52,
  },
  plansSection: {
    backgroundColor: Colors.white,
    paddingVertical: IS_DESKTOP ? 80 : 52,
  },
  trustSection: {
    backgroundColor: Colors.neutral[50],
    paddingVertical: IS_DESKTOP ? 80 : 52,
  },
  missionSection: {
    backgroundColor: Colors.white,
    paddingVertical: IS_DESKTOP ? 60 : 40,
  },
  ctaSection: {
    paddingVertical: IS_DESKTOP ? 100 : 64,
    position: 'relative',
  },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 28,
  },
  sectionHeaderCenter: { alignItems: 'center', marginBottom: 36 },
  sectionPill: {
    backgroundColor: Colors.primary[50],
    borderWidth: 1, borderColor: Colors.primary[100],
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    alignSelf: 'flex-start', marginBottom: 12,
  },
  sectionPillText: {
    fontSize: 11, fontWeight: '700', color: Colors.primary[700],
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: IS_DESKTOP ? 36 : 26, fontWeight: '900',
    color: Colors.neutral[900], letterSpacing: -0.6, marginBottom: 10,
  },
  sectionSub: {
    fontSize: 15, color: Colors.neutral[500], lineHeight: 24, marginBottom: 28,
    maxWidth: IS_DESKTOP ? 600 : undefined,
  },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingBottom: 2 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: Colors.primary[600] },
  sectionCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary[700], borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    marginTop: 20,
    alignSelf: IS_DESKTOP ? 'flex-start' : 'stretch',
    paddingHorizontal: IS_DESKTOP ? 28 : 0,
    shadowColor: Colors.primary[700],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12, elevation: 3,
  },
  sectionCtaText: { fontSize: 14, fontWeight: '700', color: Colors.white },

  // ── CATEGORIES ────────────────────────────────────────────────────────────
  catScroll: { gap: 12, paddingBottom: 4 },
  catCard: {
    width: IS_DESKTOP ? 182 : 155,
    height: IS_DESKTOP ? 140 : 120,
    borderRadius: 18, overflow: 'hidden', position: 'relative',
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12, elevation: 3,
  },
  catPhoto: { width: '100%', height: '100%' },
  catLabel: {
    position: 'absolute', bottom: 12, left: 13, right: 8,
    fontSize: 13, fontWeight: '700', color: Colors.white,
  },

  // ── FEATURED TRAINERS ─────────────────────────────────────────────────────
  trainersScroll: { gap: 16, paddingBottom: 4 },
  trainerCardWrap: { width: 320 },
  loadingBox: { height: 220, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: Colors.neutral[400] },
  emptyState: {
    backgroundColor: Colors.white, borderRadius: 20,
    padding: 40, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: Colors.neutral[100],
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: Colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral[800] },
  emptyDesc: {
    fontSize: 14, color: Colors.neutral[500],
    textAlign: 'center', lineHeight: 22, maxWidth: 320,
  },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 10, paddingHorizontal: 18,
    backgroundColor: Colors.primary[50],
    borderRadius: 10, borderWidth: 1, borderColor: Colors.primary[100],
    marginTop: 4,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary[600] },

  // ── FOR TRAINERS ──────────────────────────────────────────────────────────
  forTrainersDesktop: { flexDirection: 'row', gap: 64, alignItems: 'center' },
  forTrainersLeft: { flex: 1 },
  forTrainersRight: {
    flex: 1, borderRadius: 24, overflow: 'hidden',
    height: 540,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 32, elevation: 8,
    position: 'relative',
  },
  trainerSectionPhoto: { width: '100%', height: '100%' },
  benefitsList: { gap: 14, marginBottom: 24, marginTop: 4 },
  benefitRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
  },
  benefitDot: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.secondary[100],
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  benefitTitle: { fontSize: 14, fontWeight: '700', color: Colors.neutral[900] },
  benefitDesc: { fontSize: 13, color: Colors.neutral[500], lineHeight: 18, marginTop: 2 },
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  benefitCard: {
    width: '47%', backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    gap: 8, borderWidth: 1, borderColor: Colors.secondary[100],
    shadowColor: Colors.neutral[900], shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  benefitCardIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.secondary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  ctaGreen: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.secondary[600], borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 24,
    alignSelf: 'flex-start',
    shadowColor: Colors.secondary[700], shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 3,
  },
  ctaGreenText: { fontSize: 14, fontWeight: '700', color: Colors.white },

  // ── PLANS ─────────────────────────────────────────────────────────────────
  plansSectionHead: { alignItems: 'center', marginBottom: 40 },
  plansGrid: {
    flexDirection: IS_DESKTOP ? 'row' : 'column',
    gap: IS_DESKTOP ? 16 : 14,
    alignItems: IS_DESKTOP ? 'stretch' : undefined,
  },
  planCard: {
    flex: IS_DESKTOP ? 1 : undefined,
    backgroundColor: Colors.white,
    borderRadius: 24, padding: 28,
    borderWidth: 2, borderColor: Colors.neutral[100],
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
    gap: 0, position: 'relative',
  },
  planCardHighlight: {
    backgroundColor: Colors.primary[800],
    borderColor: Colors.primary[700],
    shadowColor: Colors.primary[900],
    shadowOpacity: 0.25, shadowRadius: 28, elevation: 10,
  },
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, marginBottom: 14,
  },
  planBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  planName: { fontSize: 22, fontWeight: '800', color: Colors.neutral[900], marginBottom: 4 },
  planDesc: { fontSize: 13, color: Colors.neutral[500], marginBottom: 20 },
  planPriceBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 },
  planPrice: { fontSize: 38, fontWeight: '900', color: Colors.neutral[900], letterSpacing: -1 },
  planPeriod: { fontSize: 14, color: Colors.neutral[400] },
  planDivider: {
    height: 1, backgroundColor: Colors.neutral[100], marginVertical: 20,
  },
  planFeatures: { gap: 11, marginBottom: 24 },
  planFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planFeatureText: { fontSize: 13, color: Colors.neutral[600], flex: 1 },
  planCta: {
    paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', borderWidth: 2,
  },
  planCtaHighlight: {
    backgroundColor: Colors.secondary[600], borderColor: Colors.secondary[600],
    shadowColor: Colors.secondary[700], shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
  },
  planCtaText: { fontSize: 15, fontWeight: '700' },

  // ── TRUST ─────────────────────────────────────────────────────────────────
  trustGrid: {
    flexDirection: IS_DESKTOP ? 'row' : 'column',
    flexWrap: IS_DESKTOP ? 'wrap' : undefined,
    gap: 14,
  },
  trustCard: {
    ...(IS_DESKTOP ? { flex: 1, minWidth: 180 } : {}),
    backgroundColor: Colors.white, borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: Colors.neutral[100],
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    gap: 10,
  },
  trustCardIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  trustCardTitle: { fontSize: 15, fontWeight: '700', color: Colors.neutral[900] },
  trustCardDesc: { fontSize: 13, color: Colors.neutral[500], lineHeight: 20 },

  // ── MISSION ───────────────────────────────────────────────────────────────
  missionCard: {
    borderRadius: 28, padding: IS_DESKTOP ? 52 : 32,
    alignItems: 'center', gap: 16,
    borderWidth: 1, borderColor: Colors.primary[100],
    overflow: 'hidden', position: 'relative',
  },
  missionIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: Colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  missionTitle: {
    fontSize: IS_DESKTOP ? 32 : 24, fontWeight: '900',
    color: Colors.neutral[900], letterSpacing: -0.5,
  },
  missionText: {
    fontSize: 16, color: Colors.neutral[600], lineHeight: 28,
    textAlign: 'center', maxWidth: IS_DESKTOP ? 640 : undefined,
  },
  missionLine: {
    width: 48, height: 3, backgroundColor: Colors.primary[200], borderRadius: 2,
  },
  missionSub: {
    fontSize: 14, color: Colors.neutral[500], lineHeight: 22,
    textAlign: 'center', maxWidth: IS_DESKTOP ? 520 : undefined,
  },

  // ── CTA FINAL ─────────────────────────────────────────────────────────────
  ctaTitle: {
    fontSize: IS_DESKTOP ? 48 : 30, fontWeight: '900',
    color: Colors.white, textAlign: 'center',
    letterSpacing: -1, marginBottom: 12,
    maxWidth: 640, alignSelf: 'center',
  },
  ctaSub: {
    fontSize: 15, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', marginBottom: 36,
  },
  ctaBtns: {
    flexDirection: IS_DESKTOP ? 'row' : 'column',
    gap: 14, maxWidth: 500, alignSelf: 'center', width: '100%',
  },
  ctaBtnPrimary: {
    flex: IS_DESKTOP ? 1 : undefined,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: 14, paddingVertical: 17,
    shadowColor: Colors.white, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  ctaBtnPrimaryText: { fontSize: 15, fontWeight: '800', color: Colors.primary[900] },
  ctaBtnOutline: {
    flex: IS_DESKTOP ? 1 : undefined,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 17,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
  },
  ctaBtnOutlineText: { fontSize: 15, fontWeight: '700', color: Colors.white },

  // ── FOOTER ────────────────────────────────────────────────────────────────
  footer: {
    backgroundColor: Colors.neutral[900],
    paddingTop: IS_DESKTOP ? 64 : 48,
    paddingBottom: 32,
  },
  footerDesktop: { flexDirection: IS_DESKTOP ? 'column' : undefined },
  footerBrand: { marginBottom: 8 },
  footerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerLogoBadge: { width: 44, height: 44 },
  footerLogoBadgeNum: { fontSize: 18, fontWeight: '900', color: Colors.white, letterSpacing: 0 },
  footerLogoName: { fontSize: 22, fontWeight: '900', color: Colors.white, letterSpacing: -0.5 },
  footerLogoImg: { width: 200, height: 60 },
  footerLogo: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: Colors.neutral[700],
    alignItems: 'center', justifyContent: 'center',
  },
  footerLogoText: { fontSize: 16, fontWeight: '700', color: Colors.neutral[200] },
  footerTagline: { fontSize: 13, color: Colors.neutral[600], marginBottom: 36, lineHeight: 20 },
  footerLinks: { gap: 28, marginBottom: 40 },
  footerLinksDesktop: {
    flexDirection: 'row', gap: 40,
  },
  footerCol: { gap: 11, flex: IS_DESKTOP ? 1 : undefined },
  footerColHead: {
    fontSize: 11, fontWeight: '700', color: Colors.neutral[500],
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2,
  },
  footerLink: { fontSize: 14, color: Colors.neutral[500] },
  footerBottom: {
    borderTopWidth: 1, borderTopColor: Colors.neutral[800], paddingTop: 20,
  },
  footerCopy: {
    fontSize: 12, color: Colors.neutral[700], textAlign: 'center',
  },
});
