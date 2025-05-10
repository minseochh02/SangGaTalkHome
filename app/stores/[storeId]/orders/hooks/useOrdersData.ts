import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Order, OrderItem, Product } from "@/utils/type";

type ExtendedOrder = Order & {
  items?: (OrderItem & {
    product?: Product
  })[];
  customer_name?: string;
};

interface UseOrdersDataResult {
  orders: ExtendedOrder[];
  loading: boolean;
  error: string | null;
  isOwner: boolean;
  refetch: () => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: number) => Promise<void>;
}

export default function useOrdersData(
  storeId: string,
  userId: string | null
): UseOrdersDataResult {
  const supabase = createClient();
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const fetchStoreAndOrders = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

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

      const isStoreOwner = storeData.user_id === userId;
      setIsOwner(isStoreOwner);

      if (!isStoreOwner) {
        setError("이 스토어의 주문 내역을 볼 수 있는 권한이 없습니다.");
        setLoading(false);
        return;
      }

      // Fetch orders for this store
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
      throw err;
    }
  };

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchStoreAndOrders();
    }
  }, [storeId, userId]);

  return {
    orders,
    loading,
    error,
    isOwner,
    refetch: fetchStoreAndOrders,
    updateOrderStatus
  };
} 