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
          placeholder="메뉴 카테고리 입력 (예: 에스프레소, 논커피, 티)"
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
        <div className="text-xs text-gray-600 italic mb-2 bg-yellow-50 p-2 rounded border border-yellow-200">
          <p>💡 <strong>카테고리 활용 방법:</strong> 카테고리를 추가한 후, 그 아래에 관련 제품을 드래그해 놓으세요. 같은 카테고리 아래 있는 상품들은 키오스크에서 그룹으로 표시됩니다.</p>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
          >
            취소
          </button>
          <button
            onClick={onSave}
            className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
            disabled={!inputValue.trim()}
          >
            카테고리 추가
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="relative my-1 group cursor-pointer flex items-center justify-center"
    >
      <div
        className="w-full flex items-center justify-center
                   h-2 group-hover:h-10
                   opacity-0 group-hover:opacity-100
                   transform scale-95 group-hover:scale-100
                   transition-all duration-200 ease-in-out"
      >
        <div className="bg-blue-50 group-hover:bg-blue-100 rounded-md px-4 py-2 flex items-center text-blue-500 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-sm font-medium">메뉴 카테고리 추가</span>
        </div>
      </div>
    </div>
  );
};

export default AddDividerPlaceholder; 