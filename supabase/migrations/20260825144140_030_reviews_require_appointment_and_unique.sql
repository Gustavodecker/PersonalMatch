/*
# Reviews require a real booking and are one per trainer per student

1. Problem
   - `reviews_insert_safe` only checked `student_id = auth.uid()`. Nothing required an
     actual appointment with the trainer, and nothing stopped the same account posting
     unlimited reviews for the same trainer. The one-per-trainer rule existed only in
     the browser. A single account could bury a competitor under fabricated ratings.

2. Changes
   - Unique index on (student_id, trainer_id): one review per student per trainer.
   - The INSERT policy now also requires an appointment between that student and that
     trainer to exist.

3. Notes
   - The review button in the app only appears after an appointment, so the legitimate
     flow is unchanged; the rule is now enforced by the database as well.
*/

CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_student_trainer
  ON public.reviews (student_id, trainer_id);

DROP POLICY IF EXISTS "reviews_insert_safe" ON public.reviews;
CREATE POLICY "reviews_insert_safe" ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.appointments a
       WHERE a.student_id = auth.uid()
         AND a.trainer_id = reviews.trainer_id
    )
  );
