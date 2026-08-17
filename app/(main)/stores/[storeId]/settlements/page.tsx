import StoreSettlementsContent from "./StoreSettlementsContent";

export default async function StoreSettlementsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  return <StoreSettlementsContent storeId={storeId} />;
}
