import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Product } from '@/utils/type'; // Use Product type directly

interface SortableDividerItemProps {
  divider: Pick<Product, 'product_id' | 'product_name'>; // Only need these two properties for dividers
  onRemove: (dividerId: string) => void;
}

const SortableDividerItem: React.FC<SortableDividerItemProps> = ({ divider, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `divider-${divider.product_id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`my-3 rounded-lg ${isDragging ? 'shadow-xl' : ''}`}
    >
      <div className="flex items-center justify-between bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500 rounded-md px-4 py-3 transition-colors">
        <div className="flex items-center flex-grow">
          {/* Drag Handle Icon */}
          <button 
            {...attributes} 
            {...listeners} 
            className="cursor-move mr-3 p-1 text-blue-500 hover:text-blue-700 touch-none" // Added touch-none for better mobile dnd
            aria-label="카테고리 순서 변경"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="font-semibold text-blue-700 text-base truncate" title={divider.product_name}>
            {divider.product_name}
          </span>
        </div>
        <button
          onClick={() => onRemove(divider.product_id.toString())}
          className="ml-2 p-1 text-blue-400 hover:text-red-600 flex-shrink-0 transition-colors"
          title="카테고리 삭제"
          aria-label="카테고리 삭제"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SortableDividerItem;
