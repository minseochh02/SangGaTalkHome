import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableContainerProps {
  id: string;
  items: string[]; // Or a more specific type if items have a structure
  children: React.ReactNode;
  className?: string;
}

const DroppableContainer = ({ 
  id, 
  items, 
  children, 
  className 
}: DroppableContainerProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'container',
      accepts: items // This implies that `items` is an array of accepted draggable ids
    }
  });

  const isHighlighted = isOver;
  const highlightClass = isHighlighted 
    ? id === 'kioskProducts' // Specific styling based on container ID
      ? 'bg-green-50 border-green-300' 
      : 'bg-blue-50 border-blue-300' 
    : 'bg-white border-gray-200';

  return (
    <div 
      ref={setNodeRef} 
      className={`min-h-[400px] p-2 rounded-lg border transition-colors duration-200 ${highlightClass} ${className || ''}`}
    >
      {children}
    </div>
  );
};

export default DroppableContainer; 