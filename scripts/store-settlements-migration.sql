-- Store KRW settlements for card kiosk orders (TOS: 재정산 within 7 business days).
-- Run on the SGT project. Service role writes rows; store owners and admins read via RLS.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS bank_name character varying,
  ADD COLUMN IF NOT EXISTS bank_account_no character varying,
  ADD COLUMN IF NOT EXISTS bank_holder character varying;

CREATE TABLE IF NOT EXISTS public.store_settlements (
  settlement_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(store_id) ON DELETE CASCADE,
  kiosk_order_id uuid NOT NULL REFERENCES public.kiosk_orders(kiosk_order_id) ON DELETE CASCADE,
  portone_imp_uid text,
  gross_amount_krw integer NOT NULL CHECK (gross_amount_krw >= 0),
  fee_amount_krw integer NOT NULL DEFAULT 0 CHECK (fee_amount_krw >= 0),
  net_amount_krw integer NOT NULL CHECK (net_amount_krw >= 0),
  fee_bps integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  due_at timestamptz NOT NULL,
  paid_at timestamptz,
  paid_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kiosk_order_id)
);

CREATE INDEX IF NOT EXISTS idx_store_settlements_store_status
  ON public.store_settlements(store_id, status, due_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_settlements_due
  ON public.store_settlements(status, due_at);

COMMENT ON TABLE public.store_settlements IS
  'KRW payouts owed to store owners after PortOne card capture. Actual bank transfer is manual until PortOne 파트너 정산 is enabled.';

ALTER TABLE public.store_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_settlements_owner_select ON public.store_settlements;
CREATE POLICY store_settlements_owner_select
  ON public.store_settlements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores s
      WHERE s.store_id = store_settlements.store_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS store_settlements_admin_all ON public.store_settlements;
CREATE POLICY store_settlements_admin_all
  ON public.store_settlements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.user_id = auth.uid()
        AND u.role = 'admin'
    )
  );

INSERT INTO public.store_settlements (
  store_id,
  kiosk_order_id,
  portone_imp_uid,
  gross_amount_krw,
  fee_amount_krw,
  net_amount_krw,
  fee_bps,
  status,
  due_at
)
SELECT
  o.store_id,
  o.kiosk_order_id,
  o.portone_imp_uid,
  GREATEST(0, ROUND(COALESCE(o.total_amount_krw, 0))::integer),
  0,
  GREATEST(0, ROUND(COALESCE(o.total_amount_krw, 0))::integer),
  0,
  'pending',
  COALESCE(o.paid_at, o.created_at, now()) + interval '9 days'
FROM public.kiosk_orders o
WHERE o.status = 'completed'
  AND COALESCE(o.total_amount_krw, 0) > 0
ON CONFLICT (kiosk_order_id) DO NOTHING;
