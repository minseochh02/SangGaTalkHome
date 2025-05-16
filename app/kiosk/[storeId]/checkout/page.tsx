'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Types for cart items
interface CartItem {
  product_id: string;
  product_name: string;
  sgt_price: number;
  quantity: number;
  image_url?: string | null;
}

// Type for store options
interface StoreOptions {
  kiosk_dine_in_enabled: boolean;
  kiosk_takeout_enabled: boolean;
  kiosk_delivery_enabled: boolean;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = params.storeId as string;
  const sessionId = searchParams.get('sessionId');
  const deviceNumber = searchParams.get('deviceNumber');
  const supabase = createClient();

  // State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [storeName, setStoreName] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [storeOptions, setStoreOptions] = useState<StoreOptions>({
    kiosk_dine_in_enabled: false,
    kiosk_takeout_enabled: false,
    kiosk_delivery_enabled: false
  });

  // Load cart from localStorage and fetch store details
  useEffect(() => {
    const loadCart = () => {
      try {
        const storedCart = localStorage.getItem(`kiosk-cart-${storeId}`);
        if (storedCart) {
          const parsedCart = JSON.parse(storedCart);
          setCartItems(parsedCart);
          // Calculate total
          const total = parsedCart.reduce(
            (sum: number, item: CartItem) => sum + (item.sgt_price * item.quantity), 0
          );
          setTotalAmount(total);
        }
      } catch (err) {
        console.error('Error loading cart from localStorage:', err);
        setError('장바구니를 불러오는데 실패했습니다.');
      }
    };

    const fetchStoreDetails = async () => {
      if (!storeId) return;
      
      try {
        setIsLoading(true);
        
        // Fetch store data
        const { data, error } = await supabase
          .from('stores')
          .select('store_name, kiosk_dine_in_enabled, kiosk_takeout_enabled, kiosk_delivery_enabled')
          .eq('store_id', storeId)
          .single();
          
        if (error) {
          console.error('Error fetching store details:', error);
          setError('스토어 정보를 불러오는데 실패했습니다.');
        } else if (data) {
          setStoreName(data.store_name);
          setStoreOptions({
            kiosk_dine_in_enabled: data.kiosk_dine_in_enabled,
            kiosk_takeout_enabled: data.kiosk_takeout_enabled,
            kiosk_delivery_enabled: data.kiosk_delivery_enabled
          });
        }
      } catch (err) {
        console.error('Error in fetchStoreDetails:', err);
        setError('스토어 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
    fetchStoreDetails();
  }, [storeId]);

  // Check for sold out items
  useEffect(() => {
    const checkForSoldOutItems = async () => {
      try {
        if (cartItems.length === 0) return;
        
        // Get product IDs from cart
        const productIds = cartItems.map(item => item.product_id);
        
        // Check if any products are sold out
        const { data } = await supabase
          .from('products')
          .select('product_id, product_name, is_sold_out')
          .in('product_id', productIds)
          .eq('is_sold_out', true);
          
        if (data && data.length > 0) {
          // Some items are now sold out
          const soldOutNames = data.map(item => {
            const cartItem = cartItems.find(ci => ci.product_id === item.product_id);
            return cartItem?.product_name || '알 수 없는 상품';
          });
          
          alert(`주문 중 다음 상품이 품절되었습니다:\n${soldOutNames.join('\n')}\n\n장바구니로 돌아가 주문을 수정해 주세요.`);
          
          // Remove sold out items from cart and update localStorage
          const updatedCart = cartItems.filter(
            item => !data.some(soldOut => soldOut.product_id === item.product_id)
          );
          
          setCartItems(updatedCart);
          localStorage.setItem(`kiosk-cart-${storeId}`, JSON.stringify(updatedCart));
          
          // Recalculate total
          const total = updatedCart.reduce(
            (sum, item) => sum + (item.sgt_price * item.quantity), 0
          );
          setTotalAmount(total);
          
          // If cart is now empty, go back to kiosk page
          if (updatedCart.length === 0) {
            router.push(`/kiosk/${storeId}`);
          }
        }
      } catch (err) {
        console.error('Error checking sold out items:', err);
      }
    };
    
    checkForSoldOutItems();
  }, [cartItems, storeId, router]);

  // Submit order with selected option
  const handleOrderSubmit = async (orderType: 'kiosk_dine_in' | 'kiosk_takeout' | 'kiosk_delivery') => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Create new kiosk order - use the same fields as the mobile app
      const { data: orderData, error: orderError } = await supabase
        .from('kiosk_orders')
        .insert({
          store_id: storeId,
          order_type: orderType,
          total_amount: totalAmount,
          status: 'completed',
          device_number: deviceNumber ? parseInt(deviceNumber) : null,
          // Include any additional fields that might be required
          created_at: new Date().toISOString()
        })
        .select('kiosk_order_id')
        .single();
        
      if (orderError || !orderData) {
        console.error('Error creating kiosk order:', orderError);
        setError('주문을 처리하는 중에 오류가 발생했습니다. 다시 시도해 주세요.');
        setIsSubmitting(false);
        return;
      }
      
      const kioskOrderId = orderData.kiosk_order_id;
      
      // Create order items with all required fields
      const orderItems = cartItems.map(item => ({
        kiosk_order_id: kioskOrderId,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.sgt_price,
        created_at: new Date().toISOString()
      }));
      
      const { error: itemsError } = await supabase
        .from('kiosk_order_items')
        .insert(orderItems);
        
      if (itemsError) {
        console.error('Error creating kiosk order items:', itemsError);
        // Continue to success page even if items have an error
      }
      
      // Clear cart in localStorage
      localStorage.removeItem(`kiosk-cart-${storeId}`);
      
      // Navigate to success page
      router.push(`/kiosk/${storeId}/success?orderId=${kioskOrderId}&orderType=${orderType}&sessionId=${sessionId}`);
    } catch (err) {
      console.error('Error in order submission:', err);
      setError('결제 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle option selection
  const handleOptionSelect = (option: 'dine-in' | 'takeout' | 'delivery') => {
    if (isSubmitting) return;
    
    let orderType: 'kiosk_dine_in' | 'kiosk_takeout' | 'kiosk_delivery';
    let optionName: string;
    
    switch (option) {
      case 'dine-in':
        orderType = 'kiosk_dine_in';
        optionName = '매장 식사';
        break;
      case 'takeout':
        orderType = 'kiosk_takeout';
        optionName = '포장';
        break;
      case 'delivery':
        orderType = 'kiosk_delivery';
        optionName = '배달';
        break;
      default:
        orderType = 'kiosk_dine_in';
        optionName = '매장 식사';
    }
    
    if (confirm(`${optionName}로 주문을 진행하시겠습니까?`)) {
      handleOrderSubmit(orderType);
    }
  };

  // Format price with commas
  const formatPrice = (price: number): string => {
    return price.toLocaleString();
  };

  // Render order options
  const renderOrderOptions = () => {
    // Count available options
    const availableOptionsCount = [
      storeOptions.kiosk_dine_in_enabled,
      storeOptions.kiosk_takeout_enabled,
      storeOptions.kiosk_delivery_enabled
    ].filter(Boolean).length;

    if (availableOptionsCount === 0) {
      return (
        <div className="py-8 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 mb-4">
            현재 이용 가능한 주문 옵션이 없습니다.
          </p>
          <Link 
            href={`/kiosk/${storeId}`}
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            돌아가기
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {storeOptions.kiosk_dine_in_enabled && (
          <button 
            className="w-full p-4 border rounded-lg flex items-center hover:bg-gray-50 transition-colors"
            onClick={() => handleOptionSelect('dine-in')}
            disabled={isSubmitting}
          >
            <div className="w-12 h-12 flex items-center justify-center bg-red-100 text-red-700 rounded-full mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg">매장에서</h3>
              <p className="text-gray-600">매장 내에서 드실 경우 선택하세요</p>
            </div>
            <div className="ml-auto">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}

        {storeOptions.kiosk_takeout_enabled && (
          <button 
            className="w-full p-4 border rounded-lg flex items-center hover:bg-gray-50 transition-colors"
            onClick={() => handleOptionSelect('takeout')}
            disabled={isSubmitting}
          >
            <div className="w-12 h-12 flex items-center justify-center bg-orange-100 text-orange-700 rounded-full mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg">포장</h3>
              <p className="text-gray-600">포장해서 가져가실 경우 선택하세요</p>
            </div>
            <div className="ml-auto">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}

        {storeOptions.kiosk_delivery_enabled && (
          <button 
            className="w-full p-4 border rounded-lg flex items-center hover:bg-gray-50 transition-colors"
            onClick={() => handleOptionSelect('delivery')}
            disabled={isSubmitting}
          >
            <div className="w-12 h-12 flex items-center justify-center bg-green-100 text-green-700 rounded-full mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg">배달</h3>
              <p className="text-gray-600">배달 받으실 경우 선택하세요</p>
            </div>
            <div className="ml-auto">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-red-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Link href={`/kiosk/${storeId}`} className="mr-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold">주문 방법 선택</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 container mx-auto p-4">
        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {/* Order summary */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-4">{storeName}</h2>
            
            <div className="border-t border-b py-4 my-4">
              <div className="max-h-48 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.product_id} className="flex justify-between py-2">
                    <div>
                      <span className="font-medium">{item.product_name}</span>
                      <span className="text-gray-500 ml-2">x{item.quantity}</span>
                    </div>
                    <span className="font-medium">{formatPrice(item.sgt_price * item.quantity)}원</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between items-center text-lg font-bold">
              <span>총 결제 금액</span>
              <span className="text-red-600">{formatPrice(totalAmount)}원</span>
            </div>
          </div>
          
          {/* Order options */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">주문 방법을 선택해주세요</h2>
            
            {isSubmitting ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">주문을 처리 중입니다...</p>
              </div>
            ) : (
              renderOrderOptions()
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 