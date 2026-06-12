/*
# PersonalMatch — Schema completo v2

## Tabelas
- profiles      → extensão de auth.users (role: student | trainer | admin)
- specialties   → catálogo de especialidades fitness (seed incluído)
- trainers      → dados profissionais: CREF, valor/hora, status pending→active
- trainer_specialties → junção N:N trainer ↔ specialty
- students      → objetivos, nível, modalidade preferida
- leads         → solicitações de contato aluno→personal
- reviews       → avaliações com moderação (pending→approved|rejected)
- profile_views → analytics de visitas ao perfil

## Chaves estrangeiras
- trainers.id → profiles.id (CASCADE)
- trainer_specialties.trainer_id → trainers.id (CASCADE)
- trainer_specialties.specialty_id → specialties.id (CASCADE)
- students.id → profiles.id (CASCADE)
- leads.student_id / trainer_id → profiles.id (CASCADE)
- reviews.student_id → profiles.id (CASCADE)
- reviews.trainer_id → trainers.id (CASCADE)
- profile_views.trainer_id → trainers.id (CASCADE)
- profile_views.viewer_id → profiles.id (SET NULL)

## Índices
status, rating, cidade, role, trainer_id/student_id em leads e reviews

## RLS
Habilitado em todas as tabelas. Políticas separadas por verbo.
Personais 'pending' não aparecem na busca pública.
Avaliações 'pending' ficam invisíveis ao público.
Admin pode aprovar tudo.

## Triggers
- set_updated_at    → mantém updated_at automático em 5 tabelas
- update_trainer_rating → recalcula rating ao aprovar review
*/

