import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Order, OrderItem, Product } from "@/utils/type";

type ExtendedOrder = Order & {
  items?: (OrderItem & {
    product?: Product
  })[];
  customer_name?: string;
};

interface UseOrdersSubscriptionProps {
  storeId: string;
  onNewOrder?: (order: ExtendedOrder) => void;
  onOrderUpdate?: (order: ExtendedOrder) => void;
}

export default function useOrdersSubscription({
  storeId,
  onNewOrder,
  onOrderUpdate
}: UseOrdersSubscriptionProps) {
  const supabase = createClient();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setupSubscription = async () => {
      try {
        // Subscribe to orders table for any new orders
        const orderChannel = supabase
          .channel('orders-channel')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'orders',
            },
            async (payload) => {
              const newOrder = payload.new as Order;
              
              // Get order items for this order
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
                .eq("order_id", newOrder.order_id);
                
              if (orderItemsError) {
                console.error('Error fetching order items:', orderItemsError);
                return;
              }
              
              // Check if any of the items are from this store
              const storeItems = orderItemsData?.filter(
                item => item.products?.store_id === storeId
              );
              
              if (!storeItems || storeItems.length === 0) {
                return; // Skip if none of the items are from this store
              }
              
              // Get wallet info for customer name
              const { data: walletData, error: walletError } = await supabase
                .from("wallets")
                .select("wallet_id, wallet_name")
                .eq("wallet_id", newOrder.wallet_id)
                .single();
                
              if (walletError && walletError.code !== 'PGRST116') { // Not found error
                console.error('Error fetching wallet:', walletError);
              }
              
              // Create extended order object
              const extendedOrder: ExtendedOrder = {
                ...newOrder,
                items: storeItems,
                customer_name: walletData?.wallet_name || '알 수 없음'
              };
              
              // Notify about new order
              if (onNewOrder) {
                onNewOrder(extendedOrder);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orders',
            },
            async (payload) => {
              const updatedOrder = payload.new as Order;
              
              // Get order items for this order to check if it's relevant
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
                .eq("order_id", updatedOrder.order_id);
                
              if (orderItemsError) {
                console.error('Error fetching order items:', orderItemsError);
                return;
              }
              
              // Check if any of the items are from this store
              const storeItems = orderItemsData?.filter(
                item => item.products?.store_id === storeId
              );
              
              if (!storeItems || storeItems.length === 0) {
                return; // Skip if none of the items are from this store
              }
              
              // Get wallet info for customer name
              const { data: walletData, error: walletError } = await supabase
                .from("wallets")
                .select("wallet_id, wallet_name")
                .eq("wallet_id", updatedOrder.wallet_id)
                .single();
                
              if (walletError && walletError.code !== 'PGRST116') { // Not found error
                console.error('Error fetching wallet:', walletError);
              }
              
              // Create extended order object
              const extendedOrder: ExtendedOrder = {
                ...updatedOrder,
                items: storeItems,
                customer_name: walletData?.wallet_name || '알 수 없음'
              };
              
              // Notify about updated order
              if (onOrderUpdate) {
                onOrderUpdate(extendedOrder);
              }
            }
          )
          .subscribe();
          
        setIsSubscribed(true);
        
        return () => {
          supabase.removeChannel(orderChannel);
        };
      } catch (err) {
        console.error('Error setting up subscription:', err);
        setError('주문 실시간 알림 설정 중 오류가 발생했습니다.');
      }
    };
    
    setupSubscription();
    
    return () => {
      // Cleanup done by the function returned from setupSubscription
    };
  }, [storeId, supabase, onNewOrder, onOrderUpdate]);

  return { isSubscribed, error };
} 