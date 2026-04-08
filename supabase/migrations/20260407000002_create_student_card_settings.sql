-- Store student card design settings per school
CREATE TABLE IF NOT EXISTS public.student_card_settings (
  id BIGSERIAL PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (school_id)
);

CREATE INDEX IF NOT EXISTS idx_student_card_settings_school_id
  ON public.student_card_settings(school_id);

CREATE INDEX IF NOT EXISTS idx_student_card_settings_settings
  ON public.student_card_settings USING GIN (settings);

CREATE OR REPLACE FUNCTION public.update_student_card_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_student_card_settings_updated_at
  ON public.student_card_settings;

CREATE TRIGGER trigger_update_student_card_settings_updated_at
  BEFORE UPDATE ON public.student_card_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_card_settings_updated_at();

ALTER TABLE public.student_card_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public all student_card_settings" ON public.student_card_settings;
CREATE POLICY "Public all student_card_settings"
  ON public.student_card_settings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.student_card_settings TO authenticated;
GRANT USAGE ON SEQUENCE public.student_card_settings_id_seq TO authenticated;

COMMENT ON TABLE public.student_card_settings IS 'Stores saved student card appearance settings per school.';
COMMENT ON COLUMN public.student_card_settings.settings IS 'JSONB object containing student card color customization settings.';
