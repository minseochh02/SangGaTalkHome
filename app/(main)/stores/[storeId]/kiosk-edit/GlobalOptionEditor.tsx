import React, { useState, useEffect, useCallback } from 'react';
// Import FontAwesome components and icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library, IconPrefix, IconName, findIconDefinition } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { JSX } from 'react/jsx-runtime';
import { createClient } from '@/utils/supabase/client'; // Remove mock comment, use actual client
// import { ProductOptionCategory, ProductOptionChoice, Product } from '@/utils/type'; // Assuming these types are defined in your project

// Add all FontAwesome solid and regular icons to the library
library.add(fas, far);

// Remove mock Supabase client
// ... existing code ...

// Define types here
interface ProductOptionChoice {
  id?: string; // Make id optional since new choices won't have IDs until saved
  name: string;
  icon?: string; // Icon for the choice (FA class "prefix icon-name" or emoji)
  price_impact?: number;
  isDefault?: boolean; // Mark if this is the default choice
}

interface ProductOptionCategory {
  id?: string; // Make id optional since new categories won't have IDs until saved
  name: string;
  icon?: string; // Icon for the category (FA class "prefix icon-name" or emoji)
  choices: ProductOptionChoice[];
  store_id?: string;
}

interface Product {
  product_id: string;
  product_name: string;
}

interface LinkedProductInfo {
  id: string;
  name: string;
}

// Curated list of Font Awesome icon names (without prefix)
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
  "cubes-stacked", "cube", "hand-holding-heart", "image", "question-circle", "save", "plus-circle", "times", "trash-alt", "times-circle", "folder-open", "check-circle", "check"
];


interface GlobalOptionEditorProps {
  storeId: string;
  products?: Product[];
}

