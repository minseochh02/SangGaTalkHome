import React, { useState, useEffect, useCallback, useRef } from 'react';
// Import FontAwesome components and icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library, IconPrefix, IconName, findIconDefinition } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { JSX } from 'react/jsx-runtime';
import { createClient } from '@/utils/supabase/client'; // Remove mock comment, use actual client
import NotificationPopup from './components/NotificationPopup'; // Import the new component
import LoadingSpinner from './components/LoadingSpinner'; // Import the new component
import IconPickerModal from './components/IconPickerModal'; // Import the new component
import { renderIconDisplay } from './components/iconUtils'; // Import from iconUtils
import LinkProductsModal from './components/LinkProductsModal'; // Import the new component
import NewCategoryForm, { NewCategoryFormRef } from './components/NewCategoryForm'; // Import NewCategoryForm and its ref type
import OptionCategoryCard from './components/OptionCategoryCard'; // Import OptionCategoryCard
// import { ProductOptionCategory, ProductOptionChoice, Product } from '@/utils/type'; // Assuming these types are defined in your project

// Add all FontAwesome solid and regular icons to the library
library.add(fas, far);

// Remove mock Supabase client
// ... existing code ...

// Define types here
export interface ProductOptionChoice { // EXPORT THIS
  id?: string; // Make id optional since new choices won't have IDs until saved
  name: string;
  icon?: string; // Icon for the choice (FA class "prefix icon-name" or emoji)
  price_impact?: number;
  isDefault?: boolean; // Mark if this is the default choice
  won_price?: number; // Added for option extra charge in KRW
  sgt_price: number; // SGT price is now non-nullable
}

export interface ProductOptionCategory { // EXPORT THIS
  id?: string; // Make id optional since new categories won't have IDs until saved
  name: string;
  icon?: string; // Icon for the category (FA class "prefix icon-name" or emoji)
  choices: ProductOptionChoice[];
  store_id?: string;
}

export interface Product { // EXPORT THIS
  product_id: string;
  product_name: string;
}

export interface LinkedProductInfo { // EXPORT THIS
  id: string;
  name: string;
}

interface GlobalOptionEditorProps {
  storeId: string;
  products?: Product[];
}

// Helper type for new choices being added
export interface NewChoice { // EXPORT THIS
    name: string;
    icon?: string;
    isDefault?: boolean; // Add isDefault property to NewChoice
    won_price?: number; // Added for option extra charge in KRW
    sgt_price: string; // SGT price is now a string to allow partial decimal input
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
  const newCategoryFormRef = useRef<NewCategoryFormRef>(null); // Ref for NewCategoryForm
  
  const [selectedOption, setSelectedOption] = useState<ProductOptionCategory | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [showIconPicker, setShowIconPicker] = useState(false);
  const [pickingIconFor, setPickingIconFor] = useState<'category' | number | null>(null); 

  const [linkedProductsStoreMap, setLinkedProductsStoreMap] = useState<Map<string, LinkedProductInfo[]>>(new Map());

  const showNotification = (message: string, type: 'success' | 'error', duration: number = 3000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  };
  

