import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconName } from '@fortawesome/fontawesome-svg-core';

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

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIconSelect: (iconValue: string) => void;
}

const IconPickerModal: React.FC<IconPickerModalProps> = ({ isOpen, onClose, onIconSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl p-5 sm:p-6 w-full max-w-xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold text-gray-800">아이콘 선택</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
            <FontAwesomeIcon icon={['fas', 'times']} className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto flex-grow grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 custom-scrollbar pr-2">
          {faIconNames.map(iconName => (
            <button 
              key={`fas-${iconName}`} 
              type="button" 
              onClick={() => onIconSelect(`fas ${iconName}`)} 
              className="p-3 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-blue-100 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all aspect-square" 
              title={`fas ${iconName}`}
            >
              <FontAwesomeIcon icon={['fas', iconName]} className="text-2xl text-gray-700" />
            </button>
          ))}
          {faIconNames.map(iconName => (
            <button 
              key={`far-${iconName}`} 
              type="button" 
              onClick={() => onIconSelect(`far ${iconName}`)} 
              className="p-3 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-blue-100 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all aspect-square" 
              title={`far ${iconName}`}
            >
              <FontAwesomeIcon icon={['far', iconName]} className="text-2xl text-gray-700" />
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">닫기</button>
        </div>
      </div>
    </div>
  );
};

export default IconPickerModal; 