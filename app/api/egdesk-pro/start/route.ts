import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const EGDESK_FUNCTIONS_URL =
  process.env.EGDESK_FUNCTIONS_URL ||
  process.env.NEXT_PUBLIC_EGDESK_FUNCTIONS_URL ||
  "https://cbptgzaubhcclkmvkiua.functions.supabase.co";

export async function POST(request: Request) {
  const secret = process.env.SGT_EGDESK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SGT_EGDESK_SECRET is not configured" },
      { status: 500 },
    );
  }

  let body: { email?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = (body.email || user?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "EGDesk에 가입한 이메일을 입력해주세요." },
      { status: 400 },
    );
  }

  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined);
  const phone =
    (user?.user_metadata?.phone as string | undefined) || user?.phone || undefined;

  const response = await fetch(
    `${EGDESK_FUNCTIONS_URL.replace(/\/$/, "")}/create-portone-payment-from-sgt`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sgt-egdesk-secret": secret,
      },
      body: JSON.stringify({ email, fullName, phone }),
    },
  );

  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text };
  }

  return NextResponse.json(data, { status: response.status });
}
