import React, { useState } from 'react';

// Interface for option items
export interface OptionItem {
  id: string;
  name: string;
  priceAdjustment: number;
}

// Interface for option groups/categories
export interface OptionGroup {
  id: string;
  name: string;
  isRequired: boolean;
  allowMultiple: boolean;
  options: OptionItem[];
}

interface OrderOptionSelectorProps {
  optionGroups: OptionGroup[];
  onSelectionChange: (selections: Record<string, string | string[]>) => void;
  initialSelections?: Record<string, string | string[]>;
}

const OrderOptionSelector: React.FC<OrderOptionSelectorProps> = ({
  optionGroups,
  onSelectionChange,
  initialSelections = {}
}) => {
  // State to track selected options for each group
  const [selections, setSelections] = useState<Record<string, string | string[]>>(initialSelections);

  // Handle option selection
  const handleOptionSelect = (groupId: string, optionId: string) => {
    const group = optionGroups.find(g => g.id === groupId);
    
    if (!group) return;
    
    let newSelections = { ...selections };
    
    if (group.allowMultiple) {
      // For multiple selection
      const currentSelections = (selections[groupId] as string[]) || [];
      
      if (currentSelections.includes(optionId)) {
        // Remove selection if already selected
        newSelections[groupId] = currentSelections.filter(id => id !== optionId);
        // If required and empty now, add back first option
        if (group.isRequired && (newSelections[groupId] as string[]).length === 0) {
          newSelections[groupId] = [optionId];
        }
      } else {
        // Add selection
        newSelections[groupId] = [...currentSelections, optionId];
      }
    } else {
      // For single selection
      newSelections[groupId] = optionId;
    }
    
    setSelections(newSelections);
    onSelectionChange(newSelections);
  };

  // Check if an option is selected
  const isOptionSelected = (groupId: string, optionId: string): boolean => {
    const selection = selections[groupId];
    
    if (!selection) return false;
    
    if (Array.isArray(selection)) {
      return selection.includes(optionId);
    }
    
    return selection === optionId;
  };

  // Find option price adjustment
  const getOptionPriceAdjustment = (groupId: string, optionId: string): number => {
    const group = optionGroups.find(g => g.id === groupId);
    if (!group) return 0;
    
    const option = group.options.find(o => o.id === optionId);
    return option?.priceAdjustment || 0;
  };

  // Initialize default selections for any required groups that have no selection
  React.useEffect(() => {
    let newSelections = { ...selections };
    let hasChanges = false;
    
    optionGroups.forEach(group => {
      if (group.isRequired && !selections[group.id] && group.options.length > 0) {
        if (group.allowMultiple) {
          newSelections[group.id] = [group.options[0].id];
        } else {
          newSelections[group.id] = group.options[0].id;
        }
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setSelections(newSelections);
      onSelectionChange(newSelections);
    }
  }, [optionGroups]);

  return (
    <div className="w-full">
      {optionGroups.map(group => (
        <div key={group.id} className="mb-8">
          {/* Category header */}
          <div className="mb-3 pb-2 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-medium text-gray-700">{group.name}</h3>
              {group.isRequired && (
                <span className="text-xs text-red-600 font-medium">
                  필수
                </span>
              )}
            </div>
          </div>
          
          {/* Options grid */}
          <div className="grid grid-cols-4 gap-3">
            {group.options.map(option => {
              const isSelected = isOptionSelected(group.id, option.id);
              const priceAdjustment = getOptionPriceAdjustment(group.id, option.id);
              
              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(group.id, option.id)}
                  className="flex flex-col items-center"
                >
                  {/* Circular button similar to the image */}
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${
                      isSelected 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } transition-colors`}
                  >
                    <span className="text-sm">{option.name.slice(0, 1)}</span>
                  </div>
                  
                  {/* Option name below the button */}
                  <span className={`text-xs text-center ${isSelected ? 'font-medium' : ''}`}>
                    {option.name}
                    {priceAdjustment !== 0 && (
                      <span className="block text-xs">
                        {priceAdjustment > 0 ? '+' : ''}{priceAdjustment}원
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderOptionSelector; 