  useEffect(() => {
    const fetchGlobalOptionsAndLinks = async () => {
      setLoading(true);
      if (!storeId) {
        setLoading(false);
        showNotification('Store ID가 제공되지 않았습니다. 옵션을 불러올 수 없습니다.', 'error');
        return;
      }

      try {
        // Fetch store option groups
        const { data: groups, error: groupsError } = await supabase
          .from('store_option_groups')
          .select('*')
          .eq('store_id', storeId)
          .order('display_order', { ascending: true });

        if (groupsError) throw groupsError;

        if (!groups || groups.length === 0) {
          setGlobalOptions([]);
          setLinkedProductsStoreMap(new Map());
          setLoading(false);
          return;
        }

        const groupIds = groups.map(g => g.id);

        // Fetch all choices for these groups
        const { data: choices, error: choicesError } = await supabase
          .from('store_option_choices')
          .select('*')
          .in('group_id', groupIds)
          .order('display_order', { ascending: true });

        if (choicesError) throw choicesError;

        // Fetch all product links for these groups
        const { data: links, error: linksError } = await supabase
          .from('product_global_option_links')
          .select('store_option_group_id, product_id')
          .in('store_option_group_id', groupIds);
        
        if (linksError) throw linksError;

        // Create a map for easy lookup of linked products
        const newLinkedProductsStoreMap = new Map<string, LinkedProductInfo[]>();
        if (links) {
          links.forEach(link => {
            const productInfo = products.find(p => p.product_id === link.product_id);
            if (productInfo) {
              const currentLinks = newLinkedProductsStoreMap.get(link.store_option_group_id) || [];
              currentLinks.push({ id: productInfo.product_id, name: productInfo.product_name });
              newLinkedProductsStoreMap.set(link.store_option_group_id, currentLinks);
            }
          });
        }
        setLinkedProductsStoreMap(newLinkedProductsStoreMap);

        // Map to our component data structure for global options
        const mappedOptions: ProductOptionCategory[] = groups.map(group => ({
          id: group.id, // Ensure ID is mapped
          name: group.name,
          icon: group.icon || undefined,
          store_id: storeId,
          choices: choices
            ? choices
                .filter(choice => choice.group_id === group.id)
                .map(choice => ({
                  id: choice.id, // Ensure ID is mapped
                  name: choice.name,
                  icon: choice.icon || undefined,
                  price_impact: choice.price_impact || 0,
                  isDefault: choice.is_default || false,
                  won_price: choice.won_price !== undefined ? choice.won_price : 0, // Map won_price
                  sgt_price: choice.sgt_price !== undefined && choice.sgt_price !== null ? choice.sgt_price : 0 // Map sgt_price, default to 0
                }))
            : []
        }));
        
        setGlobalOptions(mappedOptions);

      } catch (error) {
        console.error('Error fetching global options and links:', error);
        showNotification('옵션 및 연결된 상품 정보를 불러오는 중 오류가 발생했습니다.', 'error');
      } finally {
      setLoading(false);
      }
    };

    fetchGlobalOptionsAndLinks();
  }, [storeId, supabase, products]); // Add products to dependency array

  const handleAddCategoryFromForm = (newCategory: ProductOptionCategory) => {
    setGlobalOptions(prev => [...prev, newCategory]);
    setShowNewCategory(false); // Close the form
    // Resetting form fields is now done within NewCategoryForm itself
    showNotification('상세주문 옵션이 추가되었습니다.', 'success');
  };

  const handleRemoveCategory = (id: string) => {
    setGlobalOptions(opts => opts.filter(opt => opt.id !== id));
    showNotification('상세주문 옵션이 삭제되었습니다.', 'success');
  };

  // NEW: Function to set a choice as default within an existing category
  const handleSetDefaultChoice = (categoryId: string, choiceIdToSetAsDefault: string) => {
    setGlobalOptions(prevOptions =>
      prevOptions.map(category => {
        if (category.id === categoryId) {
          // Ensure only one default choice in this category
          const updatedChoices = category.choices.map(choice => ({
            ...choice,
            isDefault: choice.id === choiceIdToSetAsDefault
          }));
          return { ...category, choices: updatedChoices };
        }
        return category;
      })
    );
    showNotification('기본 선택이 변경되었습니다. 변경 사항을 저장해주세요.', 'success');
  };

