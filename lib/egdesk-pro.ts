export const EGDESK_PRO_PRODUCT_ID =
  process.env.NEXT_PUBLIC_EGDESK_PRO_PRODUCT_ID ||
  "26483c72-7f2e-4500-bd86-88b9440f5cc7";

export const EGDESK_FUNCTIONS_URL =
  process.env.NEXT_PUBLIC_EGDESK_FUNCTIONS_URL ||
  "https://cbptgzaubhcclkmvkiua.functions.supabase.co";

export function isEgdeskProProduct(productId: string): boolean {
  return productId === EGDESK_PRO_PRODUCT_ID;
}
