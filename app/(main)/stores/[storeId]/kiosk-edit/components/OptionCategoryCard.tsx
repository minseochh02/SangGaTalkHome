import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ProductOptionCategory, LinkedProductInfo } from '../GlobalOptionEditor'; // Types
import { renderIconDisplay } from './iconUtils'; // Icon rendering

interface OptionCategoryCardProps {
  category: ProductOptionCategory;
  linkedProducts: LinkedProductInfo[];
  onLinkProducts: (category: ProductOptionCategory) => void;
  onRemoveCategory: (categoryId: string) => void;
  onSetDefaultChoice: (categoryId: string, choiceId: string) => void;
}

const OptionCategoryCard: React.FC<OptionCategoryCardProps> = ({
  category,
  linkedProducts,
  onLinkProducts,
  onRemoveCategory,
  onSetDefaultChoice,
}) => {
  return (
    <div key={category.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out flex flex-col">
      <div className="flex justify-end space-x-2 mb-4">
        <button
          onClick={() => onLinkProducts(category)}
          className="px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md font-medium"
        >
          상품 연결
        </button>
        <button
          onClick={() => onRemoveCategory(category.id || '')}
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
                  onClick={() => onSetDefaultChoice(category.id || '', choice.id || '')} 
                  className={`bg-slate-50 p-3 rounded-lg flex flex-col items-center justify-center shadow-sm hover:bg-slate-100 transition-colors border ${choice.isDefault ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'} min-w-[80px] md:min-w-[100px] flex-1 text-center cursor-pointer relative`}
                  style={{ minHeight: '90px' }}
                  title={`클릭하여 "${choice.name}"을(를) 기본 선택으로 설정`}
                >
                  {choice.isDefault && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 font-medium shadow-sm">
                      기본값
                    </div>
                  )}
                  
                  {/* Price badges as overlays */}
                  <div className="absolute -top-2 left-2 flex gap-1">
                    {/* Won price badge */}
                    <div className={`rounded-full py-0.5 px-1.5 inline-flex items-center shadow-sm ${
                      choice.won_price && choice.won_price > 0 
                        ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}>
                      <FontAwesomeIcon icon={['fas', 'won-sign']} className="h-2.5 w-2.5" />
                      <span className="ml-0.5 text-[10px] font-medium">
                        {choice.won_price ? choice.won_price.toLocaleString() : '0'}
                      </span>
                    </div>
                    
                    {/* SGT price badge */}
                    {(choice.sgt_price !== undefined && choice.sgt_price !== null) && (
                      <div className={`rounded-full py-0.5 px-1.5 inline-flex items-center shadow-sm ${
                        choice.sgt_price > 0 
                          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }`}>
                        <span className="text-[10px] font-medium">SGT</span>
                        <span className="ml-0.5 text-[10px] font-medium">
                          {choice.sgt_price ? choice.sgt_price.toLocaleString() : '0'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-center justify-center flex-grow">
                    {renderIconDisplay(choice.icon, "text-2xl mb-1.5")}
                    <span className="text-xs sm:text-sm text-slate-700 leading-tight">{choice.name}</span>
                  </div>
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
        {linkedProducts.length > 0 ? (
          <ul className="list-disc list-inside ml-1.5 text-gray-500 text-xs">
            {linkedProducts.map(p => (
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
  );
};

export default OptionCategoryCard; 