-- ───────────────────────────── TABELAS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  phone        TEXT,
  avatar_url   TEXT,
  role         TEXT        NOT NULL CHECK (role IN ('student','trainer','admin')),
  bio          TEXT,
  city         TEXT,
  state        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS specialties (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL UNIQUE,
  icon       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trainers (
  id                UUID         PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  cref              TEXT,
  experience_years  INTEGER      DEFAULT 0,
  hourly_rate       DECIMAL(10,2),
  whatsapp          TEXT,
  instagram         TEXT,
  latitude          DECIMAL(9,6),
  longitude         DECIMAL(9,6),
  accepts_online    BOOLEAN      DEFAULT false,
  accepts_in_person BOOLEAN      DEFAULT true,
  status            TEXT         NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','active','inactive','rejected')),
  rating            DECIMAL(3,2) DEFAULT 0,
  review_count      INTEGER      DEFAULT 0,
  approved_at       TIMESTAMPTZ,
  approved_by       UUID         REFERENCES profiles(id),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trainer_specialties (
  trainer_id   UUID NOT NULL REFERENCES trainers(id)    ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
  PRIMARY KEY (trainer_id, specialty_id)
);

CREATE TABLE IF NOT EXISTS students (
  id                 UUID        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  goals              TEXT[],
  fitness_level      TEXT        CHECK (fitness_level IN ('beginner','intermediate','advanced')),
  preferred_modality TEXT        CHECK (preferred_modality IN ('online','in_person','both')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message    TEXT,
  status     TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','contacted','converted','lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  trainer_id UUID        NOT NULL REFERENCES trainers(id)  ON DELETE CASCADE,
  rating     INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  status     TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID        NOT NULL REFERENCES trainers(id)  ON DELETE CASCADE,
  viewer_id  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────── SEED ───────────────────────────────────────────

INSERT INTO specialties (name, icon) VALUES
  ('Musculação',    'dumbbell'),
  ('CrossFit',      'zap'),
  ('Yoga',          'heart'),
  ('Pilates',       'activity'),
  ('Funcional',     'target'),
  ('Boxe',          'shield'),
  ('Natação',       'waves'),
  ('Corrida',       'wind'),
  ('Dança',         'music'),
  ('Reabilitação',  'stethoscope'),
  ('Emagrecimento', 'trending-down'),
  ('Hipertrofia',   'trending-up')
ON CONFLICT (name) DO NOTHING;

-- ───────────────────────────── ÍNDICES ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_trainers_status       ON trainers(status);
CREATE INDEX IF NOT EXISTS idx_trainers_rating       ON trainers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_leads_trainer         ON leads(trainer_id);
CREATE INDEX IF NOT EXISTS idx_leads_student         ON leads(student_id);
CREATE INDEX IF NOT EXISTS idx_leads_status          ON leads(status);
CREATE INDEX IF NOT EXISTS idx_reviews_trainer       ON reviews(trainer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status        ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_pviews_trainer        ON profile_views(trainer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_city         ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_role         ON profiles(role);

-- ───────────────────────────── RLS ────────────────────────────────────────────

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialties       ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views     ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "p_sel_auth"  ON profiles;
CREATE POLICY "p_sel_auth" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "p_sel_anon"  ON profiles;
CREATE POLICY "p_sel_anon" ON profiles FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM trainers t WHERE t.id = profiles.id AND t.status = 'active'));

DROP POLICY IF EXISTS "p_ins"       ON profiles;
CREATE POLICY "p_ins" ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "p_upd"       ON profiles;
CREATE POLICY "p_upd" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- specialties (public read-only)
DROP POLICY IF EXISTS "sp_sel"      ON specialties;
CREATE POLICY "sp_sel" ON specialties FOR SELECT TO anon, authenticated USING (true);

-- trainers
DROP POLICY IF EXISTS "t_sel_anon"  ON trainers;
CREATE POLICY "t_sel_anon" ON trainers FOR SELECT TO anon
  USING (status = 'active');

DROP POLICY IF EXISTS "t_sel_auth"  ON trainers;
CREATE POLICY "t_sel_auth" ON trainers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "t_ins"       ON trainers;
CREATE POLICY "t_ins" ON trainers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "t_upd"       ON trainers;
CREATE POLICY "t_upd" ON trainers FOR UPDATE TO authenticated
  USING  (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- trainer_specialties
DROP POLICY IF EXISTS "ts_sel"      ON trainer_specialties;
CREATE POLICY "ts_sel" ON trainer_specialties FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ts_ins"      ON trainer_specialties;
CREATE POLICY "ts_ins" ON trainer_specialties FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM trainers WHERE id = trainer_id AND id = auth.uid()));

DROP POLICY IF EXISTS "ts_del"      ON trainer_specialties;
CREATE POLICY "ts_del" ON trainer_specialties FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM trainers WHERE id = trainer_id AND id = auth.uid()));

-- students
DROP POLICY IF EXISTS "st_sel"      ON students;
CREATE POLICY "st_sel" ON students FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "st_ins"      ON students;
CREATE POLICY "st_ins" ON students FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "st_upd"      ON students;
CREATE POLICY "st_upd" ON students FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- leads
DROP POLICY IF EXISTS "l_sel"       ON leads;
CREATE POLICY "l_sel" ON leads FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR trainer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "l_ins"       ON leads;
CREATE POLICY "l_ins" ON leads FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "l_upd"       ON leads;
CREATE POLICY "l_upd" ON leads FOR UPDATE TO authenticated
  USING (
    trainer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- reviews
DROP POLICY IF EXISTS "r_sel_anon"  ON reviews;
CREATE POLICY "r_sel_anon" ON reviews FOR SELECT TO anon
  USING (status = 'approved');

DROP POLICY IF EXISTS "r_sel_auth"  ON reviews;
CREATE POLICY "r_sel_auth" ON reviews FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "r_ins"       ON reviews;
CREATE POLICY "r_ins" ON reviews FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "r_upd_admin" ON reviews;
CREATE POLICY "r_upd_admin" ON reviews FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (true);

-- profile_views
DROP POLICY IF EXISTS "pv_sel"      ON profile_views;
CREATE POLICY "pv_sel" ON profile_views FOR SELECT TO authenticated
  USING (
    trainer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "pv_ins"      ON profile_views;
CREATE POLICY "pv_ins" ON profile_views FOR INSERT TO authenticated WITH CHECK (true);

-- ───────────────────────────── TRIGGERS ───────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS tg_upd_profiles  ON profiles;
CREATE TRIGGER tg_upd_profiles  BEFORE UPDATE ON profiles  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS tg_upd_trainers  ON trainers;
CREATE TRIGGER tg_upd_trainers  BEFORE UPDATE ON trainers  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS tg_upd_students  ON students;
CREATE TRIGGER tg_upd_students  BEFORE UPDATE ON students  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS tg_upd_leads     ON leads;
CREATE TRIGGER tg_upd_leads     BEFORE UPDATE ON leads     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS tg_upd_reviews   ON reviews;
CREATE TRIGGER tg_upd_reviews   BEFORE UPDATE ON reviews   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION update_trainer_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE trainers SET
    rating       = COALESCE((
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM reviews WHERE trainer_id = NEW.trainer_id AND status = 'approved'
    ), 0),
    review_count = (
      SELECT COUNT(*) FROM reviews WHERE trainer_id = NEW.trainer_id AND status = 'approved'
    )
  WHERE id = NEW.trainer_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_trainer_rating ON reviews;
CREATE TRIGGER tg_trainer_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION update_trainer_rating();