  const handleSaveOptions = async () => {
    if (!storeId) {
      showNotification('Store ID가 없어 저장할 수 없습니다.', 'error');
      return;
    }

    console.log('[GlobalOptionEditor] Starting to save global options:', globalOptions);
    setSaving(true);

    try {
      // Get existing groups and choices from DB for comparison
      const { data: dbGroups, error: dbGroupsError } = await supabase
        .from('store_option_groups')
        .select('id, name, icon, display_order')
        .eq('store_id', storeId);
      if (dbGroupsError) throw dbGroupsError;

      const dbGroupIds = dbGroups?.map(g => g.id) || [];
      const { data: dbChoices, error: dbChoicesError } = await supabase
        .from('store_option_choices')
        .select('id, group_id, name, icon, price_impact, is_default, display_order, won_price, sgt_price') // Added won_price and sgt_price
        .in('group_id', dbGroupIds);
      if (dbChoicesError) throw dbChoicesError;

      const stateGroups = globalOptions;
      const finalGlobalOptions: ProductOptionCategory[] = []; // To store state with updated/new DB IDs

      // --- Process Option Groups ---
      const groupsToUpsert: any[] = [];
      const groupIdsToKeep: string[] = [];

      for (let i = 0; i < stateGroups.length; i++) {
        const stateGroup = stateGroups[i];
        const existingDbGroup = dbGroups?.find(g => g.id === stateGroup.id);
        
        const groupDataForUpsert = {
          // store_id, name, icon, display_order are common
          store_id: storeId,
          name: stateGroup.name,
          icon: stateGroup.icon || null,
          display_order: i
        };

        if (existingDbGroup) {
          // Update existing group: include its ID
          groupsToUpsert.push({
            id: existingDbGroup.id, // Crucial: Use existing DB ID for updates
            ...groupDataForUpsert
          });
          groupIdsToKeep.push(existingDbGroup.id);
          // Ensure finalGlobalOptions uses the confirmed DB ID for existing groups
          const existingFinalGroup = finalGlobalOptions.find(fg => fg.id === existingDbGroup.id);
          if (!existingFinalGroup) {
            finalGlobalOptions.push({ ...stateGroup, id: existingDbGroup.id });
          } else if (existingFinalGroup.id !== existingDbGroup.id) { // Should not happen if logic is sound
             existingFinalGroup.id = existingDbGroup.id;
          }
        } else {
          // New group: DO NOT include an ID field, let DB generate it
          groupsToUpsert.push(groupDataForUpsert);
          // We will get the new ID after insert and map it to finalGlobalOptions later
          // For now, add a placeholder to finalGlobalOptions that will be updated
          // Use the temporary client-side ID if it exists to help with mapping later
          finalGlobalOptions.push({ ...stateGroup, id: stateGroup.id }); 
        }
      }
      
      // Upsert groups
      const { data: upsertedGroupsData, error: upsertGroupsError } = await supabase
        .from('store_option_groups')
        .upsert(groupsToUpsert, { onConflict: 'id', defaultToNull: false }) // defaultToNull: false is important
        .select();

      if (upsertGroupsError) throw upsertGroupsError;
      if (!upsertedGroupsData) throw new Error('Failed to upsert groups');

      console.log('[GlobalOptionEditor] Upserted groups data from DB:', upsertedGroupsData);

      // Map state group client IDs (or lack thereof for new ones) to new DB IDs
      const updatedFinalGlobalOptions = stateGroups.map((originalStateGroup, index) => {
        const upsertedGroup = upsertedGroupsData.find(ug => {
          // If originalStateGroup had an ID, it was an update attempt or a client-side new ID
          if (originalStateGroup.id) {
            return ug.id === originalStateGroup.id; // Match if ID was preserved (update)
          }
          // If originalStateGroup had no ID, it was a new item. 
          // We rely on the order or a more complex matching if multiple new items were added.
          // Here, we assume the upsertedGroupsData for new items might not easily map back if there's no client ID.
          // A robust solution might involve matching by name and display_order for new items if client ID is not reliable.
          // For simplicity now, let's try to find the corresponding group by checking if it was in the original dbGroups
          const wasExisting = dbGroups?.some(dbg => dbg.display_order === index && dbg.name === originalStateGroup.name) || false;
          if (!wasExisting && ug.display_order === index && ug.name === originalStateGroup.name) return true; // Basic match for new item by order and name
          return false;
        });
        
        // Fallback for new items: if upsertedGroupsData has more items than original groups with IDs, 
        // assume the extra ones (in order) are the newly inserted ones.
        const dbIdToUse = upsertedGroup?.id || upsertedGroupsData[index]?.id; // Use matched or index-based ID

        return {
          ...originalStateGroup, // Spread original state group to keep its choices
          id: dbIdToUse,       // Update with the ID from the database
        };
      });
      
      setGlobalOptions(updatedFinalGlobalOptions); // Update state with new IDs before processing choices
      
      // --- Process Choices for each group using updatedFinalGlobalOptions ---
      const choicesToUpsert: any[] = [];
      const choiceIdsToKeepByGroup = new Map<string, string[]>();
      let upsertedChoicesData: any[] | null = null; // Declare here

      for (const finalGroup of updatedFinalGlobalOptions) { 
        if (!finalGroup.id) {
          console.warn('Skipping choices for group without ID:', finalGroup.name);
          continue; 
        }
        const currentDbGroupId = finalGroup.id;
        const stateChoicesForGroup = finalGroup.choices;
        const dbChoicesForGroup = dbChoices?.filter(c => c.group_id === currentDbGroupId) || [];
        const currentGroupChoiceIdsToKeep: string[] = [];

        for (let j = 0; j < stateChoicesForGroup.length; j++) {
          const stateChoice = stateChoicesForGroup[j];
          const existingDbChoice = dbChoicesForGroup.find(c => c.id === stateChoice.id);
          const choicePayload = {
            id: stateChoice.id, 
            group_id: currentDbGroupId,
            name: stateChoice.name,
            icon: stateChoice.icon || null,
            price_impact: stateChoice.price_impact || 0,
            is_default: stateChoice.isDefault || false,
            display_order: j,
            won_price: stateChoice.won_price !== undefined ? stateChoice.won_price : 0,
            sgt_price: stateChoice.sgt_price !== undefined ? stateChoice.sgt_price : 0 
          };

          if (existingDbChoice) {
            choicesToUpsert.push(choicePayload);
            currentGroupChoiceIdsToKeep.push(existingDbChoice.id);
          } else {
            const { id, ...newChoicePayload } = choicePayload;
            choicesToUpsert.push(newChoicePayload);
          }
        }
        choiceIdsToKeepByGroup.set(currentDbGroupId, currentGroupChoiceIdsToKeep);
      }
      
      if (choicesToUpsert.length > 0) {
        // Assign to the declared variable
        const { data, error: upsertChoicesError } = await supabase
            .from('store_option_choices')
            .upsert(choicesToUpsert, { onConflict: 'id', defaultToNull: false })
            .select();
        if (upsertChoicesError) throw upsertChoicesError;
        upsertedChoicesData = data; // Assign here
        console.log('[GlobalOptionEditor] Upserted choices:', upsertedChoicesData);
      }

      // --- Delete orphaned groups and choices ---
      const groupIdsToDelete = dbGroupIds.filter(id => !upsertedGroupsData.some(ug => ug.id === id));
      if (groupIdsToDelete.length > 0) {
        console.log('[GlobalOptionEditor] Deleting groups:', groupIdsToDelete);
        const { error: deleteError } = await supabase.from('store_option_groups').delete().in('id', groupIdsToDelete);
        if (deleteError) throw deleteError;
      }

      // Convert Map entries to an array for iteration
      for (const [groupId, keptChoiceIds] of Array.from(choiceIdsToKeepByGroup.entries())) {
        const dbChoicesForThisGroup = dbChoices?.filter(c => c.group_id === groupId) || [];
        const choiceIdsToDelete = dbChoicesForThisGroup.filter(c => !keptChoiceIds.includes(c.id)).map(c => c.id);
        if (choiceIdsToDelete.length > 0) {
          console.log(`[GlobalOptionEditor] Deleting choices for group ${groupId}:`, choiceIdsToDelete);
          const { error: deleteChoicesError } = await supabase.from('store_option_choices').delete().in('id', choiceIdsToDelete);
          if (deleteChoicesError) throw deleteChoicesError;
        }
      }
      
      const finalProcessedGlobalOptions = updatedFinalGlobalOptions.map(group => {
        const choicesFromDbForThisGroup = upsertedChoicesData?.filter(uc => uc.group_id === group.id) || [];
        const stateChoices = group.choices.map(sc => {
            const dbChoice = choicesFromDbForThisGroup.find(dbc => 
                (sc.id && dbc.id === sc.id) || 
                (!sc.id && dbc.name === sc.name && dbc.price_impact === (sc.price_impact || 0)) 
            );
            return { ...sc, id: dbChoice?.id || sc.id }; 
        });
        return { ...group, choices: stateChoices }; 
      });
      
      setGlobalOptions(finalProcessedGlobalOptions);
      await fetchProductLinksForCurrentOptions(finalProcessedGlobalOptions.map(opt => opt.id || '').filter(id => id));

      console.log('[GlobalOptionEditor] Successfully saved all global options with granular updates');
      showNotification('글로벌 옵션이 성공적으로 저장되었습니다.', 'success');

    } catch (e) {
      console.error('Error saving options with granular updates:', e);
      showNotification('옵션 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const fetchProductLinksForCurrentOptions = async (groupIds: string[]) => {
    if (groupIds.length === 0) {
      setLinkedProductsStoreMap(new Map());
      return;
    }
    try {
      const { data: links, error: linksError } = await supabase
        .from('product_global_option_links')
        .select('store_option_group_id, product_id')
        .in('store_option_group_id', groupIds);

      if (linksError) throw linksError;

      const newLinkedMap = new Map<string, LinkedProductInfo[]>();
      if (links) {
        links.forEach(link => {
          const productInfo = products.find(p => p.product_id === link.product_id);
          if (productInfo) {
            const currentLinks = newLinkedMap.get(link.store_option_group_id) || [];
            currentLinks.push({ id: productInfo.product_id, name: productInfo.product_name });
            newLinkedMap.set(link.store_option_group_id, currentLinks);
          }
        });
      }
      setLinkedProductsStoreMap(newLinkedMap);
    } catch (error) {
      console.error('Error fetching product links:', error);
      showNotification('연결된 상품 정보 업데이트 중 오류 발생', 'error');
    }
  };
  
  const openLinkModal = (option: ProductOptionCategory) => {
    if (!option.id) {
      showNotification('먼저 옵션을 저장해야 상품을 연결할 수 있습니다.', 'error');
      return;
    }
    
    setSelectedOption(option);
    // Fetch currently linked products for this option
    fetchLinkedProducts(option.id);
    setShowLinkModal(true);
  };
  
  // New function to fetch products already linked to this option
  const fetchLinkedProducts = async (optionId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_global_option_links')
        .select('product_id')
        .eq('store_option_group_id', optionId);
        
      if (error) {
        console.error('Error fetching linked products:', error);
        return;
      }
      
      // Set the selected products state with currently linked products
      if (data) {
        const linkedProductIds = data.map(link => link.product_id);
        setSelectedProducts(linkedProductIds);
      } else {
        setSelectedProducts([]);
      }
    } catch (e) {
      console.error('Error in fetchLinkedProducts:', e);
      setSelectedProducts([]);
    }
  };
  
  const handleToggleProduct = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };
  
