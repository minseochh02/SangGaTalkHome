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

  try {
    const response = await fetch(
      `${EGDESK_FUNCTIONS_URL.replace(/\/$/, "")}/list-egdesk-pro-purchases`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-sgt-egdesk-secret": secret,
        },
        cache: "no-store",
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
      error instanceof Error ? error.message : "Failed to list EGDesk Pro purchases";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
