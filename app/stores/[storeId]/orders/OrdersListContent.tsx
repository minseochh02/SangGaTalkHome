"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { Order, OrderItem, Product } from "@/utils/type";

type ExtendedOrder = Order & {
  items?: (OrderItem & {
    product?: Product
  })[];
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
};

export default function OrdersListContent({ storeId }: { storeId: string }) {
  const supabase = createClient();
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // First, check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user: authUser },
          error,
        } = await supabase.auth.getUser();
        setUser(authUser || null);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };

    checkAuth();
  }, [supabase]);

  // Then, fetch store and orders data
  useEffect(() => {
    const fetchStoreAndOrders = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // First, check if the current user is the store owner
        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select("user_id")
          .eq("store_id", storeId)
          .single();

        if (storeError) {
          throw storeError;
        }

        const isStoreOwner = storeData.user_id === user.id;
        setIsOwner(isStoreOwner);

        if (!isStoreOwner) {
          setError("이 스토어의 주문 내역을 볼 수 있는 권한이 없습니다.");
          setLoading(false);
          return;
        }

        // Fetch orders for this store
        // To do this, we need to:
        // 1. Get all order items that have products from this store
        // 2. Get the corresponding orders
        const { data: orderItemsData, error: orderItemsError } = await supabase
          .from("order_items")
          .select(`
            order_items_id,
            order_id,
            product_id,
            quantity,
            won_price,
            sgt_price,
            created_at,
            products:product_id(*)
          `)
          .eq("products.store_id", storeId);

        if (orderItemsError) {
          throw orderItemsError;
        }

        if (!orderItemsData || orderItemsData.length === 0) {
          setOrders([]);
          setLoading(false);
          return;
        }

        // Get unique order IDs
        const orderIds = Array.from(new Set(orderItemsData.map(item => item.order_id)));

        // Fetch the orders
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select(`
            *,
            wallets:wallet_id(wallet_id, wallet_name)
          `)
          .in("order_id", orderIds)
          .order("created_at", { ascending: false });

        if (ordersError) {
          throw ordersError;
        }

        // Combine orders with their items
        const extendedOrders: ExtendedOrder[] = ordersData.map(order => {
          const orderItems = orderItemsData.filter(item => item.order_id === order.order_id);
          return {
            ...order,
            items: orderItems,
            customer_name: order.wallets?.wallet_name || '알 수 없음'
          };
        });

        setOrders(extendedOrders);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("주문 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStoreAndOrders();
    }
  }, [storeId, user, supabase]);

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

  const updateOrderStatus = async (orderId: string, newStatus: number) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("order_id", orderId);

      if (error) throw error;

      // Update the local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.order_id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (err) {
      console.error("Error updating order status:", err);
      alert("주문 상태 업데이트 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg">주문 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="bg-yellow-50 p-4 rounded-md">
          <p className="text-yellow-700">이 스토어의 주문 내역을 볼 수 있는 권한이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col space-y-6 mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">주문 관리</h1>
          
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setStatusFilter(null)} 
              className={`px-3 py-1 rounded-md ${statusFilter === null ? 'bg-primary text-white' : 'bg-gray-100'}`}
            >
              전체
            </button>
            {[0, 1, 2, 3, 4, 5].map(status => (
              <button 
                key={status}
                onClick={() => setStatusFilter(status)} 
                className={`px-3 py-1 rounded-md ${statusFilter === status ? 'bg-primary text-white' : getStatusColor(status)}`}
              >
                {getStatusText(status)}
              </button>
            ))}
          </div>
        </div>
        
        <Link href={`/stores/${storeId}`} className="text-sm text-gray-500 hover:underline">
          ← 스토어 페이지로 돌아가기
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">주문 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주문번호</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주문일시</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">고객</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders
                .filter(order => statusFilter === null || order.status === statusFilter)
                .map(order => (
                  <React.Fragment key={order.order_id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.order_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.sgt_total.toLocaleString()} SGT
                        <br />
                        {order.won_total.toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button 
                          onClick={() => setExpandedOrderId(expandedOrderId === order.order_id ? null : order.order_id)}
                          className="text-primary hover:underline mr-3"
                        >
                          {expandedOrderId === order.order_id ? '접기' : '상세보기'}
                        </button>
                      </td>
                    </tr>
                    {expandedOrderId === order.order_id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="border-t border-gray-200 pt-4">
                            <h3 className="font-medium mb-3">주문 상품</h3>
                            <div className="space-y-4">
                              {order.items?.map(item => (
                                <div key={item.order_items_id} className="flex items-center gap-4 pb-2 border-b border-gray-100">
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
                                      {item.quantity}개 × {item.sgt_price.toLocaleString()} SGT ({item.won_price.toLocaleString()}원)
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">{(item.sgt_price * item.quantity).toLocaleString()} SGT</p>
                                    <p className="text-sm text-gray-500">{(item.won_price * item.quantity).toLocaleString()}원</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="mt-4 bg-gray-100 p-3 rounded">
                              <p><strong>배송지:</strong> {order.shipping_address}</p>
                              <p className="mt-2">
                                <strong>배송비:</strong> {order.sgt_shipping_cost.toLocaleString()} SGT ({order.won_shipping_cost.toLocaleString()}원)
                              </p>
                            </div>
                            
                            <div className="mt-6">
                              <h3 className="font-medium mb-3">주문 상태 변경</h3>
                              <div className="flex flex-wrap gap-2">
                                {[0, 1, 2, 3, 4, 5].map(status => (
                                  <button 
                                    key={status}
                                    onClick={() => updateOrderStatus(order.order_id, status)}
                                    disabled={order.status === status}
                                    className={`px-3 py-1 rounded-md ${
                                      order.status === status 
                                        ? 'bg-gray-300 text-gray-700 cursor-not-allowed' 
                                        : getStatusColor(status) + ' hover:opacity-80'
                                    }`}
                                  >
                                    {getStatusText(status)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 