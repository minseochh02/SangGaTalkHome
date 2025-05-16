import CouponCreateContent from "./CouponCreateContent";

export default async function CouponCreatePage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const resolvedParams = await params;
  const { storeId } = resolvedParams;
  
  return <CouponCreateContent storeId={storeId} />;
} 