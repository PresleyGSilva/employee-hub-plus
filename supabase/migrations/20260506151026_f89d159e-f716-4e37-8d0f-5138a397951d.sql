ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS admin_response text;

CREATE OR REPLACE FUNCTION public.reopen_payslip(_payslip_id uuid, _admin_response text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid;
  _ref_month int;
  _ref_year int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.payslips
  SET status = 'pending',
      admin_response = _admin_response,
      rejection_reason = NULL,
      responded_at = NULL,
      signature_path = NULL,
      signed_at = NULL
  WHERE id = _payslip_id
  RETURNING user_id, reference_month, reference_year
  INTO _user, _ref_month, _ref_year;

  IF _user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, is_broadcast)
    VALUES (
      _user,
      '🔄 Holerite revisado pelo RH',
      'Seu holerite foi revisado e liberado novamente para sua avaliação.' ||
      CASE WHEN _admin_response IS NOT NULL AND length(_admin_response) > 0
           THEN ' Resposta do RH: ' || _admin_response ELSE '' END,
      false
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reopen_payslip(uuid, text) TO authenticated;