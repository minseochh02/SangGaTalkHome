import React, { useEffect, useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Product } from '@/utils/type'; // Use Product type directly

// Product Edit Modal Component
const ProductEditModal = ({ 
  isOpen, 
  product, 
  onClose, 
  onSave,
  onOpenOptionsEditor
}: { 
  isOpen: boolean; 
  product: Product | null; // Changed KioskProduct to Product
  onClose: () => void;
  onSave: (updatedProduct: Product) => void; // Changed KioskProduct to Product
  onOpenOptionsEditor: () => void; // Add handler for opening options editor
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sgtPrice, setSgtPrice] = useState<string>('');
  const [wonPrice, setWonPrice] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.product_name || '');
      setDescription(product.description || '');
      setSgtPrice(product.sgt_price ? product.sgt_price.toString() : '');
      setWonPrice(product.won_price ? product.won_price.toString() : '');
      setImageUrl(product.image_url || '');
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;
    
    setIsSaving(true);
    
    const updatedProduct: Product = { // Changed KioskProduct to Product
      ...product,
      product_name: name,
      description,
      sgt_price: sgtPrice ? parseFloat(sgtPrice) : null,
      won_price: wonPrice ? parseFloat(wonPrice) : 0,
      image_url: imageUrl,
    };
    
    onSave(updatedProduct);
    
    setIsSaving(false);
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  상품 정보 수정
                </Dialog.Title>
                
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="product-name" className="block text-sm font-medium text-gray-700">
                        상품명
                      </label>
                      <input
                        type="text"
                        id="product-name"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="product-description" className="block text-sm font-medium text-gray-700">
                        설명
                      </label>
                      <textarea
                        id="product-description"
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="product-sgt-price" className="block text-sm font-medium text-gray-700">
                          SGT 가격
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="product-sgt-price"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                          value={sgtPrice}
                          onChange={(e) => setSgtPrice(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="product-won-price" className="block text-sm font-medium text-gray-700">
                          원화 가격
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="product-won-price"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                          value={wonPrice}
                          onChange={(e) => setWonPrice(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="product-image-url" className="block text-sm font-medium text-gray-700">
                        이미지 URL
                      </label>
                      <input
                        type="url"
                        id="product-image-url"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                      {imageUrl && (
                        <div className="mt-2">
                          <img 
                            src={imageUrl} 
                            alt="상품 이미지 미리보기" 
                            className="h-20 w-20 object-cover rounded" 
                          />
                        </div>
                      )}
                    </div>

                    {/* Add button to open options editor */}
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={onOpenOptionsEditor}
                        className="w-full px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 border border-indigo-300 flex items-center justify-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                        상세 주문 옵션 설정
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={onClose}
                      disabled={isSaving}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      disabled={isSaving}
                    >
                      {isSaving ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ProductEditModal; 