CREATE OR REPLACE FUNCTION public.notify_today_birthdays()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  inserted INT := 0;
  today_start TIMESTAMPTZ := date_trunc('day', now());
  today_end   TIMESTAMPTZ := date_trunc('day', now()) + INTERVAL '1 day';
  notif_title TEXT;
BEGIN
  FOR r IN
    SELECT id, full_name
    FROM public.profiles
    WHERE active = true
      AND birth_date IS NOT NULL
      AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM now())
      AND EXTRACT(DAY   FROM birth_date) = EXTRACT(DAY   FROM now())
  LOOP
    notif_title := '🎂 Aniversário hoje: ' || COALESCE(r.full_name, 'Funcionário');
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE title = notif_title
        AND is_broadcast = true
        AND created_at >= today_start
        AND created_at <  today_end
    ) THEN
      INSERT INTO public.notifications (title, message, is_broadcast)
      VALUES (
        notif_title,
        'Hoje é aniversário de ' || COALESCE(r.full_name, 'um colega') || '! Mande os parabéns 🎉',
        true
      );
      inserted := inserted + 1;
    END IF;
  END LOOP;
  RETURN inserted;
END;
$$;