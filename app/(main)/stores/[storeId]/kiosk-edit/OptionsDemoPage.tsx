import React from 'react';
import OptionSelectorDemo from './OptionSelectorDemo';

const OptionsDemoPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">주문 옵션 선택 데모</h1>
      <p className="text-gray-600 mb-6">
        다음은 키오스크에서 사용자가 상품을 선택했을 때 표시되는 옵션 선택 인터페이스의 데모입니다.
        각 상품에 대한 얼음 양, 컵 사이즈, 당도, 토핑 등의 옵션을 선택할 수 있습니다.
      </p>
      
      <div className="max-w-lg mx-auto bg-gray-100 p-6 rounded-xl">
        <OptionSelectorDemo />
      </div>
      
      <div className="mt-8 p-6 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">사용 방법</h2>
        <ol className="list-decimal ml-5 space-y-2">
          <li>
            <strong>DefaultOptionsEditor</strong> 컴포넌트를 사용하여 스토어 관리자가 기본 옵션 그룹과 옵션을 설정합니다.
          </li>
          <li>
            설정된 옵션 데이터는 서버에 저장됩니다.
          </li>
          <li>
            키오스크 주문 화면에서 <strong>OrderOptionSelector</strong> 컴포넌트를 사용하여 사용자가 옵션을 선택합니다.
          </li>
          <li>
            선택된 옵션은 주문 데이터에 포함되어 처리됩니다.
          </li>
        </ol>
      </div>
    </div>
  );
};

export default OptionsDemoPage; 