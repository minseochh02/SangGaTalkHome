import React, { useState, useEffect } from 'react';
// import { createClient } from '@/utils/supabase/client'; // Assuming this is your Supabase client setup
// import { ProductOptionCategory, ProductOptionChoice, Product } from '@/utils/type'; // Assuming these types are defined in your project

// Mock Supabase client for demonstration if not available
const supabaseMock = {
  from: () => ({
    select: async () => ({ data: [], error: null }),
    insert: async (data: unknown) => ({ data, error: null }),
    update: async (data: unknown) => ({ data, error: null }),
    delete: async () => ({ data: [], error: null }),
  }),
};
const createClient = () => supabaseMock;


// Define types here
interface ProductOptionChoice {
  id: string;
  name: string;
  price_impact?: number;
}

interface ProductOptionCategory {
  id:string;
  name: string;
  icon?: string; // Will store Font Awesome class, e.g., "fa-solid fa-mug-hot" or emoji
  choices: ProductOptionChoice[];
  store_id?: string;
}

interface Product {
  product_id: string;
  product_name: string;
}

// Curated list of Font Awesome icons (ensure these classes are available in your project)
// For a real app, you'd want a more comprehensive list or a search/filter mechanism.
// Using a mix of solid and regular for variety. Ensure you have Font Awesome Free or Pro set up.
const faIcons = [
  "fa-solid fa-ice-cream", "fa-solid fa-mug-hot", "fa-solid fa-martini-glass-citrus", "fa-solid fa-beer-mug-empty",
  "fa-solid fa-burger", "fa-solid fa-pizza-slice", "fa-solid fa-hotdog", "fa-solid fa-drumstick-bite",
  "fa-solid fa-apple-whole", "fa-solid fa-carrot", "fa-solid fa-leaf", "fa-solid fa-seedling",
  "fa-solid fa-store", "fa-solid fa-tags", "fa-solid fa-percent", "fa-solid fa-star",
  "fa-regular fa-heart", "fa-regular fa-thumbs-up", "fa-regular fa-face-smile", "fa-solid fa-fire",
  "fa-solid fa-pepper-hot", "fa-solid fa-lemon", "fa-solid fa-bread-slice", "fa-solid fa-cheese",
  "fa-solid fa-blender", "fa-solid fa-utensils", "fa-solid fa-receipt", "fa-solid fa-gift",
  "fa-solid fa-truck-fast", "fa-solid fa-clock", "fa-solid fa-calendar-days", "fa-solid fa-credit-card",
  "fa-solid fa-bell-concierge", "fa-solid fa-temperature-high", "fa-solid fa-temperature-low", "fa-solid fa-snowflake",
  "fa-solid fa-sun", "fa-solid fa-moon", "fa-solid fa-cloud", "fa-solid fa-droplet"
];


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
  const [newCategoryIcon, setNewCategoryIcon] = useState(''); // Stores selected FA class or emoji
  const [newChoices, setNewChoices] = useState<string[]>(['', '']);
  
  const [selectedOption, setSelectedOption] = useState<ProductOptionCategory | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [showIconPicker, setShowIconPicker] = useState(false); // State for icon picker modal

  const showNotification = (message: string, type: 'success' | 'error', duration: number = 3000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  };
  
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  useEffect(() => {
    const fetchGlobalOptions = async () => {
      setLoading(true);
      const mockOptions: ProductOptionCategory[] = [
        { id: 'opt-1', name: '얼음 양', icon: '🧊', choices: [{ id: 'choice-1', name: '적게' }, { id: 'choice-2', name: '보통' }, { id: 'choice-3', name: '많이' }] },
        { id: 'opt-2', name: '시럽', icon: '🍯', choices: [{ id: 'choice-4', name: '추가 안함' }, { id: 'choice-5', name: '1펌프' }, { id: 'choice-6', name: '2펌프' }] },
        { id: 'opt-3', name: '컵 선택', icon: 'fa-solid fa-mug-hot', choices: [{ id: 'choice-7', name: '매장컵' }, { id: 'choice-8', name: '개인컵' }, { id: 'choice-9', name: '일회용컵' }] }
      ];
      setGlobalOptions(mockOptions);
      setLoading(false);
    };
    if (storeId) fetchGlobalOptions();
    else {
      setLoading(false);
      showNotification('Store ID가 제공되지 않았습니다. 옵션을 불러올 수 없습니다.', 'error');
    }
  }, [storeId]);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      showNotification('카테고리 이름을 입력해주세요.', 'error');
      return;
    }
    const validChoices = newChoices.map(c => c.trim()).filter(c => c !== '').map(name => ({ id: generateId(), name }));
    if (validChoices.length === 0) {
      showNotification('최소 하나의 옵션을 입력해주세요.', 'error');
      return;
    }
    const newCategory: ProductOptionCategory = {
      id: generateId(),
      name: newCategoryName.trim(),
      icon: newCategoryIcon.trim() || undefined,
      choices: validChoices
    };
    setGlobalOptions(prev => [...prev, newCategory]);
    setShowNewCategory(false);
    setNewCategoryName('');
    setNewCategoryIcon('');
    setNewChoices(['', '']);
    showNotification('새 카테고리가 추가되었습니다.', 'success');
  };

  const handleChoiceChange = (index: number, value: string) => {
    const updated = [...newChoices];
    updated[index] = value;
    setNewChoices(updated);
  };

  const handleAddChoiceInput = () => setNewChoices([...newChoices, '']);
  const handleRemoveCategory = (id: string) => {
    setGlobalOptions(opts => opts.filter(opt => opt.id !== id));
    showNotification('카테고리가 삭제되었습니다.', 'success');
  };

  const handleSaveOptions = async () => {
    setSaving(true);
    try {
      console.log('Saving global options:', globalOptions); // Replace with actual Supabase call
      showNotification('글로벌 옵션이 성공적으로 저장되었습니다.', 'success');
    } catch (e) {
      showNotification('옵션 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const openLinkModal = (option: ProductOptionCategory) => {
    setSelectedOption(option);
    setSelectedProducts([]);
    setShowLinkModal(true);
  };
  
  const handleToggleProduct = (id: string) => setSelectedProducts(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
  
  const handleSaveLinking = async () => {
    if (!selectedOption) return;
    try {
      console.log('Linking option', selectedOption.id, 'to products:', selectedProducts); // Replace with actual Supabase call
      showNotification('상품 연결이 성공적으로 저장되었습니다.', 'success');
      setShowLinkModal(false);
      setSelectedOption(null);
    } catch (e) {
      showNotification('상품 연결 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleIconSelect = (iconClass: string) => {
    setNewCategoryIcon(iconClass);
    setShowIconPicker(false);
  };

  // Helper to render icon (checks if it's a FA class or emoji)
  const renderIcon = (iconString?: string) => {
    if (!iconString) return null;
    if (iconString.startsWith('fa-')) { // Font Awesome icon
      return <i className={`${iconString} text-xl`}></i>;
    }
    // Assume emoji if not a Font Awesome class
    return <span className="text-2xl">{iconString}</span>; 
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-2 text-gray-600">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        {notification && (
          <div className={`fixed top-5 right-5 z-[100] p-4 mb-4 rounded-md text-white shadow-lg ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} role="alert">
            {notification.message}
            <button onClick={() => setNotification(null)} className="ml-4 float-right font-bold text-lg leading-none">&times;</button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-800">글로벌 옵션 관리</h2>
            <button onClick={handleSaveOptions} disabled={saving || globalOptions.length === 0} className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-150 ease-in-out disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center shadow-md hover:shadow-lg">
              {saving ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>저장 중...</>) : (<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M7.521 3.083A1 1 0 006.033 2.5H3.5a1 1 0 00-1 1v13a1 1 0 001 1h13a1 1 0 001-1V6.033a1 1 0 00-.583-1.488l-6.958-3.479zM13 10a1 1 0 11-2 0 1 1 0 012 0zm-5 0a1 1 0 11-2 0 1 1 0 012 0zM9 5a1 1 0 11-2 0 1 1 0 012 0z" /></svg>모든 옵션 저장</>)}
            </button>
          </div>
          <p className="text-gray-600 mb-8 text-sm sm:text-base leading-relaxed">
            여기서 생성한 옵션은 여러 상품에 공통으로 적용할 수 있습니다. 옵션을 생성한 후 원하는 상품에 연결하세요.<br/>
            아이콘은 목록에서 선택하거나 이모지 (예: 🧊)를 직접 입력할 수 있습니다.
          </p>
          {globalOptions.length > 0 ? (
            <div className="space-y-5">
              {globalOptions.map(category => (
                <div key={category.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-200 ease-in-out">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                    <div className="flex items-center mb-2 sm:mb-0">
                        {renderIcon(category.icon)}
                        <h4 className={`font-semibold text-lg text-gray-800 ${category.icon ? 'ml-3' : ''}`}>{category.name}</h4>
                    </div>
                    <div className="flex space-x-2 flex-shrink-0">
                      <button onClick={() => openLinkModal(category)} className="px-3 py-1.5 text-xs sm:text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm hover:shadow-md">상품 연결</button>
                      <button onClick={() => handleRemoveCategory(category.id)} className="px-3 py-1.5 text-xs sm:text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors shadow-sm hover:shadow-md">삭제</button>
                    </div>
                  </div>
                  {category.choices.length > 0 ? (<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mb-2">{category.choices.map(choice => (<div key={choice.id} className="bg-slate-100 p-2.5 rounded-lg text-center text-sm text-slate-700 shadow-inner">{choice.name}</div>))}</div>) : (<p className="text-sm text-gray-500 italic">선택지가 없습니다.</p>)}
                  <div className="text-xs text-gray-500 mt-3"><span className="font-medium">연결된 상품:</span> <span className="italic ml-1">아직 연결된 상품 정보가 없습니다. '상품 연결'을 통해 설정하세요.</span></div>
                </div>
              ))}
            </div>
          ) : (!showNewCategory && ( <div className="text-center py-10 px-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50"> <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"> <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /> </svg> <h3 className="mt-2 text-sm font-medium text-gray-900">글로벌 옵션 없음</h3> <p className="mt-1 text-sm text-gray-500">새로운 글로벌 옵션 카테고리를 추가하여 시작하세요.</p> </div> ))}
        </div>

        {!showNewCategory ? (
          <button onClick={() => setShowNewCategory(true)} className="mt-6 w-full p-4 border-2 border-dashed border-blue-500 rounded-xl flex items-center justify-center text-blue-600 hover:text-blue-700 hover:border-blue-600 hover:bg-blue-50 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm hover:shadow-md">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            새 글로벌 옵션 카테고리 추가
          </button>
        ) : (
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-200 mt-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-700">새 옵션 카테고리 생성</h3>
                <button onClick={() => { setShowNewCategory(false); setNewCategoryName(''); setNewCategoryIcon(''); setNewChoices(['', '']); }} className="text-gray-400 hover:text-gray-600" title="닫기">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="category-name" className="block text-sm font-medium text-gray-600 mb-1.5">옵션 카테고리 이름 <span className="text-red-500">*</span></label>
                <input type="text" id="category-name" placeholder="예: 얼음 양, 컵 선택" className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow placeholder-gray-400 sm:text-sm" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="category-icon" className="block text-sm font-medium text-gray-600 mb-1.5">아이콘 (선택)</label>
                <div className="flex items-center space-x-2">
                    <button type="button" onClick={() => setShowIconPicker(true)} className="flex-grow px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors">
                        {newCategoryIcon ? renderIcon(newCategoryIcon) : <span className="text-gray-400">아이콘 선택...</span>}
                    </button>
                    {newCategoryIcon && (
                        <button type="button" onClick={() => setNewCategoryIcon('')} className="p-2 text-gray-400 hover:text-red-600" title="아이콘 제거">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                        </button>
                    )}
                </div>
                 <input type="text" id="category-icon-fallback" placeholder="또는 이모지/클래스 직접 입력" className="mt-2 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-shadow placeholder-gray-400 sm:text-xs" value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} title="선택한 아이콘이 여기에 표시됩니다. 직접 수정도 가능합니다."/>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-600 mb-1.5">옵션 선택지 <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-500 mb-3">최소 하나의 선택지를 입력해주세요. (예: 적게, 보통, 많이)</p>
              <div className="space-y-3">
                {newChoices.map((choice, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                    <span className="text-gray-400 text-sm">{index + 1}.</span>
                    <input type="text" placeholder={`선택지 내용`} className="flex-grow px-3 py-2 border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md placeholder-gray-400" value={choice} onChange={(e) => handleChoiceChange(index, e.target.value)} />
                    {newChoices.length > 1 ? (<button type="button" onClick={() => setNewChoices(newChoices.filter((_, i) => i !== index))} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors" title="선택지 삭제"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg></button>) : (<div className="w-8 h-8"></div>)}
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleAddChoiceInput} className="mt-4 flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 px-3 rounded-lg hover:bg-blue-100 transition-colors group"><svg className="w-5 h-5 mr-1.5 text-blue-500 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>선택지 추가</button>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-8 pt-6 border-t border-gray-200">
              <button type="button" onClick={() => { setShowNewCategory(false); setNewCategoryName(''); setNewCategoryIcon(''); setNewChoices(['', '']); }} className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors w-full sm:w-auto">취소</button>
              <button type="button" onClick={handleAddCategory} className="px-6 py-2.5 bg-blue-600 border border-transparent rounded-lg shadow-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-full sm:w-auto">카테고리 추가 완료</button>
            </div>
          </div>
        )}
        
        {/* Icon Picker Modal */}
        {showIconPicker && (
            <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black bg-opacity-50 p-4">
                <div className="bg-white rounded-xl shadow-xl p-5 sm:p-6 w-full max-w-xl max-h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">아이콘 선택</h4>
                        <button onClick={() => setShowIconPicker(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                        원하는 아이콘을 클릭하세요. 이 목록은 일부 아이콘만 보여줍니다. Font Awesome 클래스 이름을 직접 입력할 수도 있습니다.
                        <br/>
                        <strong className="text-red-500">주의:</strong> 프로젝트에 Font Awesome이 설정되어 있고 해당 아이콘이 사용 가능해야 합니다.
                    </p>
                    <div className="overflow-y-auto flex-grow grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 custom-scrollbar pr-2">
                        {faIcons.map(iconClass => (
                            <button
                                key={iconClass}
                                type="button"
                                onClick={() => handleIconSelect(iconClass)}
                                className="p-3 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-blue-100 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all aspect-square"
                                title={iconClass}
                            >
                                <i className={`${iconClass} text-2xl text-gray-700`}></i>
                            </button>
                        ))}
                    </div>
                     <div className="mt-4 text-center">
                        <button type="button" onClick={() => setShowIconPicker(false)} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">닫기</button>
                    </div>
                </div>
            </div>
        )}

        {showLinkModal && selectedOption && ( <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300 ease-in-out p-4"> <div className="bg-white rounded-xl p-6 shadow-xl transform transition-all sm:max-w-lg w-full max-h-[90vh] flex flex-col"> <div className="flex justify-between items-center mb-5"> <h3 className="text-lg font-semibold text-gray-900 flex items-center"> {renderIcon(selectedOption.icon)} <span className={`${selectedOption.icon ? 'ml-2' : ''}`}>"{selectedOption.name}" 옵션을 상품에 연결</span> </h3> <button onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100" aria-label="Close modal"> <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg> </button> </div> <div className="overflow-y-auto flex-grow pr-1 custom-scrollbar"> {products && products.length > 0 ? ( <div className="space-y-2.5"> {products.map(product => ( <label key={product.product_id} htmlFor={`product-${product.product_id}`} className="flex items-center p-3 hover:bg-gray-100 rounded-lg cursor-pointer border border-gray-200 transition-colors"> <input type="checkbox" id={`product-${product.product_id}`} checked={selectedProducts.includes(product.product_id)} onChange={() => handleToggleProduct(product.product_id)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-1" /> <span className="ml-3 text-sm font-medium text-gray-700">{product.product_name}</span> </label> ))} </div> ) : ( <p className="text-gray-500 italic text-center py-6">연결할 수 있는 상품이 없습니다. 먼저 상품을 추가해주세요.</p> )} </div> <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6 pt-5 border-t border-gray-200"> <button onClick={() => setShowLinkModal(false)} className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition-colors w-full sm:w-auto">취소</button> <button onClick={handleSaveLinking} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors shadow-md hover:shadow-lg w-full sm:w-auto" disabled={!selectedOption}>연결 저장</button> </div> </div> </div> )}
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #c7c7c7; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a3a3a3; }
      `}</style>
    </div>
  );
};

export default GlobalOptionEditor;
