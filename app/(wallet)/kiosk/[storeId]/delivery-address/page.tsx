'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

// Set a placeholder delivery fee
const PLACEHOLDER_DELIVERY_FEE = 1; // 1000 SGT

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
    </div>
  );
} 