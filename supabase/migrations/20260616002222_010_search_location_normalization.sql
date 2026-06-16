
-- Add normalized location fields and service area fields to trainers
ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS service_region TEXT,
  ADD COLUMN IF NOT EXISTS service_radius_km INTEGER,
  ADD COLUMN IF NOT EXISTS normalized_city TEXT,
  ADD COLUMN IF NOT EXISTS normalized_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS accepts_gym BOOLEAN NOT NULL DEFAULT FALSE;

-- Text normalization function: lowercase, trim, remove accents, collapse spaces
CREATE OR REPLACE FUNCTION public.normalize_text(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE STRICT
AS $$
  SELECT lower(trim(regexp_replace(
    translate(input,
      'ÀÁÂÃÄàáâãäÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÝýÇçÑñ',
      'AAAAAaaaaaNEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuYyCcNn'
    ),
    '\s+', ' ', 'g'
  )));
$$;

-- Trigger: auto-normalize trainer.neighborhood on insert/update
CREATE OR REPLACE FUNCTION public.auto_normalize_trainer()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.normalized_neighborhood = CASE
    WHEN NEW.neighborhood IS NOT NULL THEN public.normalize_text(NEW.neighborhood)
    ELSE NULL
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_trainer ON public.trainers;
CREATE TRIGGER trg_normalize_trainer
  BEFORE INSERT OR UPDATE ON public.trainers
  FOR EACH ROW EXECUTE FUNCTION public.auto_normalize_trainer();

-- Trigger: sync normalized_city from profiles.city to trainers
CREATE OR REPLACE FUNCTION public.sync_trainer_normalized_city()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.city IS DISTINCT FROM OLD.city OR TG_OP = 'INSERT' THEN
    UPDATE public.trainers
    SET normalized_city = CASE
      WHEN NEW.city IS NOT NULL THEN public.normalize_text(NEW.city)
      ELSE NULL
    END
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_trainer_city ON public.profiles;
CREATE TRIGGER trg_sync_trainer_city
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_trainer_normalized_city();

-- Backfill normalized fields for existing records
UPDATE public.trainers t
SET
  normalized_city = CASE WHEN p.city IS NOT NULL THEN public.normalize_text(p.city) ELSE NULL END,
  normalized_neighborhood = CASE WHEN t.neighborhood IS NOT NULL THEN public.normalize_text(t.neighborhood) ELSE NULL END
FROM public.profiles p
WHERE t.id = p.id;
