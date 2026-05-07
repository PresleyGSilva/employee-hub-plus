
CREATE OR REPLACE FUNCTION public.get_ranking_consultoras(_month int, _year int)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, team_id uuid, team_name text, team_color text, total numeric, entries_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.team_id, t.name, t.color,
         COALESCE(SUM(ce.amount), 0)::numeric AS total,
         COUNT(ce.id)::bigint AS entries_count
  FROM public.profiles p
  LEFT JOIN public.client_entries ce
    ON ce.user_id = p.id
   AND ce.status = 'pago'
   AND EXTRACT(MONTH FROM COALESCE(ce.send_date, ce.created_at::date)) = _month
   AND EXTRACT(YEAR  FROM COALESCE(ce.send_date, ce.created_at::date)) = _year
  LEFT JOIN public.teams t ON t.id = p.team_id
  WHERE p.active = true
    AND NOT public.has_role(p.id, 'admin')
  GROUP BY p.id, p.full_name, p.avatar_url, p.team_id, t.name, t.color
  ORDER BY total DESC, p.full_name
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.get_ranking_teams(_month int, _year int)
RETURNS TABLE(team_id uuid, team_name text, team_color text, total numeric, members_count bigint, entries_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.name, t.color,
         COALESCE(SUM(ce.amount), 0)::numeric AS total,
         (SELECT COUNT(*) FROM public.profiles p2 WHERE p2.team_id = t.id AND p2.active = true)::bigint,
         COUNT(ce.id)::bigint
  FROM public.teams t
  LEFT JOIN public.profiles p ON p.team_id = t.id AND p.active = true
  LEFT JOIN public.client_entries ce
    ON ce.user_id = p.id
   AND ce.status = 'pago'
   AND EXTRACT(MONTH FROM COALESCE(ce.send_date, ce.created_at::date)) = _month
   AND EXTRACT(YEAR  FROM COALESCE(ce.send_date, ce.created_at::date)) = _year
  GROUP BY t.id, t.name, t.color
  ORDER BY total DESC, t.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_ranking_consultoras(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranking_teams(int, int) TO authenticated;