  const handleSaveLinking = async () => {
    if (!selectedOption || !storeId || !selectedOption.id) return;
    setSaving(true);
    const optionGroupId = selectedOption.id;
    try {
      console.log('[GlobalOptionEditor] Linking option', optionGroupId, 'to products:', selectedProducts);
      
      const { error: deleteError } = await supabase
        .from('product_global_option_links')
        .delete()
        .eq('store_option_group_id', optionGroupId);
      
      if (deleteError) throw deleteError;
      
      if (selectedProducts.length > 0) {
        const linksToInsert = selectedProducts.map(productId => ({
          product_id: productId,
          store_option_group_id: optionGroupId,
          store_id: storeId
        }));
        
        const { error: insertError } = await supabase
          .from('product_global_option_links')
          .insert(linksToInsert);
        
        if (insertError) throw insertError;
      }
      
      // Update the map for the UI
      const productInfos: LinkedProductInfo[] = selectedProducts
        .map(pid => {
          const product = products.find(p => p.product_id === pid);
          // Ensure product exists and map to LinkedProductInfo structure
          return product ? { id: product.product_id, name: product.product_name } : null;
        })
        .filter((p): p is LinkedProductInfo => p !== null); // Type guard to filter out nulls and assert type

      setLinkedProductsStoreMap(prev => new Map(prev).set(optionGroupId, productInfos));
      
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

  const openIconPicker = (target: 'category' | number) => {
    setPickingIconFor(target);
    setShowIconPicker(true);
  };

  const handleIconSelect = (selectedIconValue: string) => {
    if (newCategoryFormRef.current && (pickingIconFor === 'category' || typeof pickingIconFor === 'number')) {
      newCategoryFormRef.current.setIcon(pickingIconFor, selectedIconValue);
    }
    // For icons selected for existing categories/choices (if that functionality is added later),
    // you would handle that here based on pickingIconFor value.
    setShowIconPicker(false);
    setPickingIconFor(null);
  };

  const renderIconForInput = useCallback((iconString?: string): JSX.Element | null => {
    return renderIconDisplay(iconString, "text-lg");
  }, []);


  if (loading) {
    return <LoadingSpinner message="옵션 로딩 중..." />;
  }

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {notification && (
          <NotificationPopup 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}

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
            아이콘은 목록에서 선택하거나 이모지 (예: 🧊)를 직접 입력할 수 있습니다. (형식: "fas 아이콘이름" 또는 "far 아이콘이름")<br/>
            옵션 카드를 클릭하여 기본 선택을 빠르게 변경할 수 있습니다.<br/>
            <span className="text-red-600 font-medium">각 옵션에 원화와 SGT 추가 요금을 설정할 수 있습니다. 추가 요금은 고객에게 명확하게 표시됩니다.</span><br/>
            추가 요금이 0원이면 무료 옵션으로 표시됩니다. SGT 가격을 비워두면 SGT로 결제할 수 없습니다.
          </p>

          {!showNewCategory ? (
            <button
              onClick={() => setShowNewCategory(true)}
              className="mb-8 w-full p-4 border-2 border-dashed border-blue-500 rounded-xl flex items-center justify-center text-blue-600 hover:text-blue-700 hover:border-blue-600 hover:bg-blue-50 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
            >
              <FontAwesomeIcon icon={['fas', 'plus-circle']} className="w-6 h-6 mr-2.5" />
              상세주문 옵션 추가
            </button>
          ) : (
            <NewCategoryForm
              ref={newCategoryFormRef}
              storeId={storeId}
              onAddCategory={handleAddCategoryFromForm} 
              onCancel={() => setShowNewCategory(false)}
              openIconPicker={openIconPicker} // Pass openIconPicker down
              showNotification={showNotification} // Pass showNotification down
            />
          )}

          {globalOptions.length > 0 ? (
            <div className="space-y-8">
              {globalOptions.map(category => (
                <OptionCategoryCard
                  key={category.id}
                  category={category}
                  linkedProducts={linkedProductsStoreMap.get(category.id || '') || []}
                  onLinkProducts={openLinkModal} // Pass openLinkModal (was handleOpenLinkModal)
                  onRemoveCategory={handleRemoveCategory}
                  onSetDefaultChoice={handleSetDefaultChoice}
                />
              ))}
            </div>
          ) : (
            !showNewCategory && (
              <div className="text-center py-12 px-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                <FontAwesomeIcon icon={['far', 'folder-open']} className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">상세주문 옵션 없음</h3>
                <p className="mt-1.5 text-sm text-gray-500">상세주문 옵션을 추가하여 시작하세요.</p>
              </div>
            )
          )}
        </div>

        <IconPickerModal 
          isOpen={showIconPicker}
          onClose={() => {
            setShowIconPicker(false);
            setPickingIconFor(null);
          }}
          onIconSelect={handleIconSelect}
        />

        <LinkProductsModal 
          isOpen={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          selectedOption={selectedOption}
          products={products}
          selectedProducts={selectedProducts}
          onToggleProduct={handleToggleProduct}
          onSaveLinking={handleSaveLinking}
          saving={saving}
        />
      </div>
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
