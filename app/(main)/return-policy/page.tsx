import Link from 'next/link';

export default function ReturnPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900">반품/교환/환불 정책</h1>
          <p className="mt-2 text-sm text-gray-500">
            (주)쿠스는 고객 만족을 위해 아래와 같은 반품/교환/환불 정책을 운영하고 있습니다.
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">안내</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <p className="mb-2">쇼핑쿠스 반품/교환 안내</p>
                <p>반품 시 먼저 판매자와 연락하셔서 반품사유, 택배사, 배송비, 반품지 주소 등을 협의하신 후 반품상품을 발송해 주시기 바랍니다.</p>
              </dd>
            </div>

            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">요청 가능 기간 (구매자 단순 변심)</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <p>상품 수령 후 7일 이내 (구매자 반품배송비 부담)</p>
              </dd>
            </div>

            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">요청 가능 기간 (상품 표시/광고와 상이)</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <p>상품 수령 후 3개월 이내 혹은 표시/광고와 다른 사실을 안 날로부터 30일 이내 (판매자 반품배송비 부담)</p>
                <p className="text-xs text-gray-500">둘 중 하나 경과 시 반품/교환 불가</p>
              </dd>
            </div>

            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-yellow-50">
              <dt className="text-sm font-medium text-gray-700">SGT 관련 중요 안내</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <p className="font-semibold mb-2">SGT 포인트 관련 안내</p>
                <p className="mb-2">당사 서비스는 직접적인 포인트 충전 서비스를 제공하지 않습니다. 저희는 외부 서비스에서 이미 발행/충전된 포인트(SGT)를 저희 시스템 내에서 활용하는 형태로 운영하고 있습니다.</p>
                <p className="mb-2">저희는 직접 포인트를 판매하거나 충전 서비스를 제공하지 않으며, 타 서비스를 통해 획득한 포인트를 저희 플랫폼에서 사용할 수 있도록 하는 중개 서비스를 제공합니다.</p>
                <p className="font-semibold mt-2 mb-1">결제 방식 안내</p>
                <p>결제는 전액 현금(카드) 또는 전액 SGT 포인트로만 가능하며, 포인트와 현금을 혼합하여 부분 결제하는 것은 불가능합니다.</p>
              </dd>
            </div>

            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-blue-50">
              <dt className="text-sm font-medium text-gray-700">결제 취소 및 환불 정책</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <p className="font-semibold mb-2">결제 취소 안내</p>
                <p className="mb-2">결제 취소 요청은 고객센터(070-4024-5884)를 통해 접수 가능합니다.</p>
                <p className="mb-2">카드 결제건 환불 요청 시 결제된 카드로 매출취소되어 영업일 기준 3~5일 이내 환불됩니다.</p>
                <p className="mb-2">무통장 입금의 경우, 환불 계좌 정보 확인 후 영업일 기준 3~7일 이내 환불됩니다.</p>
                <p>부분 취소는 불가능하며, 취소 수수료는 발생하지 않습니다.</p>
              </dd>
            </div>

            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-red-600">반품/교환 불가능 사유</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <ul className="list-disc space-y-1 pl-5">
                  <li>반품요청기간이 지난 경우</li>
                  <li>구매자의 책임 있는 사유로 상품 등이 멸실 또는 훼손된 경우 (단, 상품의 내용을 확인하기 위하여 포장 등을 훼손한 경우는 제외)</li>
                  <li>구매자의 책임있는 사유로 포장이 훼손되어 상품 가치가 현저히 상실된 경우 (예: 식품, 화장품, 향수)</li>
                  <li>구매자의 사용 또는 일부 소비에 의하여 상품의 가치가 현저히 감소한 경우 (라벨이 떨어진 의류 또는 태그가 떨어진 명품관 상품인 경우)</li>
                  <li>시간의 경과에 의하여 재판매가 곤란할 정도로 상품 등의 가치가 현저히 감소한 경우</li>
                  <li>고객의 요청사항에 맞춰 제작에 들어가는 맞춤제작상품의 경우 (판매자에게 회복 불가능한 손해가 예상되고, 그러한 예정으로 청약철회권 행사가 불가하다는 사실을 서면 동의 받은 경우)</li>
                  <li>복제가 가능한 상품 등의 포장을 훼손한 경우 (CD/DVD/GAME/도서의 경우 포장 개봉 시)</li>
                </ul>
              </dd>
            </div>

            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">판매자 정보</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <p>상호명: (주)쿠스</p>
                <p>사업자등록번호: 731-81-02023</p>
                <p>대표자명: 차민수</p>
                <p>주소: 경기도 시흥시 서울대학로 59-69 배곧테크노밸리 609호 (우편번호: 15012)</p>
                <p>대표전화: 070-4024-5884</p>
                <p>통신판매업번호: 제2025-서울시-0000호</p>
              </dd>
            </div>
          </dl>
        </div>
        <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <Link href="/" className="text-primary hover:underline">
                홈으로 돌아가기
            </Link>
        </div>
      </div>
    </div>
  );
} 