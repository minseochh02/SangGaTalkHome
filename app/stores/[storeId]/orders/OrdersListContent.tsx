"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import OrderRow from "./components/OrderRow";
import OrderFilters from "./components/OrderFilters";
import NewOrderNotification from "./components/NewOrderNotification";
import ProductStatsDashboard from "./components/ProductStatsDashboard";
import useOrdersData from "./hooks/useOrdersData";
import useOrdersSubscription from "./hooks/useOrdersSubscription";
import { Order, OrderItem, Product, ExtendedOrder } from "@/utils/type";

export default function OrdersListContent({ storeId }: { storeId: string }) {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  
  // Get the user
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
  
  // Use our custom hooks
  const { 
    orders, 
    loading, 
    error, 
    isOwner, 
    refetch, 
    updateOrderStatus 
  } = useOrdersData(storeId, user?.id);
  
  // Handle new order notifications
  const handleNewOrder = (newOrder: ExtendedOrder) => {
    setShowNotification(true);
    refetch(); // Refresh the orders list
  };
  
  const handleOrderUpdate = (updatedOrder: ExtendedOrder) => {
    refetch(); // Simply refresh all orders when an update occurs
  };
  
  // Subscribe to real-time updates
  const { isSubscribed, error: subscriptionError } = useOrdersSubscription({
    storeId,
    onNewOrder: handleNewOrder,
    onOrderUpdate: handleOrderUpdate
  });

  // Toggle expanded order
  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
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
      {/* New order notification */}
      <NewOrderNotification 
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
      />
      
      <div className="flex flex-col space-y-6 mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">주문 관리</h1>
          
          <OrderFilters 
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        </div>
        
        <Link href={`/stores/${storeId}`} className="text-sm text-gray-500 hover:underline">
          ← 스토어 페이지로 돌아가기
        </Link>
      </div>
      
      {/* Add Product Statistics Dashboard */}
      <ProductStatsDashboard storeId={storeId} />

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
                  <OrderRow
                    key={order.order_id}
                    order={order}
                    isExpanded={expandedOrderId === order.order_id}
                    onToggleExpand={() => toggleExpandOrder(order.order_id)}
                    updateOrderStatus={updateOrderStatus}
                    storeId={storeId}
                  />
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 