
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS supervisor_approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supervisor_approved_by UUID,
  ADD COLUMN IF NOT EXISTS supervisor_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS supervisor_notes TEXT;

-- Supervisors can view team members' time entries
DROP POLICY IF EXISTS "Supervisors view team time" ON public.time_entries;
CREATE POLICY "Supervisors view team time" ON public.time_entries
  FOR SELECT USING (
    has_role(auth.uid(), 'supervisor'::app_role)
    AND is_team_supervisor(auth.uid(), get_user_team(user_id))
  );

-- Supervisors can update (approve) team members' time entries
DROP POLICY IF EXISTS "Supervisors approve team time" ON public.time_entries;
CREATE POLICY "Supervisors approve team time" ON public.time_entries
  FOR UPDATE USING (
    has_role(auth.uid(), 'supervisor'::app_role)
    AND is_team_supervisor(auth.uid(), get_user_team(user_id))
  ) WITH CHECK (
    has_role(auth.uid(), 'supervisor'::app_role)
    AND is_team_supervisor(auth.uid(), get_user_team(user_id))
  );

-- Notify admins when a supervisor approves a time entry
CREATE OR REPLACE FUNCTION public.notify_admins_time_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  emp_name text;
  sup_name text;
  notif_title text;
  notif_msg text;
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.supervisor_approved = true AND COALESCE(OLD.supervisor_approved, false) = false) THEN
    SELECT full_name INTO emp_name FROM public.profiles WHERE id = NEW.user_id;
    SELECT full_name INTO sup_name FROM public.profiles WHERE id = NEW.supervisor_approved_by;
    notif_title := '✅ Ponto aprovado pela supervisora';
    notif_msg := COALESCE(sup_name, 'Supervisora') || ' aprovou o ponto de ' ||
                 COALESCE(emp_name, 'funcionária') || ' do dia ' || to_char(NEW.entry_date, 'DD/MM/YYYY') || '.';
    FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, message, is_broadcast)
      VALUES (admin_id, notif_title, notif_msg, false);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_time_approved ON public.time_entries;
CREATE TRIGGER trg_notify_admins_time_approved
  AFTER UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_time_approved();
