'use client';

import React, { useEffect, useState, Fragment, JSX } from 'react';
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
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import KioskSalesHistory from './KioskSalesHistory';
import KioskActiveSessions from './KioskActiveSessions';
import KioskOrdersManagement from './KioskOrdersManagement';
import ProductEditModal from './ProductEditModal';
import DroppableContainer from './DroppableContainer';
import { QRCodeSVG } from 'qrcode.react';
import GlobalOptionEditor from './GlobalOptionEditor';
import AddDividerPlaceholder from './AddDividerPlaceholder';
import SortableDividerItem from './SortableDividerItem';
import { v4 as uuidv4 } from 'uuid';
import ProductCreateModal from './ProductCreateModal';
import { toast } from "@/components/ui/use-toast";

// Define SortableProductItemProps
interface SortableProductItemProps {
  product: Product;
  isKioskProduct?: boolean; // Optional, as it's not always a kiosk product
  onToggleSoldOut: (productId: string | number, currentStatus: boolean) => void;
  onEditProduct: (product: Product) => void;
  // New props for selection
  listType: 'available' | 'kiosk';
  isSelected: boolean;
  onSelect: (productId: string, select: boolean) => void;
}

// Define a basic SortableProductItem component structure for now
// This would ideally be in its own file (e.g., ./SortableProductItem.tsx)
// For the purpose of this exercise, defining it here to resolve linter errors.
const SortableProductItem: React.FC<SortableProductItemProps> = ({
  product,
  isKioskProduct,
  onToggleSoldOut,
  onEditProduct,
  listType,
  isSelected,
  onSelect
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: isKioskProduct ? `kiosk-${product.product_id}` : product.product_id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSelect(product.product_id.toString(), event.target.checked);
  };
  
  // Helper function to format price with commas (copied from KioskEditContent for now)
  const formatPrice = (price: number | null): string => {
    if (price === null) return "0";
    return price.toLocaleString();
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      className="p-3 my-1 rounded-md border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow relative"
    >
      <div className="flex items-center gap-3">
        {/* Checkbox for selection */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
          onClick={(e) => e.stopPropagation()} // Prevent D&D from starting when clicking checkbox
        />

        {/* Drag Handle (conditionally rendered or styled if needed) */}
        <button 
          {...listeners} 
          className="cursor-grab p-1 text-gray-400 hover:text-gray-600"
          aria-label="Drag to reorder"
          // Optional: Disable drag handle if item is selected for a different action, or style it.
          // For now, keep it active for intra-list reordering.
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>

        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.product_name}
            className="w-12 h-12 object-cover rounded"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
            No Img
          </div>
        )}
        <div className="flex-1">
          <h4 className="font-medium text-gray-800">{product.product_name}</h4>
          <div className="flex text-sm gap-2">
            <span className="text-gray-600">{formatPrice(product.won_price)}원</span>
            {product.sgt_price !== null && product.sgt_price !== undefined && (
              <span className="text-blue-600">{formatPrice(product.sgt_price)} SGT</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEditProduct(product); }}
            className="px-2 py-1 text-xs bg-yellow-400 text-yellow-800 rounded hover:bg-yellow-500 transition-colors"
          >
            수정
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSoldOut(product.product_id, product.is_sold_out || false); }}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              product.is_sold_out 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {product.is_sold_out ? '품절 해제' : '품절 처리'}
          </button>
        </div>
      </div>
      {/* Display kiosk_order if it's a kiosk product (for debugging/info) */}
      {isKioskProduct && product.kiosk_order !== undefined && (
        <div className="absolute top-1 right-1 text-xs text-gray-400 bg-gray-100 px-1 rounded-sm">
          KO: {product.kiosk_order}
        </div>
      )}
    </div>
  );
};

// Define a frontend-only divider type
interface KioskDivider {
  id: string;
  name: string;
  position: number; // Position in the kiosk list (between which products)
  afterProductId: string | null; // The product ID this divider comes after, null if at the beginning
}

// Add these new type definitions and helper functions near the top of the file, after the KioskDivider interface
interface CombinedMenuItem {
  id: string; // Combined ID that includes the type prefix (kiosk-, divider-)
  type: 'product' | 'divider';
  itemId: string; // The original ID without prefix
  position: number; // Position in the combined list
  item: Product | KioskDivider; // The actual item object
}

function createCombinedMenuItems(products: Product[], dividers: KioskDivider[]): CombinedMenuItem[] {
  const items: CombinedMenuItem[] = [];
  
  // Add products
  products.forEach((product, index) => {
    items.push({
      id: `kiosk-${product.product_id}`,
      type: 'product',
      itemId: product.product_id.toString(),
      position: product.kiosk_order !== undefined ? product.kiosk_order : index,
      item: product
    });
  });
  
  // Add dividers
  dividers.forEach((divider) => {
    items.push({
      id: `divider-${divider.id}`,
      type: 'divider',
      itemId: divider.id,
      position: divider.position,
      item: divider
    });
  });
  
  // Sort by position
  return items.sort((a, b) => a.position - b.position);
}

