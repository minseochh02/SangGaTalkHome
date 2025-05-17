import React, { useState, Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Product } from '@/utils/type';

// Interface for option items
interface OptionItem {
  id: string;
  name: string;
  priceAdjustment: number;
}

// Interface for option groups
interface OptionGroup {
  id: string;
  name: string;
  isRequired: boolean;
  allowMultiple: boolean;
  options: OptionItem[];
}

interface ProductOptionEditorProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSave: (productId: string | number, optionGroups: OptionGroup[]) => void;
}

const ProductOptionEditor: React.FC<ProductOptionEditorProps> = ({
  isOpen,
  product,
  onClose,
  onSave
}) => {
  // Example default option groups - in a real implementation, this would be loaded from the product
  const defaultOptionGroups: OptionGroup[] = [
    {
      id: '1',
      name: '얼음 양',
      isRequired: true,
      allowMultiple: false,
      options: [
        { id: '1-1', name: '얼음 적게', priceAdjustment: 0 },
        { id: '1-2', name: '얼음 보통', priceAdjustment: 0 },
        { id: '1-3', name: '얼음 많이', priceAdjustment: 0 },
      ]
    }
  ];

  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>(defaultOptionGroups);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState<number>(0);

  useEffect(() => {
    // In a real implementation, we would load the product's options from the database here
    // For now, we'll just use the default options
    setOptionGroups(defaultOptionGroups);
  }, [product]);

  const handleSave = () => {
    if (!product) return;
    onSave(product.product_id, optionGroups);
  };

  const addOptionGroup = () => {
    if (!newGroupName.trim()) return;
    
    const newGroup: OptionGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName,
      isRequired: false,
      allowMultiple: false,
      options: []
    };
    
    setOptionGroups([...optionGroups, newGroup]);
    setNewGroupName('');
  };

  const deleteOptionGroup = (groupId: string) => {
    setOptionGroups(optionGroups.filter(group => group.id !== groupId));
  };

  const toggleGroupRequired = (groupId: string) => {
    setOptionGroups(
      optionGroups.map(group => 
        group.id === groupId ? { ...group, isRequired: !group.isRequired } : group
      )
    );
  };

  const toggleGroupMultiple = (groupId: string) => {
    setOptionGroups(
      optionGroups.map(group => 
        group.id === groupId ? { ...group, allowMultiple: !group.allowMultiple } : group
      )
    );
  };

  const addOption = (groupId: string) => {
    if (!newOptionName.trim()) return;
    
    const newOption: OptionItem = {
      id: `option-${Date.now()}`,
      name: newOptionName,
      priceAdjustment: newOptionPrice
    };
    
    setOptionGroups(
      optionGroups.map(group => 
        group.id === groupId 
          ? { ...group, options: [...group.options, newOption] } 
          : group
      )
    );
    
    setNewOptionName('');
    setNewOptionPrice(0);
  };

  const deleteOption = (groupId: string, optionId: string) => {
    setOptionGroups(
      optionGroups.map(group => 
        group.id === groupId 
          ? { ...group, options: group.options.filter(option => option.id !== optionId) } 
          : group
      )
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  {product?.product_name || '상품'} 옵션 설정
                </Dialog.Title>
                
                <div className="mt-4 max-h-[70vh] overflow-y-auto">
                  {/* Add new option group */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-md font-medium mb-2">새 옵션 그룹 추가</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="옵션 그룹 이름 (예: 얼음 양)"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                      />
                      <button
                        type="button"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        onClick={addOptionGroup}
                      >
                        추가
                      </button>
                    </div>
                  </div>
                  
                  {/* Option groups */}
                  {optionGroups.map((group) => (
                    <div key={group.id} className="mb-8 border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-md font-medium">{group.name}</h4>
                        <button
                          onClick={() => deleteOptionGroup(group.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          삭제
                        </button>
                      </div>
                      
                      <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={group.isRequired}
                            onChange={() => toggleGroupRequired(group.id)}
                            className="rounded"
                          />
                          <span>필수 선택</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={group.allowMultiple}
                            onChange={() => toggleGroupMultiple(group.id)}
                            className="rounded"
                          />
                          <span>다중 선택 가능</span>
                        </label>
                      </div>
                      
                      {/* Options list */}
                      <div className="mb-4 space-y-2">
                        {group.options.map((option) => (
                          <div key={option.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <span>{option.name}</span>
                              {option.priceAdjustment !== 0 && (
                                <span className="ml-2 text-sm text-gray-600">
                                  {option.priceAdjustment > 0 ? '+' : ''}{option.priceAdjustment}원
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => deleteOption(group.id, option.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {/* Add new option */}
                      {editingGroupId === group.id ? (
                        <div className="mt-4 p-3 bg-gray-100 rounded-md">
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="옵션 이름 (예: 얼음 적게)"
                              value={newOptionName}
                              onChange={(e) => setNewOptionName(e.target.value)}
                            />
                            <input
                              type="number"
                              className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="가격"
                              value={newOptionPrice}
                              onChange={(e) => setNewOptionPrice(Number(e.target.value))}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                              onClick={() => setEditingGroupId(null)}
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                              onClick={() => {
                                addOption(group.id);
                                setEditingGroupId(null);
                              }}
                            >
                              추가
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                          onClick={() => setEditingGroupId(group.id)}
                        >
                          옵션 추가
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {optionGroups.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      아직 등록된 옵션 그룹이 없습니다. 새 옵션 그룹을 추가해보세요.
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={onClose}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    onClick={handleSave}
                  >
                    저장
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ProductOptionEditor; 