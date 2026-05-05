CREATE OR REPLACE FUNCTION public.get_birthdays_this_month()
RETURNS TABLE (id uuid, full_name text, avatar_url text, birth_date date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, avatar_url, birth_date
  FROM public.profiles
  WHERE active = true
    AND birth_date IS NOT NULL
    AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM now())
  ORDER BY EXTRACT(DAY FROM birth_date);
$$;

REVOKE EXECUTE ON FUNCTION public.get_birthdays_this_month() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_birthdays_this_month() TO authenticated;