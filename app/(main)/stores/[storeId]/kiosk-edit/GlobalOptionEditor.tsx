import React, { useState, useEffect, useCallback } from 'react';
// Import FontAwesome components and icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library, IconPrefix, IconName } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { JSX } from 'react/jsx-runtime';
// import { createClient } from '@/utils/supabase/client'; // Assuming this is your Supabase client setup
// import { ProductOptionCategory, ProductOptionChoice, Product } from '@/utils/type'; // Assuming these types are defined in your project

// Add all FontAwesome solid and regular icons to the library
library.add(fas, far);

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
  icon?: string; // Icon for the choice (FA class "prefix icon-name" or emoji)
  price_impact?: number;
}

interface ProductOptionCategory {
  id:string;
  name: string;
  icon?: string; // Icon for the category (FA class "prefix icon-name" or emoji)
  choices: ProductOptionChoice[];
  store_id?: string;
}

interface Product {
  product_id: string;
  product_name: string;
}

// Curated list of Font Awesome icon names (without prefix)
// These are base names; prefixes 'fas' or 'far' will be applied.
const faIconNames: IconName[] = [
  "ice-cream", "mug-hot", "martini-glass-citrus", "beer-mug-empty",
  "burger", "pizza-slice", "hotdog", "drumstick-bite",
  "apple-whole", "carrot", "leaf", "seedling",
  "store", "tags", "percent", "star",
  "heart", "thumbs-up", "face-smile", "fire",
  "pepper-hot", "lemon", "bread-slice", "cheese",
  "blender", "utensils", "receipt", "gift",
  "truck-fast", "clock", "calendar-days", "credit-card",
  "bell-concierge", "temperature-high", "temperature-low", "snowflake",
  "sun", "moon", "cloud", "droplet", "wine-glass", "champagne-glasses", "cookie-bite", "fish",
  "cubes-stacked", "cube", "hand-holding-heart", "image", "question-circle" // Added some used in mock or fallbacks
];


interface GlobalOptionEditorProps {
  storeId: string;
  products?: Product[];
}

// Helper type for new choices being added
interface NewChoice {
    name: string;
    icon?: string;
}

