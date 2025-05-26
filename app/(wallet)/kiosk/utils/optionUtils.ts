import { createClient } from '@/utils/supabase/client';

export interface OptionFee {
  id: string;
  name: string;
  price_impact: number;
  won_price: number | null;
  sgt_price: number;
  icon?: string;
  is_default: boolean;
}

export interface OptionGroup {
  id: string;
  name: string;
  choices: OptionFee[];
  icon?: string;
}

/**
 * Fetches option fees for a specific product from the database
 */
export const fetchProductOptionFees = async (productId: string): Promise<OptionGroup[]> => {
  const supabase = createClient();
  
  try {
    // First get the option groups linked to this product
    const { data: linkedOptions, error: linkError } = await supabase
      .from('product_global_option_links')
      .select('store_option_group_id')
      .eq('product_id', productId);
    
    if (linkError || !linkedOptions || linkedOptions.length === 0) {
      console.log(`No options found for product ${productId}`);
      return [];
    }
    
    const groupIds = linkedOptions.map(link => link.store_option_group_id);
    
    // Fetch option groups
    const { data: groups, error: groupError } = await supabase
      .from('store_option_groups')
      .select('*')
      .in('id', groupIds)
      .order('display_order', { ascending: true });
    
    if (groupError || !groups) {
      console.error('Error fetching option groups:', groupError);
      return [];
    }
    
    // Fetch option choices for these groups
    const { data: choices, error: choicesError } = await supabase
      .from('store_option_choices')
      .select('id, name, group_id, price_impact, won_price, sgt_price, icon, is_default')
      .in('group_id', groupIds)
      .order('display_order', { ascending: true });
    
    if (choicesError || !choices) {
      console.error('Error fetching option choices:', choicesError);
      return [];
    }
    
    // Map data to our structure
    const optionGroups: OptionGroup[] = groups.map(group => ({
      id: group.id,
      name: group.name,
      icon: group.icon || undefined,
      choices: choices
        .filter(choice => choice.group_id === group.id)
        .map(choice => ({
          id: choice.id,
          name: choice.name,
          price_impact: choice.price_impact || 0,
          won_price: choice.won_price,
          sgt_price: choice.sgt_price || 0,
          icon: choice.icon || undefined,
          is_default: choice.is_default || false
        }))
    }));
    
    return optionGroups;
  } catch (err) {
    console.error('Error in fetchProductOptionFees:', err);
    return [];
  }
};

/**
 * Fetches a single option fee by its ID
 */
export const fetchOptionFeeById = async (optionId: string): Promise<OptionFee | null> => {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('store_option_choices')
      .select('id, name, price_impact, won_price, sgt_price, icon, is_default')
      .eq('id', optionId)
      .single();
    
    if (error || !data) {
      console.error('Error fetching option fee by ID:', error);
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      price_impact: data.price_impact || 0,
      won_price: data.won_price,
      sgt_price: data.sgt_price || 0,
      icon: data.icon || undefined,
      is_default: data.is_default || false
    };
  } catch (err) {
    console.error('Error in fetchOptionFeeById:', err);
    return null;
  }
};

/**
 * Calculates the total fee impact for a set of selected options
 */
export const calculateTotalFeeImpact = (selectedOptions: string[]): Promise<number> => {
  return new Promise(async (resolve) => {
    let totalImpact = 0;
    
    try {
      const supabase = createClient();
      if (selectedOptions.length === 0) {
        resolve(0);
        return;
      }
      
      const { data, error } = await supabase
        .from('store_option_choices')
        .select('price_impact')
        .in('id', selectedOptions);
      
      if (error || !data) {
        console.error('Error calculating total fee impact:', error);
        resolve(0);
        return;
      }
      
      totalImpact = data.reduce((sum, option) => sum + (option.price_impact || 0), 0);
    } catch (err) {
      console.error('Error in calculateTotalFeeImpact:', err);
    }
    
    resolve(totalImpact);
  });
}; 