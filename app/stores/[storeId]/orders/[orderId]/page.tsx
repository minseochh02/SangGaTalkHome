import OrderDetailContent from "./OrderDetailContent";

type OrderDetailPageProps = {
  params: {
    storeId: string;
    orderId: string;
  };
};

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  return (
    <OrderDetailContent 
      storeId={params.storeId} 
      orderId={params.orderId} 
    />
  );
} 