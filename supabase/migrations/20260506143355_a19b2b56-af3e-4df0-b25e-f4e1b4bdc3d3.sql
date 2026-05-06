ALTER TYPE payslip_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS responded_at timestamptz;