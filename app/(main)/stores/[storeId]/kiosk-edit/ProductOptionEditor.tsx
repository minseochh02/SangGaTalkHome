import React, { useState } from 'react';
import { ProductOptionCategory, ProductOptionChoice } from '@/utils/type';

interface ProductOptionEditorProps {
  productId: string | number;
  initialOptions?: ProductOptionCategory[];
  onSave: (productId: string | number, options: ProductOptionCategory[]) => void;
}

const ProductOptionEditor: React.FC<ProductOptionEditorProps> = ({
  productId,
  initialOptions = [],
  onSave
}) => {
  const [options, setOptions] = useState<ProductOptionCategory[]>(initialOptions);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'single' | 'multiple'>('single');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  
  // Default to 3 empty choices
  const [newChoices, setNewChoices] = useState<Array<{
    name: string;
    priceAdjustment: string;
    isDefault: boolean;
    isSoldOut: boolean;
    icon: string;
  }>>([
    { name: '', priceAdjustment: '0', isDefault: false, isSoldOut: false, icon: '' },
    { name: '', priceAdjustment: '0', isDefault: false, isSoldOut: false, icon: '' },
    { name: '', priceAdjustment: '0', isDefault: false, isSoldOut: false, icon: '' }
  ]);

  // Generate a unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      alert('카테고리 이름을 입력해주세요.');
      return;
    }

    // Filter out empty choices and map to the proper ProductOptionChoice interface
    const validChoices = newChoices
      .filter(choice => choice.name.trim() !== '')
      .map((choice, index) => ({
        option_choice_id: generateId(), // Generate a new ID for each choice
        option_group_id: '', // This will be set when saved to the DB
        choice_name: choice.name.trim(),
        price_adjustment: parseFloat(choice.priceAdjustment) || 0,
        display_order: index,
        is_default: choice.isDefault,
        is_sold_out: choice.isSoldOut,
        choice_icon: choice.icon.trim() || null
      } as ProductOptionChoice));

    if (validChoices.length === 0) {
      alert('최소 하나의 옵션을 입력해주세요.');
      return;
    }

    if (editingCategoryIndex !== null) {
      // We're editing an existing category
      const updatedOptions = [...options];
      updatedOptions[editingCategoryIndex] = {
        ...updatedOptions[editingCategoryIndex],
        name: newCategoryName.trim(),
        group_icon: newCategoryIcon.trim() || null,
        selection_type: newCategoryType,
        choices: validChoices
      };
      setOptions(updatedOptions);
      setEditingCategoryIndex(null);
    } else {
      // We're adding a new category
      const newCategory: ProductOptionCategory = {
        id: generateId(),
        name: newCategoryName.trim(),
        group_icon: newCategoryIcon.trim() || null,
        selection_type: newCategoryType,
        display_order: options.length,
        choices: validChoices
      };
      setOptions([...options, newCategory]);
    }

    // Reset the form
    setShowNewCategory(false);
    setNewCategoryName('');
    setNewCategoryIcon('');
    setNewCategoryType('single');
    setNewChoices([
      { name: '', priceAdjustment: '0', isDefault: false, isSoldOut: false, icon: '' },
      { name: '', priceAdjustment: '0', isDefault: false, isSoldOut: false, icon: '' },
      { name: '', priceAdjustment: '0', isDefault: false, isSoldOut: false, icon: '' }
    ]);
  };

  const handleChoiceChange = (index: number, field: string, value: any) => {
    const updatedChoices = [...newChoices];
    updatedChoices[index] = { ...updatedChoices[index], [field]: value };
    setNewChoices(updatedChoices);
  };

  const handleAddChoice = () => {
    setNewChoices([...newChoices, { name: '', priceAdjustment: '0', isDefault: false, isSoldOut: false, icon: '' }]);
  };

  const handleRemoveCategory = (categoryId: string) => {
    setOptions(options.filter(option => option.id !== categoryId));
  };

  const handleEditCategory = (index: number) => {
    const category = options[index];
    
    setEditingCategoryIndex(index);
    setNewCategoryName(category.name);
    setNewCategoryIcon(category.group_icon || '');
    setNewCategoryType(category.selection_type || 'single');
    
    // Map the current choices to the format expected by the form
    const choicesForEdit = category.choices.map(choice => ({
      name: choice.choice_name || '',
      priceAdjustment: (choice.price_adjustment !== undefined ? choice.price_adjustment.toString() : '0'),
      isDefault: choice.is_default || false,
      isSoldOut: choice.is_sold_out || false,
      icon: choice.choice_icon || ''
    }));
    
    setNewChoices(choicesForEdit);
    setShowNewCategory(true);
  };

  const handleSaveOptions = () => {
    onSave(productId, options);
  };

  const iconsExample = [
    { name: 'fa-solid fa-mug-hot', label: '컵/음료' },
    { name: 'fa-solid fa-ice-cream', label: '아이스크림' },
    { name: 'fa-solid fa-temperature-high', label: '온도/핫' },
    { name: 'fa-solid fa-temperature-low', label: '온도/콜드' },
    { name: 'fa-solid fa-snowflake', label: '얼음' },
    { name: 'fa-solid fa-lemon', label: '레몬/시트러스' },
    { name: 'fa-solid fa-cookie', label: '쿠키' },
    { name: 'fa-solid fa-coffee-bean', label: '커피빈' },
    { name: 'fa-solid fa-cow', label: '우유/밀크' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">상세 주문 옵션</h3>
      
      {options.length > 0 && (
        <div className="mb-6 space-y-4">
          {options.map((category, index) => (
            <div key={category.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  {category.group_icon && (
                    <span className="mr-2">
                      <i className={category.group_icon}></i>
                    </span>
                  )}
                  <h4 className="font-medium text-gray-800">{category.name}</h4>
                  <span className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full">
                    {category.selection_type === 'multiple' ? '다중 선택' : '단일 선택'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEditCategory(index)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    수정
                  </button>
                  <button 
                    onClick={() => handleRemoveCategory(category.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {category.choices.map(choice => {
                  // Map the fields from ProductOptionChoice 
                  const choiceName = choice.choice_name || ''; // Use choice_name instead of name
                  const choiceId = choice.option_choice_id; // Use option_choice_id instead of id
                  const choiceIcon = choice.choice_icon || '';
                  const priceAdjustment = choice.price_adjustment !== undefined 
                    ? choice.price_adjustment 
                    : 0;
                  const isDefault = choice.is_default || false;
                  const isSoldOut = choice.is_sold_out || false;
                  
                  return (
                    <div 
                      key={choiceId} 
                      className={`p-2 rounded relative ${
                        isSoldOut ? 'bg-red-50 border border-red-100' : 
                        isDefault ? 'bg-green-50 border border-green-100' : 
                        'bg-gray-50 border border-gray-100'
                      }`}
                    >
                      <div className="flex items-center">
                        {choiceIcon && (
                          <span className="mr-2">
                            <i className={choiceIcon}></i>
                          </span>
                        )}
                        <span className="font-medium">{choiceName}</span>
                      </div>
                      {priceAdjustment !== 0 && (
                        <div className={`text-xs ${priceAdjustment > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {priceAdjustment > 0 ? '+' : ''}{priceAdjustment.toLocaleString()}원
                        </div>
                      )}
                      <div className="flex mt-1 space-x-1">
                        {isDefault && (
                          <span className="text-xs bg-green-100 text-green-800 px-1 rounded">기본값</span>
                        )}
                        {isSoldOut && (
                          <span className="text-xs bg-red-100 text-red-800 px-1 rounded">품절</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {!showNewCategory ? (
        <button
          onClick={() => {
            setEditingCategoryIndex(null);
            setShowNewCategory(true);
            setNewCategoryName('');
            setNewCategoryIcon('');
            setNewCategoryType('single');
            setNewChoices([
              { name: '', priceAdjustment: '0', isDefault: false, isSoldOut: false, icon: '' },
              { name: '', priceAdjustment: '0', isDefault: false, isSoldOut: false, icon: '' },
              { name: '', priceAdjustment: '0', isDefault: false, isSoldOut: false, icon: '' }
            ]);
          }}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-500 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          새 옵션 카테고리 추가
        </button>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category-name" className="block text-sm font-medium text-gray-700 mb-1">
                카테고리 이름 <span className="text-red-500">*</span>
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
            
            <div>
              <label htmlFor="category-icon" className="block text-sm font-medium text-gray-700 mb-1">
                카테고리 아이콘 (Font Awesome)
              </label>
              <input
                type="text"
                id="category-icon"
                placeholder="예: fa-solid fa-ice-cream"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
              />
              <div className="mt-1 text-xs text-gray-500">
                <a href="https://fontawesome.com/icons" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  아이콘 찾기
                </a>
                <span className="mx-1">|</span>
                예시: {iconsExample.map((icon, i) => (
                  <span key={i} className="mr-2 text-gray-700">
                    {icon.name.split(' ').pop()} ({icon.label})
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              선택 타입
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-blue-600"
                  checked={newCategoryType === 'single'}
                  onChange={() => setNewCategoryType('single')}
                />
                <span className="ml-2 text-gray-700">단일 선택 (라디오 버튼)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-blue-600"
                  checked={newCategoryType === 'multiple'}
                  onChange={() => setNewCategoryType('multiple')}
                />
                <span className="ml-2 text-gray-700">다중 선택 (체크박스)</span>
              </label>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              옵션 선택지 <span className="text-red-500">*</span>
            </label>
            
            <div className="space-y-4">
              {newChoices.map((choice, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        옵션명 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder={index === 0 ? "예: 적게" : index === 1 ? "예: 보통" : "예: 많이"}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={choice.name}
                        onChange={(e) => handleChoiceChange(index, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        가격 조정 (원)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={choice.priceAdjustment}
                        onChange={(e) => handleChoiceChange(index, 'priceAdjustment', e.target.value)}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        양수값은 추가 비용, 음수값은 할인 (예: -500)
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        아이콘 (Font Awesome)
                      </label>
                      <input
                        type="text"
                        placeholder="예: fa-solid fa-check"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={choice.icon}
                        onChange={(e) => handleChoiceChange(index, 'icon', e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-end space-x-4 h-full py-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-blue-600"
                          checked={choice.isDefault}
                          onChange={(e) => handleChoiceChange(index, 'isDefault', e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-700">기본 선택</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-blue-600"
                          checked={choice.isSoldOut}
                          onChange={(e) => handleChoiceChange(index, 'isSoldOut', e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-700">품절</span>
                      </label>
                    </div>
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
              {editingCategoryIndex !== null ? '수정 완료' : '추가'}
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