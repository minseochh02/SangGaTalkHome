import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Product } from '@/utils/type'; // Use Product type directly

// If KioskProduct is not part of the global Product type or needs specific fields for this component
interface KioskProduct extends Product {
  kiosk_order?: number;
  is_kiosk_enabled?: boolean;
  is_sold_out?: boolean;
}

interface SortableProductItemProps {
  product: Product; // Changed KioskProduct to Product
  isKioskProduct?: boolean;
  onToggleSoldOut: (productId: string | number, currentStatus: boolean) => void;
  onEditProduct: (product: Product) => void; // Changed KioskProduct to Product
}

const SortableProductItem = ({ 
  product, 
  isKioskProduct = false,
  onToggleSoldOut,
  onEditProduct
}: SortableProductItemProps) => {
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

  const isSoldOut = product.is_sold_out === true;
  
  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...attributes} 
      {...listeners}
      className={`mb-2 p-3 rounded-lg border bg-white border-gray-200 cursor-move ${isDragging ? 'z-50' : ''} ${isSoldOut ? 'bg-gray-100' : ''}`}
    >
      <div className="relative flex items-center gap-3">
        {isKioskProduct && (
          <div className="text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        {product.image_url ? (
          <div className="relative">
            <img 
              src={product.image_url} 
              alt={product.product_name}
              className={`w-12 h-12 object-cover rounded ${isSoldOut ? 'opacity-50' : ''}`}
            />
            {isSoldOut && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-sm">
                  품절
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className={`w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs ${isSoldOut ? 'opacity-50' : ''}`}>
            No Image
            {isSoldOut && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-sm">
                  품절
                </span>
              </span>
            )}
          </div>
        )}
        
        <div className={`flex-1 ${isSoldOut ? 'opacity-50' : ''}`}>
          <h4 className="font-medium">{product.product_name}</h4>
          <div className="flex text-sm gap-2">
            <span className="text-gray-600">{formatPrice(product.won_price)}원</span>
            {product.sgt_price && (
              <span className="text-blue-600">{formatPrice(product.sgt_price)} SGT</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleSoldOut(product.product_id, !!product.is_sold_out);
            }}
            className={`px-2 py-1 text-xs font-medium rounded ${isSoldOut 
              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            title={isSoldOut ? "판매 가능으로 변경" : "품절로 변경"}
          >
            {isSoldOut ? '품절 해제' : '품절'}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditProduct(product);
            }}
            className="p-1 text-gray-500 hover:text-gray-800"
            title="상품 정보 수정"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
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

export default SortableProductItem; 