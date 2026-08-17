import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

const DEFAULT_CATEGORY_ID = "2ae5ca75-6f21-41a6-8de1-48564e3f4906";
const PUBLIC_BASE = "https://sgt-wallet.com";

type IncomingImage = {
  base64?: string;
  mimeType?: string;
};

type IncomingProduct = {
  catalogId?: string;
  name?: string;
  description?: string;
  wonPrice?: number;
  sgtPrice?: number;
  category?: string;
  image?: IncomingImage;
};

type IncomingStore = {
  storeName?: string;
  description?: string;
  websiteUrl?: string;
  brandCategory?: string;
  ownerName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  businessNumber?: string;
  image?: IncomingImage;
};

function secretsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function normalizeSecret(value: string | undefined): string {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const e = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    const parts = [e.message, e.details, e.hint, e.code].filter(Boolean);
    if (parts.length) return parts.join(" | ");
  }
  return "Registration failed";
}

function assertEgdeskSecret(request: Request): NextResponse | null {
  const expected = normalizeSecret(process.env["SGT_EGDESK_SECRET"]);
  const provided = normalizeSecret(
    request.headers.get("x-sgt-egdesk-secret") || "",
  );
  if (!expected) {
    return NextResponse.json(
      { error: "SGT_EGDESK_SECRET is not configured on sgt-wallet.com" },
      { status: 500 },
    );
  }
  if (!provided || !secretsEqual(expected, provided)) {
    return unauthorized();
  }
  return null;
}

