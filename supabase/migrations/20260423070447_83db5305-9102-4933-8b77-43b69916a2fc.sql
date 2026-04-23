-- Platform settings (key/value JSON store, admin-only writes, anyone authenticated can read)
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings readable by authenticated"
  ON public.platform_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_platform_settings_updated
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.platform_settings (key, value) VALUES
  ('general', '{"platform_name":"Campus","support_email":"support@campus.app","default_currency":"usd"}'::jsonb),
  ('marketplace', '{"allow_expert_signup":true,"auto_assign":false,"min_project_budget":0,"platform_fee_percent":10}'::jsonb),
  ('notifications', '{"email_on_assignment":true,"email_on_message":false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Admin-callable RPC to change a user's role (replaces existing roles for that user)
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id UUID, _role app_role)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
END;
$$;