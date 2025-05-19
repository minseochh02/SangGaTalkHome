import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Product } from '@/utils/type';

// Define the props interface for the SortableProductItem component
interface SortableProductItemProps {
  product: Product;
  isKioskProduct?: boolean;
  onToggleSoldOut: (productId: string | number, currentStatus: boolean) => void;
  onEditProduct: (product: Product) => void;
}

const SortableProductItem: React.FC<SortableProductItemProps> = ({ 
  product, 
  isKioskProduct = false,
  onToggleSoldOut,
  onEditProduct
}) => {
  // Generate the correct id for the sortable item
  const itemId = isKioskProduct ? `kiosk-${product.product_id}` : product.product_id.toString();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 100 : 'auto', // Ensure dragging item is on top
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
      className={`p-3 mb-2 rounded-lg border shadow-sm transition-shadow ${
        isDragging 
          ? 'bg-blue-50 border-blue-400 shadow-md' 
          : isKioskProduct 
            ? 'bg-green-50 border-green-200'
            : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3" {...attributes} {...listeners}>
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
          <h4 className="font-medium flex items-center">
            {product.product_name}
            {product.is_sold_out && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                품절
              </span>
            )}
          </h4>
          <div className="flex text-sm gap-2">
            <span className="text-gray-600">{formatPrice(product.won_price)}원</span>
            {product.sgt_price && (
              <span className="text-blue-600">{formatPrice(product.sgt_price)} SGT</span>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onToggleSoldOut(product.product_id, product.is_sold_out || false)}
            className={`p-1.5 rounded-md ${
              product.is_sold_out
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-red-100 text-red-800 hover:bg-red-200'
            }`}
            title={product.is_sold_out ? '판매가능으로 변경' : '품절로 변경'}
          >
            {product.is_sold_out ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )}
          </button>
          <button
            onClick={() => onEditProduct(product)}
            className="p-1.5 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
            title="상품 정보 수정"
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
