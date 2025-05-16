import React from "react";
import { getStatusText, getStatusButtonColor } from "../utils/orderStatusUtils";

interface OrderActionsProps {
  orderId: string;
  currentStatus: number;
  updateOrderStatus: (orderId: string, newStatus: number) => Promise<void>;
}

export default function OrderActions({ 
  orderId, 
  currentStatus, 
  updateOrderStatus 
}: OrderActionsProps) {
  return (
    <div className="mt-6">
      <h3 className="font-medium mb-3">주문 상태 변경</h3>
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map(status => (
          <button 
            key={status}
            onClick={() => updateOrderStatus(orderId, status)}
            disabled={currentStatus === status}
            className={`px-3 py-1 rounded-md ${getStatusButtonColor(status, currentStatus)}`}
          >
            {getStatusText(status)}
          </button>
        ))}
      </div>
    </div>
  );
} 