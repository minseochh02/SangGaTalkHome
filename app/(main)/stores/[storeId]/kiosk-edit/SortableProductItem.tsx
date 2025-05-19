import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Product } from '@/utils/type';

interface SortableProductItemProps {
  product: Product;
  isKioskProduct?: boolean;
  onToggleSoldOut: (productId: string | number, currentStatus: boolean) => Promise<void>;
  onEditProduct: (product: Product) => void;
}

const SortableProductItem: React.FC<SortableProductItemProps> = ({
  product,
  isKioskProduct = false,
  onToggleSoldOut,
  onEditProduct
}) => {
  // For kiosk products, we use a prefix to distinguish them in the drag and drop context
  const id = isKioskProduct ? `kiosk-${product.product_id}` : `${product.product_id}`;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  // Helper function to format price with commas
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
      className={`p-3 my-2 rounded-lg border bg-white shadow-sm transition-all ${
        isDragging ? 'z-10 shadow-lg' : ''
      } ${isKioskProduct ? 'border-green-300' : 'border-gray-200'}`}
    >
      <div className="flex items-center gap-3">
        <div className="cursor-grab">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
        
        {/* Product image */}
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
        
        {/* Product details */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{product.product_name}</h4>
            {product.is_sold_out && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                품절
              </span>
            )}
          </div>
          <div className="flex text-sm gap-2">
            <span className="text-gray-600">{formatPrice(product.won_price)}원</span>
            {product.sgt_price && (
              <span className="text-blue-600">{formatPrice(product.sgt_price)} SGT</span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onToggleSoldOut(product.product_id, product.is_sold_out || false)}
            className={`p-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              product.is_sold_out 
                ? 'bg-red-100 hover:bg-red-200 focus:ring-red-500' 
                : 'bg-gray-100 hover:bg-gray-200 focus:ring-gray-500'
            }`}
            title={product.is_sold_out ? "재고 있음으로 변경" : "품절 처리"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${product.is_sold_out ? 'text-red-600' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </button>
          
          <button
            onClick={() => onEditProduct(product)}
            className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            title="상품 편집"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SortableProductItem;
