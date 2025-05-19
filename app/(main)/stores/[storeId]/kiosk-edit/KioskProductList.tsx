import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Product } from '@/utils/type';
import SortableProductItem from './SortableProductItem';
import SortableDividerItem, { DividerItemData } from './SortableDividerItem';

// Define the structure for a product item within our Kiosk list
interface ProductListItem {
  id: UniqueIdentifier; // Unique ID for dnd-kit, e.g., `kiosk-${product.product_id}`
  type: 'product';
  originalProduct: Product; // This holds the actual product data
}

// Union type for items in our sortable list
export type KioskListItem = DividerItemData | ProductListItem;

// --- InsertActionComponent ---
// This component handles showing the insert line/button and the category input form
interface InsertActionComponentProps {
  index: number; // Index in the list where this insert action is placed
  onShowInput: (index: number) => void;
  onAddCategory: (index: number, name: string) => void;
  isInputVisible: boolean;
  onCancelInput: () => void;
}

const InsertActionComponent: React.FC<InsertActionComponentProps> = ({
  index,
  onShowInput,
  onAddCategory,
  isInputVisible,
  onCancelInput,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  const handleAddClick = () => {
    if (categoryName.trim()) {
      onAddCategory(index, categoryName.trim());
      setCategoryName(''); // Reset for next use
    }
  };

  if (isInputVisible) {
    return (
      <div className="my-3 p-4 bg-blue-50 border border-blue-300 rounded-lg shadow-sm">
        <input
          type="text"
          placeholder="새 카테고리 이름 입력"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddClick(); if (e.key === 'Escape') onCancelInput();}}
        />
        <div className="mt-3 flex justify-end space-x-2">
          <button
            onClick={onCancelInput}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            취소
          </button>
          <button
            onClick={handleAddClick}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            카테고리 추가
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-10 my-1 flex items-center justify-center relative group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onShowInput(index)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onShowInput(index);}}
      aria-label={`Add category section at position ${index + 1}`}
    >
      <div
        className={`absolute inset-x-0 top-1/2 transform -translate-y-1/2 flex items-center justify-center transition-opacity duration-150 ease-in-out ${
          isHovered ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100'
        }`}
      >
        <div className="w-full h-px bg-blue-400"></div>
        <div className="absolute bg-white p-1.5 rounded-full border-2 border-blue-500 shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      {/* Hidden text for screen readers when not hovered/focused */}
      {!isHovered && <span className="sr-only">Add category here</span>}
    </div>
  );
};

// --- KioskProductList ---
interface KioskProductListProps {
  initialProducts: Product[];
  onToggleSoldOut: (productId: string | number, currentStatus: boolean) => Promise<void>;
  onEditProduct: (product: Product) => void;
  onOrderChange: (orderedItems: KioskListItem[]) => void; // Callback for when list order or content changes
}

const KioskProductList: React.FC<KioskProductListProps> = ({
  initialProducts,
  onToggleSoldOut,
  onEditProduct,
  onOrderChange,
}) => {
  const [items, setItems] = useState<KioskListItem[]>([]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null); // For dnd-kit visual feedback
  const [activeIndexForCategoryInput, setActiveIndexForCategoryInput] = useState<number | null>(null);

  useEffect(() => {
    // Initialize items from initialProducts, transforming them into ProductListItem
    const productListItems: ProductListItem[] = initialProducts.map((product, index) => ({
      id: `kiosk-${product.product_id}`, // Consistent with SortableProductItem's ID logic
      type: 'product',
      originalProduct: {
        ...product,
        // Ensure kiosk_order is set if it's used for initial sorting or display
        // kiosk_order: product.kiosk_order !== undefined ? product.kiosk_order : index,
      }
    }));
    setItems(productListItems);
  }, [initialProducts]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.id === active.id);
        const newIndex = currentItems.findIndex((item) => item.id === over.id);
        const updatedItems = arrayMove(currentItems, oldIndex, newIndex);
        onOrderChange(updatedItems); // Notify parent of order change
        return updatedItems;
      });
    }
  };

  const handleShowCategoryInput = (index: number) => {
    setActiveIndexForCategoryInput(index);
  };

  const handleAddCategory = (insertAtIndex: number, name: string) => {
    const newDivider: DividerItemData = {
      id: `divider-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // More unique ID
      type: 'divider',
      name: name,
    };
    
    setItems((currentItems) => {
      const newItems = [...currentItems];
      newItems.splice(insertAtIndex, 0, newDivider);
      onOrderChange(newItems); // Notify parent of content change
      return newItems;
    });
    setActiveIndexForCategoryInput(null); // Close input form
  };

  const handleCancelCategoryInput = () => {
    setActiveIndexForCategoryInput(null);
  };
  
  // Handler to remove an item (product or divider) - Example
  const handleRemoveItem = (idToRemove: UniqueIdentifier) => {
    setItems(currentItems => {
        const updatedItems = currentItems.filter(item => item.id !== idToRemove);
        onOrderChange(updatedItems);
        return updatedItems;
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="p-4 bg-gray-50 rounded-lg shadow">
          {/* Insert Action for the very top of the list */}
          <InsertActionComponent
            index={0}
            onShowInput={handleShowCategoryInput}
            onAddCategory={handleAddCategory}
            isInputVisible={activeIndexForCategoryInput === 0}
            onCancelInput={handleCancelCategoryInput}
          />

          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              {item.type === 'product' ? (
                <SortableProductItem
                  product={item.originalProduct}
                  isKioskProduct={true} // Assuming this context is always for kiosk
                  onToggleSoldOut={onToggleSoldOut}
                  onEditProduct={onEditProduct}
                />
              ) : (
                <SortableDividerItem 
                  divider={item}
                />
              )}
              {/* Insert Action between items */}
              <InsertActionComponent
                index={index + 1} // Insert *after* the current item
                onShowInput={handleShowCategoryInput}
                onAddCategory={handleAddCategory}
                isInputVisible={activeIndexForCategoryInput === (index + 1)}
                onCancelInput={handleCancelCategoryInput}
              />
            </React.Fragment>
          ))}
           {items.length === 0 && (
             <p className="text-center text-gray-500 py-4">상품 목록이 비어있습니다. 첫 카테고리 또는 상품을 추가하세요.</p>
           )}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default KioskProductList; 