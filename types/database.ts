export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: 'student' | 'trainer' | 'admin';
  bio: string | null;
  city: string | null;
  state: string | null;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
};

export type Trainer = {
  id: string;
  cref: string | null;
  experience_years: number;
  hourly_rate: number | null;
  monthly_rate: number | null;
  in_person_hourly_rate: number | null;
  online_hourly_rate: number | null;
  home_hourly_rate: number | null;
  gym_hourly_rate: number | null;
  whatsapp: string | null;
  instagram: string | null;
  latitude: number | null;
  longitude: number | null;
  neighborhood: string | null;
  normalized_city: string | null;
  normalized_neighborhood: string | null;
  service_region: string | null;
  service_radius_km: number | null;
  location_type: 'gym' | 'home' | 'both' | 'online' | null;
  accepts_online: boolean;
  accepts_in_person: boolean;
  accepts_home: boolean;
  accepts_gym: boolean;
  target_audience: string[];
  objectives: string[];
  status: 'pending' | 'active' | 'inactive' | 'rejected' | 'blocked';
  subscription_plan: 'free_trial' | 'free' | 'pro' | 'premium';
  subscription_status: 'trialing' | 'active' | 'expired' | 'blocked' | 'canceled';
  trial_started_at: string | null;
  trial_ends_at: string | null;
  rating: number;
  review_count: number;
  is_featured: boolean;
  is_verified: boolean;
  cover_photo_url: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  specialties?: Specialty[];
  photos?: TrainerPhoto[];
};

export type TrainerWithProfile = Omit<Trainer, 'profile' | 'specialties' | 'photos'> & {
  profile: Profile;
  specialties?: Specialty[];
  photos?: TrainerPhoto[];
};

export type TrainerPhoto = {
  id: string;
  trainer_id: string;
  url: string;
  type: 'profile' | 'cover' | 'gallery';
  sort_order: number;
  created_at: string;
};

export type TrainerClassType = {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
};

export type TrainerAvailability = {
  id: string;
  trainer_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_duration: number;
  buffer_minutes: number;
  modality: 'online' | 'in_person' | 'both';
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

export type TrainerScheduleBlock = {
  id: string;
  trainer_id: string;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  is_full_day: boolean;
  reason: string | null;
  created_at: string;
};

export type Appointment = {
  id: string;
  student_id: string | null;
  trainer_id: string;
  availability_id: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  modality: 'online' | 'in_person';
  status: 'requested' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  objective: string | null;
  message: string | null;
  student_name: string | null;
  student_phone: string | null;
  student_goal: string | null;
  class_type_id: string | null;
  class_type_name: string | null;
  created_at: string;
  updated_at: string;
  student?: Profile;
  trainer?: Profile;
};

export type Favorite = {
  id: string;
  student_id: string;
  trainer_id: string;
  created_at: string;
  trainer?: TrainerWithProfile;
};

export type Student = {
  id: string;
  goals: string[] | null;
  fitness_level: 'beginner' | 'intermediate' | 'advanced' | null;
  preferred_modality: 'online' | 'in_person' | 'both' | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
};

export type Specialty = {
  id: string;
  name: string;
  icon: string | null;
  created_at: string;
};

export type Lead = {
  id: string;
  student_id: string;
  trainer_id: string;
  message: string | null;
  status: 'pending' | 'contacted' | 'converted' | 'lost';
  created_at: string;
  updated_at: string;
  student?: Profile;
  trainer?: Profile;
};

export type Review = {
  id: string;
  student_id: string;
  trainer_id: string;
  rating: number;
  comment: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  student?: Profile;
};

export type ProfileView = {
  id: string;
  trainer_id: string;
  viewer_id: string | null;
  viewed_at: string;
};

export const TARGET_AUDIENCE_OPTIONS = [
  'Iniciante', 'Intermediário', 'Avançado',
  'Idosos', 'Gestantes', 'Pós-parto', 'Obesidade', 'Atletas',
] as const;

export const OBJECTIVES_OPTIONS = [
  'Emagrecimento', 'Hipertrofia', 'Condicionamento físico',
  'Mobilidade', 'Corrida', 'Reabilitação', 'Saúde geral',
] as const;

export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export type Voucher = {
  id: string;
  code: string;
  description: string | null;
  type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  expiry_date: string | null;
  max_uses: number | null;
  max_uses_per_user: number;
  use_count: number;
  is_active: boolean;
  applicable_for: 'trainer' | 'student' | 'both';
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VoucherRedemption = {
  id: string;
  voucher_id: string;
  user_id: string;
  redeemed_at: string;
  user?: Profile;
};

export type AppSettings = {
  id: number;
  marketplace_name: string;
  primary_color: string;
  support_whatsapp: string | null;
  support_email: string | null;
  institutional_text: string | null;
  terms_text: string | null;
  privacy_text: string | null;
  updated_at: string;
};
