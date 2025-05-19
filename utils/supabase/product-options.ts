import { createClient } from './client';
import { ProductOptionGroup, ProductOptionChoice } from '@/utils/type';
import { v4 as uuidv4 } from 'uuid';

/**
 * Fetches all option groups and their choices for a specific product
 * 
 * @param productId - The ID of the product to fetch options for
 * @returns A Promise that resolves to an array of ProductOptionGroup objects
 */
export const fetchProductOptions = async (productId: string): Promise<ProductOptionGroup[]> => {
  const supabase = createClient();
  
  try {
    // First, fetch all option groups for this product
    const { data: optionGroups, error: groupsError } = await supabase
      .from('product_option_groups')
      .select('*')
      .eq('product_id', productId)
      .order('display_order', { ascending: true });
      
    if (groupsError) throw groupsError;
    
    if (!optionGroups || optionGroups.length === 0) {
      // No option groups found for this product
      return [];
    }
    
    // Now fetch all option choices for these groups in a single query for efficiency
    const groupIds = optionGroups.map(group => group.option_group_id);
    
    const { data: optionChoices, error: choicesError } = await supabase
      .from('product_option_choices')
      .select('*')
      .in('option_group_id', groupIds)
      .order('display_order', { ascending: true });
      
    if (choicesError) throw choicesError;
    
    // Map choices to their respective groups
    const optionGroupsWithChoices: ProductOptionGroup[] = optionGroups.map(group => {
      const choices = (optionChoices || [])
        .filter(choice => choice.option_group_id === group.option_group_id)
        .map(choice => ({
          option_choice_id: choice.option_choice_id,
          option_group_id: choice.option_group_id,
          choice_name: choice.choice_name,
          price_adjustment: choice.price_adjustment,
          display_order: choice.display_order,
          is_default: choice.is_default,
          is_sold_out: choice.is_sold_out,
          choice_icon: choice.choice_icon
        } as ProductOptionChoice));
        
      return {
        option_group_id: group.option_group_id,
        product_id: group.product_id,
        store_id: group.store_id,
        group_name: group.group_name,
        display_order: group.display_order,
        selection_type: group.selection_type as 'single' | 'multiple',
        group_icon: group.group_icon,
        choices: choices
      } as ProductOptionGroup;
    });
    
    return optionGroupsWithChoices;
  } catch (error) {
    console.error('Error fetching product options:', error);
    throw error;
  }
};

/**
 * Saves option groups and their choices for a product. 
 * Uses a delete-all-and-reinsert approach for the specific product:
 * 1. Delete all existing choices for the product's groups
 * 2. Delete all existing groups for the product
 * 3. Insert new groups with the provided data
 * 4. Insert new choices for the groups
 * 
 * @param productId - The ID of the product to save options for
 * @param storeId - The ID of the store that owns the product
 * @param optionGroups - Array of ProductOptionGroup objects to save
 * @returns A Promise that resolves when the save operation is complete
 */
