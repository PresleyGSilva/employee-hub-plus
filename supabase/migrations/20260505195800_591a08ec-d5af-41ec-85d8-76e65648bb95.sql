CREATE POLICY "Users request own vacations"
ON public.vacations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'requested');