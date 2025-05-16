"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { Coupon } from "@/utils/type";

export default function CouponListContent({ storeId }: { storeId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("coupons")
          .select("*")
          .eq("store_id", storeId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCoupons(data || []);
      } catch (error: any) {
        setError(error.message || "쿠폰을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, [storeId, supabase]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/stores/${storeId}`}
          className="inline-flex items-center text-primary hover:underline"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mr-2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          스토어로 돌아가기
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">쿠폰 관리</h1>
        <Link href={`/stores/${storeId}/coupons/create`}>
          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="mr-1"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            새 쿠폰 만들기
          </button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mx-auto mb-4 text-gray-400"
          >
            <path d="M12 8.4A3.5 3.5 0 0 1 15.5 5H18a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3h2.5a3.5 3.5 0 0 1 3.5 3.4"></path>
            <polyline points="12 16 16 12 12 8"></polyline>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <h2 className="text-xl font-semibold mb-2">등록된 쿠폰이 없습니다</h2>
          <p className="text-gray-600 mb-6">
            새로운 쿠폰을 만들어 고객들에게 특별한 혜택을 제공해보세요!
          </p>
          <Link href={`/stores/${storeId}/coupons/create`}>
            <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
              첫 쿠폰 만들기
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <div
              key={coupon.coupon_id}
              className={`bg-white rounded-xl shadow-md overflow-hidden ${
                !coupon.is_active || isExpired(coupon.expiry_date)
                  ? "opacity-70"
                  : ""
              }`}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-lg font-bold truncate">{coupon.name}</h2>
                  <div
                    className={`text-xs px-2 py-1 rounded-full ${
                      !coupon.is_active
                        ? "bg-gray-100 text-gray-600"
                        : isExpired(coupon.expiry_date)
                        ? "bg-red-100 text-red-600"
                        : "bg-green-100 text-green-600"
                    }`}
                  >
                    {!coupon.is_active
                      ? "비활성화"
                      : isExpired(coupon.expiry_date)
                      ? "만료됨"
                      : "활성화"}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {coupon.description || "설명 없음"}
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="mr-2 text-gray-500 mt-0.5 shrink-0"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <div>
                      <span className="text-gray-500">만료일:</span>{" "}
                      <span
                        className={
                          isExpired(coupon.expiry_date) ? "text-red-600" : ""
                        }
                      >
                        {formatDate(coupon.expiry_date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="mr-2 text-gray-500 mt-0.5 shrink-0"
                    >
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>
                      <span className="text-gray-500">반경:</span>{" "}
                      {coupon.radius_meters}m
                    </span>
                  </div>

                  {coupon.max_claims && (
                    <div className="flex items-start">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="mr-2 text-gray-500 mt-0.5 shrink-0"
                      >
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                      </svg>
                      <span>
                        <span className="text-gray-500">최대 수량:</span>{" "}
                        {coupon.max_claims}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-3 bg-gray-50 flex justify-between">
                <Link href={`/stores/${storeId}/coupons/${coupon.coupon_id}`}>
                  <button className="text-primary text-sm hover:underline">
                    상세보기
                  </button>
                </Link>
                <Link href={`/stores/${storeId}/coupons/${coupon.coupon_id}/edit`}>
                  <button className="text-primary text-sm hover:underline">
                    수정하기
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 