function getCombinedItemIds(combinedItems: CombinedMenuItem[]): string[] {
  return combinedItems.map(item => item.id);
}

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
  
  // Divider state (frontend only)
  const [dividers, setDividers] = useState<KioskDivider[]>([]);
  
  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeDivider, setActiveDivider] = useState<KioskDivider | null>(null);
  const [currentContainer, setCurrentContainer] = useState<string | null>(null);

  // Product Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // State for the new product modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Kiosk Settings States
  const [dineInEnabled, setDineInEnabled] = useState(false);
  const [takeoutEnabled, setTakeoutEnabled] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);

  // Add a new state to control the tab view
  const [activeSection, setActiveSection] = useState<'menu' | 'options' | 'orders'>('menu');

  // Divider Input State
  const [addingDividerAfter, setAddingDividerAfter] = useState<string | null | undefined>(undefined); // null for end, product_id for after specific item, undefined for not adding
  const [newDividerName, setNewDividerName] = useState('');

  // Add this state near the other state declarations
  const [savingCategories, setSavingCategories] = useState(false);

  // Add new state variables for selections
  const [selectedAvailableProductIds, setSelectedAvailableProductIds] = useState<Set<string>>(new Set());
  const [selectedKioskProductIds, setSelectedKioskProductIds] = useState<Set<string>>(new Set());

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
        .select('*, user_id, kiosk_dine_in_enabled, kiosk_takeout_enabled, kiosk_delivery_enabled')
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
        
        // Also fetch categories
        await fetchCategories(storeId);
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
        .order('kiosk_order', { ascending: true }) 
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
      
      console.log("Fetched Kiosk Enabled Products:", kioskEnabledProducts.map(p => ({id: p.product_id, name: p.product_name, order: p.kiosk_order})));
      setKioskProducts(kioskEnabledProducts);
    } catch (err) {
      console.error('Error in fetchProducts:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCategories = async (storeId: string) => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('kiosk_categories')
        .select('*')
        .eq('store_id', storeId)
        .order('position', { ascending: true });
        
      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        return;
      }
      
      // Convert the retrieved data to KioskDivider format
      const dividers: KioskDivider[] = categoriesData.map(category => ({
        id: category.category_id,
        name: category.category_name,
        position: category.position,
        afterProductId: category.after_product_id
      }));
      
      console.log('Fetched categories:', dividers);
      setDividers(dividers);
    } catch (err) {
      console.error('Error in fetchCategories:', err);
    }
  };

  const saveCategories = async () => {
    if (!isOwner) return;
    
    setSavingCategories(true);
    try {
      console.log('Saving categories:', dividers);
      
      // First, delete all existing categories for this store
      const { error: deleteError } = await supabase
        .from('kiosk_categories')
        .delete()
        .eq('store_id', storeId);
        
      if (deleteError) {
        console.error('Error deleting existing categories:', deleteError);
        throw deleteError;
      }
      
      // Then insert all current categories
      if (dividers.length > 0) {
        const categoriesToInsert = dividers.map(divider => ({
          category_id: divider.id, // Use the existing UUID
          store_id: storeId,
          category_name: divider.name,
          position: divider.position,
          after_product_id: divider.afterProductId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        const { error: insertError } = await supabase
          .from('kiosk_categories')
          .insert(categoriesToInsert);
          
        if (insertError) {
          console.error('Error inserting categories:', insertError);
          throw insertError;
        }
      }
      
      console.log('Categories saved successfully');
      alert('카테고리가 성공적으로 저장되었습니다.');
    } catch (err) {
      console.error('Error in saveCategories:', err);
      alert('카테고리 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingCategories(false);
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
      // The currentKioskProducts should already have the correct kiosk_order
      console.log('[KioskEditPage] Saving kiosk product settings with list (expecting correct kiosk_order):', currentKioskProducts.map(p => ({id: p.product_id, name: p.product_name, order: p.kiosk_order})));
      
      // Step 1: Enable and set order for kiosk products in one batch
      if (currentKioskProducts.length > 0) {
        const kioskUpdates = currentKioskProducts.map((product) => {
          if (product.kiosk_order === undefined || product.kiosk_order === null) {
            console.warn(`Product ${product.product_id} is missing kiosk_order. This should not happen for products in kiosk list.`);
          }
          return supabase
            .from('products')
            .update({ 
              is_kiosk_enabled: true,
              kiosk_order: product.kiosk_order
            })
            .eq('product_id', product.product_id);
        });
        
        await Promise.all(kioskUpdates);
      }
      
      // Step 2: Disable products not in currentKioskProducts
      const kioskProductIds = currentKioskProducts.map(p => p.product_id);
      
      const { error: disableError } = await supabase
        .from('products')
        .update({ is_kiosk_enabled: false, kiosk_order: null }) // Also nullify kiosk_order for disabled ones
        .eq('store_id', storeId)
        .not('product_id', 'in', `(${kioskProductIds.length > 0 ? kioskProductIds.join(',') : ''})`); // Handle empty kioskProductIds
          
      if (disableError) {
        console.error('Error disabling other products:', disableError);
        throw disableError;
      }
      
      alert('키오스크 상품 설정이 성공적으로 저장되었습니다.');
      // Refresh products from DB to ensure consistency after save, especially for kiosk_order nullification
      await fetchProducts(storeId);

    } catch (err) {
      console.error('Error saving kiosk products:', err);
      alert('상품 설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingProducts(false);
    }
  };

  // ---- Button Handlers for Moving Products ----
  const handleAddToKiosk = async () => {
    if (selectedAvailableProductIds.size === 0) return;

    const productsToAdd = allProducts.filter(p => selectedAvailableProductIds.has(p.product_id.toString()));
    
    // Create a new list of kiosk products, adding new ones at the end
    let newKioskProductList = [...kioskProducts];
    
    productsToAdd.forEach(product => {
      // Avoid adding duplicates if somehow selected again before state updates
      if (!newKioskProductList.some(kp => kp.product_id === product.product_id)) {
        newKioskProductList.push({
          ...product,
          is_kiosk_enabled: true,
          // kiosk_order will be set below
        });
      }
    });

    // Re-assign kiosk_order for all items in the new list
    const updatedKioskProductsWithOrder = newKioskProductList.map((product, index) => ({
      ...product,
      kiosk_order: index
    }));

    setKioskProducts(updatedKioskProductsWithOrder);
    setSelectedAvailableProductIds(new Set()); // Clear selection

    // Save changes
    await handleSaveKioskProducts(updatedKioskProductsWithOrder);
    // Consider if saveCategories is needed if dividers' relative positions are affected
    // For now, adding to end might not directly impact divider logic unless they need re-sorting
  };

  const handleRemoveFromKiosk = async () => {
    if (selectedKioskProductIds.size === 0) return;

    let newKioskProductList = kioskProducts.filter(p => !selectedKioskProductIds.has(p.product_id.toString()));

    // Re-assign kiosk_order for the remaining items
    const updatedKioskProductsWithOrder = newKioskProductList.map((product, index) => ({
      ...product,
      kiosk_order: index
    }));
    
    setKioskProducts(updatedKioskProductsWithOrder);
    setSelectedKioskProductIds(new Set()); // Clear selection

    // Save changes
    await handleSaveKioskProducts(updatedKioskProductsWithOrder);
    // Consider if saveCategories is needed
    // If a product that a divider was 'after' is removed, saveCategories might be important
    await saveCategories(); // Saving categories to update their afterProductId if needed
  };

  // Handle drag start for both products and dividers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = String(active.id);
    setActiveId(id);
    
    if (id.startsWith('kiosk-')) {
      setCurrentContainer('kioskProducts');
      const productId = id.replace('kiosk-', '');
      const product = kioskProducts.find(p => p.product_id.toString() === productId);
      if (product) setActiveProduct(product);
    } else if (id.startsWith('divider-')) {
      setCurrentContainer('kioskProducts'); // Dividers are in the kiosk container
      const dividerId = id.replace('divider-', '');
      const divider = dividers.find(d => d.id === dividerId);
      if (divider) setActiveDivider(divider);
    } else {
      setCurrentContainer('availableProducts');
      const product = allProducts.find(p => p.product_id.toString() === id);
      if (product) setActiveProduct(product);
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

  // Handle drag end event for both products and dividers
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      // Reset states
      setActiveId(null);
      setActiveProduct(null);
      setActiveDivider(null);
      setCurrentContainer(null);
      return;
    }
    
    const activeIdString = String(active.id);
    const overIdString = String(over.id);
    
    console.log("Drag end:", { activeIdString, overIdString, currentContainer });
    
    let kioskConfigChanged = false;
    let finalKioskProductsForSave: Product[] = [...kioskProducts];
    
    // Create a combined ordered list of all items in the kiosk menu
    const combinedItems = createCombinedMenuItems(kioskProducts, dividers);
    
    // Case 1: Dragging between containers (available products ↔ kiosk products)
    // THIS CASE WILL BE REMOVED OR DISABLED as per new requirements
    /*
    if (overIdString === 'availableProducts' || overIdString === 'kioskProducts') {
      // Product removed from kiosk to available products
      if (activeIdString.startsWith('kiosk-') && overIdString === 'availableProducts') {
        const productId = activeIdString.replace('kiosk-', '');
        const newKioskProducts = kioskProducts.filter(p => p.product_id.toString() !== productId);
        const updatedKioskProducts = newKioskProducts.map((product, index) => ({
          ...product,
          kiosk_order: index
          }));

          setKioskProducts(updatedKioskProducts);
          finalKioskProductsForSave = updatedKioskProducts;
        kioskConfigChanged = true;
      } 
      // Product added from available to kiosk (at the end)
      else if (!activeIdString.startsWith('kiosk-') && !activeIdString.startsWith('divider-') && overIdString === 'kioskProducts') {
        const productId = activeIdString;
        const productToAdd = allProducts.find(p => p.product_id.toString() === productId);
        
        if (productToAdd) {
          const newKioskProducts = [...kioskProducts, {
            ...productToAdd,
            is_kiosk_enabled: true,
            kiosk_order: kioskProducts.length
          }];
          
          setKioskProducts(newKioskProducts);
          finalKioskProductsForSave = newKioskProducts;
                kioskConfigChanged = true;
              }
            }
      // A divider cannot be dragged to the available products list - enforce this
      else if (activeIdString.startsWith('divider-') && overIdString === 'availableProducts') {
        // No change, reset states
        setActiveId(null);
        setActiveDivider(null);
        setCurrentContainer(null);
        return;
      }
    }
    */
    // Case 2: Reordering within kiosk menu (product or divider dragged onto another item)
    // This case remains for intra-list D&D
    if (currentContainer === 'kioskProducts' && 
            (overIdString.startsWith('kiosk-') || overIdString.startsWith('divider-')) &&
            (activeIdString.startsWith('kiosk-') || activeIdString.startsWith('divider-'))) {
      
      // Find indices in the combined list
      const activeIndex = combinedItems.findIndex(item => item.id === activeIdString);
      const overIndex = combinedItems.findIndex(item => item.id === overIdString);
      
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        // Use arrayMove to reorder the combined list
        const newCombinedItems = arrayMove(combinedItems, activeIndex, overIndex);
        
        // Reconstruct kioskProducts and dividers from the new order
        const newKioskProducts: Product[] = [];
        const newDividers: KioskDivider[] = [];
        
        // Assign new positions to all items based on their index in the combined list
        newCombinedItems.forEach((item, index) => {
          if (item.type === 'product') {
            const product = item.item as Product;
            newKioskProducts.push({
          ...product,
          kiosk_order: index
            });
          } else { // item.type === 'divider'
            const divider = item.item as KioskDivider;
            
            // Determine what product this divider comes after
            let afterProductId: string | null = null;
            
            if (index === 0) {
              // If first item, it comes at the beginning
              afterProductId = null;
            } else {
              // Find the nearest product before this divider
              for (let i = index - 1; i >= 0; i--) {
                if (newCombinedItems[i].type === 'product') {
                  afterProductId = newCombinedItems[i].itemId;
                  break;
                }
              }
            }
            
            newDividers.push({
              ...divider,
              position: index,
              afterProductId
            });
          }
        });
        
        setKioskProducts(newKioskProducts);
        setDividers(newDividers);
        finalKioskProductsForSave = newKioskProducts;
        kioskConfigChanged = true;
        
        // Check if a divider was moved, which requires special handling
        if (activeIdString.startsWith('divider-')) {
          // Force an immediate save of the categories when a divider is moved
          setTimeout(() => {
            saveCategories().catch(err => console.error('Error saving categories after divider move:', err));
          }, 100);
        }
      }
    }
    // Case 3: Adding a product from available to kiosk by dropping on a specific item
    // THIS CASE WILL BE REMOVED OR DISABLED
    /*
    else if (!activeIdString.startsWith('kiosk-') && !activeIdString.startsWith('divider-') && 
             currentContainer === 'availableProducts' && 
             (overIdString.startsWith('kiosk-') || overIdString.startsWith('divider-'))) {
      
      const productId = activeIdString;
      const productToAdd = allProducts.find(p => p.product_id.toString() === productId);
      
      if (productToAdd) {
        // Find where to insert the product
        const overIndex = combinedItems.findIndex(item => item.id === overIdString);
        
        if (overIndex !== -1) {
          // Create new product entry with appropriate kiosk_order
          const newProduct = {
            ...productToAdd,
            is_kiosk_enabled: true,
            kiosk_order: overIndex // We'll adjust all kiosk_order values after insertion
          };
          
          // Insert into combined list
          const newCombinedItems = [...combinedItems];
          newCombinedItems.splice(overIndex, 0, {
            id: `kiosk-${productToAdd.product_id}`,
            type: 'product',
            itemId: productToAdd.product_id.toString(),
            position: overIndex,
            item: newProduct
          });
          
          // Reconstruct kioskProducts and dividers from the new order (similar to Case 2)
          const newKioskProducts: Product[] = [];
          const newDividers: KioskDivider[] = [];
          
          newCombinedItems.forEach((item, index) => {
            if (item.type === 'product') {
              const product = item.item as Product;
              newKioskProducts.push({
                ...product,
                kiosk_order: index
              });
            } else { // item.type === 'divider'
              const divider = item.item as KioskDivider;
              
              let afterProductId: string | null = null;
              
              if (index === 0) {
                afterProductId = null;
              } else {
                for (let i = index - 1; i >= 0; i--) {
                  if (newCombinedItems[i].type === 'product') {
                    afterProductId = newCombinedItems[i].itemId;
                    break;
                  }
                }
              }
              
              newDividers.push({
                ...divider,
                position: index,
                afterProductId
              });
            }
          });
          
          setKioskProducts(newKioskProducts);
          setDividers(newDividers);
          finalKioskProductsForSave = newKioskProducts;
          kioskConfigChanged = true;
        }
      }
    }
    */
    
    // Check if the drag operation was not one of the disabled ones
    // Only proceed if it's an intra-kiosk D&D operation
    const isIntraKioskDrag = currentContainer === 'kioskProducts' &&
                           (overIdString.startsWith('kiosk-') || overIdString.startsWith('divider-')) &&
                           (activeIdString.startsWith('kiosk-') || activeIdString.startsWith('divider-'));

    if (!isIntraKioskDrag && activeIdString && overIdString) {
        // If it's not an intra-kiosk drag (e.g. drag from available to kiosk, or kiosk to available)
        // and we are disabling this, then we just reset and do nothing.
        console.log("Drag operation between lists is disabled. Resetting.");
        setActiveId(null);
        setActiveProduct(null);
        setActiveDivider(null);
        setCurrentContainer(null);
        return; // Explicitly return to prevent further processing
    }

    // Reset states
    setActiveId(null);
    setActiveProduct(null);
    setActiveDivider(null);
    setCurrentContainer(null);

    // If the kiosk product configuration changed, save it to the backend
    if (kioskConfigChanged && isOwner) {
      console.log('[KioskEditPage] Kiosk configuration changed by D&D, auto-saving with list:', finalKioskProductsForSave.map(p=>({id: p.product_id, name: p.product_name, order: p.kiosk_order})));
      await handleSaveKioskProducts(finalKioskProductsForSave);
      
      // Also save categories since their positions might have changed
      await saveCategories();
    }
  };

  // ---- Divider specific functions ----
  const handleShowDividerInput = (insertAfterItemId: string | null) => {
    console.log("handleShowDividerInput for after item ID:", insertAfterItemId);
    setAddingDividerAfter(insertAfterItemId);
    setNewDividerName(''); // Reset name
  };

  const handleCancelAddDivider = () => {
    setAddingDividerAfter(undefined); // undefined means not adding
    setNewDividerName('');
  };

  const handleSaveNewDivider = async () => {
    if (!newDividerName.trim() || addingDividerAfter === undefined) return;

    const newDividerId = uuidv4();
    
    // 1. Determine the insertion index in the *current* combined list
    let insertionIndex = 0;
    const originalCombinedItems = createCombinedMenuItems(kioskProducts, dividers);
    let intendedAfterProductIdForDB: string | null = null;

    if (addingDividerAfter === '__first__') {
        insertionIndex = 0;
        intendedAfterProductIdForDB = null;
    } else if (addingDividerAfter === null) { // Add to very end
        insertionIndex = originalCombinedItems.length;
        // Determine afterProductId for DB: last product in combined list or null
        const lastProductInCombined = [...originalCombinedItems].reverse().find(item => item.type === 'product');
        intendedAfterProductIdForDB = lastProductInCombined ? lastProductInCombined.itemId : null;
    } else { // Add after a specific product
        const targetProductId = addingDividerAfter;
        intendedAfterProductIdForDB = targetProductId; // This is the product it's intended to be after
        const targetProductItemId = `kiosk-${targetProductId}`;
        const idx = originalCombinedItems.findIndex(item => item.id === targetProductItemId);
        
        if (idx !== -1) {
            insertionIndex = idx + 1; // Insert *after* the found product
      } else {
            console.warn(`Could not find item ID ${targetProductItemId} to insert divider after. Adding to end of current items.`);
            insertionIndex = originalCombinedItems.length;
            // Fallback for intendedAfterProductIdForDB if target not found
            const lastProductInCombined = [...originalCombinedItems].reverse().find(item => item.type === 'product');
            intendedAfterProductIdForDB = lastProductInCombined ? lastProductInCombined.itemId : null;
        }
    }

    // 2. Create the new KioskDivider object (position will be set in step 4)
    const newDividerObject: KioskDivider = {
      id: newDividerId,
      name: newDividerName.trim(),
        position: 0, // Placeholder, will be correctly set during re-indexing
        afterProductId: intendedAfterProductIdForDB // For DB, reflecting user intent
    };

    // 3. Create the CombinedMenuItem for the new divider
    const newCombinedDividerItem: CombinedMenuItem = {
        id: `divider-${newDividerObject.id}`,
        type: 'divider',
        itemId: newDividerObject.id,
        position: 0, // Placeholder, will be set
        item: newDividerObject
    };

    // 4. Insert the new combined item into a temporary list and re-index everything
    const tempCombinedItemsWithNew = [...originalCombinedItems];
    tempCombinedItemsWithNew.splice(insertionIndex, 0, newCombinedDividerItem);

    const finalKioskProducts: Product[] = [];
    const finalDividers: KioskDivider[] = [];

    tempCombinedItemsWithNew.forEach((combinedItem, index) => {
        if (combinedItem.type === 'product') {
            const product = combinedItem.item as Product;
            finalKioskProducts.push({
                ...product,
                kiosk_order: index // Assign new sequential order
            });
        } else { // type === 'divider'
            const divider = combinedItem.item as KioskDivider;
            let currentAfterProductId: string | null = null;
            // Determine the actual preceding product ID for this divider in the new list
            if (index > 0) {
                for (let i = index - 1; i >= 0; i--) {
                    if (tempCombinedItemsWithNew[i].type === 'product') {
                        currentAfterProductId = tempCombinedItemsWithNew[i].itemId;
                        break;
                    }
                }
            }
            // If this is the newly added divider, ensure its item object gets the updated position
            if (divider.id === newDividerId) {
                 finalDividers.push({
                    ...newDividerObject, // Use the base object
                    position: index,      // Set its final position
                    afterProductId: currentAfterProductId // And its actual afterProductId based on new list
                });
            } else {
                 finalDividers.push({
                    ...divider,
                    position: index, // Update position for existing dividers
                    afterProductId: currentAfterProductId // Update actual afterProductId
                });
            }
        }
    });
    
    setKioskProducts(finalKioskProducts);
    setDividers(finalDividers);
    
    // Save to backend
    try {
      // The saveCategories and handleSaveKioskProducts functions will save the entire current state
      // including the new divider and updated positions/orders of all items.
      
      // We need to ensure the new category is in the database first if saveCategories relies on existing IDs.
      // However, saveCategories is designed to delete all and re-insert.
      
      console.log('New divider added, preparing to save all categories and product orders.');
      await saveCategories(); // This will save all dividers, including the new one with its final position
      await handleSaveKioskProducts(finalKioskProducts); // This will save all product orders
      
      console.log('New category and all item positions/orders saved to database');
    } catch (err) {
      console.error('Error saving new category and updating all items:', err);
      alert('카테고리 추가 및 전체 항목 업데이트 중 오류가 발생했습니다.');
      // Consider reverting local state or re-fetching if the save fails critically.
    }
    
    // Reset input state
    handleCancelAddDivider();
  };

  const handleRemoveDivider = async (dividerId: string) => {
    try {
      // Remove from local state
    setDividers(dividers.filter(d => d.id !== dividerId));
      
      // Also remove from the database
      const { error } = await supabase
        .from('kiosk_categories')
        .delete()
        .eq('category_id', dividerId);
        
      if (error) {
        console.error('Error deleting category from database:', error);
      } else {
        console.log('Category deleted from database');
      }
    } catch (err) {
      console.error('Error in handleRemoveDivider:', err);
    }
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

  // Callback for when a new product is created by the modal
  const handleProductCreated = (newProduct: Product) => {
    setAllProducts((prevProducts) => [newProduct, ...prevProducts]);
    // Optionally, if you want to immediately add it to the kiosk list (though typically users might do this manually):
    // setKioskProducts((prevKiosk) => [newProduct, ...prevKiosk]); 
    // Consider if you need to re-sort or update kiosk_order if adding directly to kioskProducts
    toast({
      title: "상품 추가됨",
      description: `${newProduct.product_name}이(가) 전체 상품 목록에 추가되었습니다. 키오스크에 표시하려면 메뉴 구성에서 추가하세요.`,
    });
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

  // Replace the displayKioskItems function with this improved version
  const displayKioskItems = () => {
    const items: JSX.Element[] = [];
    
    // Create the combined ordered list using our helper function
    const combinedItems = createCombinedMenuItems(kioskProducts, dividers);
    
    // Add placeholder at the beginning
    items.push(
      <AddDividerPlaceholder
        key="first-divider-placeholder"
        onClick={() => handleShowDividerInput('__first__')}
        showInput={addingDividerAfter === '__first__'}
        inputValue={newDividerName}
        onInputChange={setNewDividerName}
        onSave={handleSaveNewDivider}
        onCancel={handleCancelAddDivider}
      />
    );

    // Add visual category groups
    let currentCategoryName: string | null = null;
    let currentCategoryId: string | null = null;
    let categoryStartIndex = -1;
    
    // First pass: add all items
    combinedItems.forEach((item, index) => {
      if (item.type === 'divider') {
        const divider = item.item as KioskDivider;
        
        // If we were in a category, close it
        if (currentCategoryName) {
          // Add a visual end of the previous category
      items.push(
            <div key={`category-end-${currentCategoryId}`} className="border-b border-blue-200 mb-2"></div>
          );
        }
        
        // Start a new category
        currentCategoryName = divider.name;
        currentCategoryId = divider.id;
        categoryStartIndex = items.length;
        
        // Add divider (category header)
        items.push(
          <div key={`category-start-${divider.id}`} className="bg-blue-50 rounded-t-md border border-blue-200 border-b-0 mt-1">
        <SortableDividerItem
          key={`divider-${divider.id}`}
          divider={{ product_id: divider.id, product_name: divider.name }}
          onRemove={handleRemoveDivider}
        />
          </div>
        );
      } else { // item.type === 'product'
        const product = item.item as Product;
      const productId = product.product_id.toString();
      
        // Add the product with proper styling based on category
      items.push(
          <div 
            key={`product-wrapper-${productId}`} 
            className={currentCategoryName 
              ? "pl-2 border-l border-r border-blue-200 bg-blue-50 bg-opacity-30" 
              : ""
            }
          >
        <SortableProductItem 
              key={`kiosk-product-${product.product_id}`} 
          product={product} 
          isKioskProduct={true}
          onToggleSoldOut={handleToggleSoldOut}
          onEditProduct={handleEditProduct}
          // Props for selection
          listType="kiosk"
          isSelected={selectedKioskProductIds.has(product.product_id.toString())}
          onSelect={(productId, select) => {
            setSelectedKioskProductIds(prev => {
              const newSet = new Set(prev);
              if (select) {
                newSet.add(productId);
              } else {
                newSet.delete(productId);
              }
              return newSet;
            });
          }}
        />
          </div>
        );
      
      // Add placeholder after each product
      items.push(
          <div 
            key={`placeholder-wrapper-${productId}`} 
            className={currentCategoryName 
              ? "pl-2 border-l border-r border-blue-200 bg-blue-50 bg-opacity-30" 
              : ""
            }
          >
        <AddDividerPlaceholder
          key={`divider-placeholder-after-${productId}`}
          onClick={() => handleShowDividerInput(productId)}
          showInput={addingDividerAfter === productId}
          inputValue={newDividerName}
          onInputChange={setNewDividerName}
          onSave={handleSaveNewDivider}
          onCancel={handleCancelAddDivider}
        />
          </div>
        );
      }
    });

    // Close the last category if open
    if (currentCategoryName) {
      items.push(
        <div key={`category-end-${currentCategoryId}-final`} className="border-b border-blue-200 rounded-b-md mb-2"></div>
      );
    }

    // Handle the case where there are no items
    if (combinedItems.length === 0) {
        items.push(
          <div key="empty-kiosk-message" className="flex flex-col justify-center items-center h-40 text-gray-400">
            <p>키오스크에 표시할 상품을 추가하세요.</p>
          </div>
        );
    }
    
    // Add a final placeholder if the last item was a divider or the list is empty
    const lastItem = combinedItems[combinedItems.length - 1];
    if (!lastItem || lastItem.type === 'divider') {
        items.push(
          <AddDividerPlaceholder
          key="last-divider-placeholder"
            onClick={() => handleShowDividerInput(null)}
            showInput={addingDividerAfter === null}
            inputValue={newDividerName}
            onInputChange={setNewDividerName}
            onSave={handleSaveNewDivider}
            onCancel={handleCancelAddDivider}
          />
        );
      }

    return items;
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">키오스크 관리</h1>
      
      {/* Main content area */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {/* Grid layout for QR code and Service options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kiosk QR Code Section */}
          <section className="bg-white p-6 rounded-lg shadow-md h-full">
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
          <section className="bg-white p-6 rounded-lg shadow-md h-full">
            <h2 className="text-2xl font-semibold text-gray-700 mb-6">서비스 옵션 활성화</h2>
            <div className="space-y-6">
              {/* Dine-in Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-800">매장에서</h3>
                  <p className="text-sm text-gray-500">키오스크에서 매장 내 수령 옵션을 제공합니다.</p>
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
                className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition ease-in-out duration-150"
              >
                서비스 옵션 저장
              </button>
            </div>
          </section>
        </div>
      </div>
      
      {/* Navigation for sections */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveSection('menu')}
          className={`px-6 py-3 text-lg font-medium transition-colors ${
            activeSection === 'menu' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          메뉴 관리
        </button>
        <button
          onClick={() => setActiveSection('options')}
          className={`px-6 py-3 text-lg font-medium transition-colors ${
            activeSection === 'options' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          상세 주문 옵션
        </button>
        <button
          onClick={() => setActiveSection('orders')}
          className={`px-6 py-3 text-lg font-medium transition-colors ${
            activeSection === 'orders' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          주문 관리
        </button>
      </div>
      
      {/* Dynamic section content */}
      {activeSection === 'menu' && (
        <div>
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <section>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">메뉴 구성</h2>
              
              {/* Add New Product Button */}
              <div className="mb-4">
                <Button onClick={() => setIsAddModalOpen(true)} variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  새 상품 추가 (키오스크 목록과 별도)
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Available Products Column */}
                <div className="flex-1">
                  <div className="bg-gray-50 p-4 rounded-lg mb-4 sticky top-4 z-10">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">모든 상품</h3>
                    <p className="text-sm text-gray-500 mb-4">키오스크에 추가할 상품을 선택하고 아래 버튼을 누르세요.</p>
                    <Button
                      onClick={handleAddToKiosk}
                      disabled={selectedAvailableProductIds.size === 0 || savingProducts}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {savingProducts && selectedAvailableProductIds.size > 0 ? '추가 중...' : `선택된 ${selectedAvailableProductIds.size}개 상품 키오스크에 추가 →`}
                    </Button>
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
                            // Props for selection
                            listType="available"
                            isSelected={selectedAvailableProductIds.has(product.product_id.toString())}
                            onSelect={(productId, select) => {
                              setSelectedAvailableProductIds(prev => {
                                const newSet = new Set(prev);
                                if (select) {
                                  newSet.add(productId);
                                } else {
                                  newSet.delete(productId);
                                }
                                return newSet;
                              });
                            }}
                          />
                        ))}
                      </SortableContext>
                    )}
                  </DroppableContainer>
                </div>

                {/* Kiosk Products Column */}
                <div className="flex-1">
                  <div className="bg-green-50 p-4 rounded-lg mb-4 sticky top-4 z-10">
                    <h3 className="text-lg font-semibold text-green-700 mb-2">키오스크 메뉴</h3>
                    <p className="text-sm text-gray-600 mb-4">상품을 선택하고 아래 버튼을 눌러 제거하거나, 드래그하여 순서를 변경하세요.</p>
                    <Button
                      onClick={handleRemoveFromKiosk}
                      disabled={selectedKioskProductIds.size === 0 || savingProducts}
                      className="w-full bg-red-500 hover:bg-red-600 text-white mb-2"
                    >
                      {savingProducts && selectedKioskProductIds.size > 0 ? '제거 중...' : `← 선택된 ${selectedKioskProductIds.size}개 상품 키오스크에서 제거`}
                    </Button>
                  </div>
                  
                  <DroppableContainer 
                    id="kioskProducts" 
                    items={[...kioskProducts.map(p => `kiosk-${p.product_id}`), ...dividers.map(d => `divider-${d.id}`)]}
                  >
                    <SortableContext
                      items={getCombinedItemIds(createCombinedMenuItems(kioskProducts, dividers))}
                      strategy={verticalListSortingStrategy}
                    >
                      {displayKioskItems()}
                    </SortableContext>
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
                {activeDivider && (
                  <div className="p-3 my-2 rounded-md border-2 border-blue-400 bg-blue-50 shadow-xl opacity-90">
                    <div className="flex items-center">
                      <div className="mr-2 text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-blue-700">{activeDivider.name}</span>
                        <span className="text-xs text-blue-500">카테고리</span>
                      </div>
                    </div>
                  </div>
                )}
              </DragOverlay>
            </section>
          </DndContext>
        </div>
      )}
      
      {activeSection === 'options' && (
        <GlobalOptionEditor 
          storeId={storeId}
          products={allProducts} 
        />
      )}
      
      {activeSection === 'orders' && (
        <KioskOrdersManagement storeId={storeId} />
      )}
      
      {/* Modal for product editing */}
      <ProductEditModal 
        isOpen={isEditModalOpen}
        product={editingProduct}
        storeId={storeId}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveEditedProduct}
      />
      
      {/* Kiosk Sales History and Active Sessions - Displayed side-by-side in 'orders' section */}
      {activeSection === 'orders' && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <KioskSalesHistory storeId={storeId} />
          <KioskActiveSessions storeId={storeId} />
        </div>
      )}

      {/* Product Create Modal */}
      {user && store && (
        <ProductCreateModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          storeId={storeId}
          userId={user.id} // Pass the user ID
          onProductCreated={handleProductCreated}
          storeWalletAddress={store.store_wallet_address} // Pass store wallet address
        />
      )}
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