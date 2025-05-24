'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SafeImage } from '@/components/ui/image';

// Types for cart items
interface CartItem {
  product_id: string;
  product_name: string;
  sgt_price: number;
  quantity: number;
  image_url?: string | null;
  options?: { groupId: string; name: string; choiceId: string; price_impact: number }[];
  krw_price?: number;
}

// Type for store options
interface StoreOptions {
  kiosk_dine_in_enabled: boolean;
  kiosk_takeout_enabled: boolean;
  kiosk_delivery_enabled: boolean;
}

// Interface for KioskOrder (ensure this matches your actual structure or shared type)
interface KioskOrder {
  kiosk_order_id: string;
  store_id: string;
  status: string;
  kiosk_session_id?: string;
  // Add other fields as needed from your kiosk_orders table
}

// Original PaymentMethod type, card_payment will be removed
type OrderTypeOption = 'kiosk_dine_in' | 'kiosk_takeout' | 'kiosk_delivery';

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
  const [totalAmount, setTotalAmount] = useState<number>(0); // This is SGT amount
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [storeOptions, setStoreOptions] = useState<StoreOptions>({
    kiosk_dine_in_enabled: false,
    kiosk_takeout_enabled: false,
    kiosk_delivery_enabled: false
  });
  const [exchangeRate, setExchangeRate] = useState<number>(1000); // Default KRW/SGT exchange rate

  // State for session-wide "order ready" notifications for OTHER orders
  const [actionableNotification, setActionableNotification] = useState<{ title: string; message: string; orderId: string } | null>(null);
  const [showActionableModal, setShowActionableModal] = useState<boolean>(false);
  const [notifiedOrderIdsThisSession, setNotifiedOrderIdsThisSession] = useState<string[]>([]);
  const orderNotificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const orderVibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load cart from localStorage and fetch store details
  useEffect(() => {
    let isActive = true; // Track component mount state
    
    const initialize = async () => {
      if (!isActive) return;
      
      try {
        setIsLoading(true);
        
        // Load cart data
        try {
          const storedCart = localStorage.getItem(`kiosk-cart-${storeId}`);
          if (storedCart) {
            const parsedCart = JSON.parse(storedCart);
            if (isActive) {
              setCartItems(parsedCart);
              // Calculate total SGT amount
              const totalSgt = parsedCart.reduce(
                (sum: number, item: CartItem) => sum + (item.sgt_price * item.quantity) + 
                                                (item.options?.reduce((optSum, opt) => optSum + opt.price_impact, 0) || 0) * item.quantity,
                0
              );
              setTotalAmount(totalSgt);
            }
          } else {
            // If no cart, redirect back to kiosk main page
            if (isActive) router.push(`/kiosk/${storeId}${sessionId ? `?sessionId=${sessionId}` : ''}`);
            return;
          }
        } catch (err) {
          console.error('Error loading cart from localStorage:', err);
          if (isActive) {
            setError('장바구니를 불러오는데 실패했습니다.');
          }
        }
        
        // Fetch exchange rate from localStorage or use default
        try {
          const storedRate = localStorage.getItem('sgt-exchange-rate');
          if (storedRate) {
            setExchangeRate(parseFloat(storedRate));
          }
        } catch (err) {
          console.error('Error loading exchange rate:', err);
        }
        
        // Fetch store data if component is still mounted
        if (isActive && storeId) {
          try {
            const { data, error } = await supabase
              .from('stores')
              .select('store_name, kiosk_dine_in_enabled, kiosk_takeout_enabled, kiosk_delivery_enabled')
              .eq('store_id', storeId)
              .single();
              
            if (error) {
              console.error('Error fetching store details:', error);
              if (isActive) setError('스토어 정보를 불러오는데 실패했습니다.');
            } else if (data && isActive) {
              setStoreName(data.store_name);
              setStoreOptions({
                kiosk_dine_in_enabled: data.kiosk_dine_in_enabled,
                kiosk_takeout_enabled: data.kiosk_takeout_enabled,
                kiosk_delivery_enabled: data.kiosk_delivery_enabled
              });
            }
          } catch (err) {
            console.error('Error in fetchStoreDetails:', err);
            if (isActive) setError('스토어 정보를 불러오는데 실패했습니다.');
          }
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    
    initialize();
    
    return () => {
      isActive = false; // Mark component as unmounted
    };
  }, [storeId, supabase, router, sessionId]);

  // Effect for initializing notification sound
  useEffect(() => {
    orderNotificationAudioRef.current = new Audio('/notification-sound.mp3');
    return () => {
      if (orderNotificationAudioRef.current) {
        orderNotificationAudioRef.current.pause();
        orderNotificationAudioRef.current = null;
      }
    };
  }, []);

  const playKioskNotificationSound = useCallback(() => {
    if (orderNotificationAudioRef.current) {
      orderNotificationAudioRef.current.currentTime = 0;
      orderNotificationAudioRef.current.play().catch(err => {
        console.error('[CheckoutPage] Error playing notification sound:', err);
      });
    }
  }, []);

  const startRepeatingVibration = useCallback(() => {
    if (orderVibrationIntervalRef.current) {
      clearInterval(orderVibrationIntervalRef.current);
    }
    if ('vibrate' in navigator) {
      orderVibrationIntervalRef.current = setInterval(() => {
        navigator.vibrate(400);
      }, 1000);
    } else {
      console.log('[CheckoutPage] Vibration API not supported.');
    }
  }, []);

  const stopRepeatingVibration = useCallback(() => {
    if (orderVibrationIntervalRef.current) {
      clearInterval(orderVibrationIntervalRef.current);
      orderVibrationIntervalRef.current = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }, []);
  
  const handleCloseActionableModal = useCallback(() => {
    setShowActionableModal(false);
    stopRepeatingVibration();
  }, [stopRepeatingVibration]);

  // Check for sold out items
  useEffect(() => {
    if (cartItems.length === 0 && !isLoading) { // check isLoading to prevent redirect on initial load
        // router.push(`/kiosk/${storeId}`); // Decided to keep user on page if cart becomes empty by sold out
        return;
    };
    
    let isActive = true;
    let alreadyChecking = false;
    
    const checkForSoldOutItems = async () => {
      if (alreadyChecking || !isActive || cartItems.length === 0) return; // Add cartItems.length check
      
      alreadyChecking = true;
      try {
        const productIds = cartItems.map(item => item.product_id);
        if (productIds.length === 0) return; // No items to check
        
        const { data } = await supabase
          .from('products')
          .select('product_id, product_name, is_sold_out')
          .in('product_id', productIds)
          .eq('is_sold_out', true);
          
        if (!isActive) return;
        
        if (data && data.length > 0) {
          const soldOutNames = data.map(item => {
            const cartItem = cartItems.find(ci => ci.product_id === item.product_id);
            return cartItem?.product_name || '알 수 없는 상품';
          });
          
          alert(`주문 중 다음 상품이 품절되었습니다:\n${soldOutNames.join('\n')}\n\n장바구니로 돌아가 주문을 수정해 주세요.`);
          
          const updatedCart = cartItems.filter(
            item => !data.some(soldOut => soldOut.product_id === item.product_id)
          );
          
          if (isActive) {
            setCartItems(updatedCart);
            localStorage.setItem(`kiosk-cart-${storeId}`, JSON.stringify(updatedCart));
            
            const totalSgt = updatedCart.reduce(
                 (sum: number, item: CartItem) => sum + (item.sgt_price * item.quantity) + 
                                                (item.options?.reduce((optSum, opt) => optSum + opt.price_impact, 0) || 0) * item.quantity,
                0
              );
            setTotalAmount(totalSgt);
            
            if (updatedCart.length === 0) {
              alert('장바구니의 모든 상품이 품절되어 키오스크 메인으로 돌아갑니다.');
              router.push(`/kiosk/${storeId}${sessionId ? `?sessionId=${sessionId}` : ''}`);
            }
          }
        }
      } catch (err) {
        console.error('Error checking sold out items:', err);
      } finally {
        alreadyChecking = false;
      }
    };
    
    checkForSoldOutItems();
    
    return () => {
      isActive = false;
    };
  }, [cartItems, storeId, router, supabase, sessionId, isLoading]);

  // Add real-time subscription for product updates during checkout
  useEffect(() => {
    if (!storeId || cartItems.length === 0) return;
    
    let isActive = true;
    
    const productChannel = supabase
      .channel(`checkout-product-updates-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          if (!isActive) return;
          
          const updatedProduct = payload.new as any;
          console.log(`[Checkout] Product update received: ${updatedProduct.product_id}, sold_out: ${updatedProduct.is_sold_out}`);
          
          if (updatedProduct.is_sold_out) {
            const affectedItem = cartItems.find(item => item.product_id === updatedProduct.product_id);
            
            if (affectedItem) {
              alert(`'${affectedItem.product_name}' 상품이 품절되어 장바구니에서 제거됩니다.`);
              
              const updatedCart = cartItems.filter(item => item.product_id !== updatedProduct.product_id);
              setCartItems(updatedCart);
              
              try {
                localStorage.setItem(`kiosk-cart-${storeId}`, JSON.stringify(updatedCart));
              } catch (err) {
                console.error('Error updating cart in localStorage:', err);
              }
              
              const totalSgt = updatedCart.reduce(
                (sum: number, item: CartItem) => sum + (item.sgt_price * item.quantity) + 
                                               (item.options?.reduce((optSum, opt) => optSum + opt.price_impact, 0) || 0) * item.quantity,
               0
              );
              setTotalAmount(totalSgt);
              
              if (updatedCart.length === 0 && isActive) {
                alert('모든 상품이 품절되어 키오스크 메인 화면으로 돌아갑니다.');
                router.push(`/kiosk/${storeId}${sessionId ? `?sessionId=${sessionId}` : ''}`);
              }
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Checkout] Subscribed to product updates for store ${storeId}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[Checkout] Product updates channel error:`, err);
        }
      });
    
    return () => {
      isActive = false;
      supabase.removeChannel(productChannel);
      console.log(`[Checkout] Unsubscribed from product updates`);
    };
  }, [storeId, cartItems, router, supabase, sessionId]);

  // Effect for initializing session-wide Kiosk Order Status Subscription (for OTHER orders in the session)
  useEffect(() => {
    if (!sessionId) {
      console.log('[CheckoutPage] No sessionId, skipping order status subscription.');
      return;
    }

    const orderStatusChannel = supabase
      .channel(`checkout-page-session-order-updates-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kiosk_orders',
          filter: `kiosk_session_id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as KioskOrder;
          const oldOrder = payload.old as Partial<KioskOrder>; 

          console.log(`[CheckoutPage] Session order update for session ${sessionId}: Order ID ${updatedOrder.kiosk_order_id}, New Status: ${updatedOrder.status}, Old Status: ${oldOrder?.status}`);
          
          if (updatedOrder.status === 'ready' && oldOrder?.status !== 'ready') {
            if (!notifiedOrderIdsThisSession.includes(updatedOrder.kiosk_order_id)) {
              console.log(`[CheckoutPage] Order ${updatedOrder.kiosk_order_id} is newly ready. Triggering notification.`);
              const notificationDetails = {
                orderId: updatedOrder.kiosk_order_id,
                title: '주문 준비 완료!',
                message: `주문 #${updatedOrder.kiosk_order_id.substring(0, 8).toUpperCase()} 준비가 완료되었습니다. 확인 후 수령해주세요.`,
              };
              setActionableNotification(notificationDetails);
              setShowActionableModal(true);
              playKioskNotificationSound();
              startRepeatingVibration();
              setNotifiedOrderIdsThisSession(prev => [...prev, updatedOrder.kiosk_order_id]);
            } else {
              console.log(`[CheckoutPage] Order ${updatedOrder.kiosk_order_id} is ready, but already notified this session on this page.`);
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[CheckoutPage] Subscribed to session order updates on CheckoutPage for session ${sessionId}`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[CheckoutPage] Channel error/timeout for order updates on CheckoutPage ${sessionId}:`, err);
        }
      });
    
    return () => {
      if (orderStatusChannel) {
        supabase.removeChannel(orderStatusChannel);
        console.log(`[CheckoutPage] Unsubscribed from session order updates on CheckoutPage for session ${sessionId}`);
      }
      stopRepeatingVibration(); 
    };
  }, [sessionId, notifiedOrderIdsThisSession, playKioskNotificationSound, startRepeatingVibration, stopRepeatingVibration, handleCloseActionableModal]);

  // UPDATED: handleOrderSubmit will now create a preliminary order and redirect to /payment page
  const handleOrderSubmit = async (orderType: OrderTypeOption) => {
    if (isSubmitting || cartItems.length === 0) return;
    
    setIsSubmitting(true);
    setError(null); // Clear previous errors
    
    // Calculate total_amount_krw using the current exchangeRate
    const calculatedTotalAmountKRW = Math.round(totalAmount * exchangeRate);

    try {
      // For delivery, first redirect to the delivery address page to gather address
      if (orderType === 'kiosk_delivery') {
        // Pass current cart total (SGT) and session info to delivery address page
        router.push(`/kiosk/${storeId}/delivery-address?totalAmountSGT=${totalAmount}&sessionId=${sessionId || ''}&deviceNumber=${deviceNumber || ''}&orderType=${orderType}`);
        // The delivery address page will then handle order creation and redirect to /payment
        setIsSubmitting(false); // Allow submission again if user navigates back
        return;
      }
      
      // 1. Create new kiosk order with 'pending_payment' status
      const { data: orderData, error: orderError } = await supabase
        .from('kiosk_orders')
        .insert({
          store_id: storeId,
          order_type: orderType,
          total_amount: totalAmount, // Store SGT amount
          total_amount_krw: calculatedTotalAmountKRW, // Store KRW amount
          status: 'pending_payment', // New status
          device_number: deviceNumber ? parseInt(deviceNumber) : null,
          created_at: new Date().toISOString(),
          kiosk_session_id: sessionId,
          // payment_method will be set after payment
        })
        .select('kiosk_order_id')
        .single();
        
      if (orderError || !orderData) {
        console.error('Error creating preliminary kiosk order:', orderError);
        setError('주문 준비 중 오류가 발생했습니다. 다시 시도해 주세요.');
        setIsSubmitting(false);
        return;
      }
      
      const kioskOrderId = orderData.kiosk_order_id;
      
      // 2. Create order items linked to this new order
      const orderItemsToInsert = cartItems.map(item => ({
        kiosk_order_id: kioskOrderId,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.sgt_price, // Base SGT price per unit
        // total_price_at_purchase: (item.sgt_price + (item.options?.reduce((sum, opt) => sum + opt.price_impact, 0) || 0)) * item.quantity, // Total SGT for this line item
        created_at: new Date().toISOString()
      }));
      
      const { data: insertedItemsData, error: itemsError } = await supabase
        .from('kiosk_order_items')
        .insert(orderItemsToInsert)
        .select('kiosk_order_item_id, product_id'); // Select to get IDs for options
        
      if (itemsError) {
        console.error('Error creating kiosk order items:', itemsError);
        // Attempt to clean up the preliminary order if items fail? Or mark as failed?
        // For now, proceed to payment, but log this error.
        // Consider a rollback or error state for the order.
        setError('주문 항목 저장 중 오류가 발생했습니다.');
        // To be safe, might not want to proceed to payment if items fail to save.
        // For now, we'll let it proceed but this is a point of attention.
      }

      // 3. Save order item options if items were successfully created
      if (insertedItemsData && insertedItemsData.length > 0) {
        const allOptionRecords = [];
        for (const cartItem of cartItems) {
          if (!cartItem.options || cartItem.options.length === 0) continue;
          
          const correspondingOrderItem = insertedItemsData.find(
            (insItem) => insItem.product_id === cartItem.product_id
          );

          if (correspondingOrderItem) {
            const itemOptionRecords = cartItem.options.map(option => ({
              kiosk_order_item_id: correspondingOrderItem.kiosk_order_item_id,
              option_group_id: option.groupId, // Assuming this ID exists in your DB or is just for reference
              option_group_name: option.name.split(':')[0].trim(),
              option_choice_id: option.choiceId, // Assuming this ID exists
              option_choice_name: option.name.split(':')[1]?.trim() || option.name,
              price_impact: option.price_impact, // SGT price impact
              created_at: new Date().toISOString()
            }));
            allOptionRecords.push(...itemOptionRecords);
          }
        }
        if (allOptionRecords.length > 0) {
          const { error: optionsError } = await supabase
            .from('kiosk_order_item_options')
            .insert(allOptionRecords);
          if (optionsError) {
            console.error('Error saving order item options:', optionsError);
            setError('주문 옵션 저장 중 오류가 발생했습니다.');
            // Similar to item error, consider implications for proceeding.
          }
        }
      }
      
      // 4. Redirect to the new payment page
      const orderName = `${storeName} - ${orderType === 'kiosk_dine_in' ? '매장식사' : '포장'}`; // Example order name
      
      // Clear cart from localStorage *before* redirecting to payment page.
      // If payment fails on the payment page, the user would need to start a new order.
      localStorage.removeItem(`kiosk-cart-${storeId}`);

      router.push(
        `/kiosk/${storeId}/payment?kioskOrderId=${kioskOrderId}&orderName=${encodeURIComponent(orderName)}&totalAmountSGT=${totalAmount}&orderType=${orderType}&originalSessionId=${sessionId || ''}&originalDeviceNumber=${deviceNumber || ''}`
      );

    } catch (err) {
      console.error('Error in order submission process:', err);
      setError('주문 처리 중 예기치 않은 오류가 발생했습니다. 다시 시도해 주세요.');
      setIsSubmitting(false);
    } 
    // No finally { setIsSubmitting(false) } here because we are redirecting
  };

  // UPDATED: handleOptionSelect to only handle dine-in, takeout, delivery
  const handleOptionSelect = (option: 'dine-in' | 'takeout' | 'delivery') => {
    if (isSubmitting) return;
    
    let orderType: OrderTypeOption;
    let optionName: string;
    
    switch (option) {
      case 'dine-in':
        orderType = 'kiosk_dine_in';
        optionName = '매장 에서';
        break;
      case 'takeout':
        orderType = 'kiosk_takeout';
        optionName = '가져가기';
        break;
      case 'delivery':
        orderType = 'kiosk_delivery';
        optionName = '배달';
        break;
      // No default needed as type is constrained
    }
    
    if (confirm(`${optionName}로 주문을 진행하시겠습니까? (결제 페이지로 이동합니다)`)) {
      handleOrderSubmit(orderType);
    }
  };

  // Format price with commas
  const formatPrice = (price: number): string => {
    return price.toLocaleString();
  };
  
  // Convert SGT to KRW
  const convertToKRW = (sgtAmount: number): number => {
    return Math.round(sgtAmount * exchangeRate);
  };

  // UPDATED: renderOrderOptions to remove card payment
  const renderOrderOptions = () => {
    const availableOptionsCount = [
      storeOptions.kiosk_dine_in_enabled,
      storeOptions.kiosk_takeout_enabled,
      storeOptions.kiosk_delivery_enabled,
    ].filter(Boolean).length;

    if (availableOptionsCount === 0 && !isLoading) { // check isLoading
      return (
        <div className="py-8 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 mb-4">
            현재 이용 가능한 주문 옵션이 없습니다.
          </p>
          <Link 
            href={`/kiosk/${storeId}${sessionId ? `?sessionId=${sessionId}` : ''}`}
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
            disabled={isSubmitting || cartItems.length === 0}
          >
            <div className="w-12 h-12 flex items-center justify-center bg-red-100 text-red-700 rounded-full mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg">매장에서</h3>
              <p className="text-gray-600">매장 내에서 수령할 경우 선택하세요</p>
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
            disabled={isSubmitting || cartItems.length === 0}
          >
            <div className="w-12 h-12 flex items-center justify-center bg-orange-100 text-orange-700 rounded-full mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg">가져가기</h3>
              <p className="text-gray-600">가져가실 경우 선택하세요</p>
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
            disabled={isSubmitting || cartItems.length === 0}
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

  if (isLoading && cartItems.length === 0) { // Added cartItems.length check for initial loading
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  if (cartItems.length === 0 && !isLoading) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          <h2 className="text-xl font-bold mb-3">장바구니가 비었습니다.</h2>
          <p className="text-gray-600 mb-6">상품을 담고 다시 주문해주세요.</p>
          <Link 
            href={`/kiosk/${storeId}${sessionId ? `?sessionId=${sessionId}` : ''}`}
            className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            상품 보러가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-red-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="mr-2 p-1 rounded-md hover:bg-red-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
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
                {cartItems.map((item, index) => ( // Added index for key
                  <div key={`${item.product_id}-${index}`} className="flex justify-between py-2">
                    <div>
                      <span className="font-medium">{item.product_name}</span>
                      <span className="text-gray-500 ml-2">x{item.quantity}</span>
                       {item.options && item.options.length > 0 && (
                        <div className="text-xs text-gray-500 pl-2">
                          {item.options.map(opt => opt.name).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium flex items-center gap-1 flex-row justify-end">
                        {formatPrice(convertToKRW(
                           (item.sgt_price + (item.options?.reduce((sum, opt) => sum + opt.price_impact, 0) || 0)) * item.quantity
                        ))}원
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1 flex-row justify-end">
                        {formatPrice(
                           (item.sgt_price + (item.options?.reduce((sum, opt) => sum + opt.price_impact, 0) || 0)) * item.quantity
                        )} SGT
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between items-center text-lg font-bold">
              <span>총 결제 금액</span>
              <div className="text-right">
                <div className="text-red-600 flex items-center gap-1 flex-row justify-end">
                  {formatPrice(convertToKRW(totalAmount))}원
                </div>
                <div className="text-sm text-gray-500 font-normal flex items-center gap-1 flex-row justify-end">
                  {formatPrice(totalAmount)} SGT
                </div>
              </div>
            </div>
          </div>
          
          {/* Payment method selection (no PortOne UI here anymore) */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">주문 방법을 선택해주세요</h2>
            
            {isSubmitting ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">주문 정보를 생성 중입니다...</p>
              </div>
            ) : (
              renderOrderOptions()
            )}
          </div>
        </div>
      </div>

      {/* Order Ready Modal Notification for other orders in session (remains the same) */}
      {showActionableModal && actionableNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[990] p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-md w-full mx-auto text-center animate-pop-in">
            {/* Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-green-100 mb-4 sm:mb-5">
              <svg className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            {/* Title */}
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">
              {actionableNotification.title}
            </h3>
            
            {/* Message */}
            <p className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-6">
              {actionableNotification.message}
            </p>
            
            {/* Confirm Button */}
            <button
              onClick={handleCloseActionableModal}
              className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-semibold text-base sm:text-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors duration-150"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 