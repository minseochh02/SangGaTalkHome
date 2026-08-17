import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { syncPendingSettlementAccounts } from "@/utils/settlement";

function clean(value: unknown): string {
  return String(value || "").trim();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: store } = await supabase
    .from("stores")
    .select("store_id, user_id")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!store || store.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { bankName?: string; bankAccountNo?: string; bankHolder?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bank_name = clean(body.bankName);
  const bank_account_no = clean(body.bankAccountNo).replace(/\s+/g, "");
  const bank_holder = clean(body.bankHolder);
  if (!bank_name || !bank_account_no || !bank_holder) {
    return NextResponse.json(
      { error: "은행, 계좌번호, 예금주를 모두 입력하세요." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("stores")
    .update({
      bank_name,
      bank_account_no,
      bank_holder,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", storeId)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await syncPendingSettlementAccounts(storeId);
  } catch (syncError) {
    console.error("Failed to sync pending settlement accounts:", syncError);
  }

  return NextResponse.json({
    ok: true,
    bank_name,
    bank_account_no,
    bank_holder,
  });
}