export const saveProductOptions = async (
  productId: string, 
  storeId: string,
  optionGroups: ProductOptionGroup[]
): Promise<void> => {
  const supabase = createClient();
  
  try {
    console.log(`[saveProductOptions] Starting save process for product ${productId}`);
    console.log(`[saveProductOptions] Number of option groups to save: ${optionGroups.length}`);
    
    // Start by fetching existing group IDs for this product
    const { data: existingGroups, error: fetchError } = await supabase
      .from('product_option_groups')
      .select('option_group_id')
      .eq('product_id', productId);
      
    if (fetchError) {
      console.error(`[saveProductOptions] Error fetching existing groups:`, fetchError);
      throw fetchError;
    }
    
    console.log(`[saveProductOptions] Found ${existingGroups?.length || 0} existing option groups`);
    
    // If we have existing groups, delete their choices first
    if (existingGroups && existingGroups.length > 0) {
      const existingGroupIds = existingGroups.map(g => g.option_group_id);
      console.log(`[saveProductOptions] Deleting choices for existing groups:`, existingGroupIds);
      
      const { error: deleteChoicesError } = await supabase
        .from('product_option_choices')
        .delete()
        .in('option_group_id', existingGroupIds);
        
      if (deleteChoicesError) {
        console.error(`[saveProductOptions] Error deleting existing choices:`, deleteChoicesError);
        throw deleteChoicesError;
      }
      
      console.log(`[saveProductOptions] Successfully deleted existing choices`);
      
      // Then delete the groups
      const { error: deleteGroupsError } = await supabase
        .from('product_option_groups')
        .delete()
        .eq('product_id', productId);
        
      if (deleteGroupsError) {
        console.error(`[saveProductOptions] Error deleting existing groups:`, deleteGroupsError);
        throw deleteGroupsError;
      }
      
      console.log(`[saveProductOptions] Successfully deleted existing groups`);
    }
    
    // Early exit if there are no option groups to save
    if (!optionGroups || optionGroups.length === 0) {
      console.log(`[saveProductOptions] No new option groups to save, exiting early`);
      return;
    }
    
    // Prepare data for insert
    const groupsToInsert = optionGroups.map((group, index) => {
      const groupId = group.option_group_id || uuidv4();
      
      return {
        option_group_id: groupId,
        product_id: productId,
        store_id: storeId,
        group_name: group.group_name,
        display_order: group.display_order !== undefined ? group.display_order : index,
        selection_type: group.selection_type || 'single',
        group_icon: group.group_icon
      };
    });
    
    console.log(`[saveProductOptions] Inserting ${groupsToInsert.length} option groups`);
    
    // Insert the groups
    const { error: insertGroupsError, data: insertedGroups } = await supabase
      .from('product_option_groups')
      .insert(groupsToInsert)
      .select();
      
    if (insertGroupsError) {
      console.error(`[saveProductOptions] Error inserting option groups:`, insertGroupsError);
      throw insertGroupsError;
    }
    
    console.log(`[saveProductOptions] Successfully inserted ${insertedGroups?.length || 0} groups`);
    
    // Prepare choices data for insert
    let choicesToInsert: any[] = [];
    
    optionGroups.forEach((group, groupIndex) => {
      // Match the inserted group with its choices
      const insertedGroup = insertedGroups?.[groupIndex];
      const groupId = insertedGroup?.option_group_id || group.option_group_id;
      
      if (!groupId) {
        console.error('[saveProductOptions] Missing group ID for choices', group);
        return;
      }
      
      const groupChoices = group.choices.map((choice, choiceIndex) => ({
        option_choice_id: choice.option_choice_id || uuidv4(),
        option_group_id: groupId,
        choice_name: choice.choice_name,
        price_adjustment: choice.price_adjustment !== undefined ? choice.price_adjustment : 0,
        display_order: choice.display_order !== undefined ? choice.display_order : choiceIndex,
        is_default: choice.is_default !== undefined ? choice.is_default : false,
        is_sold_out: choice.is_sold_out !== undefined ? choice.is_sold_out : false,
        choice_icon: choice.choice_icon
      }));
      
      choicesToInsert = [...choicesToInsert, ...groupChoices];
    });
    
    console.log(`[saveProductOptions] Inserting ${choicesToInsert.length} option choices`);
    
    // Insert the choices
    if (choicesToInsert.length > 0) {
      const { error: insertChoicesError } = await supabase
        .from('product_option_choices')
        .insert(choicesToInsert);
        
      if (insertChoicesError) {
        console.error(`[saveProductOptions] Error inserting option choices:`, insertChoicesError);
        throw insertChoicesError;
      }
      
      console.log(`[saveProductOptions] Successfully inserted all choices`);
    }
    
    console.log(`[saveProductOptions] Completed save process for product ${productId}`);
  } catch (error) {
    console.error('Error saving product options:', error);
    throw error;
  }
};

/**
 * Transform ProductOptionCategory objects (used by the current UI) to ProductOptionGroup objects
 * This is a transition helper while updating the UI components
 */
export const transformCategoriesToGroups = (
  categories: any[], // Using any[] to accommodate the transitional type
  productId: string,
  storeId: string
): ProductOptionGroup[] => {
  return categories.map((category, categoryIndex) => {
    // Handle choices transformation
    const choices: ProductOptionChoice[] = (category.choices || []).map((choice: any, choiceIndex: number) => ({
      option_choice_id: choice.option_choice_id || choice.id || uuidv4(),
      option_group_id: category.option_group_id || category.id || uuidv4(),
      choice_name: choice.choice_name || choice.name || '',
      price_adjustment: choice.price_adjustment !== undefined ? choice.price_adjustment : 0,
      display_order: choice.display_order !== undefined ? choice.display_order : choiceIndex,
      is_default: choice.is_default !== undefined ? choice.is_default : false,
      is_sold_out: choice.is_sold_out !== undefined ? choice.is_sold_out : false,
      choice_icon: choice.choice_icon || null
    }));

    // Create ProductOptionGroup from category
    return {
      option_group_id: category.option_group_id || category.id || uuidv4(),
      product_id: productId,
      store_id: storeId,
      group_name: category.group_name || category.name || '',
      display_order: category.display_order !== undefined ? category.display_order : categoryIndex,
      selection_type: category.selection_type || 'single',
      group_icon: category.group_icon || null,
      choices
    };
  });
};

/**
 * Transform ProductOptionGroup objects to ProductOptionCategory objects 
 * This is a transition helper while updating the UI components
 */
export const transformGroupsToCategories = (groups: ProductOptionGroup[]): any[] => {
  return groups.map(group => ({
    id: group.option_group_id,
    name: group.group_name,
    display_order: group.display_order,
    selection_type: group.selection_type,
    group_icon: group.group_icon,
    choices: group.choices.map(choice => ({
      id: choice.option_choice_id,
      name: choice.choice_name,
      price_adjustment: choice.price_adjustment,
      display_order: choice.display_order,
      is_default: choice.is_default,
      is_sold_out: choice.is_sold_out,
      choice_icon: choice.choice_icon
    }))
  }));
}; 