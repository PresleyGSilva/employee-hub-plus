
CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authed view positions" ON public.positions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage positions" ON public.positions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.positions (name) VALUES ('Consultor(a)'), ('Supervisor(a)')
  ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_bonus numeric DEFAULT 0;
