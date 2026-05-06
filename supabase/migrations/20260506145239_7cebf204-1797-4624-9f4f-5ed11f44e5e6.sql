DROP POLICY IF EXISTS "Users sign own payslips" ON public.payslips;
CREATE POLICY "Users sign own payslips" ON public.payslips
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);