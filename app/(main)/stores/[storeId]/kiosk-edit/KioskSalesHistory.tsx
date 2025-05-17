import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { KioskOrder, KioskOrderItem, Product } from '@/utils/type';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Disclosure } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/24/solid';

interface KioskSalesHistoryProps {
  storeId: string;
}

export default function KioskSalesHistory({ storeId }: KioskSalesHistoryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<KioskOrder[]>([]);
  const [expandedOrderItems, setExpandedOrderItems] = useState<Record<string, KioskOrderItem[]>>({});
  const supabase = createClient();

  useEffect(() => {
    async function fetchKioskOrders() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('kiosk_orders')
          .select('*')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Error fetching kiosk orders:', error);
          throw error;
        }

        setOrders(data || []);
      } catch (error) {
        console.error('Failed to fetch kiosk orders:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (storeId) {
      fetchKioskOrders();
    }
  }, [storeId]);

  const fetchOrderItems = async (kioskOrderId: string) => {
    try {
      // Check if we already have the items
      if (expandedOrderItems[kioskOrderId]?.length > 0) {
        return;
      }

      const { data: orderItems, error: itemsError } = await supabase
        .from('kiosk_order_items')
        .select(`
          *,
          product:products(product_id, product_name, image_url)
        `)
        .eq('kiosk_order_id', kioskOrderId);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        return;
      }

      setExpandedOrderItems(prev => ({
        ...prev,
        [kioskOrderId]: orderItems || []
      }));
    } catch (error) {
      console.error('Failed to fetch order items:', error);
    }
  };

  const toggleOrderExpansion = (kioskOrderId: string) => {
    fetchOrderItems(kioskOrderId);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 MM월 dd일 HH:mm', { locale: ko });
    } catch (e) {
      return dateString || '날짜 없음';
    }
  };

  const getOrderTypeLabel = (orderType: string) => {
    switch (orderType) {
      case 'kiosk_dine_in': return '매장 식사';
      case 'kiosk_takeout': return '포장';
      case 'kiosk_delivery': return '배달';
      default: return orderType;
    }
  };

  if (isLoading) {
    return (
      <div className="mt-8 p-4">
        <h2 className="text-xl font-bold mb-4">키오스크 판매 내역</h2>
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">키오스크 판매 내역</h2>
      
      {orders.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          아직 키오스크 판매 내역이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Disclosure key={order.kiosk_order_id}>
              {({ open }) => (
                <>
                  <Disclosure.Button 
                    className="flex w-full justify-between rounded-lg bg-gray-50 px-4 py-3 text-left text-sm font-medium hover:bg-gray-100 focus:outline-none focus-visible:ring focus-visible:ring-gray-500 focus-visible:ring-opacity-75"
                    onClick={() => toggleOrderExpansion(order.kiosk_order_id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                      <span className="font-semibold">#{order.kiosk_order_id.substring(0, 8)}</span>
                      <span>{formatDate(order.created_at)}</span>
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {getOrderTypeLabel(order.order_type)}
                      </span>
                      {order.device_number !== null && order.device_number !== undefined && (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          단말기 {order.device_number}번
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className="mr-4 font-bold">{Number(order.total_amount).toLocaleString()}<p className="text-xs text-gray-500">SGT</p></span>
                      <ChevronUpIcon
                        className={`${open ? 'rotate-180 transform' : ''} h-5 w-5 text-gray-500`}
                      />
                    </div>
                  </Disclosure.Button>
                  <Disclosure.Panel className="px-4 pt-2 pb-4 text-sm text-gray-500">
                    {expandedOrderItems[order.kiosk_order_id] ? (
                      <div className="mt-2">
                        <div className="mb-2 text-gray-600">
                          {order.device_number !== null && order.device_number !== undefined && (
                            <span className="inline-block mr-3">
                              <span className="font-semibold">키오스크 단말기:</span> {order.device_number}번
                            </span>
                          )}
                          <span className="inline-block">
                            <span className="font-semibold">주문 유형:</span> {getOrderTypeLabel(order.order_type)}
                          </span>
                        </div>
                        <table className="min-w-full border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="py-2 text-left">상품</th>
                              <th className="py-2 text-right">가격</th>
                              <th className="py-2 text-right">수량</th>
                              <th className="py-2 text-right">소계</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expandedOrderItems[order.kiosk_order_id].map((item) => (
                              <tr key={item.kiosk_order_item_id} className="border-b">
                                <td className="py-2 flex items-center">
                                  {item.product?.image_url && (
                                    <img
                                      src={item.product.image_url}
                                      alt={item.product?.product_name || '상품 이미지'}
                                      className="w-10 h-10 object-cover rounded mr-2"
                                    />
                                  )}
                                  <span>{item.product?.product_name || `상품 #${item.product_id.substring(0, 8)}`}</span>
                                </td>
                                <td className="py-2 text-right">{Number(item.price_at_purchase).toLocaleString()}<p className="text-xs text-gray-500">SGT</p></td>
                                <td className="py-2 text-right">{item.quantity}개</td>
                                <td className="py-2 text-right">{(Number(item.price_at_purchase) * item.quantity).toLocaleString()}<p className="text-xs text-gray-500">SGT</p></td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="font-bold">
                              <td colSpan={3} className="py-2 text-right">총계:</td>
                              <td className="py-2 text-right">{Number(order.total_amount).toLocaleString()}<p className="text-xs text-gray-500">SGT</p></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="flex justify-center items-center p-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                        <span className="ml-2">주문 상세 정보를 불러오는 중...</span>
                      </div>
                    )}
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>
          ))}
        </div>
      )}
    </div>
  );
} 