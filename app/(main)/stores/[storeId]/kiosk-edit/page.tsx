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
import KioskOrdersManagement from './KioskOrdersManagement';
import ProductEditModal from './ProductEditModal';
import SortableProductItem from './SortableProductItem';
import DroppableContainer from './DroppableContainer';
import { QRCodeSVG } from 'qrcode.react';
import GlobalOptionEditor from './GlobalOptionEditor';
import AddDividerPlaceholder from './AddDividerPlaceholder';
import SortableDividerItem from './SortableDividerItem';
import { v4 as uuidv4 } from 'uuid';

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

  // Add a new state to control the tab view
  const [activeSection, setActiveSection] = useState<'menu' | 'options' | 'orders'>('menu');

  // Divider Input State
  const [addingDividerAfter, setAddingDividerAfter] = useState<string | null | undefined>(undefined);
  const [newDividerName, setNewDividerName] = useState('');

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
      // Fetch all active products and dividers for the store
      const { data: itemsData, error: itemsError } = await supabase
        .from('products')
        .select('*, is_kiosk_enabled, kiosk_order, is_sold_out, item_type') // Ensure item_type is selected
        .eq('store_id', storeId)
        .eq('status', 1) // Re-enabled: Only active products
        // We fetch all kiosk_enabled items initially to build the kiosk list,
        // and all status=1 items for the "all products" list.
        // For dividers, they should also have is_kiosk_enabled = true if they are on the kiosk.
        .order('kiosk_order', { ascending: true }) // PostgreSQL default is NULLS LAST for ASC
        .order('created_at', { ascending: false });


      if (itemsError) {
        console.error('Error fetching products/items:', itemsError);
        setLoadingProducts(false);
        return;
      }

      const allFetchedItems = itemsData as Product[]; // Product type needs to support item_type

      // Products for the "all products" list (non-dividers, status 1)
      const storeProducts = allFetchedItems.filter(
        item => !item.item_type || item.item_type === 'product'
      );
      setAllProducts(storeProducts);

      // Kiosk items (products and dividers, enabled for kiosk, sorted)
      const kioskEnabledItems = allFetchedItems
        .filter(p => p.is_kiosk_enabled)
        .sort((a, b) => {
          if (a.kiosk_order === null || a.kiosk_order === undefined) return 1;
          if (b.kiosk_order === null || b.kiosk_order === undefined) return -1;
          return a.kiosk_order - b.kiosk_order;
        });
      
      console.log("Fetched Kiosk Enabled Items:", kioskEnabledItems.map(i => ({id: i.product_id, name: i.product_name, type: i.item_type, order: i.kiosk_order})));
      setKioskProducts(kioskEnabledItems);
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

  const handleSaveKioskProducts = async (currentKioskItems: Product[]) => {
    if (!isOwner) return;
    setSavingProducts(true);
    
    try {
      console.log('[KioskEditPage] Saving kiosk items settings with list:', currentKioskItems.map(p => ({id: p.product_id, name: p.product_name, order: p.kiosk_order, type: p.item_type })));
      
      // Step 1: Update/Create kiosk items (products and dividers)
      if (currentKioskItems.length > 0) {
        const kioskItemUpdates = currentKioskItems.map((item, index) => {
          const commonUpdateData = {
            is_kiosk_enabled: true,
            kiosk_order: index,
            updated_at: new Date().toISOString(),
            store_id: storeId, // Ensure store_id is set
          };

          if (item.item_type === 'divider') {
            // For dividers, we might be creating or updating.
            // If it's a new divider, it might not have a numeric product_id from DB yet.
            // We rely on its UUID as product_id.
            // Check if it's an existing divider by seeing if product_id is a number (from DB sequence) or string (UUID)
            // This logic might need refinement based on how new dividers are ID'd before first save.
            // For now, assume UUIDs are for new/client-side dividers.
            
            // If it's a new divider, we insert. If existing, we update.
            // We'll simplify: upsert based on product_id.
            // Supabase upsert needs a conflict target. If product_id is primary key, it's implicit.
            return supabase
              .from('products')
              .upsert({
                product_id: item.product_id, // This could be UUID for new, or existing int ID
                product_name: item.product_name, // Divider name
                description: 'Kiosk UI Divider',
                item_type: 'divider',
                status: 1, // Assuming active status for dividers
                won_price: 0, // Default for dividers
                // Set other product fields to defaults or null as appropriate for dividers
                ...commonUpdateData
              }, { 
                onConflict: 'product_id', // Assuming product_id is unique and can be PK
                // ignoreDuplicates: false // default is false, which means update
              });
          } else { // It's a product
            return supabase
              .from('products')
              .update({ 
                ...commonUpdateData
                // product_name, won_price etc. are not changed here, only kiosk status and order
              })
              .eq('product_id', item.product_id);
          }
        });
        
        const results = await Promise.all(kioskItemUpdates);
        results.forEach((result, index) => {
          if (result.error) {
            console.error(`Error saving item ${currentKioskItems[index].product_id}:`, result.error);
            // Potentially throw an error here or collect errors
          }
        });
      }
      
      // Step 2: Disable products/items not in currentKioskItems
      const currentKioskItemIds = currentKioskItems.map(p => p.product_id.toString()); // Ensure string comparison
      
      // Get all items from DB for this store to find what to disable
      const { data: allStoreDbItems, error: fetchAllError } = await supabase
        .from('products')
        .select('product_id, item_type')
        .eq('store_id', storeId);

      if (fetchAllError) {
        console.error("Error fetching all store items for disabling check:", fetchAllError);
        throw fetchAllError;
      }

      const itemsToDisable = allStoreDbItems.filter(
        dbItem => !currentKioskItemIds.includes(dbItem.product_id.toString())
      );
      
      if (itemsToDisable.length > 0) {
        const disableUpdates = itemsToDisable.map(itemToDisable => 
          supabase
            .from('products')
            .update({ is_kiosk_enabled: false, kiosk_order: null })
            .eq('product_id', itemToDisable.product_id)
        );
        const disableResults = await Promise.all(disableUpdates);
        disableResults.forEach((result, index) => {
          if (result.error) {
            console.error(`Error disabling item ${itemsToDisable[index].product_id}:`, result.error);
          }
        });
      }
      
      alert('키오스크 설정이 성공적으로 저장되었습니다.');
      await fetchProducts(storeId); // Re-fetch to get updated orders and potentially new divider IDs if they were auto-generated by DB
    } catch (err) {
      console.error('Error saving kiosk items:', err);
      alert('키오스크 설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingProducts(false);
    }
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = String(active.id);
    setActiveId(id);
    
    if (id.startsWith('kiosk-')) {
      setCurrentContainer('kioskProducts');
      const itemId = id.replace('kiosk-', '');
      const item = kioskProducts.find(p => p.product_id.toString() === itemId);
      if (item) setActiveProduct(item); // activeProduct can be a product or divider
    } else { // Dragging from available products (must be a product)
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

  // Handle drag end event
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !activeId) {
      setActiveId(null);
      setActiveProduct(null);
      setCurrentContainer(null);
      return;
    }
    
    const activeIdString = String(active.id);
    const overIdString = String(over.id);

    console.log("Drag End Details:", {activeIdString, overIdString, currentContainer});

    let kioskConfigChanged = false;
    let finalKioskItemsForSave: Product[] = [...kioskProducts];

    const activeIsKioskItem = activeIdString.startsWith('kiosk-');
    const activeItemId = activeIsKioskItem ? activeIdString.replace('kiosk-', '') : activeIdString;
    const activeItem = activeIsKioskItem 
        ? kioskProducts.find(p => p.product_id.toString() === activeItemId)
        : allProducts.find(p => p.product_id.toString() === activeItemId);

    if (!activeItem) {
        console.warn("Active item not found for D&D", activeIdString);
        setActiveId(null);
        setActiveProduct(null);
        setCurrentContainer(null);
        return;
    }

    // Case 1: Dropping onto a container (availableProducts or kioskProducts)
    if (overIdString === 'availableProducts' || overIdString === 'kioskProducts') {
        const targetContainer = overIdString;
        
        // If a divider is dragged to "availableProducts", do nothing or prevent. For now, it's ignored.
        if (activeItem.item_type === 'divider' && targetContainer === 'availableProducts') {
            console.log("Dividers cannot be moved to available products.");
        } else {
            const updatedList = handleContainerDrop(activeIdString, targetContainer);
            if (updatedList) {
                finalKioskItemsForSave = updatedList;
                kioskConfigChanged = true; // Assume change if list is updated
            }
        }
    }
    // Case 2: Dropping onto another item (reordering or moving between containers)
    else {
        const overIsKioskItem = overIdString.startsWith('kiosk-');
        const overItemId = overIsKioskItem ? overIdString.replace('kiosk-', '') : overIdString; // overId might be just product ID if not kiosk prefixed

        // Determine target container based on where the 'over' item is
        let targetContainerType: 'kioskProducts' | 'availableProducts' = 'availableProducts';
        if (kioskProducts.some(p => `kiosk-${p.product_id}` === overIdString)) {
            targetContainerType = 'kioskProducts';
        } else if (allProducts.some(p => p.product_id.toString() === overIdString && !overIdString.startsWith('kiosk-'))) {
             // This case should ideally not happen if dragging only sortable items within designated lists
             // or if 'over' is a droppable container.
             // For simplicity, we are focusing on drops over sortable items *within* kioskProducts or drops into containers.
        }


        // If the 'over' item implies a container different from current drag origin, it's a move.
        // currentContainer is where the drag started from.
        if (targetContainerType !== currentContainer) {
            if (activeItem.item_type === 'divider' && targetContainerType === 'availableProducts') {
                 console.log("Dividers cannot be moved to available products list.");
            } else {
                const updatedList = handleContainerDrop(activeIdString, targetContainerType);
                if (updatedList) {
                    finalKioskItemsForSave = updatedList;
                    kioskConfigChanged = true;
                }
            }
        } 
        // Reordering within the same container
        else if (targetContainerType === 'kioskProducts' && currentContainer === 'kioskProducts') {
            const previousKioskItemsOrder = kioskProducts.map(p => p.product_id);
            const updatedList = handleReorder(activeIdString, overIdString, 'kioskProducts');
            if (updatedList) {
                finalKioskItemsForSave = updatedList;
                const currentKioskItemsOrder = updatedList.map(p => p.product_id);
                if (JSON.stringify(previousKioskItemsOrder) !== JSON.stringify(currentKioskItemsOrder)) {
                    kioskConfigChanged = true;
                }
            }
        }
        // Reordering within 'availableProducts' is not supported by this UI for now.
    }
    
    setActiveId(null);
    setActiveProduct(null);
    setCurrentContainer(null);

    if (kioskConfigChanged && isOwner) {
      console.log('[KioskEditPage] Kiosk configuration changed by D&D, auto-saving with list:', finalKioskItemsForSave.map(p=>({id: p.product_id, name: p.product_name, order: p.kiosk_order, type: p.item_type })));
      await handleSaveKioskProducts(finalKioskItemsForSave);
    }
  };

  // Helper function to handle drops between containers
  // Returns the new kioskProducts list if it changed
  const handleContainerDrop = (activeDragId: string, targetContainerId: string): Product[] | null => {
    let newKioskStateForSave: Product[] | null = null;
    const isKioskSource = activeDragId.startsWith('kiosk-');
    const itemId = activeDragId.replace(/^kiosk-/, '');

    // Moving from kiosk to available
    if (isKioskSource && targetContainerId === 'availableProducts') {
      const movedItem = kioskProducts.find(p => p.product_id.toString() === itemId);
      if (movedItem && movedItem.item_type !== 'divider') { // Dividers cannot be moved to available
        const newKioskItems = kioskProducts.filter(p => p.product_id.toString() !== itemId);
        const updatedKioskItems = newKioskItems.map((item, index) => ({
          ...item,
          kiosk_order: index
        }));
        setKioskProducts(updatedKioskItems);
        newKioskStateForSave = updatedKioskItems;
      }
    }
    // Moving from available to kiosk
    else if (!isKioskSource && targetContainerId === 'kioskProducts') {
      const movedProduct = allProducts.find(p => p.product_id.toString() === itemId);
      if (movedProduct && (!movedProduct.item_type || movedProduct.item_type === 'product')) { // Ensure it's a product
        // Check if already in kiosk to prevent duplicates if logic is flawed
        if (!kioskProducts.some(kp => kp.product_id.toString() === movedProduct.product_id.toString())) {
            const newKioskItemsList = [...kioskProducts, {
                ...movedProduct,
                is_kiosk_enabled: true,
                kiosk_order: kioskProducts.length,
                item_type: 'product' // Explicitly set
            }];
            const updatedKioskItems = newKioskItemsList.map((item, index) => ({
                ...item,
                kiosk_order: index
            }));
            setKioskProducts(updatedKioskItems);
            newKioskStateForSave = updatedKioskItems;
        }
      }
    }
    return newKioskStateForSave;
  };

  // Helper function to handle reordering within a container (only kioskProducts supports reordering of mixed types)
  const handleReorder = (activeDragId: string, overDragId: string, containerId: string): Product[] | null => {
    let newKioskStateForSave: Product[] | null = null;
    if (containerId === 'kioskProducts') {
      const activeIndex = kioskProducts.findIndex(
        p => `kiosk-${p.product_id}` === activeDragId
      );
      const overIndex = kioskProducts.findIndex(
        p => `kiosk-${p.product_id}` === overDragId
      );
      
      if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
        const newKioskItemsList = arrayMove(kioskProducts, activeIndex, overIndex);
        const updatedKioskItems = newKioskItemsList.map((item, index) => ({
          ...item,
          kiosk_order: index
        }));
        setKioskProducts(updatedKioskItems);
        newKioskStateForSave = updatedKioskItems;
      }
    } 
    return newKioskStateForSave;
  };

  // ---- Divider specific functions ----
  const handleShowDividerInput = (insertAfterItemId: string | null) => { // null means add to end
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

    const newDivider: Product = {
      product_id: uuidv4(), // Temporary unique ID for client-side
      item_type: 'divider',
      product_name: newDividerName.trim(),
      is_kiosk_enabled: true,
      kiosk_order: 0, // Will be set correctly below

      // Add other Product fields with default/null values as necessary for your type
      store_id: storeId,
      status: 1, // Assuming active
      won_price: 0,
      sgt_price: 0,
      description: 'Kiosk UI Divider',
      image_url: null,
      category_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_sold_out: false,
      options: [],
      is_sgt_product: false,
      won_delivery_fee: 0,
      won_special_delivery_fee: 0,
      sgt_delivery_fee: 0,
      sgt_special_delivery_fee: 0,
      deleted_at: null
    };

    let updatedKioskItems = [...kioskProducts];
    if (addingDividerAfter === null) { // Add to end
      newDivider.kiosk_order = updatedKioskItems.length;
      updatedKioskItems.push(newDivider);
    } else { // Add after specific item
      const insertAtIndex = updatedKioskItems.findIndex(item => item.product_id.toString() === addingDividerAfter) + 1;
      if (insertAtIndex > -1) {
        updatedKioskItems.splice(insertAtIndex, 0, newDivider);
      } else { // Fallback: add to end if item not found (should not happen)
        newDivider.kiosk_order = updatedKioskItems.length;
        updatedKioskItems.push(newDivider);
      }
    }
    
    // Re-calculate kiosk_order for all items
    const finalKioskItems = updatedKioskItems.map((item, index) => ({
      ...item,
      kiosk_order: index,
    }));

    setKioskProducts(finalKioskItems);
    console.log('[KioskEditPage] New divider added, attempting to save. Items:', finalKioskItems.map(p=>({id: p.product_id, name: p.product_name, order: p.kiosk_order, type: p.item_type })));
    await handleSaveKioskProducts(finalKioskItems); // Save immediately

    handleCancelAddDivider(); // Reset input state
  };

  const handleRemoveDivider = async (dividerIdToRemove: string) => {
    if (!isOwner) return;
    console.log("Attempting to remove divider:", dividerIdToRemove);
    const updatedKioskItems = kioskProducts
      .filter(item => item.product_id.toString() !== dividerIdToRemove)
      .map((item, index) => ({ ...item, kiosk_order: index }));
    
    setKioskProducts(updatedKioskItems);
    
    // Also need to update the backend. The divider should be marked as not kiosk_enabled or deleted.
    // For simplicity, we'll mark it as not kiosk_enabled.
    // A more robust solution might involve actually deleting divider-type items if they are not used elsewhere.
    setSavingProducts(true);
    try {
        const { error } = await supabase
            .from('products')
            .update({ is_kiosk_enabled: false, kiosk_order: null })
            .eq('product_id', dividerIdToRemove)
            .eq('item_type', 'divider'); // Make sure we only target dividers

        if (error) {
            console.error("Error 'deleting' divider from kiosk:", error);
            alert("칸막이 삭제 중 오류가 발생했습니다.");
            // Revert local state if save fails? Or re-fetch?
            await fetchProducts(storeId); // Re-fetch to be safe
            return;
        }
        
        console.log('[KioskEditPage] Divider removed, attempting to save remaining items order.');
        await handleSaveKioskProducts(updatedKioskItems); // Save the new order of remaining items
        alert('칸막이가 삭제되었습니다.');

    } catch (err) {
        console.error("Error in handleRemoveDivider:", err);
        alert("칸막이 삭제 처리 중 오류.");
        await fetchProducts(storeId); // Re-fetch on error
    } finally {
        setSavingProducts(false);
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

  // Get available products (products not already in kioskProducts and are actual products)
  const availableProducts = allProducts.filter(
    product => 
      (!product.item_type || product.item_type === 'product') && // Ensure it's a product
      !kioskProducts.some(kProduct => kProduct.product_id === product.product_id && (!kProduct.item_type || kProduct.item_type === 'product'))
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
              className="px-6 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors shadow-sm"
            >
              서비스 옵션 저장
            </button>
          </div>
        </section>
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
                  {kioskProducts.length === 0 && addingDividerAfter !== null && ( // Show initial placeholder if list is empty and adding to end
                     <AddDividerPlaceholder
                        onClick={() => handleShowDividerInput(null)}
                        showInput={addingDividerAfter === null}
                        inputValue={newDividerName}
                        onInputChange={setNewDividerName}
                        onSave={handleSaveNewDivider}
                        onCancel={handleCancelAddDivider}
                      />
                  )}
                  {kioskProducts.length === 0 && addingDividerAfter === undefined && (
                    <div className="flex flex-col justify-center items-center h-40 text-gray-400">
                      <p>키오스크에 표시할 상품을 추가하세요.</p>
                       <AddDividerPlaceholder
                        onClick={() => handleShowDividerInput(null)} // Add to end placeholder
                        showInput={addingDividerAfter === null}
                        inputValue={newDividerName}
                        onInputChange={setNewDividerName}
                        onSave={handleSaveNewDivider}
                        onCancel={handleCancelAddDivider}
                      />
                    </div>
                  )}

                  {kioskProducts.length > 0 && (
                    <SortableContext
                      items={kioskProducts.map(p => `kiosk-${p.product_id.toString()}`)} // Ensure string IDs
                      strategy={verticalListSortingStrategy}
                    >
                      {kioskProducts.map((item, index) => (
                        <React.Fragment key={`item-fragment-${item.product_id}`}>
                          {/* Placeholder to add divider BEFORE this item */}
                          {/* Show input if addingDividerAfter matches the PREVIOUS item's ID, or if it's the first item and addingDividerAfter is a special value like 'start' or specific logic */}
                          {/* Simplified: always show placeholder, manage input visibility via `addingDividerAfter` */}
                          <AddDividerPlaceholder
                            onClick={() => handleShowDividerInput(index === 0 ? '__first__' : kioskProducts[index-1]?.product_id.toString() ?? null)}
                            showInput={addingDividerAfter === (index === 0 ? '__first__' : kioskProducts[index-1]?.product_id.toString() ?? null)}
                            inputValue={newDividerName}
                            onInputChange={setNewDividerName}
                            onSave={handleSaveNewDivider}
                            onCancel={handleCancelAddDivider}
                          />
                          
                          {item.item_type === 'divider' ? (
                            <SortableDividerItem
                              key={`kiosk-divider-${item.product_id}`}
                              divider={item}
                              onRemove={handleRemoveDivider}
                            />
                          ) : (
                            <SortableProductItem 
                              key={`kiosk-product-${item.product_id}`} 
                              product={item} 
                              isKioskProduct={true}
                              onToggleSoldOut={handleToggleSoldOut}
                              onEditProduct={handleEditProduct}
                            />
                          )}
                          {/* Placeholder after the LAST item */}
                          {index === kioskProducts.length - 1 && (
                            <AddDividerPlaceholder
                              onClick={() => handleShowDividerInput(item.product_id.toString())} // Add after this current (last) item
                              showInput={addingDividerAfter === item.product_id.toString()}
                              inputValue={newDividerName}
                              onInputChange={setNewDividerName}
                              onSave={handleSaveNewDivider}
                              onCancel={handleCancelAddDivider}
                            />
                          )}
                        </React.Fragment>
                      ))}
                    </SortableContext>
                  )}
                   {/* Always show a placeholder at the very end if the list is not empty and not currently adding there */}
                  {(kioskProducts.length > 0 && addingDividerAfter !== kioskProducts[kioskProducts.length -1].product_id.toString() ) && (
                     <AddDividerPlaceholder
                        onClick={() => handleShowDividerInput(null)} // Add to end placeholder
                        showInput={addingDividerAfter === null}
                        inputValue={newDividerName}
                        onInputChange={setNewDividerName}
                        onSave={handleSaveNewDivider}
                        onCancel={handleCancelAddDivider}
                      />
                  )}
                </DroppableContainer>
              </div>
            </div>

            {/* Drag overlay for visual feedback */}
            <DragOverlay>
              {activeProduct && ( // activeProduct can be a product or a divider
                activeProduct.item_type === 'divider' ? (
                  <div className="p-3 my-2 rounded-md border bg-blue-100 border-blue-400 shadow-xl opacity-90">
                     <div className="flex items-center justify-center">
                        <span className="font-semibold text-blue-700">{activeProduct.product_name}</span>
                     </div>
                  </div>
                ) : (
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
                )
              )}
            </DragOverlay>
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
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveEditedProduct}
      />
      
      {/* Kiosk Sales History Section - Now displayed conditionally */}
      {activeSection === 'orders' && <KioskSalesHistory storeId={storeId} />}
      
      {/* Active Kiosk Sessions Section - Now displayed conditionally */}
      {activeSection === 'orders' && <KioskActiveSessions storeId={storeId} />}
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