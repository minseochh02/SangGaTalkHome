import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlusCircleIcon, MenuIcon, ChevronRightIcon, PencilIcon } from 'lucide-react'; // Using lucide-react for icons
import { Product } from '@/utils/type'; // Import Product type from the same source as page.tsx

// --- TYPE DEFINITIONS ---

// Using imported Product type instead of redefining it
// interface Product { ... } // Removed this local definition

// Wrapper for product items in the list
interface ProductListItem {
  id: string; // Unique ID for dnd-kit, matches useSortable's ID
  type: 'product';
  data: Product;
  isKioskProduct: boolean; // To determine ID prefix and rendering details
}

// Interface for category dividers in the list
interface CategoryDividerItem {
  id: string; // Unique ID for the category
  type: 'category';
  name: string;
}

type ListItem = ProductListItem | CategoryDividerItem;

// --- USER'S SORTABLE PRODUCT ITEM (Slightly adapted for clarity and icon usage) ---
interface SortableProductItemProps {
  productItem: ProductListItem; // Using the wrapper type
  onToggleSoldOut: (productId: string | number, currentStatus: boolean) => void;
  onEditProduct: (product: Product) => void;
}

const SortableProductItem = ({ 
  productItem,
  onToggleSoldOut,
  onEditProduct
}: SortableProductItemProps) => {
  const { product_id, product_name, won_price, sgt_price, image_url, is_sold_out, kiosk_order } = productItem.data;
  const { isKioskProduct } = productItem;

  const sortableId = isKioskProduct ? `kiosk-${product_id}` : product_id.toString();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: sortableId, // This ID must match the one in SortableContext's items array
    data: {
      type: 'product', // Custom data for onDragEnd if needed
      item: productItem,
    }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 100 : 'auto', // Ensure dragging item is on top
  };

  const formatPrice = (price: number | null): string => {
    if (price === null || price === undefined) return "0";
    return price.toLocaleString();
  };

  const isItemSoldOut = is_sold_out === true;
  
  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`p-3 rounded-lg border bg-white border-gray-300 shadow-sm ${isDragging ? 'shadow-xl' : ''} ${isItemSoldOut ? 'bg-gray-100' : ''}`}
    >
      <div className="relative flex items-center gap-3">
        {/* Drag Handle */}
        <div {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-gray-600 p-1">
          <MenuIcon size={20} />
        </div>
        
        {image_url ? (
          <div className="relative">
            <img 
              src={image_url} 
              alt={product_name}
              className={`w-12 h-12 object-cover rounded ${isItemSoldOut ? 'opacity-50' : ''}`}
              onError={(e) => (e.currentTarget.src = 'https://placehold.co/48x48/e2e8f0/94a3b8?text=N/A')}
            />
            {isItemSoldOut && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded">
                <span className="text-white text-xs font-bold px-2 py-1 rounded-sm bg-red-600">
                  품절
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className={`w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs ${isItemSoldOut ? 'opacity-50' : ''}`}>
            No Image
            {isItemSoldOut && (
               <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded">
                <span className="text-white text-xs font-bold px-2 py-1 rounded-sm bg-red-600">
                  품절
                </span>
              </div>
            )}
          </div>
        )}
        
        <div className={`flex-1 ${isItemSoldOut ? 'text-gray-400' : ''}`}>
          <h4 className="font-medium text-sm">{product_name}</h4>
          <div className="flex text-xs gap-2">
            <span className="text-gray-600">{formatPrice(won_price)}원</span>
            {sgt_price !== undefined && sgt_price !== null && (
              <span className="text-blue-600">{formatPrice(sgt_price)} SGT</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Prevent drag initiation
              onToggleSoldOut(product_id, !!is_sold_out);
            }}
            className={`px-2 py-1 text-xs font-medium rounded ${isItemSoldOut 
              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
              : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
            title={isItemSoldOut ? "판매 가능으로 변경" : "품절로 변경"}
          >
            {isItemSoldOut ? '판매 시작' : '품절 처리'}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent drag initiation
              onEditProduct(productItem.data);
            }}
            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
            title="상품 정보 수정"
          >
            <PencilIcon size={16} />
          </button>
        </div>

        {isKioskProduct ? (
          <div className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600 font-mono">
            #{kiosk_order !== undefined ? kiosk_order + 1 : '?'}
          </div>
        ) : (
          <div className="text-gray-400 hover:text-gray-600 p-1">
            <ChevronRightIcon size={20} />
          </div>
        )}
      </div>
    </div>
  );
};

// --- NEW INSERTION POINT COMPONENT ---
interface InsertionPointProps {
  onInsert: () => void;
}

const InsertionPoint: React.FC<InsertionPointProps> = ({ onInsert }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative h-8 my-1 group" // Added my-1 for spacing, adjust as needed
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onInsert}
    >
      <div
        className={`absolute inset-x-0 top-1/2 h-px bg-blue-400 transition-all duration-150 ease-in-out
                    ${isHovered ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50'} group-hover:opacity-100 group-hover:scale-x-100`}
      />
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                    flex items-center justify-center w-6 h-6 bg-white border border-blue-400 rounded-full 
                    text-blue-500 cursor-pointer shadow-sm transition-all duration-150 ease-in-out
                    ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-50'} group-hover:opacity-100 group-hover:scale-100`}
      >
        <PlusCircleIcon size={20} />
      </div>
    </div>
  );
};

// --- NEW CATEGORY ITEM COMPONENT ---
interface CategoryItemProps {
  category: CategoryDividerItem;
  onUpdateName: (id: string, newName: string) => void;
  onRemove?: (id: string) => void; // Optional: for removing categories
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category, onUpdateName, onRemove }) => {
  const [name, setName] = useState(category.name);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleBlur = () => {
    if (name.trim() !== category.name) {
      onUpdateName(category.id, name.trim());
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // Trigger blur to save
    }
  };

  return (
    <div className="p-3 my-2 rounded-lg bg-slate-100 border border-slate-300 flex items-center gap-3 shadow-sm">
      <hr className="flex-grow border-slate-300" />
      <input
        type="text"
        value={name}
        onChange={handleNameChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="카테고리명 입력 (예: 메인 메뉴)"
        className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 flex-shrink min-w-0 w-auto"
        style={{minWidth: '200px'}} // Ensure input has some base width
      />
      <hr className="flex-grow border-slate-300" />
      {onRemove && (
         <button 
            onClick={() => onRemove(category.id)} 
            className="text-slate-400 hover:text-red-500 p-1"
            title="카테고리 삭제"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      )}
    </div>
  );
};


// --- MAIN ENHANCED PRODUCT LIST COMPONENT ---
const EnhancedProductList: React.FC = () => {
  // Sample initial product data - adding additional required fields
  const initialProductsData: Partial<Product>[] = [
    { 
      product_id: '101', 
      product_name: '아메리카노', 
      won_price: 3000, 
      sgt_price: 3, 
      image_url: 'https://placehold.co/100x100/e0e0e0/777?text=Coffee', 
      is_sold_out: false, 
      kiosk_order: 0,
      // Adding minimal required fields
      description: '',
      category_id: '',
      store_id: '',
      is_sgt_product: false,
      status: 1
    },
    { 
      product_id: '102', 
      product_name: '카페라떼', 
      won_price: 3500, 
      sgt_price: 3.5, 
      image_url: 'https://placehold.co/100x100/e0e0e0/777?text=Latte', 
      is_sold_out: true, 
      kiosk_order: 1,
      description: '',
      category_id: '',
      store_id: '',
      is_sgt_product: false,
      status: 1
    },
    { 
      product_id: '103', 
      product_name: '카푸치노', 
      won_price: 3500, 
      sgt_price: 3.5, 
      image_url: null, 
      is_sold_out: false, 
      kiosk_order: 2,
      description: '',
      category_id: '',
      store_id: '',
      is_sgt_product: false,
      status: 1
    },
    { 
      product_id: '104', 
      product_name: '딸기 스무디', 
      won_price: 4500, 
      sgt_price: 4.5, 
      image_url: 'https://placehold.co/100x100/e0e0e0/777?text=Smoothie', 
      is_sold_out: false, 
      kiosk_order: 3,
      description: '',
      category_id: '',
      store_id: '',
      is_sgt_product: false,
      status: 1
    },
  ];

  // Type assertion to treat the partial products as full Products for demo purposes
  const typedProducts = initialProductsData as unknown as Product[];

  // Assume this list is for a kiosk, so isKioskProduct is true for all products
  const IS_KIOSK_MODE = true;

  const initialListItems: ListItem[] = typedProducts.map(p => ({
    id: IS_KIOSK_MODE ? `kiosk-${p.product_id}` : p.product_id.toString(),
    type: 'product',
    data: p,
    isKioskProduct: IS_KIOSK_MODE,
  }));

  const [items, setItems] = useState<ListItem[]>(initialListItems);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddCategory = (index: number) => {
    const newCategory: CategoryDividerItem = {
      id: `category-${self.crypto.randomUUID()}`,
      type: 'category',
      name: '', // Initially empty, user will type
    };
    const newItems = [...items];
    newItems.splice(index, 0, newCategory);
    setItems(newItems);
  };

  const handleUpdateCategoryName = (id: string, newName: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id && item.type === 'category'
          ? { ...item, name: newName }
          : item
      )
    );
  };
  
  const handleRemoveCategory = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const handleToggleSoldOut = (productId: string | number, currentStatus: boolean) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.type === 'product' && item.data.product_id === productId) {
          return {
            ...item,
            data: { ...item.data, is_sold_out: !currentStatus },
          };
        }
        return item;
      })
    );
    console.log(`Toggled sold out for ${productId} to ${!currentStatus}`);
  };

  const handleEditProduct = (product: Product) => {
    console.log('Editing product:', product);
    // Implement your product editing logic here (e.g., open a modal)
    alert(`상품 수정: ${product.product_name}`);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const activeItem = currentItems.find(item => item.id === active.id);
        const overItem = currentItems.find(item => item.id === over.id);

        // Only allow reordering of product items with other product items
        if (activeItem?.type === 'product' && overItem?.type === 'product') {
            const oldIndex = currentItems.findIndex(item => item.id === active.id);
            const newIndex = currentItems.findIndex(item => item.id === over.id);
            const reorderedItems = arrayMove(currentItems, oldIndex, newIndex);
            
            // Update kiosk_order for products after reordering
            let currentKioskOrder = 0;
            return reorderedItems.map(item => {
                if (item.type === 'product') {
                    return {
                        ...item,
                        data: {
                            ...item.data,
                            kiosk_order: currentKioskOrder++
                        }
                    };
                }
                return item;
            });
        }
        return currentItems; // No change if dragging category or mixing types in unsupported way
      });
    }
  };

  // Get IDs of only the sortable items (products) for SortableContext
  const productItemIds = items.filter(item => item.type === 'product').map(item => item.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="max-w-2xl mx-auto p-4 font-sans">
        <h1 className="text-2xl font-semibold mb-6 text-gray-700">키오스크 상품 관리</h1>
        <SortableContext items={productItemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-0"> {/* Reduced space here, InsertionPoint has its own margin */}
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                {/* Insertion point BEFORE each item */}
                <InsertionPoint onInsert={() => handleAddCategory(index)} />
                
                {item.type === 'product' ? (
                  <SortableProductItem
                    productItem={item}
                    onToggleSoldOut={handleToggleSoldOut}
                    onEditProduct={handleEditProduct}
                  />
                ) : (
                  <CategoryItem
                    category={item}
                    onUpdateName={handleUpdateCategoryName}
                    onRemove={handleRemoveCategory} // Added remove functionality
                  />
                )}
              </React.Fragment>
            ))}
            {/* Insertion point AFTER all items */}
            <InsertionPoint onInsert={() => handleAddCategory(items.length)} />
          </div>
        </SortableContext>
        {items.length === 0 && (
             <InsertionPoint onInsert={() => handleAddCategory(0)} />
        )}
         <div className="mt-8 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Current List State (for debugging):</h3>
            <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                {JSON.stringify(items.map(item => ({
                    id: item.id, 
                    type: item.type, 
                    name: item.type === 'category' ? item.name : item.data.product_name,
                    order: item.type === 'product' ? item.data.kiosk_order : undefined
                })), null, 2)}
            </pre>
        </div>
      </div>
    </DndContext>
  );
};

// --- WRAPPER FOR COMPATIBILITY WITH EXISTING CODE ---
export interface ExistingProductItemProps {
  product: Product;
  isKioskProduct?: boolean;
  onToggleSoldOut: (productId: string | number, currentStatus: boolean) => void;
  onEditProduct: (product: Product) => void;
}

// This is the component that will be exported and used in page.tsx
const SortableProductItemWrapper: React.FC<ExistingProductItemProps> = ({
  product,
  isKioskProduct = false,
  onToggleSoldOut,
  onEditProduct
}) => {
  // Create a productItem from the provided props
  const productItem: ProductListItem = {
    id: isKioskProduct ? `kiosk-${product.product_id}` : product.product_id.toString(),
    type: 'product',
    data: product,
    isKioskProduct: isKioskProduct
  };

  // Use the inner component with the prepared productItem
  return (
    <SortableProductItem
      productItem={productItem}
      onToggleSoldOut={onToggleSoldOut}
      onEditProduct={onEditProduct}
    />
  );
};

// Export the wrapper as the default export
export default SortableProductItemWrapper;

// Export the inner component as a named export if needed elsewhere
export { SortableProductItem };

// Export EnhancedProductList as a named export rather than default
export { EnhancedProductList };

