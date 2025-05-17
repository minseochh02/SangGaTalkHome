import React, { useState } from 'react';
import OrderOptionSelector, { OptionGroup } from './OrderOptionSelector';

const OptionSelectorDemo: React.FC = () => {
  // Sample option groups with categories like ice and cup size
  const sampleOptionGroups: OptionGroup[] = [
    {
      id: 'ice-level',
      name: '얼음 양',
      isRequired: true,
      allowMultiple: false,
      options: [
        { id: 'less-ice', name: '얼음 적게', priceAdjustment: 0 },
        { id: 'regular-ice', name: '얼음 보통', priceAdjustment: 0 },
        { id: 'more-ice', name: '얼음 많이', priceAdjustment: 0 },
      ]
    },
    {
      id: 'cup-size',
      name: '컵 사이즈',
      isRequired: true,
      allowMultiple: false,
      options: [
        { id: 'small', name: '스몰', priceAdjustment: -500 },
        { id: 'regular', name: '레귤러', priceAdjustment: 0 },
        { id: 'large', name: '라지', priceAdjustment: 1000 },
      ]
    },
    {
      id: 'sugar-level',
      name: '당도',
      isRequired: false,
      allowMultiple: false,
      options: [
        { id: 'less-sugar', name: '덜 달게', priceAdjustment: 0 },
        { id: 'regular-sugar', name: '보통', priceAdjustment: 0 },
        { id: 'more-sugar', name: '달게', priceAdjustment: 0 },
      ]
    },
    {
      id: 'toppings',
      name: '토핑',
      isRequired: false,
      allowMultiple: true,
      options: [
        { id: 'pearl', name: '타피오카 펄', priceAdjustment: 500 },
        { id: 'cream', name: '크림 추가', priceAdjustment: 500 },
        { id: 'cheese', name: '치즈폼', priceAdjustment: 1000 },
      ]
    }
  ];

  // State to track the selected options
  const [selections, setSelections] = useState<Record<string, string | string[]>>({});
  
  // Calculate the total price adjustment based on selections
  const calculateTotalPriceAdjustment = (): number => {
    let totalAdjustment = 0;
    
    Object.entries(selections).forEach(([groupId, selection]) => {
      const group = sampleOptionGroups.find(g => g.id === groupId);
      if (!group) return;
      
      if (Array.isArray(selection)) {
        // For multiple selections (like toppings)
        selection.forEach(optionId => {
          const option = group.options.find(o => o.id === optionId);
          if (option) totalAdjustment += option.priceAdjustment;
        });
      } else {
        // For single selections (like ice, cup size)
        const option = group.options.find(o => o.id === selection);
        if (option) totalAdjustment += option.priceAdjustment;
      }
    });
    
    return totalAdjustment;
  };
  
  // Handle option selection changes
  const handleSelectionChange = (newSelections: Record<string, string | string[]>) => {
    setSelections(newSelections);
    console.log('Selected options:', newSelections);
  };

  // Base price of the product (for demo purposes)
  const basePrice = 5000;
  const totalPrice = basePrice + calculateTotalPriceAdjustment();

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Product header with image and basic info */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
        <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden">
          <img
            src="https://via.placeholder.com/80"
            alt="아메리카노"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">아메리카노</h2>
          <p className="text-lg font-medium text-gray-700">{basePrice.toLocaleString()}원</p>
          
          {/* Quantity selector */}
          <div className="flex items-center mt-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-700">
              -
            </button>
            <span className="mx-4 font-medium">1</span>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-700">
              +
            </button>
          </div>
        </div>
      </div>
      
      {/* Options selector */}
      <OrderOptionSelector
        optionGroups={sampleOptionGroups}
        onSelectionChange={handleSelectionChange}
      />
      
      {/* Order summary and add to cart */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-medium text-gray-800">총 금액</span>
          <span className="text-xl font-bold text-indigo-700">{totalPrice.toLocaleString()}원</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button className="py-3 px-4 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">
            장바구니
          </button>
          <button className="py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            바로 주문하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default OptionSelectorDemo; 