import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { EGDESK_FUNCTIONS_URL } from "@/lib/egdesk-pro";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

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

async function proxyEgdesk(
  path: string,
  init: { method: string; body?: string; cache?: RequestCache },
) {
  const secret = process.env.SGT_EGDESK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SGT_EGDESK_SECRET is not configured" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `${EGDESK_FUNCTIONS_URL.replace(/\/$/, "")}${path}`,
      {
        method: init.method,
        headers: {
          "Content-Type": "application/json",
          "x-sgt-egdesk-secret": secret,
        },
        body: init.body,
        cache: init.cache,
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to call EGDesk";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const secret = process.env.SGT_EGDESK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SGT_EGDESK_SECRET is not configured" },
      { status: 500 },
    );
  }

  const base = EGDESK_FUNCTIONS_URL.replace(/\/$/, "");
  const headers = {
    "Content-Type": "application/json",
    "x-sgt-egdesk-secret": secret,
  };

  try {
    const [purchasesRes, usersRes] = await Promise.all([
      fetch(`${base}/list-egdesk-pro-purchases`, {
        method: "GET",
        headers,
        cache: "no-store",
      }),
      fetch(`${base}/list-egdesk-users`, {
        method: "GET",
        headers,
        cache: "no-store",
      }),
    ]);

    const purchasesPayload = (await purchasesRes.json().catch(() => ({}))) as {
      error?: string;
      purchases?: unknown[];
    };
    const usersPayload = (await usersRes.json().catch(() => ({}))) as {
      error?: string;
      users?: unknown[];
    };

    if (!purchasesRes.ok) {
      return NextResponse.json(
        { error: purchasesPayload.error || "Failed to list EGDesk Pro purchases" },
        { status: purchasesRes.status },
      );
    }

    return NextResponse.json({
      ok: true,
      purchases: purchasesPayload.purchases || [],
      users: usersRes.ok ? usersPayload.users || [] : [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to call EGDesk";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  let body: { email?: string; months?: number; unlimited?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // empty
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "EGDesk에 가입한 이메일을 입력해주세요." },
      { status: 400 },
    );
  }

  return proxyEgdesk("/comp-egdesk-pro", {
    method: "POST",
    body: JSON.stringify({
      email,
      months: body.months,
      unlimited: body.unlimited === true,
    }),
  });
}
