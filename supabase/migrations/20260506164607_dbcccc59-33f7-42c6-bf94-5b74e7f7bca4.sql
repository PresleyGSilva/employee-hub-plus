-- Teams
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  supervisor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authed view teams" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage teams" ON public.teams FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER teams_touch BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Profile team
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- Goal scope
DO $$ BEGIN
  CREATE TYPE public.goal_scope AS ENUM ('individual','team','company');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS scope public.goal_scope NOT NULL DEFAULT 'individual';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;

-- Helper: is the user supervisor of a team
CREATE OR REPLACE FUNCTION public.is_team_supervisor(_user uuid, _team uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.teams WHERE id = _team AND supervisor_id = _user);
$$;

-- Helper: get team_id of a user
CREATE OR REPLACE FUNCTION public.get_user_team(_user uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM public.profiles WHERE id = _user;
$$;

-- Update goals RLS: supervisor can manage their team's goals
DROP POLICY IF EXISTS "Supervisors manage team goals" ON public.goals;
CREATE POLICY "Supervisors manage team goals" ON public.goals FOR ALL TO authenticated
USING (
  has_role(auth.uid(),'supervisor') AND (
    (scope = 'team' AND public.is_team_supervisor(auth.uid(), team_id))
    OR (scope = 'individual' AND user_id IS NOT NULL AND public.get_user_team(user_id) = public.get_user_team(auth.uid()) AND public.is_team_supervisor(auth.uid(), public.get_user_team(auth.uid())))
  )
)
WITH CHECK (
  has_role(auth.uid(),'supervisor') AND (
    (scope = 'team' AND public.is_team_supervisor(auth.uid(), team_id))
    OR (scope = 'individual' AND user_id IS NOT NULL AND public.get_user_team(user_id) = public.get_user_team(auth.uid()) AND public.is_team_supervisor(auth.uid(), public.get_user_team(auth.uid())))
  )
);