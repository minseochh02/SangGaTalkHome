export const getStatusText = (status: number): string => {
  switch (status) {
    case 0: return "주문 접수";
    case 1: return "결제 완료";
    case 2: return "배송 준비중";
    case 3: return "배송중";
    case 4: return "배송 완료";
    case 5: return "주문 취소";
    default: return "알 수 없음";
  }
};

export const getStatusColor = (status: number): string => {
  switch (status) {
    case 0: return "bg-yellow-100 text-yellow-800";
    case 1: return "bg-blue-100 text-blue-800";
    case 2: return "bg-purple-100 text-purple-800";
    case 3: return "bg-indigo-100 text-indigo-800";
    case 4: return "bg-green-100 text-green-800";
    case 5: return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export const getStatusButtonColor = (status: number, currentStatus: number): string => {
  if (status === currentStatus) {
    return "bg-gray-300 text-gray-700 cursor-not-allowed";
  }
  return `${getStatusColor(status)} hover:opacity-80`;
}; 