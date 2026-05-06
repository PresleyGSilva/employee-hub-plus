CREATE OR REPLACE FUNCTION public.notify_admins_payslip_response(
  _payslip_id uuid,
  _employee_name text,
  _agreed boolean,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  notif_title text;
  notif_msg text;
BEGIN
  IF _agreed THEN
    notif_title := '✅ Holerite assinado: ' || COALESCE(_employee_name, 'Funcionário');
    notif_msg := COALESCE(_employee_name, 'Funcionário') || ' concordou e assinou o holerite.';
  ELSE
    notif_title := '⚠️ Holerite recusado: ' || COALESCE(_employee_name, 'Funcionário');
    notif_msg := COALESCE(_employee_name, 'Funcionário') || ' NÃO concordou com o holerite.' ||
                 CASE WHEN _reason IS NOT NULL AND length(_reason) > 0 THEN ' Motivo: ' || _reason ELSE '' END;
  END IF;

  FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, title, message, is_broadcast)
    VALUES (admin_id, notif_title, notif_msg, false);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_admins_payslip_response(uuid, text, boolean, text) TO authenticated;