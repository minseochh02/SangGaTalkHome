'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SafeImage } from '@/components/ui/image';

// Types
interface Product {
  product_id: string;
  product_name: string;
  description?: string;
  sgt_price: number;
  image_url?: string;
  status: number;
  is_kiosk_enabled: boolean;
  kiosk_order?: number;
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
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  const [cartIconAnimate, setCartIconAnimate] = useState<boolean>(false);
  
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
      
      // Get the next available device number for this store - try using RPC function first
      let nextDeviceNumber = 1;
      try {
        const { data: sessionData, error: sessionError } = await supabase.rpc(
          'get_next_device_number',
          { p_store_id: storeId }
        );
        
        if (!sessionError) {
          nextDeviceNumber = sessionData;
        } else {
          // Fallback to manual calculation if RPC fails
          console.error('Error using RPC, falling back to manual calculation:', sessionError);
          const { data: deviceData, error: deviceError } = await supabase
            .from('kiosk_sessions')
            .select('device_number')
            .eq('store_id', storeId)
            .order('device_number', { ascending: false })
            .limit(1);
          
          if (!deviceError && deviceData && deviceData.length > 0) {
            nextDeviceNumber = (deviceData[0].device_number || 0) + 1;
          }
        }
      } catch (err) {
        console.error('Error getting device number:', err);
        // Continue with default device number 1
      }
      
      // Create or update kiosk session
      const { data: sessionData, error: sessionError } = await supabase
        .from('kiosk_sessions')
        .insert({
          store_id: storeId,
          device_identifier: deviceIdentifier,
          device_number: nextDeviceNumber,
          status: 'active',
          last_active_at: new Date().toISOString(),
          expired_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours from now
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
      
      // Fetch products - match the mobile app query format
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('product_id, product_name, description, sgt_price, image_url, status, is_kiosk_enabled, kiosk_order, is_sold_out')
        .eq('store_id', storeId)
        .eq('status', 1)
        .eq('is_kiosk_enabled', true)
        .order('kiosk_order', { ascending: true });
        
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
    let isActive = true; // Add mount state tracking
    
    const init = async () => {
      if (!isActive) return;
      await initKioskSession();
      await fetchStoreData();
      loadCart();
    };
    
    init();
    
    // Set up a timed refresh to keep the session active
    let refreshTimer: NodeJS.Timeout | null = null;
    
    const setupRefreshTimer = () => {
      if (!isActive) return;
      refreshTimer = setInterval(() => {
        if (sessionId && isActive) {
          supabase
            .from('kiosk_sessions')
            .update({ 
              last_active_at: new Date().toISOString(),
              expired_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours from now
            })
            .eq('kiosk_session_id', sessionId)
            .then(({ error }) => {
              if (error) console.error('Error refreshing session:', error);
            });
        }
      }, 60000); // Refresh every minute
    };
    
    // Start timer slightly delayed to prevent race conditions
    const timerSetupDelay = setTimeout(() => {
      setupRefreshTimer();
    }, 2000);
    
    // Cleanup function for session
    return () => {
      isActive = false; // Mark component as unmounted
      if (refreshTimer) clearInterval(refreshTimer);
      clearTimeout(timerSetupDelay);
      
      // Attempt to mark session as disconnected on unmount/close
      // This might not always run if the browser tab is closed abruptly
      if (sessionId) {
        // Use sendBeacon if available for more reliable disconnect on page unload
        const canUseSendBeacon = typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function';
        if (canUseSendBeacon) {
          const formData = new FormData();
          formData.append('kiosk_session_id', sessionId);
          formData.append('status', 'disconnected');
          // Note: sendBeacon needs a URL endpoint to send data to.
          // For direct Supabase update, this pattern is more complex.
          // Sticking to direct Supabase call for now, but beacon is an option for specific backend.
        }
        // Fallback or primary method: direct Supabase update
        supabase
          .from('kiosk_sessions')
          .update({ status: 'disconnected', last_active_at: new Date().toISOString() })
          .eq('kiosk_session_id', sessionId)
          .then(({ error }) => {
            if (error) console.error('Error disconnecting session on unmount:', error);
            else console.log('Session marked as disconnected on unmount/close.');
          });
      }
    };
  }, [initKioskSession, fetchStoreData, loadCart]);
  
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
    
