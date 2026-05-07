
CREATE TYPE public.sale_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.sales_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal_id UUID,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status public.sale_status NOT NULL DEFAULT 'pending',
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_entries_user ON public.sales_entries(user_id);
CREATE INDEX idx_sales_entries_status ON public.sales_entries(status);
CREATE INDEX idx_sales_entries_date ON public.sales_entries(sale_date);

CREATE TRIGGER trg_sales_entries_updated_at
BEFORE UPDATE ON public.sales_entries
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.sales_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sales"
ON public.sales_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own pending sales"
ON public.sales_entries FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users update own pending sales"
ON public.sales_entries FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users delete own pending sales"
ON public.sales_entries FOR DELETE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Supervisors view team sales"
ON public.sales_entries FOR SELECT
USING (
  public.has_role(auth.uid(), 'supervisor')
  AND public.is_team_supervisor(auth.uid(), public.get_user_team(user_id))
);

CREATE POLICY "Supervisors verify team sales"
ON public.sales_entries FOR UPDATE
USING (
  public.has_role(auth.uid(), 'supervisor')
  AND public.is_team_supervisor(auth.uid(), public.get_user_team(user_id))
)
WITH CHECK (
  public.has_role(auth.uid(), 'supervisor')
  AND public.is_team_supervisor(auth.uid(), public.get_user_team(user_id))
);

CREATE POLICY "Admins all sales"
ON public.sales_entries FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Função: ao aprovar uma venda, soma o valor ao current_value da meta individual da consultora (mês/ano da venda)
CREATE OR REPLACE FUNCTION public.apply_sale_to_goal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _goal_id UUID;
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    _goal_id := NEW.goal_id;
    IF _goal_id IS NULL THEN
      SELECT id INTO _goal_id FROM public.goals
      WHERE scope = 'individual'
        AND user_id = NEW.user_id
        AND reference_month = EXTRACT(MONTH FROM NEW.sale_date)::int
        AND reference_year  = EXTRACT(YEAR  FROM NEW.sale_date)::int
      ORDER BY created_at DESC LIMIT 1;
    END IF;
    IF _goal_id IS NOT NULL THEN
      UPDATE public.goals SET current_value = COALESCE(current_value, 0) + NEW.amount WHERE id = _goal_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status <> 'approved' THEN
    -- reverter
    _goal_id := OLD.goal_id;
    IF _goal_id IS NULL THEN
      SELECT id INTO _goal_id FROM public.goals
      WHERE scope = 'individual'
        AND user_id = OLD.user_id
        AND reference_month = EXTRACT(MONTH FROM OLD.sale_date)::int
        AND reference_year  = EXTRACT(YEAR  FROM OLD.sale_date)::int
      ORDER BY created_at DESC LIMIT 1;
    END IF;
    IF _goal_id IS NOT NULL THEN
      UPDATE public.goals SET current_value = GREATEST(0, COALESCE(current_value, 0) - OLD.amount) WHERE id = _goal_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_sale_to_goal
AFTER INSERT OR UPDATE ON public.sales_entries
FOR EACH ROW EXECUTE FUNCTION public.apply_sale_to_goal();
