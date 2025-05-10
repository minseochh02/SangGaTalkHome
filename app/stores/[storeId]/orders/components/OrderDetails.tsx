import React from "react";
import OrderActions from "./OrderActions";
import ReceiptToggleButton from "./ReceiptToggleButton";
import { formatPrice, formatDateTime } from "../utils/orderFormatUtils";
import { Order, OrderItem, Product, ExtendedOrder } from "@/utils/type";

interface OrderDetailsProps {
  order: ExtendedOrder;
  updateOrderStatus: (orderId: string, newStatus: number) => Promise<void>;
}

export default function OrderDetails({ order, updateOrderStatus }: OrderDetailsProps) {
  // Add null checks for items array
  const items = order.items || [];
  
  const totalItemsCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalProductPrice = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.sgt_price || 0)), 0);
  const totalProductWonPrice = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.won_price || 0)), 0);

  return (
    <td colSpan={6} className="px-6 py-4 bg-gray-50">
      <div className="border-t border-gray-200 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column: Order Items */}
          <div className="md:col-span-2">
            <h3 className="font-medium mb-3">주문 상품 ({totalItemsCount}개)</h3>
            <div className="space-y-4">
              {items.map(item => (
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
                      {item.quantity || 0}개 × {formatPrice(item.sgt_price)} SGT ({formatPrice(item.won_price)}원)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice((item.sgt_price || 0) * (item.quantity || 0))} SGT</p>
                    <p className="text-sm text-gray-500">{formatPrice((item.won_price || 0) * (item.quantity || 0))}원</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 bg-gray-100 p-3 rounded">
              <div className="flex justify-between py-1">
                <span className="text-gray-600">상품 금액</span>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(totalProductPrice)} SGT</p>
                  <p className="text-sm text-gray-500">{formatPrice(totalProductWonPrice)}원</p>
                </div>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">배송비</span>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(order.sgt_shipping_cost)} SGT</p>
                  <p className="text-sm text-gray-500">{formatPrice(order.won_shipping_cost)}원</p>
                </div>
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 font-bold">
                <span>총 결제 금액</span>
                <div className="text-right">
                  <p>{formatPrice(order.sgt_total)} SGT</p>
                  <p className="text-sm text-gray-700">{formatPrice(order.won_total)}원</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column: Customer Information and Order Management */}
          <div className="space-y-4">
            <div className="bg-white p-3 rounded border border-gray-200">
              <h3 className="font-medium mb-2 pb-1 border-b">고객 정보</h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">고객명</span>
                  <span className="font-medium">{order.customer_name || '알 수 없음'}</span>
                </div>
                {order.customer_wallet && (
                  <div className="flex flex-col">
                    <span className="text-gray-600">지갑 주소</span>
                    <span className="font-medium text-xs break-all">{order.customer_wallet}</span>
                  </div>
                )}
                <div className="flex justify-between mt-2 pt-1 border-t border-gray-100">
                  <span className="text-gray-600">주문일시</span>
                  <span className="font-medium">{order.created_at ? formatDateTime(order.created_at) : '-'}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-3 rounded border border-gray-200">
              <h3 className="font-medium mb-2 pb-1 border-b">배송 정보</h3>
              <div className="flex flex-col">
                <span className="text-gray-600 mb-1">배송지</span>
                <span className="font-medium text-sm">{order.shipping_address || '정보 없음'}</span>
              </div>
            </div>
            
            <div className="bg-white p-3 rounded border border-gray-200">
              <h3 className="font-medium mb-2 pb-1 border-b">영수증 설정</h3>
              <div className="flex flex-col">
                <ReceiptToggleButton 
                  orderId={order.order_id} 
                  initialReceiptEnabled={order.generate_receipt} 
                  className="mt-1" 
                />
                <p className="text-xs text-gray-500 mt-2">
                  영수증 활성화 시 고객은 주문 완료 후 영수증을 발급받을 수 있습니다.
                </p>
              </div>
            </div>
            
            <OrderActions 
              orderId={order.order_id} 
              currentStatus={order.status} 
              updateOrderStatus={updateOrderStatus} 
            />
          </div>
        </div>
      </div>
    </td>
  );
} 