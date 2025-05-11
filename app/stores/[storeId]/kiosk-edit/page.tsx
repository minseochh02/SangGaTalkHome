'use client';

import React, { useEffect, useState } from 'react';
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

// Define interface for product with kiosk specific properties
interface KioskProduct extends Product {
  kiosk_order?: number;
  is_kiosk_enabled?: boolean;
}

// Define a component for sortable product items
const SortableProductItem = ({ 
  product, 
  isKioskProduct = false 
}: { 
  product: KioskProduct, 
  isKioskProduct?: boolean 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: isKioskProduct ? `kiosk-${product.product_id}` : product.product_id.toString(),
    data: {
      product,
      isKioskProduct
    }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const formatPrice = (price: number | null): string => {
    if (price === null) return "0";
    return price.toLocaleString();
  };
  
  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...attributes} 
      {...listeners}
      className={`mb-2 p-3 rounded-lg border bg-white border-gray-200 cursor-move ${isDragging ? 'z-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        {isKioskProduct && (
          <div className="text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.product_name}
            className="w-12 h-12 object-cover rounded"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
            No Image
          </div>
        )}
        <div className="flex-1">
          <h4 className="font-medium">{product.product_name}</h4>
          <div className="flex text-sm gap-2">
            <span className="text-gray-600">{formatPrice(product.won_price)}원</span>
            {product.sgt_price && (
              <span className="text-blue-600">{formatPrice(product.sgt_price)} SGT</span>
            )}
          </div>
        </div>
        {isKioskProduct ? (
          <div className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
            #{product.kiosk_order !== undefined ? product.kiosk_order + 1 : '?'}
          </div>
        ) : (
          <div className="text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

// Create a droppable container component
const DroppableContainer = ({ 
  id, 
  items, 
  children, 
  className 
}: { 
  id: string; 
  items: string[]; 
  children: React.ReactNode; 
  className?: string;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'container',
      accepts: items
    }
  });

  const isHighlighted = isOver;
  const highlightClass = isHighlighted 
    ? id === 'kioskProducts' 
      ? 'bg-green-50 border-green-300' 
      : 'bg-blue-50 border-blue-300' 
    : 'bg-white border-gray-200';

  return (
    <div 
      ref={setNodeRef} 
      className={`min-h-[400px] p-2 rounded-lg border transition-colors duration-200 ${highlightClass} ${className || ''}`}
    >
      {children}
    </div>
  );
};

function KioskEditContent({ storeId }: { storeId: string }) {
  const supabase = createClient();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Product states
  const [allProducts, setAllProducts] = useState<KioskProduct[]>([]);
  const [kioskProducts, setKioskProducts] = useState<KioskProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
  
  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<KioskProduct | null>(null);
  const [currentContainer, setCurrentContainer] = useState<string | null>(null);

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
        .select('*, is_kiosk_enabled, kiosk_order')
        .eq('store_id', storeId)
        .eq('status', 1) // Only active products
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        setLoadingProducts(false);
        return;
      }

      const products = productsData as KioskProduct[];
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
    // Save kiosk service options
    console.log('Saving kiosk settings:', { storeId, dineInEnabled, takeoutEnabled, deliveryEnabled });
    alert('서비스 옵션이 저장되었습니다! (현재는 프론트엔드에만 저장됩니다)');
    // Later, this will update Supabase
  };

  const handleSaveKioskProducts = async () => {
    if (!isOwner) return;
    setSavingProducts(true);
    
    try {
      console.log('Saving kiosk product settings:', kioskProducts);

      // In a real implementation, you would update the database
      // For each product in kioskProducts, update is_kiosk_enabled=true and set kiosk_order
      // For products not in kioskProducts, set is_kiosk_enabled=false
      
      // Example of batch update (if your database supports it):
      /*
      for (let i = 0; i < kioskProducts.length; i++) {
        const product = kioskProducts[i];
        await supabase
          .from('products')
          .update({ 
            is_kiosk_enabled: true,
            kiosk_order: i 
          })
          .eq('product_id', product.product_id);
      }
      
      // Disable products not in kioskProducts
      const kioskProductIds = kioskProducts.map(p => p.product_id);
      await supabase
        .from('products')
        .update({ is_kiosk_enabled: false })
        .eq('store_id', storeId)
        .not('product_id', 'in', kioskProductIds);
      */
      
      alert('키오스크 상품 설정이 저장되었습니다! (현재는 프론트엔드에만 저장됩니다)');
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
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      // Reset states
      setActiveId(null);
      setActiveProduct(null);
      setCurrentContainer(null);
      return;
    }
    
    const activeId = String(active.id);
    const overId = String(over.id);
    
    // Handle drop into container
    if (overId === 'availableProducts' || overId === 'kioskProducts') {
      handleContainerDrop(activeId, overId);
    }
    // Handle drop onto another item
    else {
      // Determine which container we're in based on the over id
      const containerType = overId.startsWith('kiosk-') ? 'kioskProducts' : 'availableProducts';
      
      if (containerType !== currentContainer) {
        // Moving between containers
        handleContainerDrop(activeId, containerType);
      } else {
        // Reordering within the same container
        handleReorder(activeId, overId, containerType);
      }
    }
    
    // Reset states
    setActiveId(null);
    setActiveProduct(null);
    setCurrentContainer(null);
  };

  // Helper function to handle drops between containers
  const handleContainerDrop = (activeId: string, containerId: string) => {
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
      }
    }
    // Moving from available to kiosk
    else if (!activeId.startsWith('kiosk-') && containerId === 'kioskProducts') {
      const availableProducts = allProducts.filter(p => 
        !kioskProducts.some(kp => kp.product_id.toString() === p.product_id.toString())
      );
      
      const movedProduct = availableProducts.find(p => p.product_id.toString() === activeId);
      
      if (movedProduct) {
        // Add to the end of kiosk products
        const newKioskProducts = [...kioskProducts, {
          ...movedProduct,
          is_kiosk_enabled: true,
          kiosk_order: kioskProducts.length
        }];
        
        setKioskProducts(newKioskProducts);
      }
    }
  };

  // Helper function to handle reordering within a container
  const handleReorder = (activeId: string, overId: string, containerId: string) => {
    if (containerId === 'kioskProducts') {
      const activeIndex = kioskProducts.findIndex(
        p => `kiosk-${p.product_id}` === activeId
      );
      const overIndex = kioskProducts.findIndex(
        p => `kiosk-${p.product_id}` === overId
      );
      
      if (activeIndex !== overIndex) {
        // Reorder the products
        const newKioskProducts = arrayMove(kioskProducts, activeIndex, overIndex);
        
        // Update kiosk order for all products
        const updatedKioskProducts = newKioskProducts.map((product, index) => ({
          ...product,
          kiosk_order: index
        }));
        
        setKioskProducts(updatedKioskProducts);
      }
    } 
    // For now we don't need to reorder available products, but we could add that here
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
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <Link href={`/stores/${storeId}`} className="text-blue-500 hover:underline inline-flex items-center mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          스토어 상세로 돌아가기
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">키오스크 설정: {store?.store_name}</h1>
      </header>

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

      {/* Product Drag and Drop Section */}
      <section className="mt-12 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">키오스크 상품 관리</h2>
        <p className="text-gray-600 mb-6">
          상품을 드래그하여 키오스크에 표시할 상품을 선택하고 순서를 조정하세요. 왼쪽의 상품 목록에서 오른쪽 키오스크 메뉴로 상품을 끌어다 놓으세요.
        </p>
        
        {loadingProducts ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-col lg:flex-row gap-6">
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
        )}
        
        <div className="mt-8 text-right">
          <button 
            onClick={handleSaveKioskProducts}
            disabled={savingProducts || loadingProducts}
            className={`px-6 py-2 ${
              savingProducts || loadingProducts 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600'
            } text-white font-semibold rounded-lg transition-colors shadow-sm`}
          >
            {savingProducts ? '저장 중...' : '키오스크 상품 저장'}
          </button>
        </div>
      </section>
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