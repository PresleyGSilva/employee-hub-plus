
CREATE TYPE public.vacation_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.vacations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  acquisition_start DATE NOT NULL,
  acquisition_end DATE NOT NULL,
  vacation_start DATE NOT NULL,
  vacation_end DATE NOT NULL,
  vacation_days INTEGER NOT NULL DEFAULT 30,
  sold_days INTEGER NOT NULL DEFAULT 0,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  vacation_pay NUMERIC NOT NULL DEFAULT 0,
  one_third_bonus NUMERIC NOT NULL DEFAULT 0,
  sold_days_pay NUMERIC NOT NULL DEFAULT 0,
  total_gross NUMERIC NOT NULL DEFAULT 0,
  inss_deduction NUMERIC NOT NULL DEFAULT 0,
  irrf_deduction NUMERIC NOT NULL DEFAULT 0,
  total_net NUMERIC NOT NULL DEFAULT 0,
  status public.vacation_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vacations" ON public.vacations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own vacations" ON public.vacations
  FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER touch_vacations_updated_at
  BEFORE UPDATE ON public.vacations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_vacations_user ON public.vacations(user_id);
CREATE INDEX idx_vacations_dates ON public.vacations(vacation_start, vacation_end);
