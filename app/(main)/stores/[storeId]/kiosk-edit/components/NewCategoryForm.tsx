import React, { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { NewChoice, ProductOptionCategory } from '../GlobalOptionEditor'; // Types
import { renderIconDisplay } from './iconUtils'; // Icon rendering utility

export interface NewCategoryFormRef {
  setIcon: (target: 'category' | number, iconValue: string) => void;
}

interface NewCategoryFormProps {
  storeId: string;
  onAddCategory: (category: ProductOptionCategory) => void;
  onCancel: () => void;
  openIconPicker: (target: 'category' | number) => void;
  showNotification: (message: string, type: 'success' | 'error') => void;
}

const NewCategoryForm = forwardRef<NewCategoryFormRef, NewCategoryFormProps>((
  {
    storeId,
    onAddCategory,
    onCancel,
    openIconPicker,
    showNotification
  },
  ref
) => {
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('');
  const [choices, setChoices] = useState<NewChoice[]>([
    { name: '', icon: '', won_price: 0, sgt_price: '0' },
    { name: '', icon: '', won_price: 0, sgt_price: '0' },
  ]);

  const renderIconForInput = useCallback((iconString?: string) => {
    return renderIconDisplay(iconString, "text-lg");
  }, []);

  const handleChoiceChange = (index: number, field: keyof NewChoice, value: any) => {
    const updatedChoices = [...choices];
    let finalValueToSet = value;

    if (field === 'isDefault') {
        if (value === true) {
            updatedChoices.forEach((_, i) => {
                if (i !== index) updatedChoices[i].isDefault = false;
            });
        }
    } else if (field === 'won_price') {
        if (value === '' || value === null || value === undefined) {
            finalValueToSet = 0;
        } else {
            const stringValue = String(value).replace(/,/g, '');
            const numValue = parseInt(stringValue, 10);
            finalValueToSet = isNaN(numValue) ? 0 : numValue;
        }
    } else if (field === 'sgt_price') {
        finalValueToSet = String(value).replace(/,/g, '');
    }
    
    updatedChoices[index] = { ...updatedChoices[index], [field]: finalValueToSet };
    setChoices(updatedChoices);
  };

  useImperativeHandle(ref, () => ({
    setIcon: (target: 'category' | number, iconValue: string) => {
      if (target === 'category') {
        setCategoryIcon(iconValue);
      } else if (typeof target === 'number') {
        // Ensure the index is within bounds of current choices in NewCategoryForm
        if (target >= 0 && target < choices.length) {
            handleChoiceChange(target, 'icon', iconValue);
        } else {
            console.warn('Icon target index out of bounds for NewCategoryForm choices');
        }
      }
    }
  }));

  const handleAddChoice = () => {
    setChoices([...choices, { name: '', icon: '', won_price: 0, sgt_price: '0' }]);
  };

  const handleRemoveChoice = (index: number) => {
    if (choices.length <= 1) {
        showNotification('최소 하나의 선택지는 유지해야 합니다.', 'error');
        return;
    }
    const removedChoiceWasDefault = choices[index].isDefault;
    const updatedChoices = choices.filter((_, i) => i !== index);
    if (removedChoiceWasDefault && updatedChoices.length > 0 && !updatedChoices.some(c => c.isDefault)) {
        updatedChoices[0].isDefault = true;
    }
    setChoices(updatedChoices);
  };

  const handleSubmit = () => {
    if (!categoryName.trim()) {
      showNotification('상세주문 옵션 이름을 입력해주세요.', 'error');
      return;
    }

    const validChoices = choices
      .map(c => ({
        name: c.name.trim(),
        icon: c.icon?.trim() || undefined,
        isDefault: c.isDefault,
        won_price: c.won_price !== undefined ? c.won_price : 0,
        sgt_price: parseFloat(c.sgt_price) || 0,
      }))
      .filter(c => c.name !== '')
      .map(c => ({ ...c, id: undefined })); // Ensure no client-side IDs are passed for choices

    if (validChoices.length === 0) {
      showNotification('최소 하나의 옵션을 입력해주세요.', 'error');
      return;
    }

    let defaultCount = validChoices.filter(c => c.isDefault).length;
    if (defaultCount === 0 && validChoices.length > 0) {
      validChoices[0].isDefault = true;
    } else if (defaultCount > 1) {
      let firstDefaultFound = false;
      validChoices.forEach(c => {
        if (c.isDefault) {
          if (firstDefaultFound) c.isDefault = false;
          else firstDefaultFound = true;
        }
      });
    }

    const newCategory: ProductOptionCategory = {
      name: categoryName.trim(),
      icon: categoryIcon.trim() || undefined,
      choices: validChoices,
      store_id: storeId,
      // id will be undefined, to be assigned by backend/parent
    };
    onAddCategory(newCategory);
    // Reset form state locally after successful submission is handled by parent
    setCategoryName('');
    setCategoryIcon('');
    setChoices([{ name: '', icon: '', won_price: 0, sgt_price: '0' }, { name: '', icon: '', won_price: 0, sgt_price: '0' }]);
  };
  
  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-200 mt-8 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-700">상세주문 옵션 생성</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          title="닫기"
        >
          <FontAwesomeIcon icon={['fas', 'times']} className="w-6 h-6" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
        <div>
          <label htmlFor="category-name" className="block text-sm font-medium text-gray-600 mb-1.5">상세주문 옵션 이름 <span className="text-red-500">*</span></label>
          <input type="text" id="category-name" placeholder="예: 얼음 양, 컵 선택" className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow placeholder-gray-400 sm:text-sm" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">상세주문 옵션 아이콘 (선택)</label>
          <div className="flex items-center space-x-2">
              <button type="button" onClick={() => openIconPicker('category')} className="flex-grow px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors min-h-[3rem] flex items-center">
                  {categoryIcon ? renderIconForInput(categoryIcon) : <span className="text-gray-400">아이콘 선택...</span>}
              </button>
              {categoryIcon && (
                  <button type="button" onClick={() => setCategoryIcon('')} className="p-2 text-gray-400 hover:text-red-600" title="아이콘 제거">
                      <FontAwesomeIcon icon={['fas', 'trash-alt']} className="w-5 h-5" />
                  </button>
              )}
          </div>
          <input type="text" placeholder='예: "fas coffee" 또는 🧊' className="mt-2 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-shadow placeholder-gray-400 sm:text-xs" value={categoryIcon} onChange={(e) => setCategoryIcon(e.target.value)} title="선택한 아이콘이 여기에 표시됩니다. 직접 수정도 가능합니다."/>
        </div>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-600 mb-1.5">상세주문 옵션 선택지 <span className="text-red-500">*</span></label>
        <p className="text-xs text-gray-500 mb-3">각 선택지에 이름과 아이콘(선택)을 설정할 수 있습니다. 하나의 선택지를 기본값으로 지정하세요.</p>
        <div className="space-y-3">
          {choices.map((choice, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3">
                  <span className="text-gray-500 text-sm font-medium w-6 text-center">{index + 1}.</span>
                  <input type="text" placeholder={`선택지 이름`} className="flex-grow px-3 py-2.5 border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md placeholder-gray-400" value={choice.name} onChange={(e) => handleChoiceChange(index, 'name', e.target.value)} />
                  <button type="button" onClick={() => openIconPicker(index)} className="p-2.5 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400" title="선택지 아이콘 선택">
                      {choice.icon ? renderIconForInput(choice.icon) : <FontAwesomeIcon icon={['far', 'image']} className="text-gray-400 w-5 h-5" />} 
                  </button>
                  
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="0" 
                      className="px-3 py-2.5 border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md placeholder-gray-400 w-20"
                      value={choice.won_price !== undefined ? choice.won_price.toString() : '0'} 
                      onChange={(e) => handleChoiceChange(index, 'won_price', e.target.value)}
                      title="원화 추가 요금 (0원은 무료)"
                    />
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">원</span>
                  </div>
                  
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="0" 
                      className="px-3 py-2.5 border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md placeholder-gray-400 w-24"
                      value={choice.sgt_price} 
                      onChange={(e) => handleChoiceChange(index, 'sgt_price', e.target.value)}
                      title="SGT 추가 요금 (0은 무료, 소수점 입력 가능)"
                    />
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">SGT</span>
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={() => handleChoiceChange(index, 'isDefault', !choice.isDefault)} 
                    className={`p-2 rounded-md border ${choice.isDefault ? 'bg-blue-100 border-blue-400 text-blue-600' : 'border-gray-300 text-gray-400 hover:bg-gray-100'}`}
                    title={choice.isDefault ? "기본 선택 해제" : "기본 선택으로 설정"}
                  >
                    <FontAwesomeIcon icon={['fas', 'check-circle']} className="w-5 h-5" />
                  </button>
                  {choices.length > 1 && (
                      <button type="button" onClick={() => handleRemoveChoice(index)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors" title="선택지 삭제">
                          <FontAwesomeIcon icon={['fas', 'times-circle']} className="w-5 h-5" />
                      </button>
                  )}
              </div>
              <div className="mt-1.5 pl-10 flex items-center">
                {choice.isDefault && (
                  <span className="inline-flex items-center mr-3 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">
                    <FontAwesomeIcon icon={['fas', 'check']} className="w-3 h-3 mr-1" /> 기본 선택
                  </span>
                )}
                {choice.icon && (
                    <input type="text" placeholder='예: "fas star" 또는 ⭐' className="block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-shadow placeholder-gray-400 text-xs" value={choice.icon} onChange={(e) => handleChoiceChange(index, 'icon', e.target.value)} title="선택한 아이콘 (직접 수정 가능)"/>
                )}
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={handleAddChoice} className="mt-4 flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 px-3 rounded-lg hover:bg-blue-100 transition-colors group">
          <FontAwesomeIcon icon={['fas', 'plus-circle']} className="w-5 h-5 mr-1.5 text-blue-500 group-hover:text-blue-600 transition-colors" />
          선택지 추가
        </button>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-8 pt-6 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors w-full sm:w-auto">취소</button>
        <button type="button" onClick={handleSubmit} className="px-6 py-2.5 bg-blue-600 border border-transparent rounded-lg shadow-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-full sm:w-auto">상세주문 옵션 추가 완료</button>
      </div>
    </div>
  );
});

export default NewCategoryForm; 