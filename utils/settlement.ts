import { createServiceRoleClient } from "@/utils/supabase/admin";

export type SettlementStatus = "pending" | "paid" | "cancelled";

function feeBps(): number {
  const raw = Number(process.env.SETTLEMENT_FEE_BPS);
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.min(10_000, Math.round(raw));
}

function businessDays(): number {
  const raw = Number(process.env.SETTLEMENT_BUSINESS_DAYS);
  if (!Number.isFinite(raw) || raw < 1) return 7;
  return Math.round(raw);
}

export function addBusinessDays(from: Date, days: number): Date {
  const next = new Date(from.getTime());
  let added = 0;
  while (added < days) {
    next.setUTCDate(next.getUTCDate() + 1);
    const weekday = next.getUTCDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return next;
}

function roundKrw(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.max(0, Math.round(amount));
}

export async function recordSettlementForPaidOrder(input: {
  kioskOrderId: string;
  storeId?: string | null;
  grossAmountKrw?: unknown;
  portoneImpUid?: string | null;
  paidAt?: string | null;
}): Promise<void> {
  const kioskOrderId = String(input.kioskOrderId || "").trim();
  if (!kioskOrderId) return;

  const admin = createServiceRoleClient();
  let storeId = String(input.storeId || "").trim();
  let gross = roundKrw(input.grossAmountKrw);
  let portoneImpUid = input.portoneImpUid || null;
  let paidAt = input.paidAt || new Date().toISOString();

  if (!storeId || !gross) {
    const { data: order, error } = await admin
      .from("kiosk_orders")
      .select("store_id, total_amount_krw, portone_imp_uid, paid_at")
      .eq("kiosk_order_id", kioskOrderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return;
    storeId = storeId || String(order.store_id || "");
    gross = gross || roundKrw(order.total_amount_krw);
    portoneImpUid = portoneImpUid || order.portone_imp_uid || null;
    paidAt = paidAt || order.paid_at || new Date().toISOString();
  }

  if (!storeId || !gross) return;

  const bps = feeBps();
  const fee = Math.round((gross * bps) / 10_000);
  const net = Math.max(0, gross - fee);
  const dueAt = addBusinessDays(new Date(paidAt), businessDays()).toISOString();
  const now = new Date().toISOString();

  const { error } = await admin.from("store_settlements").upsert(
    {
      store_id: storeId,
      kiosk_order_id: kioskOrderId,
      portone_imp_uid: portoneImpUid,
      gross_amount_krw: gross,
      fee_amount_krw: fee,
      net_amount_krw: net,
      fee_bps: bps,
      status: "pending",
      due_at: dueAt,
      updated_at: now,
    },
    { onConflict: "kiosk_order_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function cancelSettlementForOrder(kioskOrderId: string): Promise<void> {
  const id = String(kioskOrderId || "").trim();
  if (!id) return;
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("store_settlements")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
      notes: "주문 취소로 정산이 취소되었습니다.",
    })
    .eq("kiosk_order_id", id)
    .eq("status", "pending");
  if (error) throw error;
}
