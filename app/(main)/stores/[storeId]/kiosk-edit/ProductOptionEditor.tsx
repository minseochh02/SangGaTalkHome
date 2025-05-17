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
  const [newChoices, setNewChoices] = useState<string[]>(['', '', '']);

  // Generate a unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

    setOptions([...options, newCategory]);
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
    setOptions(options.filter(option => option.id !== categoryId));
  };

  const handleSaveOptions = () => {
    onSave(productId, options);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">상세 주문 옵션</h3>
      
      {options.length > 0 && (
        <div className="mb-6 space-y-4">
          {options.map(category => (
            <div key={category.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-800">{category.name}</h4>
                <button 
                  onClick={() => handleRemoveCategory(category.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {category.choices.map(choice => (
                  <div key={choice.id} className="bg-gray-50 p-2 rounded text-center">
                    {choice.name}
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