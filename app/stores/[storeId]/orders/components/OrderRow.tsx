import React from "react";
import OrderStatusBadge from "./OrderStatusBadge";
import OrderDetails from "./OrderDetails";
import { formatOrderId, formatRelativeTime, formatPrice, isNewOrder } from "../utils/orderFormatUtils";
import { Order, OrderItem, Product, ExtendedOrder } from "@/utils/type";

interface OrderRowProps {
  order: ExtendedOrder;
  isExpanded: boolean;
  onToggleExpand: () => void;
  updateOrderStatus: (orderId: string, newStatus: number) => Promise<void>;
}

export default function OrderRow({ 
  order, 
  isExpanded, 
  onToggleExpand,
  updateOrderStatus
}: OrderRowProps) {
  const isNew = isNewOrder(order.created_at);
  
  return (
    <React.Fragment>
      <tr className={`hover:bg-gray-50 ${isNew ? 'animate-pulse bg-yellow-50' : ''}`}>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {formatOrderId(order.order_id)}
          {isNew && (
            <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">신규</span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {formatRelativeTime(order.created_at)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {order.customer_name || '알 수 없음'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {formatPrice(order.sgt_total)} SGT
          <br />
          {formatPrice(order.won_total)}원
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <OrderStatusBadge status={order.status} />
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <button 
            onClick={onToggleExpand}
            className="text-primary hover:underline mr-3"
          >
            {isExpanded ? '접기' : '상세보기'}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <OrderDetails 
            order={order} 
            updateOrderStatus={updateOrderStatus} 
          />
        </tr>
      )}
    </React.Fragment>
  );
} 