
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');
CREATE TYPE public.payslip_status AS ENUM ('pending', 'signed');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  pix_key TEXT,
  phone TEXT,
  position TEXT,
  base_salary NUMERIC(10,2) DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roles (separate table - security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  doc_type TEXT,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time entries
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  worked_minutes INTEGER DEFAULT 0,
  late_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  is_absent BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- Payslips
CREATE TABLE public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference_month INTEGER NOT NULL,
  reference_year INTEGER NOT NULL,
  base_salary NUMERIC(10,2) NOT NULL DEFAULT 0,
  absence_deduction NUMERIC(10,2) NOT NULL DEFAULT 0,
  late_deduction NUMERIC(10,2) NOT NULL DEFAULT 0,
  overtime_pay NUMERIC(10,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_net NUMERIC(10,2) NOT NULL DEFAULT 0,
  absent_days INTEGER NOT NULL DEFAULT 0,
  total_late_minutes INTEGER NOT NULL DEFAULT 0,
  total_overtime_minutes INTEGER NOT NULL DEFAULT 0,
  status payslip_status NOT NULL DEFAULT 'pending',
  signature_path TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, reference_month, reference_year)
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Goals
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  reference_month INTEGER NOT NULL,
  reference_year INTEGER NOT NULL,
  target_value NUMERIC(12,2) DEFAULT 0,
  current_value NUMERIC(12,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Has-role function (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile and default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER time_entries_updated BEFORE UPDATE ON public.time_entries
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- user_roles policies
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- documents
CREATE POLICY "Users view own docs" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own docs" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own docs" ON public.documents FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins all docs" ON public.documents FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- time_entries
CREATE POLICY "Users view own time" ON public.time_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own time" ON public.time_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own time" ON public.time_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins all time" ON public.time_entries FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- payslips
CREATE POLICY "Users view own payslips" ON public.payslips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users sign own payslips" ON public.payslips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins all payslips" ON public.payslips FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- notifications
CREATE POLICY "Users view own or broadcast notifs" ON public.notifications FOR SELECT USING (auth.uid() = user_id OR is_broadcast = true);
CREATE POLICY "Users update own notifs" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins all notifs" ON public.notifications FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- goals
CREATE POLICY "All authed view goals" ON public.goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage goals" ON public.goals FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-documents', 'employee-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('payslip-signatures', 'payslip-signatures', false);

-- Storage policies: documents (path: <user_id>/filename)
CREATE POLICY "Users view own document files" ON storage.objects FOR SELECT
USING (bucket_id = 'employee-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own document files" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own document files" ON storage.objects FOR DELETE
USING (bucket_id = 'employee-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins view all document files" ON storage.objects FOR SELECT
USING (bucket_id = 'employee-documents' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies: signatures
CREATE POLICY "Users view own signatures" ON storage.objects FOR SELECT
USING (bucket_id = 'payslip-signatures' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own signatures" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payslip-signatures' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins view all signatures" ON storage.objects FOR SELECT
USING (bucket_id = 'payslip-signatures' AND public.has_role(auth.uid(), 'admin'));
