import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface KioskOrder {
  order_id: string;
  store_id: string;
  status: string;
  created_at: string;
  device_number?: number;
  total_amount?: number;
  order_items?: any[]; // Simplified for this example
  // Add other fields as needed
}

interface KioskOrdersManagementProps {
  storeId: string;
}

export default function KioskOrdersManagement({ storeId }: KioskOrdersManagementProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<KioskOrder[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Function to fetch pending orders
    async function fetchOrders() {
      setIsLoading(true);
      try {
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

        setOrders(data || []);
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
                setOrders((prevOrders) => 
                  [newOrder, ...prevOrders].sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )
                );
              }
            } else if (payload.eventType === 'UPDATE') {
              setOrders((prevOrders) => {
                // Filter out orders that are now ready_for_pickup or completed
                const updatedOrders = prevOrders
                  .map((order) => order.order_id === newOrder.order_id ? newOrder : order)
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
            supabase
              .from('kiosk_orders')
              .select('*')
              .eq('store_id', storeId)
              .in('status', ['pending', 'processing'])
              .order('created_at', { ascending: false })
              .then(({ data, error }) => {
                if (error) console.error('Manual refresh error', error);
                else setOrders(data || []);
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
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주문 ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">단말기</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주문 시간</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.order_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.order_id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.device_number ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        단말기 {order.device_number}번
                      </span>
                    ) : (
                      <span className="text-gray-400">정보 없음</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : order.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status === 'pending' ? '대기 중' : 
                       order.status === 'processing' ? '처리 중' : order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.total_amount ? `${order.total_amount.toLocaleString()} SGT` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.created_at)}
                    <div className="text-xs text-gray-400">{getTimeAgo(order.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleMarkAsReady(order.order_id, order.device_number)}
                      className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1 rounded"
                    >
                      완료
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>완료 버튼을 누르면 해당 키오스크 단말기에 알림이 전송됩니다.</p>
      </div>
    </div>
  );
} 