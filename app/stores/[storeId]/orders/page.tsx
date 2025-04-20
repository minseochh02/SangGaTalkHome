import OrdersListContent from "./OrdersListContent";

export default async function OrdersListPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const resolvedParams = await params;
  const { storeId } = resolvedParams;
  
  return <OrdersListContent storeId={storeId} />;
} 