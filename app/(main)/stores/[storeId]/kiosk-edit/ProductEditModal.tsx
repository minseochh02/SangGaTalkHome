import React, { useEffect, useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Product, ProductOptionCategory, ProductOptionChoice, ProductOptionGroup } from '@/utils/type'; 
import ProductOptionEditor from './ProductOptionEditor';
import { fetchProductOptions, saveProductOptions, transformCategoriesToGroups, transformGroupsToCategories } from '@/utils/supabase/product-options';
import { createClient } from '@/utils/supabase/client';

// Product Edit Modal Component
const ProductEditModal = ({ 
  isOpen, 
  product, 
  onClose, 
  onSave 
}: { 
  isOpen: boolean; 
  product: Product | null;
  onClose: () => void;
  onSave: (updatedProduct: Product) => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sgtPrice, setSgtPrice] = useState<string>('');
  const [wonPrice, setWonPrice] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' or 'options'
  const [productOptions, setProductOptions] = useState<ProductOptionCategory[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const supabase = createClient();

  // Load product data when the modal opens
  useEffect(() => {
    if (product) {
      setName(product.product_name || '');
      setDescription(product.description || '');
      setSgtPrice(product.sgt_price ? product.sgt_price.toString() : '');
      setWonPrice(product.won_price ? product.won_price.toString() : '');
      setImageUrl(product.image_url || '');
      
      // Load product options from the database
      if (isOpen) {
        loadProductOptions(product.product_id);
      }
    }
  }, [product, isOpen]);

  // Load product options from the database
  const loadProductOptions = async (productId: string) => {
    if (!productId) return;
    
    setLoadingOptions(true);
    try {
      // Fetch product options from the database
      const optionGroups = await fetchProductOptions(productId);
      
      // Convert ProductOptionGroup[] to ProductOptionCategory[] for the existing editor
      const categories = transformGroupsToCategories(optionGroups);
      setProductOptions(categories);
      
      console.log('Loaded product options:', categories);
    } catch (error) {
      console.error('Error loading product options:', error);
      // Show a user-friendly error message if needed
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;
    
    setIsSaving(true);
    
    try {
      // First, save the product details
      const updatedProduct: Product = {
        ...product,
        product_name: name,
        description,
        sgt_price: sgtPrice ? parseFloat(sgtPrice) : null,
        won_price: wonPrice ? parseFloat(wonPrice) : 0,
        image_url: imageUrl,
        // options: productOptions, // productOptions are saved separately now
      };
      
      // Call the parent component's onSave function to save the basic product details
      // This onSave is from KioskEditPage and saves the main product attributes
      await onSave(updatedProduct); 
      console.log("ProductEditModal: Basic product details saved via parent onSave.");
      
      // Check if we have any options to save
      if (productOptions && productOptions.length > 0 && product.product_id && product.store_id) {
        console.log("ProductEditModal: Attempting to save options:", JSON.stringify(productOptions, null, 2)); 
        try {
          // Transform ProductOptionCategory[] (from editor state) to ProductOptionGroup[] (for DB)
          const optionGroupsToSave = transformCategoriesToGroups(
            productOptions, 
            product.product_id, 
            product.store_id
          );
          
          console.log("ProductEditModal: Transformed optionGroups for DB:", JSON.stringify(optionGroupsToSave, null, 2)); 
          
          // Save the product options to the database
          await saveProductOptions(product.product_id, product.store_id, optionGroupsToSave);
          console.log('Product options saved successfully to DB.');
        } catch (optionsError) {
          console.error('Error saving product options to DB:', optionsError);
          alert('상품 옵션 저장 중 오류가 발생했습니다.'); 
        }
      } else {
        // If there are no productOptions, but we might need to clear existing options in DB
        // This handles the case where all options were removed.
        if (product.product_id && product.store_id) {
            console.log("ProductEditModal: No options in editor, ensuring options are cleared in DB for product:", product.product_id);
            await saveProductOptions(product.product_id, product.store_id, []); // Pass empty array to delete existing
            console.log('Ensured no options are present in DB for this product.');
        } else {
            console.warn("ProductEditModal: product_id or store_id missing, cannot clear options.");
        }
      }
      
      // Close the modal on successful save
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('상품 정보 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOptions = (productId: string | number, options: ProductOptionCategory[]) => {
    setProductOptions(options);
    // Switch back to basic tab after saving options
    setActiveTab('basic');
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
                
                {/* Tab navigation */}
                <div className="flex border-b mb-4">
                  <button
                    className={`py-2 px-4 ${activeTab === 'basic' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('basic')}
                  >
                    기본 정보
                  </button>
                  <button
                    className={`py-2 px-4 ${activeTab === 'options' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('options')}
                  >
                    상세 주문 옵션
                  </button>
                </div>
                
                {activeTab === 'basic' ? (
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
                ) : (
                  <div>
                    {loadingOptions ? (
                      <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : (
                      <ProductOptionEditor 
                        productId={product?.product_id || ''}
                        initialOptions={productOptions}
                        onSave={handleSaveOptions}
                      />
                    )}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ProductEditModal; 