export const EGDESK_PRO_PRODUCT_ID =
  process.env.NEXT_PUBLIC_EGDESK_PRO_PRODUCT_ID ||
  "26483c72-7f2e-4500-bd86-88b9440f5cc7";

export const EGDESK_FUNCTIONS_URL =
  process.env.NEXT_PUBLIC_EGDESK_FUNCTIONS_URL ||
  "https://cbptgzaubhcclkmvkiua.functions.supabase.co";

export const EGDESK_PRO_LIST_PRICE_KRW = "₩138,000";
export const EGDESK_PRO_LIST_TERM = "6개월";

export type EgdeskProPurchase = {
  userId: string;
  email: string | null;
  name: string | null;
  provider: string;
  source: string;
  status: string;
  active: boolean;
  amount: number | null;
  currency: string | null;
  priceLabel: string;
  periodEnd: string | null;
  remainingMs: number | null;
  remainingDays: number | null;
  remainingLabel: string;
  paidAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export function isEgdeskProProduct(productId: string): boolean {
  return productId === EGDESK_PRO_PRODUCT_ID;
}
