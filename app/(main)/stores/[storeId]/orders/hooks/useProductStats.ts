import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  totalSold: number;
  topSellingProducts: {
    product_id: string;
    product_name: string;
    image_url: string | null;
    sold_count: number;
  }[];
  loading: boolean;
  error: string | null;
}

interface OrderItemProduct {
  product_id: string;
  product_name: string;
  image_url: string | null;
  store_id: string;
}

interface OrderItem {
  order_items_id: string;
  quantity: number;
  products: OrderItemProduct | null;
}

export default function useProductStats(storeId: string): ProductStats {
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    activeProducts: 0,
    totalSold: 0,
    topSellingProducts: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchProductStats = async () => {
      if (!storeId) return;
      
      try {
        const supabase = createClient();
        
        // Get all products count
        const { count: totalCount, error: totalError } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("store_id", storeId);
          
        if (totalError) throw totalError;
        
        // Get active products count (status = 1)
        const { count: activeCount, error: activeError } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("store_id", storeId)
          .eq("status", 1);
          
        if (activeError) throw activeError;
        
        // Get order items for this store's products
        const { data, error: itemsError } = await supabase
          .from("order_items")
          .select(`
            order_items_id,
            quantity,
            products:product_id (
              product_id, 
              product_name,
              image_url,
              store_id
            )
          `)
          .not("products", "is", null);
          
        if (itemsError) throw itemsError;
        
        const orderItemsData = data as unknown as OrderItem[];
        
        // Filter for only this store's products
        const storeOrderItems = orderItemsData.filter(
          item => item.products?.store_id === storeId
        );
        
        // Calculate total sold items
        const totalSold = storeOrderItems.reduce(
          (sum, item) => sum + (item.quantity || 0), 
          0
        );
        
        // Calculate top selling products
        const productSales: Record<string, {
          product_id: string;
          product_name: string;
          image_url: string | null;
          sold_count: number;
        }> = {};
        
        storeOrderItems.forEach(item => {
          if (!item.products?.product_id) return;
          
          const productId = item.products.product_id;
          
          if (!productSales[productId]) {
            productSales[productId] = {
              product_id: productId,
              product_name: item.products.product_name || "알 수 없는 상품",
              image_url: item.products.image_url,
              sold_count: 0
            };
          }
          
          productSales[productId].sold_count += (item.quantity || 0);
        });
        
        // Get top 5 selling products
        const topSellingProducts = Object.values(productSales)
          .sort((a, b) => b.sold_count - a.sold_count)
          .slice(0, 5);
        
        setStats({
          totalProducts: totalCount || 0,
          activeProducts: activeCount || 0,
          totalSold,
          topSellingProducts,
          loading: false,
          error: null
        });
        
      } catch (err) {
        console.error("Error fetching product stats:", err);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: "상품 통계를 불러오는 중 오류가 발생했습니다."
        }));
      }
    };

    fetchProductStats();
  }, [storeId]);

  return stats;
} 