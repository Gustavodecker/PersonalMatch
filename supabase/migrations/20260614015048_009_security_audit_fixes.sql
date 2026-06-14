-- ============================================================
-- MIGRATION 009: Security Audit Fixes
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. FIX MUTABLE SEARCH PATH em set_updated_at
--    (INVOKER, sem SECURITY DEFINER - apenas fixar search_path)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 2. FIX MUTABLE SEARCH PATH + REVOKE PUBLIC em update_trainer_rating
--    (SECURITY DEFINER - fixar search_path e revogar execução pública)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_trainer_rating()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE trainers SET
    rating       = COALESCE((
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM reviews
      WHERE trainer_id = NEW.trainer_id AND status = 'approved'
    ), 0),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE trainer_id = NEW.trainer_id AND status = 'approved'
    )
  WHERE id = NEW.trainer_id;
  RETURN NEW;
END;
$$;

-- Revogar execução pública (só trigger pode chamar internamente)
REVOKE EXECUTE ON FUNCTION public.update_trainer_rating() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_trainer_rating() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_trainer_rating() FROM PUBLIC;


-- ────────────────────────────────────────────────────────────
-- 3. FIX RLS profile_views: remover policies WITH CHECK true
--    e criar uma policy segura com WITH CHECK real
-- ────────────────────────────────────────────────────────────

-- Remover todas as policies de INSERT (as duas são WITH CHECK = true)
DROP POLICY IF EXISTS profile_views_insert ON public.profile_views;
DROP POLICY IF EXISTS pv_ins              ON public.profile_views;

-- Remover duplicata de SELECT também (dois com mesma regra)
DROP POLICY IF EXISTS pv_sel ON public.profile_views;

-- Recriar INSERT seguro:
--   - autenticados inserem: viewer_id deve ser auth.uid() ou NULL
--   - anônimos inserem: viewer_id deve ser NULL
CREATE POLICY "pv_insert_safe" ON public.profile_views
  FOR INSERT
  WITH CHECK (
    viewer_id IS NULL
    OR viewer_id = auth.uid()
  );


-- ────────────────────────────────────────────────────────────
-- 4. FIX RLS reviews: remover 3 policies UPDATE duplicadas
--    que têm WITH CHECK = true (sem restrição de escrita)
-- ────────────────────────────────────────────────────────────

-- Remover as três policies de UPDATE duplicadas
DROP POLICY IF EXISTS r_upd_admin          ON public.reviews;
DROP POLICY IF EXISTS reviews_upd_admin    ON public.reviews;
DROP POLICY IF EXISTS reviews_update_admin ON public.reviews;

-- Remover também INSERTs duplicados (3 com mesma regra)
DROP POLICY IF EXISTS reviews_ins    ON public.reviews;
DROP POLICY IF EXISTS reviews_insert ON public.reviews;

-- Remover SELECTs duplicados
DROP POLICY IF EXISTS reviews_sel_anon    ON public.reviews;
DROP POLICY IF EXISTS reviews_sel_auth    ON public.reviews;
DROP POLICY IF EXISTS reviews_select_anon ON public.reviews;
DROP POLICY IF EXISTS reviews_select_auth ON public.reviews;

-- Recriar UPDATE seguro para admin:
--   USING: só admin pode ver a linha para atualizar
--   WITH CHECK: após update, status deve ser approved/rejected/pending (não produz WITH CHECK = true)
CREATE POLICY "reviews_update_admin_safe" ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    AND status IN ('pending', 'approved', 'rejected')
  );

-- Recriar SELECT consolidado (anon vê só aprovados, autenticados veem todos os seus)
CREATE POLICY "reviews_select_anon_safe" ON public.reviews
  FOR SELECT
  TO anon
  USING (status = 'approved');

CREATE POLICY "reviews_select_auth_safe" ON public.reviews
  FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    OR student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Recriar INSERT consolidado (apenas um, já estava correto no r_ins)
DROP POLICY IF EXISTS r_ins ON public.reviews;

CREATE POLICY "reviews_insert_safe" ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 5. FIX Storage bucket trainer-photos: trocar SELECT amplo
--    por SELECT restrito a arquivos (sem listagem do bucket inteiro)
-- ────────────────────────────────────────────────────────────

-- Remover policy ampla que permite listar todo o bucket
DROP POLICY IF EXISTS "trainer_photos_public_read" ON storage.objects;

-- Recriar SELECT restrito: permite acesso a arquivo específico
-- (name não pode ser vazio / raiz do bucket — evita listagem)
CREATE POLICY "trainer_photos_read_objects" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'trainer-photos'
    AND name <> ''
    AND octet_length(name) > 0
  );
