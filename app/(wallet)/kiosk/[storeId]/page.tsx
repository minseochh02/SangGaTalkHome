'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SafeImage } from '@/components/ui/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library, IconPrefix, IconName, findIconDefinition } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';

// Add all FontAwesome icons to the library
library.add(fas, far);

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
  // product_category?: string; // This general category is NOT used for kiosk grouping/filtering
}

interface Category { // This represents KioskCategory for the kiosk page
  category_id: string;
  category_name: string;
  position?: number; // Added to store the position from kiosk_categories
}

interface CartItem {
  product_id: string;
  product_name: string;
  sgt_price: number;
  quantity: number;
  image_url?: string | null;
}

// Define this interface, ideally in a shared types file or at the top of the component
interface KioskOrder {
  order_id: string;
  kiosk_session_id?: string;
  store_id: string;
  status: string;
  order_display_id?: string;
  device_number?: number;
  // other relevant order fields
}

// Add new interfaces for product options
interface ProductOptionChoice {
  id: string;
  name: string;
  icon?: string;
  price_impact: number;
  is_default: boolean;
}

interface ProductOptionGroup {
  id: string;
  name: string;
  icon?: string;
  choices: ProductOptionChoice[];
}

interface SelectedOption {
  groupId: string;
  choiceId: string;
  name: string;
  price_impact: number;
}

interface CartItemWithOptions extends CartItem {
  options?: SelectedOption[];
  total_price: number; // Base price + all option price impacts
}

