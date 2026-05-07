
DROP POLICY IF EXISTS "Users view teammates" ON public.profiles;
CREATE POLICY "Users view teammates" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    team_id IS NOT NULL
    AND team_id = public.get_user_team(auth.uid())
  );
