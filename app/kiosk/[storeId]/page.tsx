'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// Types
interface Product {
  product_id: string;
  product_name: string;
  description?: string;
  sgt_price: number;
  image_url?: string;
  is_sold_out: boolean;
  product_category?: string;
}

interface Category {
  category_id: string;
  category_name: string;
}

interface CartItem {
  product_id: string;
  product_name: string;
  sgt_price: number;
  quantity: number;
  image_url?: string | null;
}

export default function KioskPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.storeId as string;
  const supabase = createClient();
  
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCart, setShowCart] = useState<boolean>(false);
  const [deviceNumber, setDeviceNumber] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Initialize kiosk session
  const initKioskSession = useCallback(async () => {
    try {
      // Generate a device ID based on browser info or use a cookie
      const getDeviceIdentifier = (): string => {
        // Try to get existing device id from localStorage
        const existingId = localStorage.getItem('kiosk-device-id');
        if (existingId) return existingId;
        
        // Otherwise create a new one
        const newId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('kiosk-device-id', newId);
        return newId;
      };
      
      const deviceIdentifier = getDeviceIdentifier();
      
      // Get the next available device number for this store
      const { data: deviceData, error: deviceError } = await supabase
        .from('kiosk_sessions')
        .select('device_number')
        .eq('store_id', storeId)
        .order('device_number', { ascending: false })
        .limit(1);
        
      let nextDeviceNumber = 1;
      if (!deviceError && deviceData && deviceData.length > 0) {
        nextDeviceNumber = (deviceData[0].device_number || 0) + 1;
      }
      
      // Create or update kiosk session
      const { data: sessionData, error: sessionError } = await supabase
        .from('kiosk_sessions')
        .upsert({
          store_id: storeId,
          device_identifier: deviceIdentifier,
          device_number: nextDeviceNumber,
          status: 'active',
          last_active_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (sessionError) {
        console.error('Error creating kiosk session:', sessionError);
      } else if (sessionData) {
        setDeviceNumber(sessionData.device_number);
        setSessionId(sessionData.kiosk_session_id);
      }
    } catch (err) {
      console.error('Error in initKioskSession:', err);
    }
  }, [storeId, supabase]);
  
  // Fetch store data and products
  const fetchStoreData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch store data
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('store_name')
        .eq('store_id', storeId)
        .single();
        
      if (storeError) {
        console.error('Error fetching store:', storeError);
        setError('스토어 정보를 불러오는데 실패했습니다.');
      } else if (storeData) {
        setStoreName(storeData.store_name);
      }
      
      // Try fetching product categories - this is optional
      try {
        const { data: categoryData, error: categoryError } = await supabase
          .from('product_categories')
          .select('category_id, category_name')
          .eq('store_id', storeId)
          .order('display_order', { ascending: true });
          
        if (!categoryError && categoryData && categoryData.length > 0) {
          setCategories(categoryData);
          setSelectedCategory(categoryData[0].category_id);
        } else {
          // If categories don't exist, clear any existing categories
          setCategories([]);
          setSelectedCategory(null);
        }
      } catch (err) {
        console.error('Error fetching categories (optional):', err);
        setCategories([]);
        setSelectedCategory(null);
      }
      
      // Fetch products - don't include product_category
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('product_id, product_name, description, sgt_price, image_url, is_sold_out')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
        
      if (productError) {
        console.error('Error fetching products:', productError);
        setError('상품 정보를 불러오는데 실패했습니다.');
      } else if (productData) {
        setProducts(productData);
      }
    } catch (err) {
      console.error('Error in fetchStoreData:', err);
      setError('데이터를 불러오는데 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [storeId, supabase]);
  
  // Load cart from localStorage
  const loadCart = useCallback(() => {
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
    }
  }, [storeId]);
  
  // Initialize data
  useEffect(() => {
    initKioskSession();
    fetchStoreData();
    loadCart();
    
    // Set up a timed refresh to keep the session active
    const refreshTimer = setInterval(() => {
      if (sessionId) {
        supabase
          .from('kiosk_sessions')
          .update({ last_active_at: new Date().toISOString() })
          .eq('kiosk_session_id', sessionId)
          .then(({ error }) => {
            if (error) console.error('Error refreshing session:', error);
          });
      }
    }, 60000); // Refresh every minute
    
    return () => clearInterval(refreshTimer);
  }, [initKioskSession, fetchStoreData, loadCart, sessionId, supabase]);
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(`kiosk-cart-${storeId}`, JSON.stringify(cartItems));
      
      // Update total amount
      const total = cartItems.reduce(
        (sum, item) => sum + (item.sgt_price * item.quantity), 0
      );
      setTotalAmount(total);
    } catch (err) {
      console.error('Error saving cart to localStorage:', err);
    }
  }, [cartItems, storeId]);
  
  // Cart functions
  const addToCart = (product: Product) => {
    if (product.is_sold_out) return;
    
    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.product_id === product.product_id);
      
      if (existingItemIndex !== -1) {
        // Item already in cart, increment quantity
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1
        };
        return updatedItems;
      } else {
        // Add new item to cart
        return [...prevItems, {
          product_id: product.product_id,
          product_name: product.product_name,
          sgt_price: product.sgt_price,
          quantity: 1,
          image_url: product.image_url
        }];
      }
    });
  };
  
  const incrementItem = (productId: string) => {
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.product_id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };
  
  const decrementItem = (productId: string) => {
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.product_id === productId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ).filter(item => item.quantity > 0)
    );
  };
  
  const removeItem = (productId: string) => {
    setCartItems(prevItems => 
      prevItems.filter(item => item.product_id !== productId)
    );
  };
  
  const clearCart = () => {
    if (confirm('장바구니를 비우시겠습니까?')) {
      setCartItems([]);
    }
  };
  
  // Format price with commas
  const formatPrice = (price: number): string => {
    return price.toLocaleString();
  };
  
  // Filter products by selected category (if categories exist)
  const filteredProducts = selectedCategory && categories.length > 0
    ? products.filter(product => product.product_category === selectedCategory)
    : products;
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-red-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">{storeName}</h1>
          <div 
            className="relative cursor-pointer" 
            onClick={() => setShowCart(!showCart)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartItems.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-white text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {cartItems.length}
              </span>
            )}
          </div>
        </div>
      </header>
      
      {/* Category tabs - only show if categories exist */}
      {categories.length > 0 && (
        <div className="bg-white shadow-sm overflow-x-auto">
          <div className="container mx-auto">
            <div className="flex space-x-2 p-2">
              {categories.map((category) => (
                <button
                  key={category.category_id}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                    selectedCategory === category.category_id
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedCategory(category.category_id)}
                >
                  {category.category_name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1 container mx-auto p-4">
        {/* Product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-8 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-600">해당 카테고리에 상품이 없습니다.</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div 
                key={product.product_id} 
                className={`bg-white rounded-lg shadow-md overflow-hidden ${
                  product.is_sold_out ? 'opacity-60' : ''
                }`}
              >
                {product.image_url ? (
                  <div className="relative h-48 w-full">
                    <Image
                      src={product.image_url}
                      alt={product.product_name}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                    {product.is_sold_out && (
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                        <span className="bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm font-medium">
                          품절
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {product.is_sold_out && (
                      <span className="absolute bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm font-medium">
                        품절
                      </span>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-lg font-medium">{product.product_name}</h3>
                  {product.description && (
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{product.description}</p>
                  )}
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-red-600 font-bold">{formatPrice(product.sgt_price)}원</span>
                    <button
                      className={`px-3 py-1 rounded-md ${
                        product.is_sold_out
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                      onClick={() => !product.is_sold_out && addToCart(product)}
                      disabled={product.is_sold_out}
                    >
                      {product.is_sold_out ? '품절' : '담기'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Cart sidebar */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-10 transition-opacity duration-300 ${
          showCart ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowCart(false)}
      ></div>
      
      <div 
        className={`fixed top-0 bottom-0 right-0 w-full sm:w-96 bg-white shadow-xl z-20 transform transition-transform duration-300 ease-in-out ${
          showCart ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Cart header */}
          <div className="bg-red-600 text-white p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">장바구니</h2>
            <button 
              className="text-white"
              onClick={() => setShowCart(false)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-center">장바구니가 비어있습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.product_id} className="flex items-center bg-gray-50 p-3 rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0 mr-3">
                      {item.image_url ? (
                        <div className="relative h-full w-full">
                          <Image
                            src={item.image_url}
                            alt={item.product_name}
                            fill
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product_name}</h4>
                      <p className="text-red-600 font-bold">{formatPrice(item.sgt_price)}원</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <button 
                        className="text-gray-500 hover:text-red-600 mb-2"
                        onClick={() => removeItem(item.product_id)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <div className="flex items-center border rounded-md">
                        <button 
                          className="px-2 py-1 text-gray-600 hover:bg-gray-100" 
                          onClick={() => decrementItem(item.product_id)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="px-2 min-w-[2rem] text-center">{item.quantity}</span>
                        <button 
                          className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                          onClick={() => incrementItem(item.product_id)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Cart footer */}
          <div className="p-4 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-700 font-medium">총 금액</span>
              <span className="text-xl font-bold text-red-600">{formatPrice(totalAmount)}원</span>
            </div>
            
            <div className="space-y-2">
              <button
                className={`w-full py-3 bg-red-600 text-white font-bold rounded-md ${
                  cartItems.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
                }`}
                disabled={cartItems.length === 0}
                onClick={() => {
                  setShowCart(false);
                  router.push(`/kiosk/${storeId}/checkout?sessionId=${sessionId}&deviceNumber=${deviceNumber}`);
                }}
              >
                결제하기
              </button>
              
              <button
                className={`w-full py-2 border border-gray-300 text-gray-700 rounded-md ${
                  cartItems.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                }`}
                disabled={cartItems.length === 0}
                onClick={clearCart}
              >
                장바구니 비우기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 