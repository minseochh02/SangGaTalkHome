import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("users")
    .select("user_id, role")
    .eq("email", user.email)
    .maybeSingle();
  if (!profile || !["admin", "super_admin"].includes(String(profile.role))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { profile };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("store_settlements")
      .select(
        "*, stores(store_name, owner_name, bank_name, bank_account_no, bank_holder)",
      )
      .order("due_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ settlements: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list settlements";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const profile = "profile" in auth ? auth.profile : null;
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { settlementId?: string; status?: string; notes?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const settlementId = String(body.settlementId || "").trim();
  if (!settlementId) {
    return NextResponse.json({ error: "settlementId is required" }, { status: 400 });
  }
  if (body.status !== "paid") {
    return NextResponse.json({ error: "Only status=paid is supported" }, { status: 400 });
  }

  try {
    const admin = createServiceRoleClient();
    const { error } = await admin
      .from("store_settlements")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_by: profile.user_id,
        notes: body.notes || "관리자가 계좌이체 후 정산 완료 처리",
        updated_at: new Date().toISOString(),
      })
      .eq("settlement_id", settlementId)
      .eq("status", "pending");
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark paid";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
