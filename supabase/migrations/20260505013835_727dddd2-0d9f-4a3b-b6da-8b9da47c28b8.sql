ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS lunch_out timestamptz,
  ADD COLUMN IF NOT EXISTS lunch_in timestamptz,
  ADD COLUMN IF NOT EXISTS break_out timestamptz,
  ADD COLUMN IF NOT EXISTS break_in timestamptz,
  ADD COLUMN IF NOT EXISTS balance_minutes integer DEFAULT 0;