import React from "react";
import Link from "next/link";
import { formatPrice } from "../utils/orderFormatUtils";
import useProductStats from "../hooks/useProductStats";

interface ProductStatsDashboardProps {
  storeId: string;
}

export default function ProductStatsDashboard({ storeId }: ProductStatsDashboardProps) {
  const { totalProducts, activeProducts, totalSold, topSellingProducts, loading, error } = useProductStats(storeId);
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4 mb-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">상품 통계 대시보드</h2>
        <Link 
          href={`/stores/${storeId}/products/list`}
          className="text-sm text-primary hover:underline flex items-center"
        >
          <span>상품 관리</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Total products card */}
        <div className="bg-blue-50 rounded-lg p-4 flex flex-col">
          <span className="text-blue-600 text-sm font-medium">전체 상품</span>
          <span className="text-2xl font-bold">{totalProducts}개</span>
          <span className="text-blue-600 text-sm mt-1">
            활성 상품: {activeProducts}개
          </span>
        </div>
        
        {/* Total sold items card */}
        <div className="bg-green-50 rounded-lg p-4 flex flex-col">
          <span className="text-green-600 text-sm font-medium">총 판매 수량</span>
          <span className="text-2xl font-bold">{formatPrice(totalSold)}개</span>
        </div>
        
        {/* Conversion rate card */}
        <div className="bg-purple-50 rounded-lg p-4 flex flex-col">
          <span className="text-purple-600 text-sm font-medium">판매율</span>
          <span className="text-2xl font-bold">
            {totalProducts > 0 ? Math.round((totalSold / totalProducts) * 100) : 0}%
          </span>
          <span className="text-purple-600 text-sm mt-1">
            평균 {totalProducts > 0 ? (totalSold / totalProducts).toFixed(1) : 0}개/상품
          </span>
        </div>
      </div>
      
      {topSellingProducts.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">인기 상품 Top 5</h3>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상품</th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">판매량</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topSellingProducts.map(product => (
                  <tr key={product.product_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.product_name} 
                            className="h-8 w-8 rounded-full object-cover mr-2"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 mr-2 flex items-center justify-center text-xs text-gray-500">
                            이미지 없음
                          </div>
                        )}
                        <Link 
                          href={`/stores/${storeId}/products/${product.product_id}`}
                          className="text-sm font-medium text-gray-900 hover:text-primary"
                        >
                          {product.product_name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                      {product.sold_count}개
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 