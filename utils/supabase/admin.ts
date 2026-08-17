import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function normalizeSecret(value: string | undefined): string {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function decodeJwtClaims(token: string): { ref?: string; role?: string } | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json) as { ref?: string; role?: string };
  } catch {
    return null;
  }
}

export function createServiceRoleClient(): SupabaseClient {
  const url = normalizeSecret(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeSecret(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const expectedRef = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
  const claims = decodeJwtClaims(key);
  if (claims?.ref && expectedRef && claims.ref !== expectedRef) {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY is for project ${claims.ref}, but this app uses ${expectedRef}.`,
    );
  }
  if (claims?.role && claims.role !== "service_role") {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY has role ${claims.role}, not service_role.`,
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
