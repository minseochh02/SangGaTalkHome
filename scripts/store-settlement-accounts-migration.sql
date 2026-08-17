-- Per-store 정산 계좌, snapshotted onto each settlement.

ALTER TABLE public.store_applications
  ADD COLUMN IF NOT EXISTS bank_name character varying,
  ADD COLUMN IF NOT EXISTS bank_account_no character varying,
  ADD COLUMN IF NOT EXISTS bank_holder character varying;

ALTER TABLE public.store_settlements
  ADD COLUMN IF NOT EXISTS payout_bank_name character varying,
  ADD COLUMN IF NOT EXISTS payout_bank_account_no character varying,
  ADD COLUMN IF NOT EXISTS payout_bank_holder character varying;

COMMENT ON COLUMN public.stores.bank_name IS 'Current 정산 은행 for this store';
COMMENT ON COLUMN public.stores.bank_account_no IS 'Current 정산 계좌번호 for this store';
COMMENT ON COLUMN public.stores.bank_holder IS 'Current 정산 예금주 for this store';
COMMENT ON COLUMN public.store_settlements.payout_bank_account_no IS
  'Account snapshotted when the settlement was created or last synced while pending';

UPDATE public.store_settlements s
SET
  payout_bank_name = st.bank_name,
  payout_bank_account_no = st.bank_account_no,
  payout_bank_holder = st.bank_holder,
  updated_at = now()
FROM public.stores st
WHERE s.store_id = st.store_id
  AND s.status = 'pending'
  AND s.payout_bank_account_no IS NULL
  AND st.bank_account_no IS NOT NULL;
