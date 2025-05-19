import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DividerItemProps {
  divider: {
    product_id: string;
    product_name: string;
  };
  onRemove: (id: string) => void;
}

const SortableDividerItem = ({ divider, onRemove }: DividerItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: `divider-${divider.product_id}`,
    data: {
      divider,
      type: 'divider'
    }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  
  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...attributes} 
      {...listeners}
      className={`my-2 p-3 rounded-md cursor-move ${isDragging ? 'z-50' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-2 text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-blue-700">{divider.product_name}</span>
            <span className="text-xs text-blue-500">카테고리</span>
          </div>
        </div>
        
        <div className="flex items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(divider.product_id);
            }}
            className="p-1 text-red-500 hover:text-red-700 bg-white rounded-full hover:bg-red-50"
            title="카테고리 삭제"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SortableDividerItem;
