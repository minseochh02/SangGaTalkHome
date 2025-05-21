'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
// import { AddressSuggestions } from '@/components/kiosk/AddressSuggestions'; // Assuming this path - corrected path or remove if not used
// If AddressSuggestions is a local component, adjust the path e.g. './AddressSuggestions'
// For now, if it's not immediately used by the notification logic, let's comment it out to resolve linting unless it's essential for this page's core functionality beyond notifications.

// Set a placeholder delivery fee
const PLACEHOLDER_DELIVERY_FEE = 1; // 1000 SGT

// Define KioskOrder interface (if not already globally available)
interface KioskOrder {
  kiosk_order_id: string;
  kiosk_session_id?: string; // Make sure this is part of your KioskOrder interface for filtering
  store_id: string;
  status: string;
  // other relevant order fields
}

export default function DeliveryAddressPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = params.storeId as string;
  const totalAmount = searchParams.get('totalAmount') ? parseInt(searchParams.get('totalAmount')!) : 0;
  const sessionId = searchParams.get('sessionId');
  const deviceNumber = searchParams.get('deviceNumber');
  const supabase = createClient();

  // Form state
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed total with delivery fee
  const totalWithDelivery = totalAmount + PLACEHOLDER_DELIVERY_FEE;

  // Format price with commas
  const formatPrice = (price: number): string => {
    return price.toLocaleString();
  };

  const [map, setMap] = useState<any>(null); // Keep your map state

  // State for session-wide "order ready" notifications
  const [actionableNotification, setActionableNotification] = useState<{ title: string; message: string; orderId: string } | null>(null);
  const [showActionableModal, setShowActionableModal] = useState<boolean>(false);
  const [notifiedOrderIdsThisSession, setNotifiedOrderIdsThisSession] = useState<string[]>([]);
  const orderNotificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const orderVibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Removed the empty useEffect for storeId as it's not directly used by notification logic
  // and its original purpose in the template was unclear.
  // useEffect(() => {
  // // ... existing code ...
  //   return () => {
  // // ... existing code ...
  //   };
  // }, [storeId]);

  // Effect for initializing notification sound
  useEffect(() => {
    orderNotificationAudioRef.current = new Audio('/notification-sound.mp3'); // Ensure this path is correct
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
        console.error('[DeliveryAddressPage] Error playing notification sound:', err);
      });
    }
  }, []);

  const startRepeatingVibration = useCallback(() => {
    if (orderVibrationIntervalRef.current) {
      clearInterval(orderVibrationIntervalRef.current);
    }
    if ('vibrate' in navigator) {
      orderVibrationIntervalRef.current = setInterval(() => {
        navigator.vibrate(400); // Buzz for 400ms
      }, 1000); // Every 1 second
    } else {
      console.log('[DeliveryAddressPage] Vibration API not supported.');
    }
  }, []);

  const stopRepeatingVibration = useCallback(() => {
    if (orderVibrationIntervalRef.current) {
      clearInterval(orderVibrationIntervalRef.current);
      orderVibrationIntervalRef.current = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0); // Stop any ongoing vibration
    }
  }, []);

  const handleDismissActionableToast = useCallback(() => {
    setShowActionableModal(false);
    stopRepeatingVibration();
    // Do not reset actionableNotification here if you want auto-dismiss to handle it,
    // or setActionableNotification(null) to prevent re-showing for the same notification instance immediately.
  }, [stopRepeatingVibration]);

  const handleCloseActionableModal = useCallback(() => {
    setShowActionableModal(false);
    stopRepeatingVibration();
    // Optionally clear actionableNotification if it shouldn't reappear on next trigger for the same order
    // setActionableNotification(null); 
  }, [stopRepeatingVibration]);

  // Session-wide Kiosk Order Status Subscription for previous orders
  useEffect(() => {
    if (!sessionId || !storeId) return; // Ensure sessionId and storeId are available

    const orderStatusChannel = supabase
      .channel(`delivery-address-page-session-order-updates-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kiosk_orders',
          filter: `kiosk_session_id=eq.${sessionId}`, // Filter by session ID
        },
        (payload) => {
          const updatedOrder = payload.new as KioskOrder;
          const oldOrder = payload.old as Partial<KioskOrder>;

          console.log(`[DeliveryAddressPage] Session order update for session ${sessionId}: Order ID ${updatedOrder.kiosk_order_id}, New Status: ${updatedOrder.status}, Old Status: ${oldOrder?.status}`);
          
          if (updatedOrder.status === 'ready' && oldOrder?.status !== 'ready') {
            if (!notifiedOrderIdsThisSession.includes(updatedOrder.kiosk_order_id)) {
              console.log(`[DeliveryAddressPage] Order ${updatedOrder.kiosk_order_id} is newly ready. Triggering notification.`);
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

              // Auto-dismiss toast after some time -- REMOVED FOR MODAL
              // const dismissTimeout = setTimeout(() => {
              //    // Only dismiss if this specific notification is still showing
              //   if (actionableNotification && actionableNotification.orderId === updatedOrder.kiosk_order_id && showActionableToast) {
              //       handleDismissActionableToast();
              //   }
              // }, 10000); // 10 seconds
              
              // It's good practice to clear timeout if the component unmounts or dependencies change before it fires
              // This might be handled by the main return cleanup of the useEffect if structured carefully
            } else {
              console.log(`[DeliveryAddressPage] Order ${updatedOrder.kiosk_order_id} is ready, but already notified this session on this page.`);
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[DeliveryAddressPage] Subscribed to session order updates for session ${sessionId}`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[DeliveryAddressPage] Channel error/timeout for order updates ${sessionId}:`, err);
        }
      });
    
    return () => {
      if (orderStatusChannel) {
        supabase.removeChannel(orderStatusChannel);
        console.log(`[DeliveryAddressPage] Unsubscribed from session order updates for session ${sessionId}`);
      }
      stopRepeatingVibration(); // Ensure vibration stops on unmount or if sessionId/storeId changes
    };
  }, [sessionId, storeId, supabase, notifiedOrderIdsThisSession, playKioskNotificationSound, startRepeatingVibration, stopRepeatingVibration, handleCloseActionableModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) {
      setError('주소를 입력해주세요.');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('연락처를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create new kiosk order with delivery information
      const { data: orderData, error: orderError } = await supabase
        .from('kiosk_orders')
        .insert({
          store_id: storeId,
          order_type: 'kiosk_delivery',
          total_amount: totalWithDelivery, // Include delivery fee
          status: 'pending',
          device_number: deviceNumber ? parseInt(deviceNumber) : null,
          delivery_address: address,
          delivery_address_detail: detailAddress,
          delivery_phone: phoneNumber,
          delivery_note: deliveryNote,
          delivery_fee: PLACEHOLDER_DELIVERY_FEE,
          created_at: new Date().toISOString(),
          kiosk_session_id: sessionId,
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
      
      // Create order items using the cart data from localStorage
      try {
        const storedCart = localStorage.getItem(`kiosk-cart-${storeId}`);
        if (storedCart) {
          const cartItems = JSON.parse(storedCart);
          
          // Create order items with all required fields
          const orderItems = cartItems.map((item: any) => ({
            kiosk_order_id: kioskOrderId,
            product_id: item.product_id,
            quantity: item.quantity,
            price_at_purchase: item.sgt_price,
            created_at: new Date().toISOString()
          }));
          
          const { data: orderItemsData, error: itemsError } = await supabase
            .from('kiosk_order_items')
            .insert(orderItems)
            .select('kiosk_order_item_id, product_id');
            
          if (itemsError) {
            console.error('Error creating kiosk order items:', itemsError);
            // Continue to success page even if items have an error
          }
          
          // Save order item options if items were successfully created
          if (orderItemsData && orderItemsData.length > 0) {
            try {
              // Prepare option records for all items with options
              const allOptionRecords = [];
              
              for (const item of cartItems) {
                if (!item.options || item.options.length === 0) continue;
                
                // Find the corresponding order item ID
                const orderItem = orderItemsData.find((oi: any) => oi.product_id === item.product_id);
                if (!orderItem) continue;
                
                // Create option records for this item
                const itemOptionRecords = item.options.map((option: any) => ({
                  kiosk_order_item_id: orderItem.kiosk_order_item_id,
                  option_group_id: option.groupId,
                  option_group_name: option.name.split(':')[0].trim(), // Extract group name from the formatted name
                  option_choice_id: option.choiceId,
                  option_choice_name: option.name.split(':')[1]?.trim() || option.name, // Extract choice name or use full name
                  price_impact: option.price_impact,
                  created_at: new Date().toISOString()
                }));
                
                allOptionRecords.push(...itemOptionRecords);
              }
              
              // Save all option records if there are any
              if (allOptionRecords.length > 0) {
                const { error: optionsError } = await supabase
                  .from('kiosk_order_item_options')
                  .insert(allOptionRecords);
                  
                if (optionsError) {
                  console.error('Error saving order item options:', optionsError);
                  // Continue to success page even if options have an error
                }
              }
            } catch (optErr) {
              console.error('Error processing order options:', optErr);
              // Continue to success page even if option processing fails
            }
          }
          
          // Clear cart in localStorage
          localStorage.removeItem(`kiosk-cart-${storeId}`);
        }
      } catch (err) {
        console.error('Error processing cart items:', err);
      }
      
      // Navigate to success page
      router.push(`/kiosk/${storeId}/success?orderId=${kioskOrderId}&orderType=kiosk_delivery&sessionId=${sessionId}`);
    } catch (err) {
      console.error('Error in order submission:', err);
      setError('결제 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-red-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Link href={`/kiosk/${storeId}/checkout?sessionId=${sessionId}&deviceNumber=${deviceNumber}`} className="mr-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold">배달 정보 입력</h1>
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
          
          {/* Order summary with delivery fee */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-4">주문 금액</h2>
            
            <div className="flex justify-between items-center py-2">
              <span>상품 금액</span>
              <span className="flex items-center gap-1 flex-row">
                {formatPrice(totalAmount)}<p className="text-xs text-gray-500">SGT</p>
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b mb-3">
              <span>배달 수수료</span>
              <span className="flex items-center gap-1 flex-row">
                {formatPrice(PLACEHOLDER_DELIVERY_FEE)}<p className="text-xs text-gray-500">SGT</p>
              </span>
            </div>
            
            <div className="flex justify-between items-center text-lg font-bold">
              <span>총 결제 금액</span>
              <span className="text-red-600 flex items-center gap-1 flex-row">
                {formatPrice(totalWithDelivery)}<p className="text-xs text-gray-500">SGT</p>
              </span>
            </div>
          </div>
          
          {/* Delivery address form */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">배달 정보</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="address" className="block mb-1 font-medium">
                    주소 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="address"
                    className="w-full p-2 border rounded-md"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="주소를 입력해주세요"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="detailAddress" className="block mb-1 font-medium">
                    상세 주소
                  </label>
                  <input
                    type="text"
                    id="detailAddress"
                    className="w-full p-2 border rounded-md"
                    value={detailAddress}
                    onChange={(e) => setDetailAddress(e.target.value)}
                    placeholder="동/호수 등의 상세 주소"
                  />
                </div>
                
                <div>
                  <label htmlFor="phoneNumber" className="block mb-1 font-medium">
                    연락처 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    className="w-full p-2 border rounded-md"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="010-0000-0000"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="deliveryNote" className="block mb-1 font-medium">
                    배달 요청사항
                  </label>
                  <textarea
                    id="deliveryNote"
                    className="w-full p-2 border rounded-md"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    rows={3}
                    placeholder="배달 기사님께 전달할 요청사항을 입력해주세요"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full mt-6 py-3 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                    처리 중...
                  </div>
                ) : (
                  '주문하기'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Order Ready Modal Notification */}
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

      {/* Keyframes for modal animation (optional, add to a global CSS or style tag if needed) */}
      {/* <style jsx global>{`
        @keyframes pop-in {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-pop-in { animation: pop-in 0.3s ease-out forwards; }
      `}</style> */}

    </div>
  );
} 