    // Set recently added product to trigger animation
    setRecentlyAdded(product.product_id);
    
    // Animate cart icon
    setCartIconAnimate(true);
    
    // Clear animation states after a delay
    setTimeout(() => {
      setRecentlyAdded(null);
      setCartIconAnimate(false);
    }, 700);
  };
  
  // Check if item is in cart
  const isInCart = (productId: string): boolean => {
    return cartItems.some(item => item.product_id === productId);
  };
  
  // Get quantity of item in cart
  const getCartQuantity = (productId: string): number => {
    const item = cartItems.find(item => item.product_id === productId);
    return item ? item.quantity : 0;
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
  
  // Filter products (note: we're not filtering by category since product_category isn't available)
  // Display all products for now, categorization can be added later if needed
  const filteredProducts = products;
  
  // Add product subscription useEffect
  useEffect(() => {
    // Skip if no storeId or not ready yet
    if (!storeId) return;
    
    // Set up real-time subscription for product updates
    const productChannel = supabase
      .channel(`kiosk-product-updates-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const updatedProduct = payload.new as Product;
          
          console.log(`[KioskPage] Product update received: ${updatedProduct.product_id} (${updatedProduct.product_name}), kiosk_enabled: ${updatedProduct.is_kiosk_enabled}, sold_out: ${updatedProduct.is_sold_out}`);
          
          // Check for sold-out state changes first, which affect the cart
          const cartItemExists = cartItems.find(item => item.product_id === updatedProduct.product_id);
          if (updatedProduct.is_sold_out && cartItemExists) {
            // Automatically remove the sold-out item from cart
            setCartItems(prevItems => prevItems.filter(item => item.product_id !== updatedProduct.product_id));
            
            // Inform the user that the item was removed
            alert(
              `'${updatedProduct.product_name}' 상품이 품절되어 장바구니에서 자동으로 제거되었습니다.`
            );
          }

          // Then handle the product list updates
          setProducts((currentProducts) => {
            // For debugging, log the current state
            console.log('[KioskPage] currentProducts count:', currentProducts.length);
            
            const productExistsInState = currentProducts.some(p => p.product_id === updatedProduct.product_id);
            
            // If the product doesn't exist in state and is not kiosk-enabled, we can skip processing
            if (!productExistsInState && !updatedProduct.is_kiosk_enabled) {
              console.log(`[KioskPage] Skipping update for non-existent, non-kiosk product: ${updatedProduct.product_id}`);
              return currentProducts; // No change needed
            }
            
            // Handle products that should be displayed
            if (updatedProduct.is_kiosk_enabled) {
              if (productExistsInState) {
                console.log(`[KioskPage] Updating existing product: ${updatedProduct.product_name}`);
                return currentProducts.map((p) =>
                  p.product_id === updatedProduct.product_id ? { ...p, ...updatedProduct } : p
                ).sort((a, b) => (a.kiosk_order ?? Infinity) - (b.kiosk_order ?? Infinity));
              } else {
                console.log(`[KioskPage] Adding new product: ${updatedProduct.product_name}`);
                return [...currentProducts, updatedProduct]
                  .sort((a, b) => (a.kiosk_order ?? Infinity) - (b.kiosk_order ?? Infinity));
              }
            } 
            // Handle products that should be removed
            else if (productExistsInState) {
              console.log(`[KioskPage] Removing product: ${updatedProduct.product_name}`);
              return currentProducts.filter(p => p.product_id !== updatedProduct.product_id);
            }
            
            // Default case - no changes needed
            return currentProducts;
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[KioskPage] Subscribed to product updates for store ${storeId}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[KioskPage] Product updates channel error for store ${storeId}:`, err);
        }
        if (status === 'TIMED_OUT') {
          console.warn(`[KioskPage] Realtime subscription timed out for store ${storeId}`);
        }
      });
    
    // Cleanup function for subscription
    return () => {
      supabase.removeChannel(productChannel);
      console.log(`[KioskPage] Unsubscribed from product updates for store ${storeId}`);
    };
  }, [storeId, supabase, cartItems]); // Add cartItems dependency to access the most up-to-date cart
  
  // Real-time subscription for session status changes (remote disconnect by admin)
  useEffect(() => {
    if (!sessionId || !storeId || !supabase) return;

    const channel = supabase
      .channel(`kiosk-session-status-web-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kiosk_sessions',
          filter: `kiosk_session_id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedSession = payload.new as { status: string; kiosk_session_id: string };
          console.log('[KioskPage] Session status update received:', updatedSession);

          if (updatedSession.kiosk_session_id === sessionId && updatedSession.status === 'disconnected') {
            console.log('[KioskPage] Session remotely disconnected by admin.');
            
            // Clear the refresh timer to stop heartbeats
            // Note: refreshTimer is not directly accessible here.
            // This logic might need refactoring if direct timer clear is needed,
            // or rely on component unmount/navigation to stop it.
            // For now, immediate redirect is the primary action.

            alert('스토어 관리자에 의해 현재 키오스크 세션이 종료되었습니다. 홈으로 이동합니다.');
            router.push('/'); // Redirect to homepage, or a more appropriate page
            
            // Optionally clear local storage related to this kiosk session
            localStorage.removeItem(`kiosk-cart-${storeId}`);
            localStorage.removeItem('kiosk-device-id'); // If a new session should get a new ID
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[KioskPage] Subscribed to session status updates for session ${sessionId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[KioskPage] Session status channel error for ${sessionId}:`, err);
        } else if (status === 'TIMED_OUT') {
          console.warn(`[KioskPage] Session status subscription timed out for ${sessionId}`);
        }
      });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        console.log(`[KioskPage] Unsubscribed from session status updates for ${sessionId}`);
      }
    };
  }, [sessionId, storeId, supabase, router]); // Added router to dependencies
  
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
          <h1 className="text-xl font-bold">
            {storeName}
            {deviceNumber ? ` (단말기 ${deviceNumber}번)` : ''}
          </h1>
          <div 
            className={`relative cursor-pointer ${cartIconAnimate ? 'animate-bounce' : ''}`}
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
      
      {/* Category tabs - hiding for now since we're not filtering by category yet
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
      */}
      
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
            filteredProducts.map((product) => {
              const inCart = isInCart(product.product_id);
              const quantity = getCartQuantity(product.product_id);
              
              return (
                <div 
                  key={product.product_id} 
                  className={`bg-white rounded-lg shadow-md overflow-hidden ${
                    product.is_sold_out ? 'opacity-60' : ''
                  } ${recentlyAdded === product.product_id ? 'animate-pulse' : ''}
                    ${inCart ? 'border-2 border-red-500' : ''}`}
                >
                  <div className="relative">
                    {inCart && (
                      <div className="absolute top-2 right-2 z-10 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {quantity}개
                      </div>
                    )}
                    
                    {product.image_url ? (
                      <div className="relative h-48 w-full">
                        <SafeImage
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
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-medium">{product.product_name}</h3>
                    {product.description && (
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">{product.description}</p>
                    )}
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-red-600 font-bold flex items-center gap-1 flex-row">{formatPrice(product.sgt_price)}<p className="text-xs text-gray-500">SGT</p></span>
                      <button
                        className={`px-3 py-1 rounded-md ${
                          product.is_sold_out
                            ? 'bg-gray-300 cursor-not-allowed'
                            : recentlyAdded === product.product_id 
                              ? 'bg-green-600 text-white transition-colors duration-300' 
                              : inCart
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                        onClick={() => !product.is_sold_out && addToCart(product)}
                        disabled={product.is_sold_out}
                      >
                        {product.is_sold_out 
                          ? '품절' 
                          : recentlyAdded === product.product_id 
                            ? '추가됨!' 
                            : inCart
                              ? '추가' 
                              : '담기'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
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
                          <SafeImage
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
                      <p className="text-red-600 font-bold flex items-center gap-1 flex-row">{formatPrice(item.sgt_price)}<p className="text-xs text-gray-500">SGT</p></p>
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