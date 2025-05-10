import React from "react";
import OrderActions from "./OrderActions";
import { formatPrice } from "../utils/orderFormatUtils";
import { Order, OrderItem, Product, ExtendedOrder } from "@/utils/type";

interface OrderDetailsProps {
  order: ExtendedOrder;
  updateOrderStatus: (orderId: string, newStatus: number) => Promise<void>;
}

export default function OrderDetails({ order, updateOrderStatus }: OrderDetailsProps) {
  return (
    <td colSpan={6} className="px-6 py-4 bg-gray-50">
      <div className="border-t border-gray-200 pt-4">
        <h3 className="font-medium mb-3">주문 상품</h3>
        <div className="space-y-4">
          {order.items?.map(item => (
            <div 
              key={item.order_items_id} 
              className="flex items-center gap-4 pb-2 border-b border-gray-100"
            >
              {item.product?.image_url && (
                <img 
                  src={item.product.image_url} 
                  alt={item.product?.product_name} 
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <p className="font-medium">{item.product?.product_name || '삭제된 상품'}</p>
                <p className="text-sm text-gray-500">
                  {item.quantity}개 × {formatPrice(item.sgt_price)} SGT ({formatPrice(item.won_price)}원)
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatPrice(item.sgt_price * item.quantity)} SGT</p>
                <p className="text-sm text-gray-500">{formatPrice(item.won_price * item.quantity)}원</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 bg-gray-100 p-3 rounded">
          <p><strong>배송지:</strong> {order.shipping_address}</p>
          <p className="mt-2">
            <strong>배송비:</strong> {formatPrice(order.sgt_shipping_cost)} SGT ({formatPrice(order.won_shipping_cost)}원)
          </p>
        </div>
        
        <OrderActions 
          orderId={order.order_id} 
          currentStatus={order.status} 
          updateOrderStatus={updateOrderStatus} 
        />
      </div>
    </td>
  );
} 