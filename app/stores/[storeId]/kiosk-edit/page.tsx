'use client';

import React, { useEffect, useState, Fragment } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Store, Product } from '@/utils/type';
import Link from 'next/link';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, Transition } from '@headlessui/react';
import KioskSalesHistory from './KioskSalesHistory';
import KioskActiveSessions from './KioskActiveSessions';
import ProductEditModal from './ProductEditModal';
import SortableProductItem from './SortableProductItem';
import DroppableContainer from './DroppableContainer';
import { QRCodeSVG } from 'qrcode.react';

// Product Edit Modal Component
// const ProductEditModal = ({...}) => { ... }; // <-- REMOVE THIS ENTIRE COMPONENT DEFINITION

// Define a component for sortable product items
// const SortableProductItem = ({...}) => { ... }; // <-- REMOVE THIS ENTIRE COMPONENT DEFINITION

// Create a droppable container component
// const DroppableContainer = ({...}) => { ... }; // <-- REMOVE THIS ENTIRE COMPONENT DEFINITION

function KioskEditContent({ storeId }: { storeId: string }) {
  const supabase = createClient();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Product states
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [kioskProducts, setKioskProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
  
  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [currentContainer, setCurrentContainer] = useState<string | null>(null);

  // Product Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Kiosk Settings States
  const [dineInEnabled, setDineInEnabled] = useState(false);
  const [takeoutEnabled, setTakeoutEnabled] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);

  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Helper function to format price with commas
  const formatPrice = (price: number | null): string => {
    if (price === null) return "0";
    return price.toLocaleString();
  };

  useEffect(() => {
    const fetchUserAndStore = async () => {
      setLoading(true);
      setError(null);

      // Fetch user first
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error fetching user:', userError);
        setError('사용자 정보를 가져오는데 실패했습니다.');
        setLoading(false);
        return;
      }
      setUser(authUser);

      if (!authUser) {
        setError('로그인이 필요합니다. 스토어 설정을 수정할 권한이 없습니다.');
        setLoading(false);
        return;
      }

      // Fetch store details
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*, user_id, kiosk_dine_in_enabled, kiosk_takeout_enabled, kiosk_delivery_enabled') // Assuming these columns exist or will be added
        .eq('store_id', storeId)
        .single();

      if (storeError) {
        console.error('Error fetching store:', storeError);
        setError('스토어 정보를 가져오는데 실패했습니다.');
        setLoading(false);
        return;
      }

      if (!storeData) {
        setError('스토어를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }
      
      setStore(storeData as Store);

      // Check ownership
      if (storeData.user_id !== authUser.id) {
        setError('이 스토어의 설정을 수정할 권한이 없습니다.');
        setIsOwner(false);
      } else {
        setIsOwner(true);
        // Initialize toggle states from fetched store data (if available)
        setDineInEnabled(storeData.kiosk_dine_in_enabled || false);
        setTakeoutEnabled(storeData.kiosk_takeout_enabled || false);
        setDeliveryEnabled(storeData.kiosk_delivery_enabled || false);
        
        // Fetch products
        await fetchProducts(storeId);
      }
      setLoading(false);
    };

    fetchUserAndStore();
  }, [storeId, supabase]);

  const fetchProducts = async (storeId: string) => {
    setLoadingProducts(true);
    try {
      // Fetch all active products for the store
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, is_kiosk_enabled, kiosk_order, is_sold_out')
        .eq('store_id', storeId)
        .eq('status', 1) // Only active products
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        setLoadingProducts(false);
        return;
      }

      const products = productsData as Product[];
      setAllProducts(products);

      // Filter products that are enabled for kiosk and sort by kiosk_order
      const kioskEnabledProducts = products
        .filter(p => p.is_kiosk_enabled)
        .sort((a, b) => {
          if (a.kiosk_order === null || a.kiosk_order === undefined) return 1;
          if (b.kiosk_order === null || b.kiosk_order === undefined) return -1;
          return a.kiosk_order - b.kiosk_order;
        });

      setKioskProducts(kioskEnabledProducts);
    } catch (err) {
      console.error('Error in fetchProducts:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSaveKioskOptions = async () => {
    if (!isOwner) return;
    
    try {
      console.log('Saving kiosk settings:', { storeId, dineInEnabled, takeoutEnabled, deliveryEnabled });
      
      // Update the store record in Supabase
      const { error } = await supabase
        .from('stores')
        .update({
          kiosk_dine_in_enabled: dineInEnabled,
          kiosk_takeout_enabled: takeoutEnabled,
          kiosk_delivery_enabled: deliveryEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('store_id', storeId);
      
      if (error) {
        throw error;
      }
      
      alert('서비스 옵션이 성공적으로 저장되었습니다.');
    } catch (err) {
      console.error('Error saving kiosk options:', err);
      alert('서비스 옵션 저장 중 오류가 발생했습니다.');
    }
  };

  const handleSaveKioskProducts = async (currentKioskProducts: Product[]) => {
    if (!isOwner) return;
    setSavingProducts(true);
    
    try {
      console.log('[KioskEditPage] Saving kiosk product settings with list:', currentKioskProducts.map(p => ({id: p.product_id, name: p.product_name, order: p.kiosk_order })));
      
      // Step 1: Enable and set order for kiosk products in one batch
      if (currentKioskProducts.length > 0) {
        const kioskProductIds = currentKioskProducts.map(p => p.product_id);
        const kioskUpdates = currentKioskProducts.map((product, index) => {
          return supabase
            .from('products')
            .update({ 
              is_kiosk_enabled: true,
              kiosk_order: index 
            })
            .eq('product_id', product.product_id);
        });
        
        // Execute all updates in parallel
        await Promise.all(kioskUpdates);
      }
      
      // Step 2: Disable products not in currentKioskProducts in one query
      const kioskProductIds = currentKioskProducts.map(p => p.product_id);
      
      if (kioskProductIds.length > 0) {
        // Only run this query if there are kiosk products to exclude
        const { error } = await supabase
          .from('products')
          .update({ is_kiosk_enabled: false })
          .eq('store_id', storeId)
          .not('product_id', 'in', `(${kioskProductIds.join(',')})`);
          
        if (error) {
          console.error('Error disabling other products:', error);
          throw error;
        }
      } else {
        // If no products are enabled for kiosk, disable all products for this store
        const { error } = await supabase
          .from('products')
          .update({ is_kiosk_enabled: false })
          .eq('store_id', storeId);
          
        if (error) {
          console.error('Error disabling all products:', error);
          throw error;
        }
      }
      
      alert('키오스크 상품 설정이 성공적으로 저장되었습니다.');
    } catch (err) {
      console.error('Error saving kiosk products:', err);
      alert('상품 설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingProducts(false);
    }
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = String(active.id);
    setActiveId(id);
    
    // Set the current container (either availableProducts or kioskProducts)
    if (id.startsWith('kiosk-')) {
      setCurrentContainer('kioskProducts');
    } else {
      setCurrentContainer('availableProducts');
    }
    
    // Find the active product
    let product;
    
    if (id.startsWith('kiosk-')) {
      // It's a kiosk product
      const productId = id.replace('kiosk-', '');
      product = kioskProducts.find(p => p.product_id.toString() === productId);
    } else {
      // It's an available product
      product = allProducts.find(p => p.product_id.toString() === id);
    }
    
    if (product) {
      setActiveProduct(product);
    }
  };

  // Track drag over containers
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    
    // Exit if not dragging over anything
    if (!over) return;
    
    const containerId = over.id.toString();
    
    // If over a different container than the one we started from, update current container
    if ((containerId === 'availableProducts' || containerId === 'kioskProducts') && 
        containerId !== currentContainer) {
      setCurrentContainer(containerId);
    }
  };

  // Handle drag end event
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      // Reset states
      setActiveId(null);
      setActiveProduct(null);
      setCurrentContainer(null);
      return;
    }
    
    const activeIdString = String(active.id);
    const overIdString = String(over.id);
    
    let kioskConfigChanged = false;
    let finalKioskProductsForSave: Product[] = [...kioskProducts]; // Initialize with current state

    // Handle drop into container
    if (overIdString === 'availableProducts' || overIdString === 'kioskProducts') {
      const updatedList = handleContainerDrop(activeIdString, overIdString);
      if (updatedList) {
        finalKioskProductsForSave = updatedList;
      }
      // A drop into/out of kioskProducts always signifies a change.
      if (overIdString === 'kioskProducts' || (activeIdString.startsWith('kiosk-') && overIdString === 'availableProducts')) {
        kioskConfigChanged = true;
      }
    }
    // Handle drop onto another item
    else {
      const containerType = overIdString.startsWith('kiosk-') ? 'kioskProducts' : 'availableProducts';
      
      if (containerType !== currentContainer) {
        // Moving between containers
        const updatedList = handleContainerDrop(activeIdString, containerType);
        if (updatedList) {
          finalKioskProductsForSave = updatedList;
        }
        if (containerType === 'kioskProducts' || activeIdString.startsWith('kiosk-')){
            kioskConfigChanged = true;
        }
      } else {
        // Reordering within the same container
        if (containerType === 'kioskProducts') {
            const previousKioskProductsOrder = kioskProducts.map(p => p.product_id);
            const updatedList = handleReorder(activeIdString, overIdString, containerType);
            if (updatedList) {
              finalKioskProductsForSave = updatedList;
              const currentKioskProductsOrder = updatedList.map(p => p.product_id);
              if (JSON.stringify(previousKioskProductsOrder) !== JSON.stringify(currentKioskProductsOrder)) {
                  kioskConfigChanged = true;
              }
            } else {
              // If handleReorder returns null but it was a kioskProducts reorder,
              // it implies no actual order change. We can compare orders if needed,
              // but kioskConfigChanged might already be false or handleReorder should ensure it.
              // For now, if updatedList is null, finalKioskProductsForSave remains as is.
            }
        }
      }
    }
    
    // Reset states
    setActiveId(null);
    setActiveProduct(null);
    setCurrentContainer(null);

    // If the kiosk configuration changed, save it
    if (kioskConfigChanged && isOwner) {
      console.log('[KioskEditPage] Kiosk configuration changed by D&D, auto-saving with list:', finalKioskProductsForSave.map(p=>({id: p.product_id, name: p.product_name, order: p.kiosk_order })));
      await handleSaveKioskProducts(finalKioskProductsForSave);
    }
  };

  // Helper function to handle drops between containers
  // Returns the new kioskProducts list if it changed, otherwise null or original for chaining.
  const handleContainerDrop = (activeId: string, containerId: string): Product[] | null => {
    let newKioskStateForSave: Product[] | null = null;
    // Moving from kiosk to available
    if (activeId.startsWith('kiosk-') && containerId === 'availableProducts') {
      const productId = activeId.replace('kiosk-', '');
      const movedProduct = kioskProducts.find(p => p.product_id.toString() === productId);
      
      if (movedProduct) {
        // Remove from kiosk products
        const newKioskProducts = kioskProducts.filter(p => p.product_id.toString() !== productId);
        
        // Update kiosk order for remaining products
        const updatedKioskProducts = newKioskProducts.map((product, index) => ({
          ...product,
          kiosk_order: index
        }));
        
        setKioskProducts(updatedKioskProducts);
        newKioskStateForSave = updatedKioskProducts;
      }
    }
    // Moving from available to kiosk
    else if (!activeId.startsWith('kiosk-') && containerId === 'kioskProducts') {
      const currentAvailableProducts = allProducts.filter(p => 
        !kioskProducts.some(kp => kp.product_id.toString() === p.product_id.toString())
      );
      
      const movedProduct = currentAvailableProducts.find(p => p.product_id.toString() === activeId);
      
      if (movedProduct) {
        // Add to the end of kiosk products
        const newKioskProductsList = [...kioskProducts, {
          ...movedProduct,
          is_kiosk_enabled: true, // Explicitly set, though handleSave will do it too
          kiosk_order: kioskProducts.length
        }];
        
        setKioskProducts(newKioskProductsList);
        newKioskStateForSave = newKioskProductsList;
      }
    }
    return newKioskStateForSave; // Return the list that was set, or null if no relevant change
  };

  // Helper function to handle reordering within a container
  // Returns the new kioskProducts list if it changed, otherwise null.
  const handleReorder = (activeId: string, overId: string, containerId: string): Product[] | null => {
    let newKioskStateForSave: Product[] | null = null;
    if (containerId === 'kioskProducts') {
      const activeIndex = kioskProducts.findIndex(
        p => `kiosk-${p.product_id}` === activeId
      );
      const overIndex = kioskProducts.findIndex(
        p => `kiosk-${p.product_id}` === overId
      );
      
      if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
        // Reorder the products
        const newKioskProductsList = arrayMove(kioskProducts, activeIndex, overIndex);
        
        // Update kiosk order for all products
        const updatedKioskProducts = newKioskProductsList.map((product, index) => ({
          ...product,
          kiosk_order: index
        }));
        
        setKioskProducts(updatedKioskProducts);
        newKioskStateForSave = updatedKioskProducts;
      }
    } 
    // For now we don't need to reorder available products, but we could add that here
    return newKioskStateForSave; // Return the list that was set, or null if no relevant change
  };

  const handleToggleSoldOut = async (productId: string | number, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      
      // Update in Supabase
      const { error } = await supabase
        .from('products')
        .update({ 
          is_sold_out: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('product_id', productId);
        
      if (error) {
        console.error('Error updating sold out status:', error);
        alert('품절 상태 업데이트 중 오류가 발생했습니다.');
        return;
      }
      
      // Update local state
      setAllProducts(prevProducts => 
        prevProducts.map(product => 
          product.product_id === productId 
            ? { ...product, is_sold_out: newStatus } 
            : product
        )
      );
      
      setKioskProducts(prevProducts => 
        prevProducts.map(product => 
          product.product_id === productId 
            ? { ...product, is_sold_out: newStatus } 
            : product
        )
      );
      
      console.log(`Product ${productId} is now ${newStatus ? 'sold out' : 'available'}`);
    } catch (err) {
      console.error('Error in handleToggleSoldOut:', err);
      alert('품절 상태 업데이트 중 오류가 발생했습니다.');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedProduct = async (updatedProduct: Product) => {
    try {
      // Only include sgt_price if it's not null
      const updateData: any = {
        product_name: updatedProduct.product_name,
        description: updatedProduct.description,
        won_price: updatedProduct.won_price,
        image_url: updatedProduct.image_url,
        updated_at: new Date().toISOString()
      };
      
      // Only include sgt_price if it exists
      if (updatedProduct.sgt_price !== null) {
        updateData.sgt_price = updatedProduct.sgt_price;
      }
      
      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('product_id', updatedProduct.product_id);
        
      if (error) {
        console.error('Error updating product:', error);
        alert('상품 정보 업데이트 중 오류가 발생했습니다.');
        return;
      }
      
      // Update local state
      setAllProducts(prevProducts => 
        prevProducts.map(product => 
          product.product_id === updatedProduct.product_id 
            ? updatedProduct 
            : product
        )
      );
      
      setKioskProducts(prevProducts => 
        prevProducts.map(product => 
          product.product_id === updatedProduct.product_id 
            ? updatedProduct 
            : product
        )
      );
      
      // Close modal
      setIsEditModalOpen(false);
      setEditingProduct(null);
      
      alert('상품 정보가 성공적으로 업데이트되었습니다.');
    } catch (err) {
      console.error('Error in handleSaveEditedProduct:', err);
      alert('상품 정보 업데이트 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 min-h-screen flex flex-col items-center justify-center text-center">
        <p className="text-red-500 text-xl mb-4">⚠️ {error}</p>
        <Link href={`/stores/${storeId}`} className="text-blue-500 hover:underline">
          스토어 상세 페이지로 돌아가기
        </Link>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto p-6 min-h-screen flex flex-col items-center justify-center text-center">
        <p className="text-red-500 text-xl mb-4">🚫 접근 권한 없음</p>
        <p className="mb-4">이 페이지에 접근할 권한이 없습니다.</p>
        <Link href={`/stores/${storeId}`} className="text-blue-500 hover:underline">
          스토어 상세 페이지로 돌아가기
        </Link>
      </div>
    );
  }

  // Get available products (products not already in kioskProducts)
  const availableProducts = allProducts.filter(
    product => !kioskProducts.some(kProduct => kProduct.product_id === product.product_id)
  );

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">키오스크 편집</h1>
      
      {/* Main content area */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {/* Kiosk QR Code Section */}
        <section className="mb-12 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">키오스크 QR 코드</h2>
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 flex flex-col items-center">
              <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/kiosk/${storeId}`} size={200} />
              <p className="mt-4 text-sm text-gray-600 text-center">
                QR 코드를 스캔하여 웹 키오스크 모드에 바로 접속하세요.
              </p>
              <p className="mt-2 text-sm text-gray-500 text-center">
                이 QR 코드는 웹 브라우저에서 스토어의 키오스크 모드에 바로 접속할 수 있는 링크입니다.
              </p>
            </div>
          </div>
        </section>
        
        {/* Service Option Toggles */}
        <section className="mb-12 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">서비스 옵션 활성화</h2>
          <div className="space-y-6">
            {/* Dine-in Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-800">매장 내 식사</h3>
                <p className="text-sm text-gray-500">키오스크에서 매장 내 식사 옵션을 제공합니다.</p>
              </div>
              <button
                onClick={() => setDineInEnabled(!dineInEnabled)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  dineInEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${
                    dineInEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Takeout Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-800">포장 (가져가기)</h3>
                <p className="text-sm text-gray-500">키오스크에서 포장 옵션을 제공합니다.</p>
              </div>
              <button
                onClick={() => setTakeoutEnabled(!takeoutEnabled)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  takeoutEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${
                    takeoutEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Delivery Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-800">배달</h3>
                <p className="text-sm text-gray-500">키오스크에서 배달 옵션을 제공합니다. (추가 설정 필요할 수 있음)</p>
              </div>
              <button
                onClick={() => setDeliveryEnabled(!deliveryEnabled)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  deliveryEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${
                    deliveryEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          <div className="mt-8 text-right">
            <button 
              onClick={handleSaveKioskOptions}
              className="px-6 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors shadow-sm"
            >
              서비스 옵션 저장
            </button>
          </div>
        </section>
      </div>
      
      {/* Drag and drop section */}
      <div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="flex flex-col md:flex-row gap-6">
            {/* Available Products Column */}
            <div className="flex-1">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">모든 상품</h3>
                <p className="text-sm text-gray-500 mb-4">키오스크에 추가할 상품을 오른쪽으로 드래그하세요.</p>
              </div>
              
              <DroppableContainer 
                id="availableProducts" 
                items={availableProducts.map(p => p.product_id.toString())}
              >
                {availableProducts.length === 0 ? (
                  <div className="flex justify-center items-center h-32 text-gray-400">
                    모든 상품이 키오스크에 추가되었습니다.
                  </div>
                ) : (
                  <SortableContext
                    items={availableProducts.map(p => p.product_id.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    {availableProducts.map(product => (
                      <SortableProductItem 
                        key={product.product_id} 
                        product={product}
                        onToggleSoldOut={handleToggleSoldOut}
                        onEditProduct={handleEditProduct}
                      />
                    ))}
                  </SortableContext>
                )}
              </DroppableContainer>
            </div>

            {/* Kiosk Products Column */}
            <div className="flex-1">
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <h3 className="text-lg font-semibold text-green-700 mb-2">키오스크 메뉴</h3>
                <p className="text-sm text-gray-600 mb-4">여기에 표시된 상품만 키오스크에 표시됩니다. 순서를 조정하려면 드래그하세요.</p>
              </div>
              
              <DroppableContainer 
                id="kioskProducts" 
                items={kioskProducts.map(p => `kiosk-${p.product_id}`)}
              >
                {kioskProducts.length === 0 ? (
                  <div className="flex justify-center items-center h-32 text-gray-400">
                    키오스크에 표시할 상품을 추가하세요.
                  </div>
                ) : (
                  <SortableContext
                    items={kioskProducts.map(p => `kiosk-${p.product_id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {kioskProducts.map((product) => (
                      <SortableProductItem 
                        key={`kiosk-${product.product_id}`} 
                        product={product} 
                        isKioskProduct={true}
                        onToggleSoldOut={handleToggleSoldOut}
                        onEditProduct={handleEditProduct}
                      />
                    ))}
                  </SortableContext>
                )}
              </DroppableContainer>
            </div>
          </div>

          {/* Drag overlay for visual feedback */}
          <DragOverlay>
            {activeProduct && (
              <div className="p-3 rounded-lg border-2 border-blue-400 bg-white shadow-lg opacity-80">
                <div className="flex items-center gap-3">
                  {activeProduct.image_url ? (
                    <img 
                      src={activeProduct.image_url} 
                      alt={activeProduct.product_name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                      No Image
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium">{activeProduct.product_name}</h4>
                    <div className="flex text-sm gap-2">
                      <span className="text-gray-600">{formatPrice(activeProduct.won_price)}원</span>
                      {activeProduct.sgt_price && (
                        <span className="text-blue-600">{formatPrice(activeProduct.sgt_price)} SGT</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
      
      {/* Modal for product editing */}
      <ProductEditModal 
        isOpen={isEditModalOpen}
        product={editingProduct}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveEditedProduct}
      />
      
      {/* Kiosk Sales History Section */}
      <KioskSalesHistory storeId={storeId} />
      
      {/* Active Kiosk Sessions Section */}
      <KioskActiveSessions storeId={storeId} />
    </div>
  );
}

export default async function KioskEditPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const resolvedParams = await params;
  const { storeId } = resolvedParams;
  
  return <KioskEditContent storeId={storeId} />;
} 