export default function KioskPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = params.storeId as string;
  const supabase = createClient();
  
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); // Will hold kiosk_categories with position
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>('all');
  const [showCart, setShowCart] = useState<boolean>(false);
  const [deviceNumber, setDeviceNumber] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(searchParams.get('sessionId'));
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  const [cartIconAnimate, setCartIconAnimate] = useState<boolean>(false);
  
  // New state for mapping products to their effective kiosk category
  const [effectiveProductToKioskCategoryMap, setEffectiveProductToKioskCategoryMap] = useState<Map<string, string | null>>(new Map());
  
  // New state for options
  const [productOptions, setProductOptions] = useState<Map<string, ProductOptionGroup[]>>(new Map());
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [cartItemsWithOptions, setCartItemsWithOptions] = useState<CartItemWithOptions[]>([]);
  
  // Initialize kiosk session
  const initKioskSession = useCallback(async (urlSessionId: string | null) => {
    try {
      if (urlSessionId) {
        // Try to fetch and validate the session from URL
        const { data: existingSession, error: existingSessionError } = await supabase
          .from('kiosk_sessions')
          .select('kiosk_session_id, device_number, status, expired_at')
          .eq('kiosk_session_id', urlSessionId)
          .single();

        if (existingSession && existingSession.status === 'active' && new Date(existingSession.expired_at) > new Date()) {
          console.log('Using existing active session from URL:', existingSession.kiosk_session_id);
          setSessionId(existingSession.kiosk_session_id);
          setDeviceNumber(existingSession.device_number);
          // Optionally update last_active_at
          await supabase.from('kiosk_sessions').update({ last_active_at: new Date().toISOString() }).eq('kiosk_session_id', existingSession.kiosk_session_id);
          return; // Session from URL is valid and used
        } else {
          console.log('Session ID from URL is invalid, expired, or not found. Proceeding to create/find new session.', existingSessionError?.message);
        }
      }

      // Fallback to deviceIdentifier logic if no valid URL session ID
      const getDeviceIdentifier = (): string => {
        const existingId = localStorage.getItem('kiosk-device-id');
        if (existingId) return existingId;
        const newId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('kiosk-device-id', newId);
        return newId;
      };
      const deviceIdentifier = getDeviceIdentifier();

      let nextDeviceNumber = 1;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_next_device_number', { p_store_id: storeId });
        if (!rpcError && rpcData != null) {
          nextDeviceNumber = rpcData;
        } else {
          console.error('Error using RPC for device number, falling back:', rpcError?.message);
          const { data: manualDeviceData, error: manualDeviceError } = await supabase
            .from('kiosk_sessions')
            .select('device_number')
            .eq('store_id', storeId)
            .order('device_number', { ascending: false })
            .limit(1);
          if (!manualDeviceError && manualDeviceData && manualDeviceData.length > 0) {
            nextDeviceNumber = (manualDeviceData[0].device_number || 0) + 1;
          }
        }
      } catch (err) {
        console.error('Error getting device number:', err);
      }

      const { data: newSessionData, error: newSessionError } = await supabase
        .from('kiosk_sessions')
        .insert({
          store_id: storeId,
          device_identifier: deviceIdentifier,
          device_number: nextDeviceNumber,
          status: 'active',
          last_active_at: new Date().toISOString(),
          expired_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
        })
        .select('kiosk_session_id, device_number')
        .single();

      if (newSessionError) {
        console.error('Error creating new kiosk session:', newSessionError.message);
        setError('키오스크 세션 시작에 실패했습니다.');
      } else if (newSessionData) {
        console.log('New kiosk session started:', newSessionData.kiosk_session_id);
        setSessionId(newSessionData.kiosk_session_id);
        setDeviceNumber(newSessionData.device_number);
      }
    } catch (err) {
      console.error('Error in initKioskSession:', err);
      setError('키오스크 세션 초기화 중 오류 발생');
    }
  }, [storeId, supabase]);

  // useEffect to call initKioskSession with sessionId from URL
  useEffect(() => {
    const initialSessionIdFromUrl = searchParams.get('sessionId');
    if (!sessionId) { // Only run if sessionId is not already set (e.g. by direct state initialization)
      initKioskSession(initialSessionIdFromUrl);
    }
  }, [initKioskSession, searchParams, sessionId]);
  
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
          .from('kiosk_categories')
          .select('category_id, category_name, position') // Ensure position is fetched
          .eq('store_id', storeId)
          .order('position', { ascending: true });
          
        if (!categoryError && categoryData && categoryData.length > 0) {
          setCategories(categoryData as Category[]);
        } else {
          setCategories([]);
          setSelectedCategory('all'); 
        }
      } catch (err) {
        console.error('Error fetching categories (optional):', err);
        setCategories([]);
        setSelectedCategory('all');
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
  
  // Load cart from localStorage with options support
  const loadCart = useCallback(() => {
    try {
      const storedCart = localStorage.getItem(`kiosk-cart-${storeId}`);
      if (storedCart) {
        setCartItemsWithOptions(JSON.parse(storedCart));
        
        // Calculate total including options price impacts
        const total = JSON.parse(storedCart).reduce(
          (sum: number, item: CartItemWithOptions) => sum + (item.total_price * item.quantity), 0
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
      await initKioskSession(sessionId);
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
      localStorage.setItem(`kiosk-cart-${storeId}`, JSON.stringify(cartItemsWithOptions));
      
      // Update total amount
      const total = cartItemsWithOptions.reduce(
        (sum, item) => sum + (item.total_price * item.quantity), 0
      );
      setTotalAmount(total);
    } catch (err) {
      console.error('Error saving cart to localStorage:', err);
    }
  }, [cartItemsWithOptions, storeId]);
  
  // New function to fetch product options
  const fetchProductOptions = async (productId: string) => {
    if (productOptions.has(productId)) {
      // Already fetched options for this product
      return productOptions.get(productId) || [];
    }
    
    try {
      // Fetch linked global option groups for this product
      const { data: linkedOptions, error: linkError } = await supabase
        .from('product_global_option_links')
        .select('store_option_group_id')
        .eq('product_id', productId);
      
      if (linkError || !linkedOptions || linkedOptions.length === 0) {
        console.log(`No options found for product ${productId}`);
        setProductOptions(prev => new Map(prev).set(productId, []));
        return [];
      }
      
      const groupIds = linkedOptions.map(link => link.store_option_group_id);
      
      // Fetch option groups
      const { data: groups, error: groupError } = await supabase
        .from('store_option_groups')
        .select('*')
        .in('id', groupIds)
        .order('display_order', { ascending: true });
      
      if (groupError || !groups) {
        console.error('Error fetching option groups:', groupError);
        return [];
      }
      
      // Fetch option choices for these groups
      const { data: choices, error: choicesError } = await supabase
        .from('store_option_choices')
        .select('*')
        .in('group_id', groupIds)
        .order('display_order', { ascending: true });
      
      if (choicesError || !choices) {
        console.error('Error fetching option choices:', choicesError);
        return [];
      }
      
      // Map data to our component structure
      const productOptionGroups: ProductOptionGroup[] = groups.map(group => ({
        id: group.id,
        name: group.name,
        icon: group.icon || undefined,
        choices: choices
          .filter(choice => choice.group_id === group.id)
          .map(choice => ({
            id: choice.id,
            name: choice.name,
            icon: choice.icon || undefined,
            price_impact: choice.price_impact || 0,
            is_default: choice.is_default || false
          }))
      }));
      
      // Update state
      setProductOptions(prev => new Map(prev).set(productId, productOptionGroups));
      return productOptionGroups;
    } catch (err) {
      console.error('Error fetching product options:', err);
      return [];
    }
  };
  
  // Helper to select default options
  const selectDefaultOptions = (optionGroups: ProductOptionGroup[]) => {
    const defaultOptions: SelectedOption[] = [];
    
    optionGroups.forEach(group => {
      const defaultChoice = group.choices.find(choice => choice.is_default);
      if (defaultChoice) {
        defaultOptions.push({
          groupId: group.id,
          choiceId: defaultChoice.id,
          name: `${group.name}: ${defaultChoice.name}`,
          price_impact: defaultChoice.price_impact
        });
      }
    });
    
    return defaultOptions;
  };
  
  // Modified addToCart to handle options
  const addToCart = async (product: Product) => {
    if (product.is_sold_out) return;
    
    // Fetch options for this product
    const options = await fetchProductOptions(product.product_id);
    
    if (options && options.length > 0) {
      // Product has options, show selection modal
      setSelectedProduct(product);
      setSelectedOptions(selectDefaultOptions(options));
      setShowOptionsModal(true);
    } else {
      // No options, add directly to cart
      addToCartWithOptions(product, []);
    }
  };
  
  // Function to add product with selected options to cart
  const addToCartWithOptions = (product: Product, options: SelectedOption[]) => {
    setCartItemsWithOptions(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => 
        item.product_id === product.product_id && 
        JSON.stringify(item.options?.sort((a,b) => a.choiceId.localeCompare(b.choiceId))) === JSON.stringify(options.sort((a,b) => a.choiceId.localeCompare(b.choiceId)))
      );

      let newCart;
      const optionPrice = options.reduce((sum, opt) => sum + opt.price_impact, 0);
      const itemBasePrice = product.sgt_price;
      const itemTotalPrice = itemBasePrice + optionPrice;

      if (existingItemIndex > -1) {
        newCart = prevCart.map((item, index) => 
          index === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        newCart = [...prevCart, { 
          product_id: product.product_id, 
          product_name: product.product_name, 
          sgt_price: itemBasePrice, // Store base price
          quantity: 1, 
          image_url: product.image_url,
          options: options,
          total_price: itemTotalPrice // Store total price per unit including options
        }];
      }
      triggerCartAnimation(product.product_id);
      return newCart;
    });
  };
  
  const handleOptionChange = (groupId: string, choice: ProductOptionChoice) => {
    setSelectedOptions(prev => {
      // Remove any existing choice for this group
      const filtered = prev.filter(option => option.groupId !== groupId);
      
      // Add the new choice
      return [...filtered, {
        groupId,
        choiceId: choice.id,
        name: `${productOptions.get(selectedProduct?.product_id || '')?.find(g => g.id === groupId)?.name || ''}: ${choice.name}`,
        price_impact: choice.price_impact
      }];
    });
  };
  
  // Modified cart functions to handle options
  const isInCart = (productId: string): boolean => {
    return cartItemsWithOptions.some(item => item.product_id === productId);
  };
  
  const getCartQuantity = (productId: string): number => {
    // Sum up quantities for all items with this product ID (could have different options)
    return cartItemsWithOptions
      .filter(item => item.product_id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };
  
  const incrementItem = (index: number) => {
    setCartItemsWithOptions(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        quantity: updatedItems[index].quantity + 1
      };
      return updatedItems;
    });
  };
  
  const decrementItem = (index: number) => {
    setCartItemsWithOptions(prevItems => {
      const updatedItems = [...prevItems];
      if (updatedItems[index].quantity > 1) {
        updatedItems[index] = {
          ...updatedItems[index],
          quantity: updatedItems[index].quantity - 1
        };
        return updatedItems;
      } else {
        return updatedItems.filter((_, i) => i !== index);
      }
    });
  };
  
  const removeItem = (index: number) => {
    setCartItemsWithOptions(prevItems => 
      prevItems.filter((_, i) => i !== index)
    );
  };
  
  const clearCart = () => {
    if (confirm('장바구니를 비우시겠습니까?')) {
      setCartItemsWithOptions([]);
    }
  };
  
  // Format price with commas
  const formatPrice = (price: number): string => {
    return price.toLocaleString();
  };
  
  // useEffect to compute product to kiosk category mapping
  useEffect(() => {
    const newMap = new Map<string, string | null>();
    
    // Ensure categories (kiosk_categories) are sorted by position
    const sortedKioskCategories = [...categories].sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));

    products.forEach(product => {
      if (product.kiosk_order === undefined || product.kiosk_order === null) {
        newMap.set(product.product_id, null); // Products without order can't be mapped easily
        return;
      }

      let assignedKioskCategoryId: string | null = null;
      for (const kc of sortedKioskCategories) {
        if (kc.position !== undefined && product.kiosk_order >= kc.position) {
          assignedKioskCategoryId = kc.category_id; // Last one wins
        } else {
          // Since KCs are sorted, if product.kiosk_order < kc.position, it won't be in this or subsequent KCs
           // However, if a product's order is 2, and categories are at 0 and 5, it belongs to category at 0.
           // The "last one wins" by iterating through all should handle this if categories are sorted.
        }
      }
      newMap.set(product.product_id, assignedKioskCategoryId);
    });
    setEffectiveProductToKioskCategoryMap(newMap);
  }, [products, categories]);
  
  // Filter products by selected category
  const filteredProducts = products.filter(product => {
    if (!product.is_kiosk_enabled) {
      return false; // Always filter out non-kiosk-enabled products
    }
  
    if (selectedCategory === 'all' || selectedCategory === null) {
      return true; // Show all kiosk-enabled products
    }
    
    // Use the new map for filtering
    const productKioskCategory = effectiveProductToKioskCategoryMap.get(product.product_id);
    return productKioskCategory === selectedCategory;
  });
  
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
          const cartItemExists = cartItemsWithOptions.find(item => item.product_id === updatedProduct.product_id);
          if (updatedProduct.is_sold_out && cartItemExists) {
            // Automatically remove the sold-out item from cart
            setCartItemsWithOptions(prevItems => prevItems.filter(item => item.product_id !== updatedProduct.product_id));
            
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
  }, [storeId, supabase, cartItemsWithOptions]); // Add cartItemsWithOptions dependency to access the most up-to-date cart
  
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
  
  // Add this new useEffect for order notifications
  useEffect(() => {
    if (!storeId || !sessionId) return;

    console.log('[KioskPage] Setting up order notification subscription for store:', storeId);
    
    const ordersChannel = supabase
      .channel(`web-kiosk-orders-${storeId}-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kiosk_orders', // Make sure this matches your actual orders table
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          console.log('[KioskPage] Order update received:', payload);
          const updatedOrder = payload.new as KioskOrder;
          
          // Check if this is a ready-for-pickup notification
          if (updatedOrder.status === 'ready_for_pickup') {
            // You can optionally check if device_number matches this kiosk
            // if (updatedOrder.device_number === deviceNumber) {
              // For web, we'll use the built-in alert
              alert(
                updatedOrder.device_number 
                  ? `단말기 ${updatedOrder.device_number}번에서 주문하신 메뉴가 준비되었습니다. 픽업대로 와주세요.`
                  : '주문하신 메뉴가 준비되었습니다. 픽업대로 와주세요.'
              );
            // }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[KioskPage] Successfully subscribed to orders for store ${storeId}`);
        } else if (err) {
          console.error(`[KioskPage] Error subscribing to orders:`, err);
        }
      });

    // Cleanup function
    return () => {
      console.log(`[KioskPage] Cleaning up orders subscription for store ${storeId}`);
      supabase.removeChannel(ordersChannel);
    };
  }, [storeId, sessionId, deviceNumber]); // Dependencies for this effect
  
  // Utility function to render icons
  const renderIcon = (iconString?: string, size: string = "text-2xl") => {
    if (!iconString || iconString.trim() === '') return null;
    
    // Check for emoji (simplified check)
    if (
      iconString.length <= 2 || 
      iconString.match(/\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]/)
    ) {
      return <span className={`${size} mr-2`}>{iconString}</span>;
    }
    
    // Process FontAwesome icon
    const parts = iconString.split(' ');
    if (parts.length > 0) {
      const firstPart = parts[0].toLowerCase();
      let prefix: IconPrefix | undefined = undefined;
      let iconName: IconName | undefined = undefined;
      
      // Parse prefix
      if (firstPart === 'fas' || firstPart === 'fa-solid' || firstPart === 'solid') {
        prefix = 'fas';
      } else if (firstPart === 'far' || firstPart === 'fa-regular' || firstPart === 'regular') {
        prefix = 'far';
      }
      
      // Parse icon name
      if (parts.length > 1) {
        let nameCandidate = parts.slice(1).join(' ');
        if (nameCandidate.startsWith('fa-')) {
          nameCandidate = nameCandidate.substring(3);
        }
        iconName = nameCandidate as IconName;
      }
      
      if (prefix && iconName) {
        try {
          // Check if the icon is in the library
          const iconLookup = findIconDefinition({ prefix, iconName });
          if (iconLookup) {
            return <FontAwesomeIcon icon={[prefix, iconName]} className={`${size} mr-2`} />;
          }
        } catch (e) {
          console.warn(`Error rendering FA icon: ${iconString}`, e);
        }
      }
    }
    
    // Fallback for unknown icon format
    return <span className="text-gray-400 text-sm mr-2">{iconString}</span>;
  };
  
  const triggerCartAnimation = (productId: string) => {
    setRecentlyAdded(productId);
    setCartIconAnimate(true);
    setTimeout(() => {
      setCartIconAnimate(false);
      setRecentlyAdded(null);
    }, 1000); // Animation duration
  };
  
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
            {cartItemsWithOptions.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-white text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {cartItemsWithOptions.length}
              </span>
            )}
          </div>
        </div>
      </header>
      
      {/* Category tabs */}
      {(categories.length > 0 || selectedCategory === 'all') && ( // Show if categories exist or 'all' is an option
        <div className="bg-white shadow-sm overflow-x-auto sticky top-0 z-5"> {/* Added sticky top-0 z-5 for visibility */}
          <div className="container mx-auto">
            <div className="flex space-x-2 p-2">
              <button
                key="all-categories"
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedCategory === 'all' || selectedCategory === null
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedCategory('all')}
              >
                전체
              </button>
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
              <p className="text-gray-600">{selectedCategory === 'all' || selectedCategory === null ? '등록된 상품이 없습니다.' : '해당 카테고리에 상품이 없습니다.'}</p>
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
      
      {/* Options Modal */}
      {showOptionsModal && selectedProduct && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">{selectedProduct.product_name}</h3>
                <button 
                  onClick={() => setShowOptionsModal(false)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-5">
              {productOptions.get(selectedProduct.product_id)?.map((group) => (
                <div key={group.id} className="mb-6">
                  <div className="flex items-center mb-3">
                    {group.icon && renderIcon(group.icon)}
                    <h4 className="text-lg font-medium">{group.name}</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {group.choices.map((choice) => {
                      const isSelected = selectedOptions.some(
                        opt => opt.groupId === group.id && opt.choiceId === choice.id
                      );
                      
                      return (
                        <button
                          key={choice.id}
                          className={`p-3 rounded-lg border ${
                            isSelected 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-gray-200 hover:bg-gray-50'
                          } flex items-center justify-between`}
                          onClick={() => handleOptionChange(group.id, choice)}
                        >
                          <div className="flex items-center">
                            {choice.icon && renderIcon(choice.icon, "text-xl")}
                            <span>{choice.name}</span>
                          </div>
                          
                          {choice.price_impact !== 0 && (
                            <span className={`text-sm font-medium ${
                              choice.price_impact > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {choice.price_impact > 0 ? '+' : ''}
                              {formatPrice(choice.price_impact)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              <div className="mt-6 border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-700">기본 가격</span>
                  <span className="font-medium">{formatPrice(selectedProduct.sgt_price)}</span>
                </div>
                
                {selectedOptions.length > 0 && selectedOptions.map((option, index) => (
                  <div key={index} className="flex justify-between items-center py-1">
                    <span className="text-gray-600 text-sm">{option.name}</span>
                    <span className={`text-sm ${
                      option.price_impact > 0 ? 'text-green-600' : option.price_impact < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {option.price_impact > 0 ? '+' : ''}
                      {formatPrice(option.price_impact)}
                    </span>
                  </div>
                ))}
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t font-bold">
                  <span>총 가격</span>
                  <span className="text-lg text-red-600">{formatPrice(
                    selectedProduct.sgt_price + selectedOptions.reduce((sum, opt) => sum + opt.price_impact, 0)
                  )}</span>
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t">
              <button
                className="w-full py-3 bg-red-600 text-white font-bold rounded-md hover:bg-red-700"
                onClick={() => addToCartWithOptions(selectedProduct, selectedOptions)}
              >
                장바구니에 담기
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modify cart sidebar */}
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
            {cartItemsWithOptions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-center">장바구니가 비어있습니다.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {cartItemsWithOptions.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center">
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
                        <p className="text-red-600 font-bold">{formatPrice(item.total_price)}<span className="text-xs text-gray-500 ml-1">SGT</span></p>
                      </div>
                      <div className="flex flex-col items-end">
                        <button 
                          className="text-gray-500 hover:text-red-600 mb-2"
                          onClick={() => removeItem(index)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <div className="flex items-center border rounded-md">
                          <button 
                            className="px-2 py-1 text-gray-600 hover:bg-gray-100" 
                            onClick={() => decrementItem(index)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="px-2 min-w-[2rem] text-center">{item.quantity}</span>
                          <button 
                            className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                            onClick={() => incrementItem(index)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Show selected options */}
                    {item.options && item.options.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <ul className="text-xs text-gray-600 pl-2">
                          {item.options.map((option, optionIndex) => (
                            <li key={optionIndex} className="flex justify-between py-1">
                              <span>{option.name}</span>
                              {option.price_impact !== 0 && (
                                <span className={option.price_impact > 0 ? 'text-green-600' : 'text-red-600'}>
                                  {option.price_impact > 0 ? '+' : ''}
                                  {formatPrice(option.price_impact)}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Cart footer */}
          <div className="p-4 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-700 font-medium">총 금액</span>
              <span className="text-xl font-bold text-red-600">{formatPrice(totalAmount)}<span className="text-xs text-gray-500 ml-1">SGT</span></span>
            </div>
            
            <div className="space-y-2">
              <button
                className={`w-full py-3 bg-red-600 text-white font-bold rounded-md ${
                  cartItemsWithOptions.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
                }`}
                disabled={cartItemsWithOptions.length === 0}
                onClick={() => {
                  setShowCart(false);
                  router.push(`/kiosk/${storeId}/checkout?sessionId=${sessionId}&deviceNumber=${deviceNumber}`);
                }}
              >
                결제하기
              </button>
              
              <button
                className={`w-full py-2 border border-gray-300 text-gray-700 rounded-md ${
                  cartItemsWithOptions.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                }`}
                disabled={cartItemsWithOptions.length === 0}
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