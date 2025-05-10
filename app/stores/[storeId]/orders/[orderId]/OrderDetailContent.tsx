"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Order, OrderItem, Product, ExtendedOrder } from "@/utils/type";
import { formatDateTime, formatPrice } from "@/app/stores/[storeId]/orders/utils/orderFormatUtils";
import OrderStatusBadge from "@/app/stores/[storeId]/orders/components/OrderStatusBadge";
import OrderActions from "@/app/stores/[storeId]/orders/components/OrderActions";

interface OrderDetailContentProps {
  storeId: string;
  orderId: string;
}

export default function OrderDetailContent({ storeId, orderId }: OrderDetailContentProps) {
  const supabase = createClient();
  const [order, setOrder] = useState<ExtendedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);

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

  // Fetch store and order data
  useEffect(() => {
    const fetchOrderData = async () => {
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

        // Fetch the specific order
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select(`
            *,
            wallets:wallet_id(wallet_id, wallet_name, wallet_address)
          `)
          .eq("order_id", orderId)
          .single();

        if (orderError) {
          throw orderError;
        }

        // Fetch order items for this order
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
          .eq("order_id", orderId);

        if (orderItemsError) {
          throw orderItemsError;
        }

        // Check if any of the items are from this store
        const storeItems = orderItemsData.filter(
          item => item?.products && typeof item.products === 'object' && 'store_id' in item.products && item.products.store_id === storeId
        );

        if (storeItems.length === 0) {
          setError("해당 주문에 이 스토어의 상품이 없습니다.");
          setLoading(false);
          return;
        }

        // Create extended order object
        const extendedOrder: ExtendedOrder = {
          ...orderData,
          items: orderItemsData,
          customer_name: orderData.wallets?.wallet_name || '알 수 없음',
          customer_wallet: orderData.wallets?.wallet_address
        };

        setOrder(extendedOrder);
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("주문 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOrderData();
    }
  }, [storeId, orderId, user, supabase]);

  const updateOrderStatus = async (orderId: string, newStatus: number) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("order_id", orderId);

      if (error) throw error;

      // Update the local state
      if (order) {
        setOrder(prevOrder => {
          if (!prevOrder) return null;
          return { ...prevOrder, status: newStatus };
        });
      }
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
          <Link 
            href={`/stores/${storeId}/orders`} 
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            ← 주문 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="bg-yellow-50 p-4 rounded-md">
          <p className="text-yellow-700">이 스토어의 주문 내역을 볼 수 있는 권한이 없습니다.</p>
          <Link 
            href={`/stores/${storeId}`} 
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            ← 스토어 페이지로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="bg-yellow-50 p-4 rounded-md">
          <p className="text-yellow-700">주문 정보를 찾을 수 없습니다.</p>
          <Link 
            href={`/stores/${storeId}/orders`} 
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            ← 주문 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const totalItemsCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalProductPrice = order.items?.reduce((sum, item) => sum + (item.quantity * item.sgt_price), 0) || 0;
  const totalProductWonPrice = order.items?.reduce((sum, item) => sum + (item.quantity * item.won_price), 0) || 0;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col space-y-6 mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">주문 상세 정보</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 justify-between">
          <Link href={`/stores/${storeId}/orders`} className="text-sm text-gray-500 hover:underline">
            ← 주문 목록으로 돌아가기
          </Link>
          <span className="text-sm text-gray-500">
            주문일시: {formatDateTime(order.created_at)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Items Section - Takes 2/3 width on large screens */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">주문 상품 ({totalItemsCount}개)</h2>
            <div className="space-y-6">
              {order.items?.map(item => (
                <div 
                  key={item.order_items_id} 
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-gray-100"
                >
                  {item.product?.image_url && (
                    <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded overflow-hidden">
                      <img 
                        src={item.product.image_url} 
                        alt={item.product?.product_name || '상품 이미지'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{item.product?.product_name || '삭제된 상품'}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatPrice(item.sgt_price)} SGT ({formatPrice(item.won_price)}원)
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      수량: {item.quantity}개
                    </p>
                  </div>
                  <div className="text-right w-full sm:w-auto">
                    <p className="font-medium">{formatPrice(item.sgt_price * item.quantity)} SGT</p>
                    <p className="text-sm text-gray-500">{formatPrice(item.won_price * item.quantity)}원</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-600">상품 금액</span>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(totalProductPrice)} SGT</p>
                  <p className="text-sm text-gray-500">{formatPrice(totalProductWonPrice)}원</p>
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-600">배송비</span>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(order.sgt_shipping_cost)} SGT</p>
                  <p className="text-sm text-gray-500">{formatPrice(order.won_shipping_cost)}원</p>
                </div>
              </div>
              <div className="flex justify-between mt-4 pt-4 border-t border-gray-200 text-lg font-bold">
                <span>총 결제 금액</span>
                <div className="text-right">
                  <p>{formatPrice(order.sgt_total)} SGT</p>
                  <p className="text-sm text-gray-600">{formatPrice(order.won_total)}원</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer and Order Management Section - Takes 1/3 width on large screens */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">고객 정보</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">고객명</span>
                <span className="font-medium">{order.customer_name}</span>
              </div>
              {order.customer_wallet && (
                <div className="flex justify-between">
                  <span className="text-gray-600">지갑 주소</span>
                  <span className="font-medium text-sm break-all">{order.customer_wallet}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Shipping Information */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">배송 정보</h2>
            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-gray-600 mb-1">배송지</span>
                <span className="font-medium">{order.shipping_address}</span>
              </div>
            </div>
          </div>
          
          {/* Order Status Management */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">주문 상태 관리</h2>
            <OrderActions 
              orderId={order.order_id} 
              currentStatus={order.status} 
              updateOrderStatus={updateOrderStatus} 
            />
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="font-medium mb-2">주문 메모</h3>
              <textarea 
                className="w-full p-3 border border-gray-300 rounded-md text-sm" 
                rows={3}
                placeholder="주문에 대한 메모를 남길 수 있습니다."
                readOnly={true}
                value="고객 메모 기능은 추후 업데이트 예정입니다."
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 