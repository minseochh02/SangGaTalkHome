import { redirect } from "next/navigation";

export default async function EgdeskProCheckoutRedirect({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const qs = t ? `?t=${encodeURIComponent(t)}` : "";
  redirect(`/portone-checkout${qs}`);
}
