import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface OrderItemOption {
  option_id: string;
  option_group_name: string;
  option_choice_name: string;
  price_impact: number;
}

interface OrderItem {
  kiosk_order_item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price_at_purchase: number;
  options?: OrderItemOption[];
}

// Interface for item data from database with products relation
interface OrderItemData {
  kiosk_order_item_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  products?: {
    product_name?: string;
  } | null;
}

interface KioskOrder {
  order_id: string;
  kiosk_order_id?: string;
  store_id: string;
  status: string;
  created_at: string;
  device_number?: number;
  total_amount?: number;
  order_type?: string;
  delivery_address?: string;
  delivery_address_detail?: string;
  delivery_phone?: string;
  delivery_note?: string;
  order_items?: OrderItem[];
}

// Interface for database query results
interface ProductRelation {
  product_name: string;
  [key: string]: any;
}

interface KioskOrdersManagementProps {
  storeId: string;
}

export default function KioskOrdersManagement({ storeId }: KioskOrdersManagementProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<KioskOrder[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const supabase = createClient();

  // Toggle order details expansion
  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  useEffect(() => {
    // Function to fetch pending orders
    async function fetchOrders() {
      setIsLoading(true);
      try {
        // Fetch basic order information
        const { data, error } = await supabase
          .from('kiosk_orders')
          .select('*')
          .eq('store_id', storeId)
          .in('status', ['pending', 'processing']) // Only get orders needing attention
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching kiosk orders:', error);
          throw error;
        }

        // Fetch order items and options for each order
        const ordersWithDetails = await Promise.all((data || []).map(async (order) => {
          // Fetch order items
          const { data: itemsData, error: itemsError } = await supabase
            .from('kiosk_order_items')
            .select(`
              kiosk_order_item_id,
              product_id,
              quantity,
              price_at_purchase,
              products:product_id (product_name)
            `)
            .eq('kiosk_order_id', order.kiosk_order_id);

          if (itemsError) {
            console.error('Error fetching order items:', itemsError);
            return { ...order, order_items: [] };
          }

          // Format items with product names
          const formattedItems = (itemsData || []).map(item => {
            // Use type assertion for products property
            return {
              kiosk_order_item_id: item.kiosk_order_item_id,
              product_id: item.product_id,
              product_name: (item.products as any)?.product_name || '알 수 없는 상품',
              quantity: item.quantity,
              price_at_purchase: item.price_at_purchase,
              options: [] // Initialize empty options array
            };
          });

          // Fetch options for each order item
          const itemsWithOptions = await Promise.all(formattedItems.map(async (item) => {
            const { data: optionsData, error: optionsError } = await supabase
              .from('kiosk_order_item_options')
              .select('*')
              .eq('kiosk_order_item_id', item.kiosk_order_item_id);

            if (optionsError) {
              console.error('Error fetching item options:', optionsError);
              return item;
            }

            return {
              ...item,
              options: optionsData || []
            };
          }));

          return {
            ...order,
            order_items: itemsWithOptions
          };
        }));

        setOrders(ordersWithDetails);
      } catch (error) {
        console.error('Failed to fetch kiosk orders:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (storeId) {
      fetchOrders(); // Initial fetch

      // Set up Supabase real-time subscription
      const channel = supabase
        .channel(`kiosk-orders-admin-${storeId}`)
        .on(
          'postgres_changes',
          { 
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public', 
            table: 'kiosk_orders',
            filter: `store_id=eq.${storeId}` // Filter for the current store
          },
          (payload) => {
            console.log('Kiosk order change received!', payload);
            const newOrder = payload.new as KioskOrder;
            const oldOrder = payload.old as KioskOrder;

            if (payload.eventType === 'INSERT') {
              // Only add if it's a pending or processing order
              if (newOrder.status === 'pending' || newOrder.status === 'processing') {
                // Fetch the complete order details including items and options
                fetchOrderDetails(newOrder).then(orderWithDetails => {
                  setOrders((prevOrders) => 
                    [orderWithDetails, ...prevOrders].sort((a, b) => 
                      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                  );
                });
              }
            } else if (payload.eventType === 'UPDATE') {
              setOrders((prevOrders) => {
                // Filter out orders that are now ready_for_pickup or completed
                const updatedOrders = prevOrders
                  .map((order) => order.order_id === newOrder.order_id ? {...order, ...newOrder} : order)
                  .filter(order => 
                    order.status === 'pending' || order.status === 'processing'
                  );
                return updatedOrders.sort((a, b) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
              });
            } else if (payload.eventType === 'DELETE') {
              setOrders((prevOrders) =>
                prevOrders.filter((order) => order.order_id !== oldOrder.order_id)
              );
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to kiosk_orders changes for store:', storeId);
          }
          if (status === 'CHANNEL_ERROR') {
            console.error(`Realtime channel error for store ${storeId}:`, err);
          }
          if (status === 'TIMED_OUT') {
            console.warn(`Realtime subscription timed out for store ${storeId}`);
          }
        });
      
      // Clean up subscription on component unmount
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [storeId, supabase]);

  // Helper function to fetch complete order details for a new order
  const fetchOrderDetails = async (order: KioskOrder): Promise<KioskOrder> => {
    try {
      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from('kiosk_order_items')
        .select(`
          kiosk_order_item_id,
          product_id,
          quantity,
          price_at_purchase,
          products:product_id (product_name)
        `)
        .eq('kiosk_order_id', order.kiosk_order_id);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        return order;
      }

      // Format items with product names
      const formattedItems = (itemsData || []).map(item => {
        // Use type assertion for products property
        return {
          kiosk_order_item_id: item.kiosk_order_item_id,
          product_id: item.product_id,
          product_name: (item.products as any)?.product_name || '알 수 없는 상품',
          quantity: item.quantity,
          price_at_purchase: item.price_at_purchase,
          options: [] // Initialize empty options array
        };
      });

      // Fetch options for each order item
      const itemsWithOptions = await Promise.all(formattedItems.map(async (item) => {
        const { data: optionsData, error: optionsError } = await supabase
          .from('kiosk_order_item_options')
          .select('*')
          .eq('kiosk_order_item_id', item.kiosk_order_item_id);

        if (optionsError) {
          console.error('Error fetching item options:', optionsError);
          return item;
        }

        return {
          ...item,
          options: optionsData || []
        };
      }));

      return {
        ...order,
        order_items: itemsWithOptions
      };
    } catch (error) {
      console.error('Error fetching order details:', error);
      return order;
    }
  };

  // Function to format dates
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 MM월 dd일 HH:mm:ss', { locale: ko });
    } catch (e) {
      return dateString || '날짜 없음';
    }
  };

  // Function to get time ago
  const getTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ko });
    } catch (e) {
      return '';
    }
  };

  // Function to format price with commas
  const formatPrice = (price: number): string => {
    return price.toLocaleString();
  };

  // Function to get order type display text
  const getOrderTypeText = (orderType?: string): string => {
    switch (orderType) {
      case 'kiosk_dine_in': return '매장에서';
      case 'kiosk_takeout': return '가져가기';
      case 'kiosk_delivery': return '배달';
      default: return '알 수 없음';
    }
  };

  // Function to mark an order as ready for pickup
  const handleMarkAsReady = async (orderId: string, deviceNumber?: number) => {
    try {
      console.log(`Marking order ${orderId} as ready for pickup (Device: ${deviceNumber})`);
      
      const { error } = await supabase
        .from('kiosk_orders')
        .update({ 
          status: 'ready_for_pickup',
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId);

      if (error) {
        console.error('Error marking order as ready:', error);
        alert('주문 상태 업데이트 중 오류가 발생했습니다.');
        return;
      }

      alert('주문이 준비 완료로 표시되었습니다. 키오스크에 알림이 전송되었습니다.');
    } catch (error) {
      console.error('Failed to mark order as ready:', error);
      alert('주문 상태 업데이트 중 오류가 발생했습니다.');
    }
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="mt-8 p-4">
        <h2 className="text-xl font-bold mb-4">키오스크 주문 관리</h2>
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">키오스크 주문 관리</h2>
        <button 
          onClick={() => {
            // Manual refresh if needed
            setIsLoading(true);
            setOrders([]);
            setExpandedOrderId(null);
            
            supabase
              .from('kiosk_orders')
              .select('*')
              .eq('store_id', storeId)
              .in('status', ['pending', 'processing'])
              .order('created_at', { ascending: false })
              .then(async ({ data, error }) => {
                if (error) {
                  console.error('Manual refresh error', error);
                  setIsLoading(false);
                  return;
                }
                
                // Fetch details for all orders
                const ordersWithDetails = await Promise.all((data || []).map(fetchOrderDetails));
                setOrders(ordersWithDetails);
                setIsLoading(false);
              });
          }}
          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm flex items-center"
          title="실시간으로 자동 업데이트됩니다."
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          새로고침
        </button>
      </div>
      
      {orders.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          현재 처리 중인 키오스크 주문이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.order_id || Math.random().toString()} className="border rounded-lg overflow-hidden">
              {/* Order header - always visible */}
              <div 
                className="flex flex-wrap justify-between items-center p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => toggleOrderDetails(order.order_id)}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    {formatDate(order.created_at).split(' ')[2]} {/* Just show the day part */}
                  </span>
                  <span className="text-sm text-gray-500">
                    {getTimeAgo(order.created_at)}
                  </span>
                  {order.device_number && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      단말기 {order.device_number}번
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : order.status === 'processing'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status === 'pending' ? '대기 중' : 
                     order.status === 'processing' ? '처리 중' : order.status || '상태 없음'}
                  </span>
                  {order.order_type && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {getOrderTypeText(order.order_type)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className="font-semibold">
                    {order.total_amount ? `${formatPrice(order.total_amount)} SGT` : '-'}
                  </span>
                  <svg 
                    className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedOrderId === order.order_id ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {/* Order details - expanded view */}
              {expandedOrderId === order.order_id && (
                <div className="border-t p-4">
                  {/* Order items */}
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">주문 상품</h4>
                    <div className="space-y-3">
                      {order.order_items && order.order_items.length > 0 ? (
                        order.order_items.map((item) => (
                          <div key={item.kiosk_order_item_id} className="bg-gray-50 p-3 rounded">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium">{item.product_name}</span>
                                <span className="text-gray-500 ml-2">x{item.quantity}</span>
                              </div>
                              <span>{formatPrice(item.price_at_purchase * item.quantity)} SGT</span>
                            </div>
                            
                            {/* Options for this item */}
                            {item.options && item.options.length > 0 && (
                              <div className="mt-2 pl-4 border-l-2 border-gray-200">
                                {item.options.map((option) => (
                                  <div key={option.option_id} className="text-sm flex justify-between items-center py-1">
                                    <span className="text-gray-700">
                                      {option.option_group_name}: <span className="font-medium">{option.option_choice_name}</span>
                                    </span>
                                    {option.price_impact !== 0 && (
                                      <span className={`${option.price_impact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {option.price_impact > 0 ? '+' : ''}{formatPrice(option.price_impact)} SGT
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm italic">주문 상품 정보가 없습니다.</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Delivery information (if available) */}
                  {order.order_type === 'kiosk_delivery' && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">배달 정보</h4>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="mb-1"><span className="font-medium">주소:</span> {order.delivery_address}</p>
                        {order.delivery_address_detail && (
                          <p className="mb-1"><span className="font-medium">상세주소:</span> {order.delivery_address_detail}</p>
                        )}
                        {order.delivery_phone && (
                          <p className="mb-1"><span className="font-medium">연락처:</span> {order.delivery_phone}</p>
                        )}
                        {order.delivery_note && (
                          <p><span className="font-medium">요청사항:</span> {order.delivery_note}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent toggle
                        handleMarkAsReady(order.order_id || '', order.device_number);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors shadow-sm"
                      disabled={!order.order_id}
                    >
                      주문 준비 완료
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-500">
        <p>완료 버튼을 누르면 해당 키오스크 단말기에 알림이 전송됩니다.</p>
        <p className="mt-1">주문 항목을 클릭하면 상세 정보를 확인할 수 있습니다.</p>
      </div>
    </div>
  );
} 