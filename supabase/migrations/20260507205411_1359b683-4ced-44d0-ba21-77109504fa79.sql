-- Enum de status do cliente
DO $$ BEGIN
  CREATE TYPE public.client_entry_status AS ENUM ('pago','pedido_aceito','pendente','recusado','cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.client_entry_type AS ENUM ('meu_cliente','indicacao');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.client_gender AS ENUM ('masculino','feminino','outro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.client_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_type public.client_entry_type NOT NULL DEFAULT 'meu_cliente',
  cpf text,
  full_name text NOT NULL,
  gender public.client_gender,
  rg text,
  amount numeric NOT NULL DEFAULT 0,
  send_date date,
  birth_date date,
  phone text,
  age integer,
  status public.client_entry_status NOT NULL DEFAULT 'pendente',
  bank text,
  praca text,
  indicated_by text,
  extra_field_1 text,
  extra_field_2 text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_entries_user ON public.client_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_client_entries_send_date ON public.client_entries(send_date);

ALTER TABLE public.client_entries ENABLE ROW LEVEL SECURITY;

-- Admin tudo
CREATE POLICY "Admins manage all client entries"
ON public.client_entries FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Consultora vê próprias
CREATE POLICY "Users view own client entries"
ON public.client_entries FOR SELECT
USING (auth.uid() = user_id);

-- Consultora insere próprias
CREATE POLICY "Users insert own client entries"
ON public.client_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Consultora atualiza próprias
CREATE POLICY "Users update own client entries"
ON public.client_entries FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Consultora deleta próprias
CREATE POLICY "Users delete own client entries"
ON public.client_entries FOR DELETE
USING (auth.uid() = user_id);

-- Supervisora vê toda a equipe dela
CREATE POLICY "Supervisors view team client entries"
ON public.client_entries FOR SELECT
USING (
  public.has_role(auth.uid(), 'supervisor')
  AND public.is_team_supervisor(auth.uid(), public.get_user_team(user_id))
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_client_entries_touch ON public.client_entries;
CREATE TRIGGER trg_client_entries_touch
BEFORE UPDATE ON public.client_entries
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();