import { OrderItem, Product, ExtendedOrder } from "@/utils/type";

export const formatOrderId = (orderId: string): string => {
  return orderId.substring(0, 8) + "...";
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('ko-KR');
};

export const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const orderDate = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - orderDate.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}초 전`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}분 전`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  } else {
    return formatDateTime(dateString);
  }
};

export const formatPrice = (price: number): string => {
  return price.toLocaleString();
};

export const isNewOrder = (createdAt: string, thresholdMinutes: number = 5): boolean => {
  const now = new Date();
  const orderDate = new Date(createdAt);
  const diffInMinutes = (now.getTime() - orderDate.getTime()) / (1000 * 60);
  
  return diffInMinutes <= thresholdMinutes;
}; 