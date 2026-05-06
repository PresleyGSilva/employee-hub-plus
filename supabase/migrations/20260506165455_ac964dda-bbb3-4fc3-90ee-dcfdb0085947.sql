DROP POLICY IF EXISTS "All authed view goals" ON public.goals;

CREATE POLICY "Scoped view goals" ON public.goals
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR scope = 'company'
  OR (scope = 'individual' AND user_id = auth.uid())
  OR (scope = 'team' AND team_id = public.get_user_team(auth.uid()))
  OR (scope = 'individual' AND user_id IS NOT NULL AND public.get_user_team(user_id) = public.get_user_team(auth.uid()) AND public.is_team_supervisor(auth.uid(), public.get_user_team(auth.uid())))
  OR (scope = 'team' AND public.is_team_supervisor(auth.uid(), team_id))
);