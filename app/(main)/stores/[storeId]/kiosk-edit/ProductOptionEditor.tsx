import React, { useState } from 'react';
import { ProductOptionCategory, ProductOptionChoice } from '@/utils/type';

interface ProductOptionEditorProps {
  productId: string | number;
  storeId: string;
  initialOptions?: ProductOptionCategory[];
  onSave: (productId: string | number, options: ProductOptionCategory[]) => void;
}

const ProductOptionEditor: React.FC<ProductOptionEditorProps> = ({
  productId,
  storeId,
  initialOptions = [],
  onSave
}) => {
  const [options, setOptions] = useState<ProductOptionCategory[]>(initialOptions);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [newCategorySelectionType, setNewCategorySelectionType] = useState<'single' | 'multiple'>('single');
  const [newCategoryDisplayOrder, setNewCategoryDisplayOrder] = useState(0);
  
  // New state for each choice
  const [newChoices, setNewChoices] = useState<Array<{
    name: string;
    priceAdjustment: number;
    displayOrder: number;
    isDefault: boolean;
    isSoldOut: boolean;
    choiceIcon: string;
  }>>([{
    name: '',
    priceAdjustment: 0,
    displayOrder: 0,
    isDefault: false,
    isSoldOut: false,
    choiceIcon: ''
  }]);

  // Generate a unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      alert('카테고리 이름을 입력해주세요.');
      return;
    }

    // Filter out empty choices
    const validChoices = newChoices
      .filter(choice => choice.name.trim() !== '')
      .map((choice, index) => ({
        id: generateId(),
        name: choice.name.trim(),
        priceAdjustment: choice.priceAdjustment,
        displayOrder: choice.displayOrder || index, // Use the specified order or index as fallback
        isDefault: choice.isDefault,
        isSoldOut: choice.isSoldOut,
        choiceIcon: choice.choiceIcon
      }));

    if (validChoices.length === 0) {
      alert('최소 하나의 옵션을 입력해주세요.');
      return;
    }

    const newCategory: ProductOptionCategory = {
      id: generateId(),
      name: newCategoryName.trim(),
      displayOrder: newCategoryDisplayOrder,
      selectionType: newCategorySelectionType,
      groupIcon: newCategoryIcon.trim() || undefined,
      storeId: storeId.toString(),
      productId: productId.toString(),
      choices: validChoices
    };

    setOptions([...options, newCategory]);
    resetNewCategoryForm();
  };

  const resetNewCategoryForm = () => {
    setShowNewCategory(false);
    setNewCategoryName('');
    setNewCategoryIcon('');
    setNewCategorySelectionType('single');
    setNewCategoryDisplayOrder(0);
    setNewChoices([{
      name: '',
      priceAdjustment: 0,
      displayOrder: 0,
      isDefault: false,
      isSoldOut: false,
      choiceIcon: ''
    }]);
  };

  const handleChoiceChange = (index: number, field: string, value: any) => {
    const updatedChoices = [...newChoices];
    
    // Type assertion to handle various field types
    if (field === 'name' || field === 'choiceIcon') {
      (updatedChoices[index] as any)[field] = value;
    } else if (field === 'priceAdjustment' || field === 'displayOrder') {
      (updatedChoices[index] as any)[field] = Number(value);
    } else if (field === 'isDefault' || field === 'isSoldOut') {
      (updatedChoices[index] as any)[field] = Boolean(value);
    }
    
    setNewChoices(updatedChoices);
  };

  const handleAddChoice = () => {
    setNewChoices([...newChoices, {
      name: '',
      priceAdjustment: 0,
      displayOrder: newChoices.length,
      isDefault: false,
      isSoldOut: false,
      choiceIcon: ''
    }]);
  };

  const handleRemoveChoice = (index: number) => {
    if (newChoices.length <= 1) {
      alert('최소 하나의 옵션이 필요합니다.');
      return;
    }
    const updatedChoices = [...newChoices];
    updatedChoices.splice(index, 1);
    setNewChoices(updatedChoices);
  };

  const handleRemoveCategory = (categoryId: string) => {
    setOptions(options.filter(option => option.id !== categoryId));
  };

  const handleSaveOptions = () => {
    // Ensure all required fields are set
    const optionsToSave = options.map(category => ({
      ...category,
      storeId: storeId.toString(),
      productId: productId.toString(),
      choices: category.choices.map((choice, index) => ({
        ...choice,
        displayOrder: choice.displayOrder ?? index
      }))
    }));
    
    onSave(productId, optionsToSave);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">상세 주문 옵션</h3>
      
      {options.length > 0 && (
        <div className="mb-6 space-y-4">
          {options.map(category => (
            <div key={category.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  {category.groupIcon && (
                    <i className={`${category.groupIcon} mr-2 text-blue-500`}></i>
                  )}
                  <h4 className="font-medium text-gray-800">{category.name}</h4>
                  <span className="ml-2 text-sm text-gray-500">
                    ({category.selectionType === 'multiple' ? '다중 선택' : '단일 선택'})
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    순서: {category.displayOrder || 0}
                  </span>
                </div>
                <button 
                  onClick={() => handleRemoveCategory(category.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {category.choices.map(choice => (
                  <div key={choice.id} className={`p-2 rounded ${choice.isSoldOut ? 'bg-gray-200' : 'bg-gray-50'} ${choice.isDefault ? 'border-2 border-blue-300' : ''}`}>
                    <div className="flex justify-between items-center">
                      {choice.choiceIcon && (
                        <i className={`${choice.choiceIcon} mr-1 text-blue-500`}></i>
                      )}
                      <span className="font-medium">{choice.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {choice.priceAdjustment !== undefined && choice.priceAdjustment !== 0 && (
                        <div className={(choice.priceAdjustment || 0) > 0 ? 'text-red-500' : 'text-green-500'}>
                          {(choice.priceAdjustment || 0) > 0 ? '+' : ''}{(choice.priceAdjustment || 0).toLocaleString()}원
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>순서: {choice.displayOrder || 0}</span>
                        {choice.isDefault && <span className="text-blue-500">기본값</span>}
                        {choice.isSoldOut && <span className="text-red-500">품절</span>}
                      </div>
                    </div>
                  </div>
                ))}
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
          새 옵션 카테고리 추가
        </button>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="mb-4">
            <label htmlFor="category-name" className="block text-sm font-medium text-gray-700 mb-1">
              카테고리 이름
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

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="category-icon" className="block text-sm font-medium text-gray-700 mb-1">
                아이콘 (Font Awesome 클래스)
              </label>
              <input
                type="text"
                id="category-icon"
                placeholder="예: fa-solid fa-ice-cube"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="category-display-order" className="block text-sm font-medium text-gray-700 mb-1">
                표시 순서
              </label>
              <input
                type="number"
                id="category-display-order"
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={newCategoryDisplayOrder}
                onChange={(e) => setNewCategoryDisplayOrder(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="category-selection-type" className="block text-sm font-medium text-gray-700 mb-1">
              선택 유형
            </label>
            <select
              id="category-selection-type"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={newCategorySelectionType}
              onChange={(e) => setNewCategorySelectionType(e.target.value as 'single' | 'multiple')}
            >
              <option value="single">단일 선택 (라디오 버튼)</option>
              <option value="multiple">다중 선택 (체크 박스)</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              옵션 선택지
            </label>
            <div className="space-y-4">
              {newChoices.map((choice, index) => (
                <div key={index} className="p-3 border rounded-md bg-gray-50">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">이름</label>
                      <input
                        type="text"
                        placeholder={index === 0 ? "예: 적게" : index === 1 ? "예: 보통" : "예: 많이"}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={choice.name}
                        onChange={(e) => handleChoiceChange(index, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">아이콘 (Font Awesome)</label>
                      <input
                        type="text"
                        placeholder="예: fa-solid fa-snowflake"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={choice.choiceIcon}
                        onChange={(e) => handleChoiceChange(index, 'choiceIcon', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">가격 조정 (원)</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={choice.priceAdjustment}
                        onChange={(e) => handleChoiceChange(index, 'priceAdjustment', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">표시 순서</label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={choice.displayOrder}
                        onChange={(e) => handleChoiceChange(index, 'displayOrder', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={choice.isDefault}
                          onChange={(e) => handleChoiceChange(index, 'isDefault', e.target.checked)}
                          className="mr-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">기본값</span>
                      </label>
                      
                      <label className="flex items-center text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={choice.isSoldOut}
                          onChange={(e) => handleChoiceChange(index, 'isSoldOut', e.target.checked)}
                          className="mr-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">품절</span>
                      </label>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleRemoveChoice(index)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddChoice}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              선택지 추가
            </button>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => resetNewCategoryForm()}
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

      {options.length > 0 && (
        <div className="mt-6 text-right">
          <button
            onClick={handleSaveOptions}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            옵션 저장
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductOptionEditor; 