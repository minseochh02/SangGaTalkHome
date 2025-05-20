import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { KioskOrder as BaseKioskOrder, KioskOrderItem, Product } from '@/utils/type';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Disclosure } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/24/solid';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// Add new interface for order item options
interface OrderItemOption {
  option_id: string;
  kiosk_order_item_id: string;
  option_group_name: string;
  option_choice_name: string;
  price_impact: number;
}

// Extend KioskOrderItem to include options
interface KioskOrderItemWithOptions extends KioskOrderItem {
  options?: OrderItemOption[];
}

// Extend KioskOrder to include delivery-related properties
interface KioskOrder extends BaseKioskOrder {
  delivery_address?: string;
  delivery_address_detail?: string;
  delivery_phone?: string;
  delivery_note?: string;
}

interface KioskSalesHistoryProps {
  storeId: string;
}

// Filter interface
interface OrderFilters {
  dateFrom: string;
  dateTo: string;
  orderType: string;
  status: string;
}

export default function KioskSalesHistory({ storeId }: KioskSalesHistoryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<KioskOrder[]>([]);
  const [expandedOrderItems, setExpandedOrderItems] = useState<Record<string, KioskOrderItemWithOptions[]>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({
    dateFrom: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    orderType: '',
    status: '',
  });
  const ordersPerPage = 10;
  const supabase = createClient();

  useEffect(() => {
    fetchKioskOrders();
  }, [storeId, currentPage, filters]);

  async function fetchKioskOrders() {
    setIsLoading(true);
    try {
      // Start building the query
      let query = supabase
        .from('kiosk_orders')
        .select('*', { count: 'exact' })
        .eq('store_id', storeId);

      // Apply date filters
      if (filters.dateFrom) {
        const fromDate = startOfDay(new Date(filters.dateFrom));
        query = query.gte('created_at', fromDate.toISOString());
      }
      
      if (filters.dateTo) {
        const toDate = endOfDay(new Date(filters.dateTo));
        query = query.lte('created_at', toDate.toISOString());
      }

      // Apply order type filter
      if (filters.orderType) {
        query = query.eq('order_type', filters.orderType);
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Add pagination
      const from = (currentPage - 1) * ordersPerPage;
      const to = from + ordersPerPage - 1;
      
      // Execute query with pagination and sorting
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching kiosk orders:', error);
        throw error;
      }

      setOrders(data || []);
      setTotalOrders(count || 0);
    } catch (error) {
      console.error('Failed to fetch kiosk orders:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const fetchOrderItems = async (kioskOrderId: string) => {
    try {
      // Check if we already have the items
      if (expandedOrderItems[kioskOrderId]?.length > 0) {
        return;
      }

      const { data: orderItems, error: itemsError } = await supabase
        .from('kiosk_order_items')
        .select(`
          *,
          product:products(product_id, product_name, image_url)
        `)
        .eq('kiosk_order_id', kioskOrderId);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        return;
      }

      // Fetch options for each order item
      const itemsWithOptions = await Promise.all((orderItems || []).map(async (item) => {
        const { data: optionsData, error: optionsError } = await supabase
          .from('kiosk_order_item_options')
          .select('*')
          .eq('kiosk_order_item_id', item.kiosk_order_item_id);

        if (optionsError) {
          console.error('Error fetching item options:', optionsError);
          return { ...item, options: [] };
        }

        return {
          ...item,
          options: optionsData || []
        };
      }));

      setExpandedOrderItems(prev => ({
        ...prev,
        [kioskOrderId]: itemsWithOptions || []
      }));
    } catch (error) {
      console.error('Failed to fetch order items:', error);
    }
  };

  const toggleOrderExpansion = (kioskOrderId: string) => {
    fetchOrderItems(kioskOrderId);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 MM월 dd일 HH:mm', { locale: ko });
    } catch (e) {
      return dateString || '날짜 없음';
    }
  };

  const getOrderTypeLabel = (orderType: string) => {
    switch (orderType) {
      case 'kiosk_dine_in': return '매장 식사';
      case 'kiosk_takeout': return '포장';
      case 'kiosk_delivery': return '배달';
      default: return orderType;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'processing': return '처리중';
      case 'ready_for_pickup': return '준비완료';
      case 'completed': return '완료됨';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  };

  // Format price with commas
  const formatPrice = (price: number): string => {
    return price.toLocaleString();
  };

  // Reset filters to default
  const resetFilters = () => {
    setFilters({
      dateFrom: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      dateTo: format(new Date(), 'yyyy-MM-dd'),
      orderType: '',
      status: '',
    });
    setCurrentPage(1);
  };

  // Apply filters
  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when filters change
    fetchKioskOrders();
  };

  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const totalPages = Math.ceil(totalOrders / ordersPerPage);

  if (isLoading && orders.length === 0) {
    return (
      <div className="mt-8 p-4">
        <h2 className="text-xl font-bold mb-4">키오스크 판매 내역</h2>
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">키오스크 판매 내역</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center px-3 py-2 bg-gray-100 rounded-md text-gray-700 hover:bg-gray-200"
        >
          {showFilters ? (
            <>
              <XMarkIcon className="w-5 h-5 mr-1" />
              필터 닫기
            </>
          ) : (
            <>
              <FunnelIcon className="w-5 h-5 mr-1" />
              필터
            </>
          )}
        </button>
      </div>
      
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작 날짜</label>
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료 날짜</label>
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">주문 유형</label>
              <select
                name="orderType"
                value={filters.orderType}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">전체</option>
                <option value="kiosk_dine_in">매장 식사</option>
                <option value="kiosk_takeout">포장</option>
                <option value="kiosk_delivery">배달</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">전체</option>
                <option value="pending">대기중</option>
                <option value="processing">처리중</option>
                <option value="ready_for_pickup">준비완료</option>
                <option value="completed">완료됨</option>
                <option value="cancelled">취소됨</option>
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                초기화
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700"
              >
                적용
              </button>
            </div>
          </form>
        </div>
      )}
      
      {orders.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          검색 조건에 맞는 키오스크 판매 내역이 없습니다.
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <Disclosure key={order.kiosk_order_id}>
                {({ open }) => (
                  <>
                    <Disclosure.Button 
                      className="flex w-full justify-between rounded-lg bg-gray-50 px-4 py-3 text-left text-sm font-medium hover:bg-gray-100 focus:outline-none focus-visible:ring focus-visible:ring-gray-500 focus-visible:ring-opacity-75"
                      onClick={() => toggleOrderExpansion(order.kiosk_order_id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                        <span className="font-semibold">#{order.kiosk_order_id.substring(0, 8)}</span>
                        <span>{formatDate(order.created_at)}</span>
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {getOrderTypeLabel(order.order_type)}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                          {getStatusLabel(order.status)}
                        </span>
                        {order.device_number !== null && order.device_number !== undefined && (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            단말기 {order.device_number}번
                          </span>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className="mr-4 font-bold flex items-center gap-1 flex-row">{Number(order.total_amount).toLocaleString()}<p className="text-xs text-gray-500">SGT</p></span>
                        <ChevronUpIcon
                          className={`${open ? 'rotate-180 transform' : ''} h-5 w-5 text-gray-500`}
                        />
                      </div>
                    </Disclosure.Button>
                    <Disclosure.Panel className="px-4 pt-2 pb-4 text-sm text-gray-500">
                      {expandedOrderItems[order.kiosk_order_id] ? (
                        <div className="mt-2">
                          <div className="mb-2 text-gray-600">
                            {order.device_number !== null && order.device_number !== undefined && (
                              <span className="inline-block mr-3">
                                <span className="font-semibold">키오스크 단말기:</span> {order.device_number}번
                              </span>
                            )}
                            <span className="inline-block mr-3">
                              <span className="font-semibold">주문 유형:</span> {getOrderTypeLabel(order.order_type)}
                            </span>
                            <span className="inline-block">
                              <span className="font-semibold">상태:</span> {getStatusLabel(order.status)}
                            </span>
                          </div>
                          <table className="min-w-full border-collapse">
                            <thead>
                              <tr className="border-b">
                                <th className="py-2 text-left">상품</th>
                                <th className="py-2 text-right">가격</th>
                                <th className="py-2 text-right">수량</th>
                                <th className="py-2 text-right">소계</th>
                              </tr>
                            </thead>
                            <tbody>
                              {expandedOrderItems[order.kiosk_order_id].map((item) => (
                                <React.Fragment key={item.kiosk_order_item_id}>
                                  <tr className="border-b">
                                    <td className="py-2 flex items-center">
                                      {item.product?.image_url && (
                                        <img
                                          src={item.product.image_url}
                                          alt={item.product?.product_name || '상품 이미지'}
                                          className="w-10 h-10 object-cover rounded mr-2"
                                        />
                                      )}
                                      <span>{item.product?.product_name || `상품 #${item.product_id.substring(0, 8)}`}</span>
                                    </td>
                                    <td className="py-2 text-right">{Number(item.price_at_purchase).toLocaleString()}<span className="text-xs text-gray-500 ml-1">SGT</span></td>
                                    <td className="py-2 text-right">{item.quantity}개</td>
                                    <td className="py-2 text-right">{(Number(item.price_at_purchase) * item.quantity).toLocaleString()}<span className="text-xs text-gray-500 ml-1">SGT</span></td>
                                  </tr>
                                  {/* Options row */}
                                  {item.options && item.options.length > 0 && (
                                    <tr>
                                      <td colSpan={4} className="py-2 pb-3">
                                        <div className="pl-12 text-xs text-gray-600">
                                          <div className="font-medium mb-1">선택 옵션:</div>
                                          <div className="space-y-1 pl-2 border-l-2 border-gray-200">
                                            {item.options.map(option => (
                                              <div key={option.option_id} className="flex justify-between">
                                                <span>
                                                  {option.option_group_name}: <span className="font-medium">{option.option_choice_name}</span>
                                                </span>
                                                {option.price_impact !== 0 && (
                                                  <span className={option.price_impact > 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {option.price_impact > 0 ? '+' : ''}{formatPrice(option.price_impact)}<span className="text-xs ml-1">SGT</span>
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="font-bold">
                                <td colSpan={3} className="py-2 text-right">총계:</td>
                                <td className="py-2 text-right">{Number(order.total_amount).toLocaleString()}<span className="text-xs text-gray-500 ml-1">SGT</span></td>
                              </tr>
                            </tfoot>
                          </table>
                          
                          {/* Add delivery information if available */}
                          {order.order_type === 'kiosk_delivery' && order.delivery_address && (
                            <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                              <div className="font-medium mb-1">배달 정보:</div>
                              <div className="pl-3">
                                <p><span className="font-medium">주소:</span> {order.delivery_address}</p>
                                {order.delivery_address_detail && (
                                  <p><span className="font-medium">상세주소:</span> {order.delivery_address_detail}</p>
                                )}
                                {order.delivery_phone && (
                                  <p><span className="font-medium">연락처:</span> {order.delivery_phone}</p>
                                )}
                                {order.delivery_note && (
                                  <p><span className="font-medium">요청사항:</span> {order.delivery_note}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-center items-center p-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                          <span className="ml-2">주문 상세 정보를 불러오는 중...</span>
                        </div>
                      )}
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{totalOrders}</span>개 주문 중{' '}
                <span className="font-medium">{(currentPage - 1) * ordersPerPage + 1}</span>-
                <span className="font-medium">
                  {Math.min(currentPage * ordersPerPage, totalOrders)}
                </span>
                번째 결과
              </div>
              <nav className="flex items-center">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage <= 1}
                  className={`${
                    currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                  } p-2 rounded-md mr-2`}
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // For simplicity, show only 5 pages and adjust based on current page
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded-md ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className={`${
                    currentPage >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                  } p-2 rounded-md ml-2`}
                >
                  <ArrowRightIcon className="h-5 w-5" />
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
} 