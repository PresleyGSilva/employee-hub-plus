
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_goals_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS goals_touch_updated ON public.goals;
CREATE TRIGGER goals_touch_updated BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.touch_goals_updated_at();
