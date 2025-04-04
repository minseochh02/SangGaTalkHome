import CouponListContent from "./CouponListContent";

export default async function CouponListPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const resolvedParams = await params;
  const { storeId } = resolvedParams;
  
  return <CouponListContent storeId={storeId} />;
} 