"use client";

import { useState } from 'react';

export default function KioskTutorialPage() {
  const [activeTab, setActiveTab] = useState('customer');

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl font-sans">
      <header className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">키오스크 사용 가이드</h1>
        <p className="text-md text-gray-600 mt-2">
          고객님과 점주님 모두를 위한 키오스크 기능 사용 방법을 안내합니다.
        </p>
      </header>

      {/* Tab Navigation */}
      <div className="mb-8 flex justify-center border-b border-gray-300">
        <button
          className={`px-6 py-3 font-semibold text-lg focus:outline-none ${
            activeTab === 'customer'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('customer')}
        >
          고객 가이드
        </button>
        <button
          className={`px-6 py-3 font-semibold text-lg focus:outline-none ${
            activeTab === 'storeOwner'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('storeOwner')}
        >
          점주 가이드
        </button>
      </div>

      {/* Customer Tutorial Section */}
      {activeTab === 'customer' && (
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-700 mb-6 pb-2 border-b border-gray-300">
            고객 가이드: 키오스크로 주문하기
          </h2>
          <p className="mb-6 text-gray-600">
            다음 단계에 따라 키오스크를 사용하여 쉽게 주문하세요.
          </p>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">1. 키오스크 접속하기</h3>
              <p className="text-gray-600 mb-3">다음 두 가지 방법으로 상점의 키오스크에 접속할 수 있습니다:</p>
              <div className="ml-4 space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-700">방법 A: 웹사이트 내 탐색</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
                    <li>웹사이트에서 상점이나 카테고리를 검색하여 시작하세요.</li>
                    <li>주문하고 싶은 상점을 선택하세요.</li>
                    <li>상점 페이지에서 <strong>"키오스크 페이지로 이동"</strong> 버튼을 찾아 탭하세요.</li>
                  </ul>
                  <img src="/images/kiosk_tutorial/customer_step_1a_app_navigation.jpeg" alt="고객 - 1A단계 - '키오스크 페이지로 이동' 버튼 찾기" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-700">방법 B: QR 코드 스캔</h4>
                  <p className="text-gray-600 mt-2">상점에 비치된 QR 코드를 찾으세요. 스마트폰 카메라를 사용하여 스캔하면 해당 상점의 키오스크 페이지로 바로 이동합니다.</p>
                  <img src="/images/kiosk_tutorial/customer_step_1b_qr_scan.jpeg" alt="고객 - 1B단계 - 고객 QR 코드 스캔" className="mt-3 w-full max-w-xs mx-auto rounded-lg shadow-md border border-gray-200" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">2. 키오스크 시작 및 상품 탐색</h3>
              <p className="text-gray-600 mb-3">키오스크 인터페이스가 로드되면 상점 이름과 키오스크 메뉴가 표시됩니다. 상품 카테고리를 탐색하거나 상품 목록을 스크롤하세요.</p>
              <img src="/images/kiosk_tutorial/customer_step_2_welcome_browsing.jpeg" alt="고객 - 2단계 - 카테고리 및 상품이 있는 키오스크 메인 페이지" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">3. 상품 선택 및 맞춤 설정</h3>
              <p className="text-gray-600 mb-3">상품을 탭하여 상세 정보를 보거나 맞춤 설정하세요. 옵션(사이즈, 토핑 등)이 있는 경우 선택 창이 나타납니다. 선택 사항을 정하고 가격 변동을 확인한 후, 장바구니에 추가하세요.</p>
              <img src="/images/kiosk_tutorial/customer_step_3a_options_modal.jpeg" alt="고객 - 3A단계 - 상품 상세/옵션 모달" className="mt-3 mb-2 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
              <img src="/images/kiosk_tutorial/customer_step_3b_item_added_to_cart.jpeg" alt="고객 - 3B단계 - 장바구니에 상품 추가 확인" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">4. 장바구니 검토 및 수정</h3>
              <p className="text-gray-600 mb-3">장바구니 아이콘에는 상품 수량, 옵션, 가격이 표시됩니다. 아이콘을 탭하여 주문 요약을 확인하세요. 상품 수량을 변경하거나 삭제할 수 있습니다.</p>
              <img src="/images/kiosk_tutorial/customer_step_4_cart_summary.jpeg" alt="고객 - 4단계 - 장바구니 요약 보기" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">5. 수령 방법 선택</h3>
              <p className="text-gray-600 mb-3">주문 내용에 만족하셨다면 수령 방법을 선택하세요. 매장마다 제공하는 수령 방법이 다를 수 있습니다.</p>
              <img src="/images/kiosk_tutorial/customer_step_5a_checkout_button.jpeg" alt="고객 - 5A단계 - 결제 버튼" className="mt-3 mb-2 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">6. 결제 진행 및 정책 검토</h3>
              <p className="text-gray-600 mb-3">주문 내용에 만족하셨다면 원하시는 결제 방법을 선택하세요.</p>
              <img src="/images/kiosk_tutorial/customer_step_6_policy_screen.jpeg" alt="고객 - 5B단계 - 정책 표시/동의 화면" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">7. 결제 및 주문 확인</h3>
              <p className="text-gray-600 mb-3">화면 안내에 따라 결제를 완료하세요. 결제가 성공하면 주문 번호가 포함된 확인 화면이 나타납니다.</p>
              <img src="/images/kiosk_tutorial/customer_step_7_order_confirmation.jpeg" alt="고객 - 6단계 - 주문 성공 확인" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">8. 주문 준비 완료 알림</h3>
              <p className="text-gray-600 mb-3">주문한 상품이 준비되면 시스템에서 알림(화면, 소리 또는 진동)을 보냅니다.</p>
              <img src="/images/kiosk_tutorial/customer_step_8_order_ready_notification.jpeg" alt="고객 - 7단계 - 주문 준비 완료 알림" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
            </div>
          </div>
        </section>
      )}

      {/* Store Owner Tutorial Section */}
      {activeTab === 'storeOwner' && (
        <section>
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-700 mb-6 pb-2 border-b border-gray-300">
            점주 가이드: 키오스크 관리하기
          </h2>
          <p className="mb-6 text-gray-600">
            이 가이드는 상점의 키오스크를 효과적으로 설정하고 관리하는 데 도움을 드립니다.
          </p>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">1. 키오스크 관리 접속</h3>
              <p className="text-gray-600 mb-3">상가톡 웹사이트에 로그인하세요. 상점 설정으로 이동하여 "키오스크 관리" 섹션을 찾으세요.</p>
              <p className="text-gray-600 mb-3"><strong>참고:</strong> 상점의 고유 키오스크 QR 코드는 상가톡에서 제공합니다. 인쇄하여 고객에게 보이도록 비치하세요.</p>
              <img src="/images/kiosk_tutorial/store_owner_step_1_dashboard_access.png" alt="점주 - 1단계 - 판매자 대시보드 키오스크 관리" className="mt-3 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">2. 키오스크 설정 대시보드</h3>
              <p className="text-gray-600 mb-3">이 화면이 메인 제어판입니다. 메뉴 빌더, 주문 대시보드, 활성 세션, 판매 보고서 및 상품 옵션 관리 섹션을 찾을 수 있습니다.</p>
              <img src="/images/kiosk_tutorial/store_owner_step_2_config_dashboard.png" alt="점주 - 2단계 - 키오스크 설정 대시보드 개요" className="mt-3 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">3. 키오스크 메뉴 설정</h3>
              <p className="text-gray-600 mb-3">상품이 시스템에 있는지 확인하세요. 듀얼 패널 레이아웃("사용 가능한 상점 상품" vs. "키오스크 메뉴 레이아웃")을 사용하여 상품을 키오스크 메뉴로 선택 후 이동하세요. 항목을 드래그 앤 드롭하여 순서를 변경하세요. "카테고리 구분선"을 추가, 이름 지정 및 배치하세요.</p>
              <img src="/images/kiosk_tutorial/store_owner_step_3a_menu_editor.png" alt="점주 - 3A단계 - 메뉴 편집기 레이아웃" className="mt-3 mb-2 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
              <img src="/images/kiosk_tutorial/store_owner_step_3b_move_example.png" alt="점주 - 3B단계 - 드래그 앤 드롭 순서 변경 예시 (GIF)" className="mt-3 mb-2 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
              <p className="text-sm text-gray-500 text-center mt-1 mb-2">(예시: 순서 변경 GIF)</p>
              <img src="/images/kiosk_tutorial/store_owner_step_3c_product_edit_modal.png" alt="점주 - 3C단계 - 상품 편집/생성 모달" className="mt-3 w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200" />
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">4. 상품 품절 처리 및 상세 정보 관리</h3>
              <p className="text-gray-600 mb-3">키오스크 메뉴의 상품에 대해 "품절 처리" 버튼으로 상태를 전환하거나 "수정" 버튼을 클릭하여 상세 정보(이름, 가격, 이미지)를 편집하고 옵션을 할당/맞춤 설정하세요.</p>
              <img src="/images/kiosk_tutorial/store_owner_step_4_product_availability.png" alt="점주 - 4단계 - '품절' 상태 전환 및 상품 편집 접근" className="mt-3 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">5. 재사용 가능한 상품 옵션 만들기 (전역 옵션 편집기)</h3>
              <p className="text-gray-600 mb-3">"전역 상품 옵션" 편집기에서 옵션 그룹(예: "음료 사이즈")을 만드세요. 이를 여러 상품에 적용할 수 있습니다.</p> {/* 추후 가격 조정 기능 추가 예정 "과 가격 조정이 포함된 선택 항목(예: "라지" +1,000원)"" */}
              <img src="/images/kiosk_tutorial/store_owner_step_5_global_options_editor.png" alt="점주 - 5단계 - 전역 옵션 편집기 인터페이스" className="mt-3 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">6. 키오스크 메뉴 저장 및 게시</h3>
              <p className="text-gray-600 mb-3">변경 사항들은 바로 고객 키오스크 화면에 적용됩니다.</p>
              <img src="/images/kiosk_tutorial/store_owner_step_6_save_publish.png" alt="점주 - 6단계 - 저장 또는 게시 버튼" className="mt-3 w-full max-w-sm mx-auto rounded-lg shadow-md border border-gray-200" />
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">7. 키오스크 운영 모니터링</h3>
              <p className="text-gray-600 mb-3">정기적으로 대시보드를 확인하여 주문 관리, 활성 세션 보기 및 판매 보고서 검토를 수행하세요.</p>
              <img src="/images/kiosk_tutorial/store_owner_step_7a_order_management.png" alt="점주 - 7A단계 - 주문 관리 보기" className="mt-3 mb-2 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
              <img src="/images/kiosk_tutorial/store_owner_step_7b_sales_reports.png" alt="점주 - 7B단계 - 활성 세션 또는 판매 보고서 보기" className="mt-3 w-full max-w-lg mx-auto rounded-lg shadow-md border border-gray-200" />
            </div>
          </div>
        </section>
      )}

      <footer className="mt-12 pt-6 border-t border-gray-300 text-center">
        <p className="text-gray-600">이 가이드가 키오스크 기능을 최대한 활용하는 데 도움이 되기를 바랍니다!</p>
      </footer>
    </div>
  );
} 