import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ProductOptionCategory, ProductOptionChoice, Product } from '@/utils/type';

interface GlobalOptionEditorProps {
  storeId: string;
  products?: Product[];
}

const GlobalOptionEditor: React.FC<GlobalOptionEditorProps> = ({
  storeId,
  products = []
}) => {
  const supabase = createClient();
  const [globalOptions, setGlobalOptions] = useState<ProductOptionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newChoices, setNewChoices] = useState<string[]>(['', '', '']);
  
  // For linking options to products
  const [selectedOption, setSelectedOption] = useState<ProductOptionCategory | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  
  // Generate a unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Fetch existing global options
  useEffect(() => {
    const fetchGlobalOptions = async () => {
      setLoading(true);
      // For now, we'll mock this since we're not implementing DB yet
      // In a real implementation, you would fetch from Supabase
      const mockOptions = [
        {
          id: 'opt-1',
          name: '얼음 양',
          choices: [
            { id: 'choice-1', name: '적게' },
            { id: 'choice-2', name: '보통' },
            { id: 'choice-3', name: '많이' },
          ]
        },
        {
          id: 'opt-2',
          name: '시럽',
          choices: [
            { id: 'choice-4', name: '추가 안함' },
            { id: 'choice-5', name: '1펌프' },
            { id: 'choice-6', name: '2펌프' },
          ]
        }
      ];
      
      setGlobalOptions(mockOptions);
      setLoading(false);
    };
    
    fetchGlobalOptions();
  }, [storeId]);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      alert('카테고리 이름을 입력해주세요.');
      return;
    }

    // Filter out empty choices
    const validChoices = newChoices.filter(choice => choice.trim() !== '').map(choice => ({
      id: generateId(),
      name: choice.trim()
    }));

    if (validChoices.length === 0) {
      alert('최소 하나의 옵션을 입력해주세요.');
      return;
    }

    const newCategory: ProductOptionCategory = {
      id: generateId(),
      name: newCategoryName.trim(),
      choices: validChoices
    };

    setGlobalOptions([...globalOptions, newCategory]);
    setShowNewCategory(false);
    setNewCategoryName('');
    setNewChoices(['', '', '']);
  };

  const handleChoiceChange = (index: number, value: string) => {
    const updatedChoices = [...newChoices];
    updatedChoices[index] = value;
    setNewChoices(updatedChoices);
  };

  const handleAddChoice = () => {
    setNewChoices([...newChoices, '']);
  };

  const handleRemoveCategory = (categoryId: string) => {
    setGlobalOptions(globalOptions.filter(option => option.id !== categoryId));
  };

  const handleSaveOptions = async () => {
    setSaving(true);
    
    try {
      // In a real implementation, you would save to Supabase here
      console.log('Saving global options:', globalOptions);
      // Mock success
      alert('글로벌 옵션이 성공적으로 저장되었습니다.');
    } catch (error) {
      console.error('Error saving options:', error);
      alert('옵션 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };
  
  const openLinkModal = (option: ProductOptionCategory) => {
    setSelectedOption(option);
    // Pre-select products that already have this option
    // In a real implementation, you would fetch this from your DB
    setSelectedProducts([]);
    setShowLinkModal(true);
  };
  
  const handleToggleProduct = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };
  
  const handleSaveLinking = async () => {
    if (!selectedOption) return;
    
    try {
      // In a real implementation, you would save the product-option associations
      console.log('Linking option', selectedOption.id, 'to products:', selectedProducts);
      // Mock success
      alert('상품 연결이 성공적으로 저장되었습니다.');
      setShowLinkModal(false);
    } catch (error) {
      console.error('Error linking products:', error);
      alert('상품 연결 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">글로벌 옵션 관리</h2>
        <button
          onClick={handleSaveOptions}
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
        >
          {saving ? '저장 중...' : '모든 옵션 저장'}
        </button>
      </div>
      
      <p className="text-gray-600 mb-6">
        여기서 생성한 옵션은 여러 상품에 공통으로 적용할 수 있습니다. 옵션을 생성한 후 원하는 상품에 연결하세요.
      </p>
      
      {globalOptions.length > 0 && (
        <div className="mb-6 space-y-4">
          {globalOptions.map(category => (
            <div key={category.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-800">{category.name}</h4>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => openLinkModal(category)}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    상품 연결
                  </button>
                  <button 
                    onClick={() => handleRemoveCategory(category.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {category.choices.map(choice => (
                  <div key={choice.id} className="bg-gray-50 p-2 rounded text-center">
                    {choice.name}
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                <span className="font-medium">연결된 상품:</span> 
                {/* In a real implementation, you would show linked products here */}
                <span className="italic">아직 연결된 상품이 없습니다.</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showNewCategory ? (
        <button
          onClick={() => setShowNewCategory(true)}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-500 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          새 글로벌 옵션 카테고리 추가
        </button>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="mb-4">
            <label htmlFor="category-name" className="block text-sm font-medium text-gray-700 mb-1">
              옵션 카테고리 이름
            </label>
            <input
              type="text"
              id="category-name"
              placeholder="예: 얼음 양"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              옵션 선택지
            </label>
            <div className="space-y-2">
              {newChoices.map((choice, index) => (
                <input
                  key={index}
                  type="text"
                  placeholder={index === 0 ? "예: 적게" : index === 1 ? "예: 보통" : "예: 많이"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={choice}
                  onChange={(e) => handleChoiceChange(index, e.target.value)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddChoice}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              + 선택지 추가
            </button>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowNewCategory(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700"
            >
              추가
            </button>
          </div>
        </div>
      )}
      
      {/* Modal for linking options to products */}
      {showLinkModal && selectedOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              "{selectedOption.name}" 옵션을 연결할 상품 선택
            </h3>
            
            {products.length === 0 ? (
              <p className="text-gray-500 italic">연결할 수 있는 상품이 없습니다.</p>
            ) : (
              <div className="mb-4 space-y-2">
                {products.map(product => (
                  <div key={product.product_id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`product-${product.product_id}`}
                      checked={selectedProducts.includes(product.product_id)}
                      onChange={() => handleToggleProduct(product.product_id)}
                      className="mr-2"
                    />
                    <label htmlFor={`product-${product.product_id}`} className="flex-1 cursor-pointer">
                      {product.product_name}
                    </label>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSaveLinking}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalOptionEditor; 