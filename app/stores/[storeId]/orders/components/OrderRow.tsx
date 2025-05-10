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
  storeId: string;
}

export default function OrderRow({ 
  order, 
  isExpanded, 
  onToggleExpand,
  updateOrderStatus,
  storeId
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
            className="text-primary hover:underline flex items-center"
          >
            {isExpanded ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                접기
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                주문 상세보기
              </>
            )}
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