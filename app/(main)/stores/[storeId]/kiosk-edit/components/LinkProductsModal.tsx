import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Product, ProductOptionCategory } from '../GlobalOptionEditor'; // Adjust path as needed for type imports
import { renderIconDisplay } from './iconUtils';

interface LinkProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOption: ProductOptionCategory | null;
  products: Product[];
  selectedProducts: string[];
  onToggleProduct: (id: string) => void;
  onSaveLinking: () => void;
  saving: boolean;
}

const LinkProductsModal: React.FC<LinkProductsModalProps> = ({
  isOpen,
  onClose,
  selectedOption,
  products,
  selectedProducts,
  onToggleProduct,
  onSaveLinking,
  saving,
}) => {
  if (!isOpen || !selectedOption) return null;

  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300 ease-in-out p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 shadow-xl transform transition-all sm:max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            {renderIconDisplay(selectedOption.icon)}
            <span className={`${selectedOption.icon ? 'ml-2' : ''}`}>"{selectedOption.name}" 옵션을 상품에 연결</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100" aria-label="Close modal">
            <FontAwesomeIcon icon={['fas', 'times']} className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto flex-grow pr-1 custom-scrollbar">
          {products && products.length > 0 ? (
            <div className="space-y-2.5">
              {products.map(product => (
                <label key={product.product_id} htmlFor={`product-${product.product_id}`} className="flex items-center p-3 hover:bg-gray-100 rounded-lg cursor-pointer border border-gray-200 transition-colors">
                  <input
                    type="checkbox"
                    id={`product-${product.product_id}`}
                    checked={selectedProducts.includes(product.product_id)}
                    onChange={() => onToggleProduct(product.product_id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-1"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">{product.product_name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic text-center py-6">연결할 수 있는 상품이 없습니다. 먼저 상품을 추가해주세요.</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6 pt-5 border-t border-gray-200">
          <button onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition-colors w-full sm:w-auto">취소</button>
          <button onClick={onSaveLinking} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors shadow-md hover:shadow-lg w-full sm:w-auto" disabled={!selectedOption || saving}>
            {saving ? '저장 중...' : '연결 저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkProductsModal; 