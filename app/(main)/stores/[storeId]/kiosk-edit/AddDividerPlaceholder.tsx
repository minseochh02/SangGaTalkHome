import React from 'react';

interface AddDividerPlaceholderProps {
  onClick: () => void; // Called when the placeholder itself (plus icon area) is clicked to show input
  showInput: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const AddDividerPlaceholder: React.FC<AddDividerPlaceholderProps> = ({
  onClick,
  showInput,
  inputValue,
  onInputChange,
  onSave,
  onCancel,
}) => {
  if (showInput) {
    return (
      <div className="my-2 p-2 border border-blue-300 rounded bg-blue-50 shadow-sm">
        <input
          type="text"
          placeholder="Enter divider name"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-2 focus:ring-blue-500 focus:border-blue-500"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSave();
            } else if (e.key === 'Escape') {
              onCancel();
            }
          }}
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
            disabled={!inputValue.trim()}
          >
            Save Divider
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="relative my-1 h-8 flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-md cursor-pointer group transition-all duration-150 ease-in-out"
      title="Add a divider here"
    >
      <div className="flex items-center text-gray-400 group-hover:text-blue-500 transition-colors duration-150">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span className="ml-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out">Add Divider</span>
      </div>
      {/* Thin line that appears on hover for better visual cue */}
      <div className="absolute left-0 right-0 mx-auto w-3/4 h-px bg-blue-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-200 ease-out"></div>
    </div>
  );
};

export default AddDividerPlaceholder; 