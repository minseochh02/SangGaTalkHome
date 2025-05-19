import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UniqueIdentifier } from '@dnd-kit/core';

export interface DividerItemData {
  id: UniqueIdentifier;
  type: 'divider';
  name: string;
  // onRemove?: (id: UniqueIdentifier) => void; // Optional: if you want a remove button on dividers
}

interface SortableDividerItemProps {
  divider: DividerItemData;
}

const SortableDividerItem: React.FC<SortableDividerItemProps> = ({ divider }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: divider.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 100 : 'auto', // Ensure dragging item is on top
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 my-2 rounded-md border shadow-sm transition-shadow ${
        isDragging ? 'bg-blue-100 border-blue-400' : 'bg-gray-100 border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div 
            {...attributes} // Make only part of it draggable if needed, or whole thing
            {...listeners} // Spread listeners for drag handle
            className="flex-grow text-center text-sm font-semibold text-gray-700 cursor-grab py-1"
        >
          {divider.name}
        </div>
        {/* Optional: Remove button for the divider 
        {divider.onRemove && (
            <button 
                onClick={() => divider.onRemove && divider.onRemove(divider.id)}
                className="ml-2 p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-200"
                aria-label={`Remove category ${divider.name}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        )}
        */}
      </div>
    </div>
  );
};

export default SortableDividerItem;