// Helper type for new choices being added
interface NewChoice {
    name: string;
    icon?: string;
    isDefault?: boolean; // Add isDefault property to NewChoice
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
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [newChoices, setNewChoices] = useState<NewChoice[]>([{ name: '', icon: '' }, { name: '', icon: '' }]);
  
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

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      showNotification('카테고리 이름을 입력해주세요.', 'error');
      return;
    }
    const validChoices: ProductOptionChoice[] = newChoices
        .map(c => ({ 
          name: c.name.trim(), 
          icon: c.icon?.trim() || undefined,
          isDefault: c.isDefault
        }))
        .filter(c => c.name !== '')
        .map(c => ({ name: c.name, icon: c.icon, isDefault: c.isDefault }));

    if (validChoices.length === 0) {
      showNotification('최소 하나의 옵션을 입력해주세요.', 'error');
      return;
    }
    
    let defaultCount = validChoices.filter(c => c.isDefault).length;
    if (defaultCount === 0 && validChoices.length > 0) {
      validChoices[0].isDefault = true; // Set first as default if none selected
    } else if (defaultCount > 1) {
      // If multiple defaults somehow got selected, keep only the first one
      let firstDefaultFound = false;
      validChoices.forEach(c => {
        if (c.isDefault) {
          if (firstDefaultFound) c.isDefault = false;
          else firstDefaultFound = true;
        }
      });
    }
    
    const newCategory: ProductOptionCategory = {
      name: newCategoryName.trim(),
      icon: newCategoryIcon.trim() || undefined,
      choices: validChoices,
      store_id: storeId
    };
    setGlobalOptions(prev => [...prev, newCategory]);
    setShowNewCategory(false);
    setNewCategoryName('');
    setNewCategoryIcon('');
    setNewChoices([{ name: '', icon: '' }, { name: '', icon: '' }]);
    showNotification('새 카테고리가 추가되었습니다.', 'success');
  };

  const handleNewChoiceChange = (index: number, field: 'name' | 'icon' | 'isDefault', value: any) => {
    const updatedChoices = [...newChoices];
    
    if (field === 'isDefault' && value === true) {
      updatedChoices.forEach((choice, i) => {
        if (i !== index) updatedChoices[i] = { ...updatedChoices[i], isDefault: false };
      });
    }
    
    updatedChoices[index] = { ...updatedChoices[index], [field]: value };
    setNewChoices(updatedChoices);
  };

  const handleAddChoiceInput = () => setNewChoices([...newChoices, { name: '', icon: '' }]);
  
  const handleRemoveNewChoice = (index: number) => {
    if (newChoices.length <= 1) {
        showNotification('최소 하나의 선택지는 유지해야 합니다.', 'error');
        return;
    }
    const removedChoiceWasDefault = newChoices[index].isDefault;
    const updatedChoices = newChoices.filter((_, i) => i !== index);

    // If the removed choice was the default and there are other choices left, make the new first choice the default.
    if (removedChoiceWasDefault && updatedChoices.length > 0 && !updatedChoices.some(c => c.isDefault)) {
        updatedChoices[0].isDefault = true;
    }
    setNewChoices(updatedChoices);
  };

  const handleRemoveCategory = (id: string) => {
    setGlobalOptions(opts => opts.filter(opt => opt.id !== id));
    showNotification('카테고리가 삭제되었습니다.', 'success');
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
        .select('id, group_id, name, icon, price_impact, is_default, display_order')
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
            display_order: j
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
    if (pickingIconFor === 'category') {
      setNewCategoryIcon(selectedIconValue);
    } else if (typeof pickingIconFor === 'number') {
      handleNewChoiceChange(pickingIconFor, 'icon', selectedIconValue);
    }
    setShowIconPicker(false);
    setPickingIconFor(null);
  };

  const renderIconDisplay = useCallback((iconString?: string, sizeClass: string = "text-xl sm:text-2xl"): JSX.Element | null => {
    if (!iconString || iconString.trim() === '') return null;
    const parts = iconString.split(' ');
    let parsedPrefix: IconPrefix | undefined = undefined;
    let parsedIconName: IconName | undefined = undefined;

    if (parts.length > 0) {
        const firstPart = parts[0].toLowerCase();
        let nameCandidate: string | undefined = parts.length > 1 ? parts.slice(1).join(' ') : undefined;
        if (firstPart === 'fas' || firstPart === 'fa-solid' || firstPart === 'solid') parsedPrefix = 'fas';
        else if (firstPart === 'far' || firstPart === 'fa-regular' || firstPart === 'regular') parsedPrefix = 'far';
        if (nameCandidate) {
            if (nameCandidate.startsWith('fa-')) nameCandidate = nameCandidate.substring(3);
            parsedIconName = nameCandidate as IconName;
        }
    }

    if (parsedPrefix && parsedIconName) {
        try {
            // Check if the icon is in the library
            const iconLookup = findIconDefinition({ prefix: parsedPrefix, iconName: parsedIconName });
            if (iconLookup) {
                return <FontAwesomeIcon icon={[parsedPrefix, parsedIconName]} className={`${sizeClass} flex-shrink-0`} />;
            } else {
                console.warn(`FontAwesome icon fas ${parsedIconName} or far ${parsedIconName} not found in library. Icon string: ${iconString}`);
            }
        } catch (e) { console.warn(`Error rendering FA icon: ${iconString}`, e); }
    }
    // Check for emoji (simplified check)
    const faRelated = iconString.toLowerCase().includes('fa') || iconString.toLowerCase().includes('solid') || iconString.toLowerCase().includes('regular') || (parsedPrefix !== undefined);
    if (!faRelated && (iconString.length <= 2 || iconString.match(/\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]/))) {
        return <span className={`${sizeClass} flex-shrink-0`}>{iconString}</span>;
    }
    // Fallback icon if not an emoji and not a valid FA icon
    return <span className="text-gray-400 text-xs flex-shrink-0" title={`Unknown icon: ${iconString}`}><FontAwesomeIcon icon={['far', 'question-circle']} className={sizeClass} /></span>;
  }, []);

  const renderIconForInput = useCallback((iconString?: string): JSX.Element | null => {
    return renderIconDisplay(iconString, "text-lg");
  }, [renderIconDisplay]);


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
      <div className="max-w-4xl mx-auto">
        {notification && (
          <div className={`fixed top-5 right-5 z-[100] p-4 mb-4 rounded-md text-white shadow-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`} role="alert">
            {notification.message}
            <button onClick={() => setNotification(null)} className="ml-4 float-right font-bold text-xl leading-none">&times;</button>
          </div>
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
            옵션 카드를 클릭하여 기본 선택을 빠르게 변경할 수 있습니다.
          </p>

          {globalOptions.length > 0 ? (
            <div className="space-y-8">
              {globalOptions.map(category => (
                <div key={category.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out flex flex-col">
                  <div className="flex justify-end space-x-2 mb-4">
                    <button
                      onClick={() => openLinkModal(category)}
                      className="px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md font-medium"
                    >
                      상품 연결
                    </button>
                    <button
                      onClick={() => handleRemoveCategory(category.id || '')}
                      className="px-4 py-2 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm hover:shadow-md font-medium"
                    >
                      삭제
                    </button>
                  </div>

                  <div className="flex flex-col flex-grow gap-y-4">
                    <div className="w-full pb-4 mb-4 border-b border-gray-200">
                      <div className="flex items-start space-x-3 mb-1">
                        {renderIconDisplay(category.icon, "text-2xl sm:text-3xl")}
                        <h4 className="font-semibold text-2xl text-gray-800">{category.name}</h4>
                      </div>
                    </div>

                    <div className="w-full">
                      {category.choices.length > 0 ? (
                        <div className="flex flex-row flex-wrap gap-3">
                          {category.choices.map(choice => (
                            <div 
                              key={choice.id} 
                              onClick={() => handleSetDefaultChoice(category.id || '', choice.id || '')} // MODIFIED: Added onClick handler
                              className={`bg-slate-50 p-3 rounded-lg flex flex-col items-center justify-center shadow-sm hover:bg-slate-100 transition-colors border ${choice.isDefault ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'} min-w-[80px] md:min-w-[100px] flex-1 text-center cursor-pointer relative`} // MODIFIED: Changed cursor-default to cursor-pointer
                              style={{ minHeight: '90px' }}
                              title={`클릭하여 "${choice.name}"을(를) 기본 선택으로 설정`}
                            >
                              {choice.isDefault && (
                                <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 font-medium shadow-sm">
                                  기본값
                                </div>
                              )}
                              <div className="flex flex-col items-center justify-center flex-grow">
                                {renderIconDisplay(choice.icon, "text-2xl mb-1.5")}
                                <span className="text-xs sm:text-sm text-slate-700 leading-tight">{choice.name}</span>
                              </div>
                              {choice.price_impact !== undefined && ( // Display price impact if it exists
                                  <span className={`mt-2 text-xs font-medium ${choice.price_impact > 0 ? 'text-green-600' : choice.price_impact < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                      ({choice.price_impact > 0 ? '+' : ''}{choice.price_impact.toLocaleString()}원)
                                  </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full bg-gray-50 rounded-md p-6">
                            <p className="text-sm text-gray-500 italic">선택지가 없습니다. 옵션을 추가해주세요.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mt-auto pt-5 border-t border-gray-200">
                    <span className="font-semibold">연결된 상품:</span>
                    {(linkedProductsStoreMap.get(category.id || '') || []).length > 0 ? (
                      <ul className="list-disc list-inside ml-1.5 text-gray-500 text-xs">
                        {(linkedProductsStoreMap.get(category.id || '') || []).map(p => (
                          <li key={p.id}>{p.name}</li>
                        ))}
                      </ul>
                    ) : (
                    <span className="italic ml-1.5 text-gray-500">
                        연결된 상품 없음. '상품 연결' 버튼을 사용하세요.
                    </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !showNewCategory && (
              <div className="text-center py-12 px-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                <FontAwesomeIcon icon={['far', 'folder-open']} className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">글로벌 옵션 없음</h3>
                <p className="mt-1.5 text-sm text-gray-500">새로운 글로벌 옵션 카테고리를 추가하여 시작하세요.</p>
              </div>
            )
          )}
        </div>

        {!showNewCategory ? (
          <button
            onClick={() => setShowNewCategory(true)}
            className="mt-6 w-full p-4 border-2 border-dashed border-blue-500 rounded-xl flex items-center justify-center text-blue-600 hover:text-blue-700 hover:border-blue-600 hover:bg-blue-50 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
          >
            <FontAwesomeIcon icon={['fas', 'plus-circle']} className="w-6 h-6 mr-2.5" />
            새 글로벌 옵션 카테고리 추가
          </button>
        ) : (
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-200 mt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-700">새 옵션 카테고리 생성</h3>
              <button
                onClick={() => { setShowNewCategory(false); setNewCategoryName(''); setNewCategoryIcon(''); setNewChoices([{ name: '', icon: '', isDefault: false }, { name: '', icon: '', isDefault: false }]); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                title="닫기"
              >
                <FontAwesomeIcon icon={['fas', 'times']} className="w-6 h-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
              <div>
                <label htmlFor="category-name" className="block text-sm font-medium text-gray-600 mb-1.5">옵션 카테고리 이름 <span className="text-red-500">*</span></label>
                <input type="text" id="category-name" placeholder="예: 얼음 양, 컵 선택" className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow placeholder-gray-400 sm:text-sm" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">카테고리 아이콘 (선택)</label>
                <div className="flex items-center space-x-2">
                    <button type="button" onClick={() => openIconPicker('category')} className="flex-grow px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors min-h-[3rem] flex items-center">
                        {newCategoryIcon ? renderIconForInput(newCategoryIcon) : <span className="text-gray-400">아이콘 선택...</span>}
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
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-600 mb-1.5">옵션 선택지 <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-500 mb-3">각 선택지에 이름과 아이콘(선택)을 설정할 수 있습니다. 하나의 선택지를 기본값으로 지정하세요.</p>
              <div className="space-y-3">
                {newChoices.map((choice, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                        <span className="text-gray-500 text-sm font-medium w-6 text-center">{index + 1}.</span>
                        <input type="text" placeholder={`선택지 이름`} className="flex-grow px-3 py-2.5 border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md placeholder-gray-400" value={choice.name} onChange={(e) => handleNewChoiceChange(index, 'name', e.target.value)} />
                        <button type="button" onClick={() => openIconPicker(index)} className="p-2.5 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400" title="선택지 아이콘 선택">
                            {choice.icon ? renderIconForInput(choice.icon) : <FontAwesomeIcon icon={['far', 'image']} className="text-gray-400 w-5 h-5" />}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleNewChoiceChange(index, 'isDefault', !choice.isDefault)} 
                          className={`p-2 rounded-md border ${choice.isDefault ? 'bg-blue-100 border-blue-400 text-blue-600' : 'border-gray-300 text-gray-400 hover:bg-gray-100'}`}
                          title={choice.isDefault ? "기본 선택 해제" : "기본 선택으로 설정"}
                        >
                          <FontAwesomeIcon icon={['fas', 'check-circle']} className="w-5 h-5" />
                        </button>
                        {newChoices.length > 1 && ( // Only show remove button if there's more than one choice
                            <button type="button" onClick={() => handleRemoveNewChoice(index)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors" title="선택지 삭제">
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
                      {choice.icon && ( // Show icon input only if an icon is selected/entered
                          <input type="text" placeholder='예: "fas star" 또는 ⭐' className="block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-shadow placeholder-gray-400 text-xs" value={choice.icon} onChange={(e) => handleNewChoiceChange(index, 'icon', e.target.value)} title="선택한 아이콘 (직접 수정 가능)"/>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleAddChoiceInput} className="mt-4 flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 px-3 rounded-lg hover:bg-blue-100 transition-colors group">
                <FontAwesomeIcon icon={['fas', 'plus-circle']} className="w-5 h-5 mr-1.5 text-blue-500 group-hover:text-blue-600 transition-colors" />
                선택지 추가
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-8 pt-6 border-t border-gray-200">
              <button type="button" onClick={() => { setShowNewCategory(false); setNewCategoryName(''); setNewCategoryIcon(''); setNewChoices([{ name: '', icon: '', isDefault: false }, { name: '', icon: '', isDefault: false }]); }} className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors w-full sm:w-auto">취소</button>
              <button type="button" onClick={handleAddCategory} className="px-6 py-2.5 bg-blue-600 border border-transparent rounded-lg shadow-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-full sm:w-auto">카테고리 추가 완료</button>
            </div>
          </div>
        )}
        
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
                        {faIconNames.map(iconName => ( // Only map through curated list
                            <button key={`fas-${iconName}`} type="button" onClick={() => handleIconSelect(`fas ${iconName}`)} className="p-3 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-blue-100 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all aspect-square" title={`fas ${iconName}`}>
                                <FontAwesomeIcon icon={['fas', iconName]} className="text-2xl text-gray-700" />
                            </button>
                        ))}
                        {faIconNames.map(iconName => (  // Only map through curated list
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

        {showLinkModal && selectedOption && (
          <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300 ease-in-out p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 shadow-xl transform transition-all sm:max-w-lg w-full max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  {renderIconDisplay(selectedOption.icon)}
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