function getAdmin(): SupabaseClient {
  const url = normalizeSecret(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeSecret(process.env["SUPABASE_SERVICE_ROLE_KEY"]);
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const expectedRef = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
  const claims = decodeJwtClaims(key);
  if (claims?.ref && expectedRef && claims.ref !== expectedRef) {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY is for project ${claims.ref}, but this app uses ${expectedRef}. Use the service_role key from SGT (${expectedRef}), not EGDesk.`,
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

function decodeJwtClaims(token: string): { ref?: string; role?: string } | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { ref?: string; role?: string };
    return { ref: parsed.ref, role: parsed.role };
  } catch {
    return null;
  }
}

function publicBase(): string {
  const configured = (
    process.env.SGT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    PUBLIC_BASE
  ).replace(/\/$/, "");
  // NEXT_PUBLIC_SERVER_URL is the Hugging Face FastAPI backend, not the storefront.
  if (/hf\.space|localhost|127\.0\.0\.1/i.test(configured)) {
    return PUBLIC_BASE;
  }
  return configured;
}

function biMarker(snapshotId: string): string {
  return `egdesk-bi:${snapshotId}`;
}

function productMarker(catalogId: string): string {
  return `egdesk-product:${catalogId}`;
}

function withMarker(marker: string, text: string): string {
  const stripped = String(text || "")
    .replace(/^egdesk-(?:bi|product):[^\n]*\n*/i, "")
    .trim();
  return stripped ? `${marker}\n\n${stripped}` : marker;
}

function urlsForStore(storeId: string) {
  const base = publicBase();
  return {
    storeId,
    storeUrl: `${base}/stores/${storeId}`,
    kioskUrl: `${base}/kiosk/${storeId}`,
  };
}

function extForMime(mimeType: string): string {
  const mime = mimeType.toLowerCase();
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

async function uploadImage(input: {
  admin: SupabaseClient;
  bucket: "product-images" | "store-thumbnail";
  folder: string;
  image?: IncomingImage;
}): Promise<string | null> {
  const raw = String(input.image?.base64 || "")
    .replace(/^data:[^;]+;base64,/, "")
    .trim();
  if (!raw) return null;
  const buffer = Buffer.from(raw, "base64");
  if (!buffer.length || buffer.length > 2_000_000) return null;
  const mime = String(input.image?.mimeType || "image/jpeg")
    .split(";")[0]
    .trim();
  const contentType = mime.startsWith("image/") ? mime : "image/jpeg";
  const filePath = `${input.folder}/${Date.now()}-${randomUUID()}.${extForMime(contentType)}`;
  const { error } = await input.admin.storage.from(input.bucket).upload(filePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return input.admin.storage.from(input.bucket).getPublicUrl(filePath).data.publicUrl;
}

function escapeIlike(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const perPage = 200;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const hit = users.find((user) => (user.email ?? "").toLowerCase() === normalized);
    if (hit) return hit;
    if (users.length < perPage) break;
  }
  return null;
}

async function findPublicUserByEmail(admin: SupabaseClient, email: string) {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await admin
    .from("users")
    .select("user_id, email")
    .ilike("email", escapeIlike(normalized))
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.user_id) return null;
  return { userId: data.user_id as string, email: normalized };
}

async function findOwnerByEmail(admin: SupabaseClient, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;

  const profile = await findPublicUserByEmail(admin, normalized);
  if (profile) return profile;

  const authUser = await findAuthUserByEmail(admin, normalized);
  if (!authUser?.id) return null;
  return { userId: authUser.id, email: normalized };
}

async function ensurePublicUser(
  admin: SupabaseClient,
  userId: string,
  email: string,
) {
  const { data: existing } = await admin
    .from("users")
    .select("user_id, email")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.user_id) return existing.user_id;

  const username = `${email.split("@")[0] || "egdesk"}-${userId.slice(0, 8)}`;
  const now = new Date().toISOString();
  const { error } = await admin.from("users").insert({
    user_id: userId,
    email,
    username,
    role: "store_owner",
    created_at: now,
    updated_at: now,
  });
  if (error && !String(error.message || "").toLowerCase().includes("duplicate")) {
    throw error;
  }
  return userId;
}

async function resolveOwnerByEmail(admin: SupabaseClient, email: string) {
  const owner = await findOwnerByEmail(admin, email);
  if (!owner) return null;
  const userId = await ensurePublicUser(admin, owner.userId, owner.email);
  return { userId, email: owner.email };
}

function accountUrls() {
  const base = publicBase();
  return {
    loginUrl: `${base}/login`,
    signupUrl: `${base}/signup`,
  };
}

async function findStoreBySnapshot(
  admin: SupabaseClient,
  snapshotId: string,
) {
  const marker = biMarker(snapshotId);
  const { data, error } = await admin
    .from("stores")
    .select("store_id, store_name, description, website_url, business_number")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (
    (data || []).find((row) =>
      String(row.description || "").includes(marker),
    ) || null
  );
}

async function resolveCategoryId(
  admin: SupabaseClient,
  brandCategory?: string,
): Promise<string> {
  const fallback =
    process.env.EGDESK_SGT_CATEGORY_ID || DEFAULT_CATEGORY_ID;
  const needle = String(brandCategory || "").trim();
  if (!needle) return fallback;

  const { data } = await admin
    .from("categories")
    .select("category_id, category_name")
    .ilike("category_name", `%${needle}%`)
    .limit(1)
    .maybeSingle();

  return data?.category_id || fallback;
}

async function upsertProducts(
  admin: SupabaseClient,
  storeId: string,
  ownerUserId: string,
  products: IncomingProduct[],
) {
  const synced: Array<{
    catalogId: string;
    productId: string;
    name: string;
    created: boolean;
    imageUrl?: string | null;
  }> = [];

  for (const product of products) {
    const name = String(product.name || "").trim();
    if (!name) continue;

    const catalogId = String(product.catalogId || name).trim();
    const marker = productMarker(catalogId);
    const description = withMarker(marker, String(product.description || ""));
    const wonPrice = Number.isFinite(Number(product.wonPrice))
      ? Math.max(0, Math.round(Number(product.wonPrice)))
      : 0;
    const sgtPrice = Number.isFinite(Number(product.sgtPrice))
      ? Math.max(0, Number(product.sgtPrice))
      : 0;
    const category = String(product.category || "").trim() || null;
    const now = new Date().toISOString();

    const { data: existingRows, error: listError } = await admin
      .from("products")
      .select("product_id, product_name, description, image_url")
      .eq("store_id", storeId)
      .limit(500);
    if (listError) throw listError;

    const existing =
      (existingRows || []).find((row) =>
        String(row.description || "").includes(marker),
      ) ||
      (existingRows || []).find((row) => row.product_name === name) ||
      null;

    const imageUrl = await uploadImage({
      admin,
      bucket: "product-images",
      folder: ownerUserId,
      image: product.image,
    });

    const payload: Record<string, unknown> = {
      product_name: name,
      description,
      won_price: wonPrice,
      sgt_price: sgtPrice,
      category,
      store_id: storeId,
      status: 1,
      is_sgt_product: false,
      is_kiosk_enabled: true,
      is_sold_out: false,
      won_delivery_fee: 0,
      updated_at: now,
    };
    if (imageUrl) payload.image_url = imageUrl;

    if (existing?.product_id) {
      const { error } = await admin
        .from("products")
        .update(payload)
        .eq("product_id", existing.product_id);
      if (error) throw error;
      synced.push({
        catalogId,
        productId: existing.product_id,
        name,
        created: false,
        imageUrl: imageUrl || existing.image_url || null,
      });
      continue;
    }

    const { data: inserted, error } = await admin
      .from("products")
      .insert(payload)
      .select("product_id")
      .single();
    if (error) throw error;
    synced.push({
      catalogId,
      productId: inserted.product_id,
      name,
      created: true,
      imageUrl: imageUrl || null,
    });
  }

  return synced;
}

export async function GET(request: Request) {
  const denied = assertEgdeskSecret(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const snapshotId = url.searchParams.get("snapshotId")?.trim() || "";
  const email = url.searchParams.get("email")?.trim() || "";
  if (!snapshotId && !email) {
    return NextResponse.json(
      { error: "email or snapshotId is required" },
      { status: 400 },
    );
  }

  try {
    const admin = getAdmin();
    if (email && !snapshotId) {
      const owner = await findOwnerByEmail(admin, email);
      return NextResponse.json({
        linked: Boolean(owner),
        email: email.trim().toLowerCase(),
        userId: owner?.userId || null,
        ...accountUrls(),
      });
    }

    const store = await findStoreBySnapshot(admin, snapshotId);
    if (!store) {
      return NextResponse.json({ found: false, snapshotId });
    }
    return NextResponse.json({
      found: true,
      snapshotId,
      ...urlsForStore(store.store_id),
      storeName: store.store_name,
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = assertEgdeskSecret(request);
  if (denied) return denied;

  let body: {
    snapshotId?: string;
    email?: string;
    store?: IncomingStore;
    products?: IncomingProduct[];
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const snapshotId = String(body.snapshotId || "").trim();
  const storeName = String(body.store?.storeName || "").trim();
  const email = String(body.email || body.store?.email || "")
    .trim()
    .toLowerCase();
  if (!snapshotId || !storeName) {
    return NextResponse.json(
      { error: "snapshotId and store.storeName are required" },
      { status: 400 },
    );
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "email is required so the store can be owned by the SGT account" },
      { status: 400 },
    );
  }

  try {
    const admin = getAdmin();
    const owner = await resolveOwnerByEmail(admin, email);
    if (!owner) {
      return NextResponse.json(
        {
          code: "NO_SGT_USER",
          error: `No SGT Wallet account for ${email}. Log in or sign up on sgt-wallet.com with this email, then register again.`,
          email,
          ...accountUrls(),
        },
        { status: 409 },
      );
    }
    const ownerUserId = owner.userId;
    const categoryId = await resolveCategoryId(
      admin,
      body.store?.brandCategory,
    );
    const marker = biMarker(snapshotId);
    const description = withMarker(
      marker,
      String(body.store?.description || storeName),
    );
    const now = new Date().toISOString();
    const storePayload: Record<string, unknown> = {
      user_id: ownerUserId,
      store_name: storeName,
      store_type: 2,
      category_id: categoryId,
      description,
      address: String(body.store?.address || "온라인").trim() || "온라인",
      phone_number: String(body.store?.phoneNumber || "").trim(),
      website_url: String(body.store?.websiteUrl || "").trim() || null,
      business_number: String(body.store?.businessNumber || "").trim(),
      owner_name: String(body.store?.ownerName || storeName).trim() || storeName,
      email: owner.email,
      operating_hours: "",
      kiosk_takeout_enabled: true,
      updated_at: now,
    };

    const existing = await findStoreBySnapshot(admin, snapshotId);
    let storeId: string;
    let created = false;

    if (existing?.store_id) {
      storeId = existing.store_id;
    } else {
      const { data: inserted, error } = await admin
        .from("stores")
        .insert({ ...storePayload, created_at: now })
        .select("store_id")
        .single();
      if (error) throw error;
      storeId = inserted.store_id;
      created = true;
    }

    const storeImageUrl = await uploadImage({
      admin,
      bucket: "store-thumbnail",
      folder: ownerUserId,
      image: body.store?.image,
    });
    if (storeImageUrl) storePayload.image_url = storeImageUrl;

    if (!created) {
      const { error } = await admin
        .from("stores")
        .update(storePayload)
        .eq("store_id", storeId);
      if (error) throw error;
    } else if (storeImageUrl) {
      const { error } = await admin
        .from("stores")
        .update({ image_url: storeImageUrl, updated_at: now })
        .eq("store_id", storeId);
      if (error) throw error;
    }

    const products = await upsertProducts(
      admin,
      storeId,
      ownerUserId,
      Array.isArray(body.products) ? body.products : [],
    );

    return NextResponse.json({
      ok: true,
      created,
      snapshotId,
      ownerEmail: owner.email,
      ownerUserId,
      ...urlsForStore(storeId),
      storeName,
      products,
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
