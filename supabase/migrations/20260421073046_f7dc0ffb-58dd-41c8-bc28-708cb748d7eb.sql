
-- Enums
CREATE TYPE public.payment_status AS ENUM ('pending','paid','refunded','failed');
CREATE TYPE public.payout_status AS ENUM ('requested','approved','paid','rejected');
CREATE TYPE public.invoice_status AS ENUM ('draft','issued','paid','void');
CREATE TYPE public.earning_status AS ENUM ('pending','available','paid_out');

-- payments: escrow charge per project
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status public.payment_status NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_reference TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_project ON public.payments(project_id);
CREATE INDEX idx_payments_student ON public.payments(student_id);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own payments" ON public.payments
  FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage payments" ON public.payments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Students create own payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  student_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status public.invoice_status NOT NULL DEFAULT 'draft',
  pdf_path TEXT,
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_student ON public.invoices(student_id);
CREATE INDEX idx_invoices_project ON public.invoices(project_id);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own invoices" ON public.invoices
  FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage invoices" ON public.invoices
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- payouts
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status public.payout_status NOT NULL DEFAULT 'requested',
  method TEXT,
  notes TEXT,
  processed_by UUID,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payouts_expert ON public.payouts(expert_id);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts view own payouts" ON public.payouts
  FOR SELECT TO authenticated USING (expert_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Experts request payouts" ON public.payouts
  FOR INSERT TO authenticated WITH CHECK (expert_id = auth.uid() AND status = 'requested');
CREATE POLICY "Admins manage payouts" ON public.payouts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_payouts_updated BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- expert_earnings ledger
CREATE TABLE public.expert_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status public.earning_status NOT NULL DEFAULT 'pending',
  payout_id UUID REFERENCES public.payouts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (milestone_id)
);
CREATE INDEX idx_earnings_expert ON public.expert_earnings(expert_id);
CREATE INDEX idx_earnings_project ON public.expert_earnings(project_id);
ALTER TABLE public.expert_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts view own earnings" ON public.expert_earnings
  FOR SELECT TO authenticated USING (expert_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage earnings" ON public.expert_earnings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_earnings_updated BEFORE UPDATE ON public.expert_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create earning on milestone approval
CREATE OR REPLACE FUNCTION public.create_earning_on_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _expert UUID;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT assigned_expert_id INTO _expert FROM public.projects WHERE id = NEW.project_id;
    IF _expert IS NOT NULL AND COALESCE(NEW.price, 0) > 0 THEN
      INSERT INTO public.expert_earnings (expert_id, project_id, milestone_id, amount, status)
      VALUES (_expert, NEW.project_id, NEW.id, NEW.price, 'available')
      ON CONFLICT (milestone_id) DO UPDATE SET status = 'available', amount = EXCLUDED.amount;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_milestone_earning AFTER UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.create_earning_on_approval();

-- Auto-create draft invoice when payment marked paid
CREATE OR REPLACE FUNCTION public.create_invoice_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _num TEXT;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    _num := 'INV-' || to_char(now(),'YYYYMMDD') || '-' || substr(replace(NEW.id::text,'-',''),1,8);
    INSERT INTO public.invoices (invoice_number, payment_id, project_id, student_id, amount, currency, status, issued_at, paid_at)
    VALUES (_num, NEW.id, NEW.project_id, NEW.student_id, NEW.amount, NEW.currency, 'paid', now(), NEW.paid_at)
    ON CONFLICT (invoice_number) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_invoice AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.create_invoice_on_payment();
