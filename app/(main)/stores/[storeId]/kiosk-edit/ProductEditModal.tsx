import React, { useEffect, useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Product, ProductOptionCategory, ProductOptionChoice } from '@/utils/type'; 
import ProductOptionEditor from './ProductOptionEditor';
import { createClient } from '@/utils/supabase/client';

// Product Edit Modal Component
const ProductEditModal = ({ 
  isOpen, 
  product, 
  storeId,
  onClose, 
  onSave 
}: { 
  isOpen: boolean; 
  product: Product | null;
  storeId: string;
  onClose: () => void;
  onSave: (updatedProduct: Product) => void;
}) => {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sgtPrice, setSgtPrice] = useState<string>('');
  const [wonPrice, setWonPrice] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' or 'options'
  const [productOptions, setProductOptions] = useState<ProductOptionCategory[]>([]);

  // Load basic product data when product changes
  useEffect(() => {
    if (product) {
      setName(product.product_name || '');
      setDescription(product.description || '');
      setSgtPrice(product.sgt_price ? product.sgt_price.toString() : '');
      setWonPrice(product.won_price ? product.won_price.toString() : '');
      setImageUrl(product.image_url || '');
      
      // Load product options from database when product changes
      loadProductOptions(product.product_id);
    }
  }, [product]);

  // Load product options from database
  const loadProductOptions = async (productId: string) => {
    if (!productId) return;
    
    setLoadingOptions(true);
    try {
      // 1. Fetch option groups for this product
      const { data: groupsData, error: groupsError } = await supabase
        .from('product_option_groups')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });
        
      if (groupsError) {
        console.error('Error loading option groups:', groupsError);
        return;
      }
      
      if (!groupsData || groupsData.length === 0) {
        // No options found
        setProductOptions([]);
        return;
      }
      
      // 2. For each group, fetch its choices
      const optionCategories: ProductOptionCategory[] = [];
      
      for (const group of groupsData) {
        const { data: choicesData, error: choicesError } = await supabase
          .from('product_option_choices')
          .select('*')
          .eq('option_group_id', group.option_group_id)
          .order('display_order', { ascending: true });
          
        if (choicesError) {
          console.error(`Error loading choices for group ${group.option_group_id}:`, choicesError);
          continue; // Skip this group if error
        }
        
        // Convert DB records to our interface format
        const choices: ProductOptionChoice[] = (choicesData || []).map(choice => ({
          id: choice.option_choice_id,
          name: choice.choice_name,
          priceAdjustment: choice.price_adjustment,
          displayOrder: choice.display_order,
          isDefault: choice.is_default,
          isSoldOut: choice.is_sold_out,
          choiceIcon: choice.choice_icon,
          optionGroupId: choice.option_group_id
        }));
        
        optionCategories.push({
          id: group.option_group_id,
          name: group.group_name,
          displayOrder: group.display_order,
          selectionType: group.selection_type as 'single' | 'multiple',
          groupIcon: group.group_icon,
          storeId: group.store_id,
          productId: group.product_id,
          choices
        });
      }
      
      setProductOptions(optionCategories);
    } catch (err) {
      console.error('Error in loadProductOptions:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  // Save product options to database
  const saveProductOptions = async (productId: string, options: ProductOptionCategory[]) => {
    if (!productId) return;
    
    try {
      // 1. Delete all existing option choices for this product's groups
      const { data: existingGroups, error: groupsQueryError } = await supabase
        .from('product_option_groups')
        .select('option_group_id')
        .eq('product_id', productId);
        
      if (groupsQueryError) {
        console.error('Error querying existing option groups:', groupsQueryError);
        return false;
      }
      
      if (existingGroups && existingGroups.length > 0) {
        const groupIds = existingGroups.map(g => g.option_group_id);
        
        // Delete all choices for these groups
        const { error: choicesDeleteError } = await supabase
          .from('product_option_choices')
          .delete()
          .in('option_group_id', groupIds);
          
        if (choicesDeleteError) {
          console.error('Error deleting existing option choices:', choicesDeleteError);
          return false;
        }
        
        // Delete all groups
        const { error: groupsDeleteError } = await supabase
          .from('product_option_groups')
          .delete()
          .eq('product_id', productId);
          
        if (groupsDeleteError) {
          console.error('Error deleting existing option groups:', groupsDeleteError);
          return false;
        }
      }
      
      // 2. Insert new option groups
      for (const group of options) {
        const { data: newGroup, error: groupInsertError } = await supabase
          .from('product_option_groups')
          .insert({
            option_group_id: group.id,
            product_id: productId,
            store_id: storeId,
            group_name: group.name,
            display_order: group.displayOrder || 0,
            selection_type: group.selectionType || 'single',
            group_icon: group.groupIcon
          })
          .select()
          .single();
          
        if (groupInsertError) {
          console.error('Error inserting option group:', groupInsertError);
          continue; // Skip choices for this group if error
        }
        
        // 3. Insert choices for this group
        if (group.choices && group.choices.length > 0) {
          const choicesToInsert = group.choices.map(choice => ({
            option_choice_id: choice.id,
            option_group_id: group.id,
            choice_name: choice.name,
            price_adjustment: choice.priceAdjustment || 0,
            display_order: choice.displayOrder || 0,
            is_default: choice.isDefault || false,
            is_sold_out: choice.isSoldOut || false,
            choice_icon: choice.choiceIcon
          }));
          
          const { error: choicesInsertError } = await supabase
            .from('product_option_choices')
            .insert(choicesToInsert);
            
          if (choicesInsertError) {
            console.error('Error inserting option choices:', choicesInsertError);
          }
        }
      }
      
      return true;
    } catch (err) {
      console.error('Error in saveProductOptions:', err);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;
    
    setIsSaving(true);
    
    const updatedProduct: Product = {
      ...product,
      product_name: name,
      description,
      sgt_price: sgtPrice ? parseFloat(sgtPrice) : null,
      won_price: wonPrice ? parseFloat(wonPrice) : 0,
      image_url: imageUrl,
      options: productOptions, // Include options in the product object
    };
    
    // First save the product
    onSave(updatedProduct);
    
    // Then save the options separately to our new tables
    await saveProductOptions(product.product_id, productOptions);
    
    setIsSaving(false);
  };

  const handleSaveOptions = async (productId: string | number, options: ProductOptionCategory[]) => {
    setProductOptions(options);
    
    // Save options to database immediately
    if (productId) {
      const success = await saveProductOptions(productId.toString(), options);
      if (success) {
        alert('옵션이 저장되었습니다.');
      } else {
        alert('옵션 저장 중 오류가 발생했습니다.');
      }
    }
    
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
                  loadingOptions ? (
                    <div className="py-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <p className="mt-2 text-gray-500">옵션 로딩 중...</p>
                    </div>
                  ) : (
                    <ProductOptionEditor 
                      productId={product?.product_id || ''}
                      storeId={storeId}
                      initialOptions={productOptions}
                      onSave={handleSaveOptions}
                    />
                  )
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