import React from "react";

interface OrderStatusBadgeProps {
  status: number;
}

export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return "주문 접수";
      case 1: return "결제 완료";
      case 2: return "배송 준비중";
      case 3: return "배송중";
      case 4: return "배송 완료";
      case 5: return "주문 취소";
      default: return "알 수 없음";
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return "bg-yellow-100 text-yellow-800";
      case 1: return "bg-blue-100 text-blue-800";
      case 2: return "bg-purple-100 text-purple-800";
      case 3: return "bg-indigo-100 text-indigo-800";
      case 4: return "bg-green-100 text-green-800";
      case 5: return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(status)}`}>
      {getStatusText(status)}
    </span>
  );
} 