const GlobalOptionEditor: React.FC<GlobalOptionEditorProps> = ({
  storeId,
  products = [] // Default to empty array if products is undefined
}) => {
  const supabase = createClient(); // Initialize Supabase client
  const [globalOptions, setGlobalOptions] = useState<ProductOptionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState(''); // Stores icon string e.g., "fas ice-cream" or "🧊"
  const [newChoices, setNewChoices] = useState<NewChoice[]>([{ name: '', icon: '' }, { name: '', icon: '' }]);
  
  const [selectedOption, setSelectedOption] = useState<ProductOptionCategory | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [showIconPicker, setShowIconPicker] = useState(false);
  // To track if icon picker is for category or a specific choice index
  const [pickingIconFor, setPickingIconFor] = useState<'category' | number | null>(null); 

  // Function to display notifications
  const showNotification = (message: string, type: 'success' | 'error', duration: number = 3000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  };
  
  // Generates a simple unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  // Fetch global options on component mount or when storeId changes
  useEffect(() => {
    const fetchGlobalOptions = async () => {
      setLoading(true);
      // Mock data simulating fetched options
      const mockOptions: ProductOptionCategory[] = [
        { 
          id: 'opt-1', name: '얼음 양', icon: '🧊', // Emoji icon
          choices: [
            { id: 'choice-1', name: '적게', icon: 'fas cubes-stacked' }, // Font Awesome icon
            { id: 'choice-2', name: '보통' }, 
            { id: 'choice-3', name: '많이', icon: 'fas cube' }
          ] 
        },
        { 
          id: 'opt-2', name: '시럽', icon: '🍯', 
          choices: [
            { id: 'choice-4', name: '추가 안함' }, 
            { id: 'choice-5', name: '1펌프', icon: '1️⃣' }, 
            { id: 'choice-6', name: '2펌프', icon: '2️⃣' }
          ] 
        },
        { 
          id: 'opt-3', name: '컵 선택', icon: 'fas mug-hot', 
          choices: [
            { id: 'choice-7', name: '매장컵', icon: 'fas store' }, 
            { id: 'choice-8', name: '개인컵', icon: 'fas hand-holding-heart' }, 
            { id: 'choice-9', name: '일회용컵' }
          ] 
        }
      ];
      // Simulate API delay
      // await new Promise(resolve => setTimeout(resolve, 1000)); 
      setGlobalOptions(mockOptions);
      setLoading(false);
    };

    if (storeId) {
      fetchGlobalOptions();
    } else {
      setLoading(false);
      showNotification('Store ID가 제공되지 않았습니다. 옵션을 불러올 수 없습니다.', 'error');
    }
  }, [storeId]); // Dependency array for useEffect

  // Handles adding a new category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      showNotification('카테고리 이름을 입력해주세요.', 'error');
      return;
    }
    const validChoices: ProductOptionChoice[] = newChoices
        .map(c => ({ name: c.name.trim(), icon: c.icon?.trim() || undefined }))
        .filter(c => c.name !== '')
        .map(c => ({ id: generateId(), name: c.name, icon: c.icon }));

    if (validChoices.length === 0) {
      showNotification('최소 하나의 옵션을 입력해주세요.', 'error');
      return;
    }
    const newCategory: ProductOptionCategory = {
      id: generateId(),
      name: newCategoryName.trim(),
      icon: newCategoryIcon.trim() || undefined,
      choices: validChoices,
      store_id: storeId // Associate with current store
    };
    setGlobalOptions(prev => [...prev, newCategory]);
    setShowNewCategory(false);
    setNewCategoryName('');
    setNewCategoryIcon('');
    setNewChoices([{ name: '', icon: '' }, { name: '', icon: '' }]); // Reset new choice inputs
    showNotification('새 카테고리가 추가되었습니다.', 'success');
  };

  // Handles changes in new choice input fields
  const handleNewChoiceChange = (index: number, field: 'name' | 'icon', value: string) => {
    const updatedChoices = [...newChoices];
    updatedChoices[index] = { ...updatedChoices[index], [field]: value };
    setNewChoices(updatedChoices);
  };

  // Adds another input field for a new choice
  const handleAddChoiceInput = () => setNewChoices([...newChoices, { name: '', icon: '' }]);
  
  // Removes an input field for a new choice
  const handleRemoveNewChoice = (index: number) => {
    if (newChoices.length <= 1) {
        showNotification('최소 하나의 선택지는 유지해야 합니다.', 'error');
        return;
    }
    setNewChoices(newChoices.filter((_, i) => i !== index));
  };

  // Removes a category
  const handleRemoveCategory = (id: string) => {
    setGlobalOptions(opts => opts.filter(opt => opt.id !== id));
    showNotification('카테고리가 삭제되었습니다.', 'success');
  };

  // Saves all global options (simulated)
  const handleSaveOptions = async () => {
    setSaving(true);
    try {
      // Here you would typically make an API call to save `globalOptions`
      // For example: await supabase.from('product_option_categories').upsert(globalOptions);
      console.log('Saving global options:', globalOptions);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      showNotification('글로벌 옵션이 성공적으로 저장되었습니다.', 'success');
    } catch (e) {
      console.error('Error saving options:', e);
      showNotification('옵션 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  // Opens the modal to link an option category to products
  const openLinkModal = (option: ProductOptionCategory) => {
    setSelectedOption(option);
    // Typically, you might fetch products already linked to this option here
    setSelectedProducts([]); // Reset selected products for the new modal
    setShowLinkModal(true);
  };
  
  // Toggles selection of a product in the link modal
  const handleToggleProduct = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };
  
  // Saves the linking of an option category to selected products (simulated)
  const handleSaveLinking = async () => {
    if (!selectedOption) return;
    setSaving(true); // Use a general saving state or a specific one for linking
    try {
      // API call to save links: (selectedOption.id, selectedProducts)
      console.log('Linking option', selectedOption.id, 'to products:', selectedProducts);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      showNotification('상품 연결이 성공적으로 저장되었습니다.', 'success');
      setShowLinkModal(false);
      setSelectedOption(null);
    } catch (e) {
      console.error('Error linking products:', e);
      showNotification('상품 연결 중 오류가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Opens the icon picker modal
  const openIconPicker = (target: 'category' | number) => {
    setPickingIconFor(target);
    setShowIconPicker(true);
  };

  // Handles selection of an icon from the picker
  const handleIconSelect = (selectedIconValue: string) => {
    if (pickingIconFor === 'category') {
      setNewCategoryIcon(selectedIconValue);
    } else if (typeof pickingIconFor === 'number') {
      handleNewChoiceChange(pickingIconFor, 'icon', selectedIconValue);
    }
    setShowIconPicker(false);
    setPickingIconFor(null);
  };

  // Renders an icon string (FontAwesome or Emoji)
  const renderIcon = useCallback((iconString?: string): JSX.Element | null => {
    if (!iconString || iconString.trim() === '') return null;

    const parts = iconString.split(' ');
    let parsedPrefix: IconPrefix | undefined = undefined;
    let parsedIconName: IconName | undefined = undefined;

    if (parts.length > 0) {
        const firstPart = parts[0].toLowerCase();
        let nameCandidate: string | undefined = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

        if (firstPart === 'fas' || firstPart === 'fa-solid' || firstPart === 'solid') {
            parsedPrefix = 'fas';
        } else if (firstPart === 'far' || firstPart === 'fa-regular' || firstPart === 'regular') {
            parsedPrefix = 'far';
        }
        // Add 'fab' for brands if needed: else if (firstPart === 'fab' || ...) parsedPrefix = 'fab';

        if (nameCandidate) {
            if (nameCandidate.startsWith('fa-')) { // Handles "fa-icon-name"
                nameCandidate = nameCandidate.substring(3);
            }
            parsedIconName = nameCandidate as IconName;
        } else if (parsedPrefix && parts.length === 1 && !firstPart.includes('fa-')) {
             // Case: "fas" (prefix only, no icon name) - invalid for rendering an icon.
             // This path should ideally not be hit if icon strings are "prefix name" or emoji.
        } else if (!parsedPrefix && firstPart.startsWith('fa-')) {
            // Case: "fa-icon-name" (no prefix specified, assume solid)
            // This is less robust. Prefer "prefix icon-name" format.
            // parsedPrefix = 'fas'; // Default to solid
            // parsedIconName = firstPart.substring(3) as IconName;
        }
    }

    if (parsedPrefix && parsedIconName) {
        try {
            // FontAwesomeIcon will throw an error if the icon doesn't exist in the library.
            return <FontAwesomeIcon icon={[parsedPrefix, parsedIconName]} className="text-lg sm:text-xl" />;
        } catch (e) {
            console.warn(`Error rendering FontAwesome icon: PFX=${parsedPrefix}, NME=${parsedIconName}, STR=${iconString}`, e);
        }
    }
    const faRelated = iconString.toLowerCase().includes('fa') || iconString.toLowerCase().includes('solid') || iconString.toLowerCase().includes('regular') || (parsedPrefix !== undefined);
    if (!faRelated && (iconString.length <= 2 || iconString.match(/\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]/))) {
        return <span className="text-xl sm:text-2xl">{iconString}</span>;
    }
    
    // Fallback for unrecognized formats or errors
    return <span className="text-gray-400 text-xs" title={`Unknown icon: ${iconString}`}><FontAwesomeIcon icon={['far', 'question-circle']} className="text-lg sm:text-xl" /></span>;
  }, []);


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-3 text-gray-700 text-lg">옵션 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto"> {/* Increased max-width for wider grid */}
        {/* Notification Area */}
        {notification && (
          <div className={`fixed top-5 right-5 z-[100] p-4 mb-4 rounded-md text-white shadow-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`} role="alert">
            {notification.message}
            <button onClick={() => setNotification(null)} className="ml-4 float-right font-bold text-xl leading-none">&times;</button>
          </div>
        )}

        {/* Main Content Area for Displaying Options */}
        <div className="bg-white rounded-xl shadow-xl p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-3xl font-bold text-gray-800">글로벌 옵션 관리</h2>
            <button
              onClick={handleSaveOptions}
              disabled={saving || globalOptions.length === 0}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-150 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center shadow-md hover:shadow-lg text-base font-semibold"
            >
              {saving ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2.5"></div>저장 중...</>
              ) : (
                <><FontAwesomeIcon icon={['fas', 'save']} className="h-5 w-5 mr-2.5" />모든 옵션 저장</>
              )}
            </button>
          </div>
          <p className="text-gray-600 mb-8 text-sm sm:text-base leading-relaxed">
            여기서 생성한 옵션은 여러 상품에 공통으로 적용할 수 있습니다. 옵션을 생성한 후 원하는 상품에 연결하세요.<br/>
            아이콘은 목록에서 선택하거나 이모지 (예: 🧊)를 직접 입력할 수 있습니다. (형식: "fas 아이콘이름" 또는 "far 아이콘이름")
          </p>

          {/* Grid for Global Options */}
          {globalOptions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {globalOptions.map(category => (
                <div key={category.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col h-full">
                  {/* Card Header: Category Name, Icon, and Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-3 border-b border-gray-200">
                    <div className="flex items-center mb-2 sm:mb-0 min-w-0"> {/* min-w-0 for text truncation if needed */}
                      {renderIcon(category.icon)}
                      <h4 className={`font-semibold text-xl text-gray-800 truncate ${category.icon ? 'ml-3' : ''}`}>{category.name}</h4>
                    </div>
                    <div className="flex space-x-2 flex-shrink-0 self-start sm:self-center">
                      <button
                        onClick={() => openLinkModal(category)}
                        className="px-3.5 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                      >
                        상품 연결
                      </button>
                      <button
                        onClick={() => handleRemoveCategory(category.id)}
                        className="px-3.5 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm hover:shadow-md"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  
                  {/* Card Body: Choices List */}
                  <div className="space-y-2.5 flex-grow mb-4"> {/* flex-grow allows this to take available space */}
                    {category.choices.length > 0 ? (
                      category.choices.map(choice => (
                        <div key={choice.id} className="bg-slate-100 p-3 rounded-lg flex items-center shadow-inner hover:bg-slate-200 transition-colors">
                          {renderIcon(choice.icon)}
                          <span className={`text-sm text-slate-800 ${choice.icon ? 'ml-2.5' : ''}`}>{choice.name}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic py-4 text-center">선택지가 없습니다.</p>
                    )}
                  </div>

                  {/* Card Footer: Linked Products Info */}
                  <div className="text-xs text-gray-500 mt-auto pt-3 border-t border-gray-100">
                    <span className="font-medium">연결된 상품:</span>
                    <span className="italic ml-1">
                      {/* Placeholder - actual linked product info would go here */}
                      아직 연결된 상품 정보가 없습니다.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Empty state when no global options exist (and not adding new one)
            !showNewCategory && (
              <div className="text-center py-12 px-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                <FontAwesomeIcon icon={['far', 'folder-open']} className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">글로벌 옵션 없음</h3>
                <p className="mt-1.5 text-sm text-gray-500">새로운 글로벌 옵션 카테고리를 추가하여 시작하세요.</p>
              </div>
            )
          )}
        </div>

        {/* Toggle Button or Form for Adding New Category */}
        {!showNewCategory ? (
          <button
            onClick={() => setShowNewCategory(true)}
            className="mt-6 w-full p-4 border-2 border-dashed border-blue-500 rounded-xl flex items-center justify-center text-blue-600 hover:text-blue-700 hover:border-blue-600 hover:bg-blue-50 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
          >
            <FontAwesomeIcon icon={['fas', 'plus-circle']} className="w-6 h-6 mr-2.5" />
            새 글로벌 옵션 카테고리 추가
          </button>
        ) : (
          // Form for creating a new option category
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-200 mt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-700">새 옵션 카테고리 생성</h3>
              <button
                onClick={() => { setShowNewCategory(false); setNewCategoryName(''); setNewCategoryIcon(''); setNewChoices([{ name: '', icon: '' }, { name: '', icon: '' }]); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                title="닫기"
              >
                <FontAwesomeIcon icon={['fas', 'times']} className="w-6 h-6" />
              </button>
            </div>
            {/* Category Name and Icon Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
              <div>
                <label htmlFor="category-name" className="block text-sm font-medium text-gray-600 mb-1.5">옵션 카테고리 이름 <span className="text-red-500">*</span></label>
                <input type="text" id="category-name" placeholder="예: 얼음 양, 컵 선택" className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow placeholder-gray-400 sm:text-sm" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">카테고리 아이콘 (선택)</label>
                <div className="flex items-center space-x-2">
                    <button type="button" onClick={() => openIconPicker('category')} className="flex-grow px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors min-h-[3rem] flex items-center">
                        {newCategoryIcon ? renderIcon(newCategoryIcon) : <span className="text-gray-400">아이콘 선택...</span>}
                    </button>
                    {newCategoryIcon && (
                        <button type="button" onClick={() => setNewCategoryIcon('')} className="p-2 text-gray-400 hover:text-red-600" title="아이콘 제거">
                            <FontAwesomeIcon icon={['fas', 'trash-alt']} className="w-5 h-5" />
                        </button>
                    )}
                </div>
                <input type="text" placeholder='예: "fas coffee" 또는 🧊' className="mt-2 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-shadow placeholder-gray-400 sm:text-xs" value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} title="선택한 아이콘이 여기에 표시됩니다. 직접 수정도 가능합니다."/>
              </div>
            </div>
            
            {/* Choices Input Area */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-600 mb-1.5">옵션 선택지 <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-500 mb-3">각 선택지에 이름과 아이콘(선택)을 설정할 수 있습니다.</p>
              <div className="space-y-3">
                {newChoices.map((choice, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                        <span className="text-gray-500 text-sm font-medium w-6 text-center">{index + 1}.</span>
                        <input type="text" placeholder={`선택지 이름`} className="flex-grow px-3 py-2.5 border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md placeholder-gray-400" value={choice.name} onChange={(e) => handleNewChoiceChange(index, 'name', e.target.value)} />
                        <button type="button" onClick={() => openIconPicker(index)} className="p-2.5 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400" title="선택지 아이콘 선택">
                            {choice.icon ? renderIcon(choice.icon) : <FontAwesomeIcon icon={['far', 'image']} className="text-gray-400 w-5 h-5" />}
                        </button>
                        {newChoices.length > 1 && (
                            <button type="button" onClick={() => handleRemoveNewChoice(index)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors" title="선택지 삭제">
                                <FontAwesomeIcon icon={['fas', 'times-circle']} className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    {/* Direct input for choice icon string */}
                    {choice.icon && ( // Show input only if an icon is selected or being typed
                        <div className="mt-1.5 pl-10"> {/* Aligned with choice name input */}
                             <input type="text" placeholder='예: "fas star" 또는 ⭐' className="block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-shadow placeholder-gray-400 text-xs" value={choice.icon} onChange={(e) => handleNewChoiceChange(index, 'icon', e.target.value)} title="선택한 아이콘 (직접 수정 가능)"/>
                        </div>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleAddChoiceInput} className="mt-4 flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 px-3 rounded-lg hover:bg-blue-100 transition-colors group">
                <FontAwesomeIcon icon={['fas', 'plus-circle']} className="w-5 h-5 mr-1.5 text-blue-500 group-hover:text-blue-600 transition-colors" />
                선택지 추가
              </button>
            </div>
            
            {/* Action Buttons for New Category Form */}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-8 pt-6 border-t border-gray-200">
              <button type="button" onClick={() => { setShowNewCategory(false); setNewCategoryName(''); setNewCategoryIcon(''); setNewChoices([{ name: '', icon: '' }, { name: '', icon: '' }]); }} className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors w-full sm:w-auto">취소</button>
              <button type="button" onClick={handleAddCategory} className="px-6 py-2.5 bg-blue-600 border border-transparent rounded-lg shadow-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-full sm:w-auto">카테고리 추가 완료</button>
            </div>
          </div>
        )}
        
        {/* Icon Picker Modal */}
        {showIconPicker && (
            <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl p-5 sm:p-6 w-full max-w-xl max-h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">아이콘 선택</h4>
                        <button onClick={() => {setShowIconPicker(false); setPickingIconFor(null);}} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                            <FontAwesomeIcon icon={['fas', 'times']} className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="overflow-y-auto flex-grow grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 custom-scrollbar pr-2">
                        {/* Solid Icons */}
                        {faIconNames.map(iconName => (
                            <button key={`fas-${iconName}`} type="button" onClick={() => handleIconSelect(`fas ${iconName}`)} className="p-3 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-blue-100 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all aspect-square" title={`fas ${iconName}`}>
                                <FontAwesomeIcon icon={['fas', iconName]} className="text-2xl text-gray-700" />
                            </button>
                        ))}
                        {/* Regular Icons */}
                        {faIconNames.map(iconName => ( 
                             <button key={`far-${iconName}`} type="button" onClick={() => handleIconSelect(`far ${iconName}`)} className="p-3 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-blue-100 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all aspect-square" title={`far ${iconName}`}>
                                <FontAwesomeIcon icon={['far', iconName]} className="text-2xl text-gray-700" />
                            </button>
                        ))}
                    </div>
                     <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                        <button type="button" onClick={() => {setShowIconPicker(false); setPickingIconFor(null);}} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">닫기</button>
                     </div>
                </div>
            </div>
        )}

        {/* Product Linking Modal */}
        {showLinkModal && selectedOption && (
          <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300 ease-in-out p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 shadow-xl transform transition-all sm:max-w-lg w-full max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  {renderIcon(selectedOption.icon)}
                  <span className={`${selectedOption.icon ? 'ml-2' : ''}`}>"{selectedOption.name}" 옵션을 상품에 연결</span>
                </h3>
                <button onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100" aria-label="Close modal">
                  <FontAwesomeIcon icon={['fas', 'times']} className="w-6 h-6" />
                </button>
              </div>
              <div className="overflow-y-auto flex-grow pr-1 custom-scrollbar">
                {products && products.length > 0 ? (
                  <div className="space-y-2.5">
                    {products.map(product => (
                      <label key={product.product_id} htmlFor={`product-${product.product_id}`} className="flex items-center p-3 hover:bg-gray-100 rounded-lg cursor-pointer border border-gray-200 transition-colors">
                        <input
                          type="checkbox"
                          id={`product-${product.product_id}`}
                          checked={selectedProducts.includes(product.product_id)}
                          onChange={() => handleToggleProduct(product.product_id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-1"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">{product.product_name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-6">연결할 수 있는 상품이 없습니다. 먼저 상품을 추가해주세요.</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6 pt-5 border-t border-gray-200">
                <button onClick={() => setShowLinkModal(false)} className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition-colors w-full sm:w-auto">취소</button>
                <button onClick={handleSaveLinking} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors shadow-md hover:shadow-lg w-full sm:w-auto" disabled={!selectedOption || saving}>
                  {saving ? '저장 중...' : '연결 저장'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Global styles for custom scrollbar (optional) */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #c7c7c7; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a3a3a3; }
      `}</style>
    </div>
  );
};

export default GlobalOptionEditor;
