import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

const DEFAULT_OWNER_USER_ID = "51267fb7-57ec-49ad-82f9-b0591f8533a4";
const DEFAULT_CATEGORY_ID = "2ae5ca75-6f21-41a6-8de1-48564e3f4906";
const PUBLIC_BASE = "https://sgt-wallet.com";

type IncomingProduct = {
  catalogId?: string;
  name?: string;
  description?: string;
  wonPrice?: number;
  category?: string;
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
};

function secretsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function assertEgdeskSecret(request: Request): NextResponse | null {
  const expected = process.env.SGT_EGDESK_SECRET || "";
  const provided = request.headers.get("x-sgt-egdesk-secret") || "";
  if (!expected || !provided || !secretsEqual(expected, provided)) {
    return unauthorized();
  }
  return null;
}

function getAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function publicBase(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    PUBLIC_BASE
  ).replace(/\/$/, "");
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

async function findStoreBySnapshot(
  admin: SupabaseClient,
  snapshotId: string,
) {
  const ownerUserId =
    process.env.EGDESK_SGT_OWNER_USER_ID || DEFAULT_OWNER_USER_ID;
  const marker = biMarker(snapshotId);
  const { data, error } = await admin
    .from("stores")
    .select("store_id, store_name, description, website_url, business_number")
    .eq("user_id", ownerUserId)
    .is("deleted_at", null)
    .limit(500);
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
  products: IncomingProduct[],
) {
  const synced: Array<{
    catalogId: string;
    productId: string;
    name: string;
    created: boolean;
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
    const category = String(product.category || "").trim() || null;
    const now = new Date().toISOString();

    const { data: existingRows, error: listError } = await admin
      .from("products")
      .select("product_id, product_name, description")
      .eq("store_id", storeId)
      .limit(500);
    if (listError) throw listError;

    const existing =
      (existingRows || []).find((row) =>
        String(row.description || "").includes(marker),
      ) ||
      (existingRows || []).find((row) => row.product_name === name) ||
      null;

    const payload = {
      product_name: name,
      description,
      won_price: wonPrice,
      category,
      store_id: storeId,
      status: 1,
      is_sgt_product: false,
      is_kiosk_enabled: true,
      is_sold_out: false,
      won_delivery_fee: 0,
      updated_at: now,
    };

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
    });
  }

  return synced;
}

export async function GET(request: Request) {
  const denied = assertEgdeskSecret(request);
  if (denied) return denied;

  const snapshotId = new URL(request.url).searchParams.get("snapshotId")?.trim();
  if (!snapshotId) {
    return NextResponse.json({ error: "snapshotId is required" }, { status: 400 });
  }

  try {
    const admin = getAdmin();
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
    const message = error instanceof Error ? error.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = assertEgdeskSecret(request);
  if (denied) return denied;

  let body: {
    snapshotId?: string;
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
  if (!snapshotId || !storeName) {
    return NextResponse.json(
      { error: "snapshotId and store.storeName are required" },
      { status: 400 },
    );
  }

  try {
    const admin = getAdmin();
    const ownerUserId =
      process.env.EGDESK_SGT_OWNER_USER_ID || DEFAULT_OWNER_USER_ID;
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
    const storePayload = {
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
      email: String(body.store?.email || "").trim(),
      operating_hours: "",
      kiosk_takeout_enabled: true,
      updated_at: now,
    };

    const existing = await findStoreBySnapshot(admin, snapshotId);
    let storeId: string;
    let created = false;

    if (existing?.store_id) {
      const { error } = await admin
        .from("stores")
        .update(storePayload)
        .eq("store_id", existing.store_id);
      if (error) throw error;
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

    const products = await upsertProducts(
      admin,
      storeId,
      Array.isArray(body.products) ? body.products : [],
    );

    return NextResponse.json({
      ok: true,
      created,
      snapshotId,
      ...urlsForStore(storeId),
      storeName,
      products,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
