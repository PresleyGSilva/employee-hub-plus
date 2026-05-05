
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS signed_document_path text;

INSERT INTO storage.buckets (id, name, public) VALUES ('payslip-documents', 'payslip-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users view own payslip docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payslip-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own payslip docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payslip-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own payslip docs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payslip-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins view all payslip docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payslip-documents' AND public.has_role(auth.uid(), 'admin'));
