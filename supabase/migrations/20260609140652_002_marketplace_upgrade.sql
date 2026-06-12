-- ─────────────── STORAGE BUCKET ───────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('trainer-photos', 'trainer-photos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "trainer_photos_public_read" ON storage.objects;
CREATE POLICY "trainer_photos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'trainer-photos');
DROP POLICY IF EXISTS "trainer_photos_auth_insert" ON storage.objects;
CREATE POLICY "trainer_photos_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trainer-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "trainer_photos_auth_delete" ON storage.objects;
CREATE POLICY "trainer_photos_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'trainer-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─────────────── NEW COLUMNS ON trainers ───────────────
ALTER TABLE trainers
  ADD COLUMN IF NOT EXISTS neighborhood      TEXT,
  ADD COLUMN IF NOT EXISTS location_type     TEXT DEFAULT 'gym',
  ADD COLUMN IF NOT EXISTS accepts_home      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepts_gym       BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS target_audience   TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS objectives        TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS monthly_rate      DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS is_featured       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_verified       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cover_photo_url   TEXT;

-- ─────────────── trainer_photos ───────────────
CREATE TABLE IF NOT EXISTS trainer_photos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  UUID        NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  url         TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'gallery',
  sort_order  INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trainer_photos_trainer ON trainer_photos(trainer_id);
ALTER TABLE trainer_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tp_sel_all"   ON trainer_photos;
CREATE POLICY "tp_sel_all"   ON trainer_photos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "tp_ins_own"   ON trainer_photos;
CREATE POLICY "tp_ins_own"   ON trainer_photos FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid());
DROP POLICY IF EXISTS "tp_del_own"   ON trainer_photos;
CREATE POLICY "tp_del_own"   ON trainer_photos FOR DELETE TO authenticated USING (trainer_id = auth.uid());

-- ─────────────── trainer_availability ───────────────
CREATE TABLE IF NOT EXISTS trainer_availability (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id       UUID        NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  day_of_week      INTEGER     NOT NULL,
  start_time       TIME        NOT NULL,
  end_time         TIME        NOT NULL,
  session_duration INTEGER     DEFAULT 60,
  modality         TEXT        DEFAULT 'in_person',
  notes            TEXT,
  is_active        BOOLEAN     DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_avail_trainer ON trainer_availability(trainer_id);
ALTER TABLE trainer_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "av_sel_all"   ON trainer_availability;
CREATE POLICY "av_sel_all"   ON trainer_availability FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "av_ins_own"   ON trainer_availability;
CREATE POLICY "av_ins_own"   ON trainer_availability FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid());
DROP POLICY IF EXISTS "av_upd_own"   ON trainer_availability;
CREATE POLICY "av_upd_own"   ON trainer_availability FOR UPDATE TO authenticated USING (trainer_id = auth.uid());
DROP POLICY IF EXISTS "av_del_own"   ON trainer_availability;
CREATE POLICY "av_del_own"   ON trainer_availability FOR DELETE TO authenticated USING (trainer_id = auth.uid());

-- ─────────────── appointments ───────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  availability_id  UUID        REFERENCES trainer_availability(id) ON DELETE SET NULL,
  appointment_date DATE        NOT NULL,
  start_time       TIME        NOT NULL,
  end_time         TIME        NOT NULL,
  modality         TEXT        NOT NULL DEFAULT 'in_person',
  status           TEXT        NOT NULL DEFAULT 'requested',
  objective        TEXT,
  message          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appt_trainer ON appointments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_appt_student ON appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appt_status  ON appointments(status);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appt_sel" ON appointments;
CREATE POLICY "appt_sel" ON appointments FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR trainer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "appt_ins" ON appointments;
CREATE POLICY "appt_ins" ON appointments FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "appt_upd" ON appointments;
CREATE POLICY "appt_upd" ON appointments FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR trainer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS tg_upd_appointments ON appointments;
CREATE TRIGGER tg_upd_appointments BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────── favorites ───────────────
CREATE TABLE IF NOT EXISTS favorites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id  UUID        NOT NULL REFERENCES trainers(id)  ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, trainer_id)
);
CREATE INDEX IF NOT EXISTS idx_fav_student ON favorites(student_id);
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fav_sel" ON favorites;
CREATE POLICY "fav_sel" ON favorites FOR SELECT TO authenticated USING (student_id = auth.uid());
DROP POLICY IF EXISTS "fav_ins" ON favorites;
CREATE POLICY "fav_ins" ON favorites FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "fav_del" ON favorites;
CREATE POLICY "fav_del" ON favorites FOR DELETE TO authenticated USING (student_id = auth.uid());
