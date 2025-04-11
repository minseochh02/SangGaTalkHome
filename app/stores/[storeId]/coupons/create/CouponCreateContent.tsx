"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CouponFormData {
  name: string;
  description: string;
  warning: string;
  expiry_date: string;
  radius_meters: number;
  max_claims: number | null;
  is_active: boolean;
}

export default function CouponCreateContent({ storeId }: { storeId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [nearbyDeviceCount, setNearbyDeviceCount] = useState<number | null>(null);
  const [storeLocation, setStoreLocation] = useState<{latitude: number; longitude: number} | null>(null);
  
  const [formData, setFormData] = useState<CouponFormData>({
    name: "",
    description: "",
    warning: "",
    expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // Default: 24 hours from now
    radius_meters: 1000, // Default: 1km
    max_claims: null,
    is_active: true,
  });

  // Fetch store details to get location
  useEffect(() => {
    const fetchStoreDetails = async () => {
      try {
        const { data: store, error } = await supabase
          .from("stores")
          .select("latitude, longitude")
          .eq("store_id", storeId)
          .single();

        if (error) throw error;

        if (store && store.latitude && store.longitude) {
          setStoreLocation({
            latitude: store.latitude,
            longitude: store.longitude
          });
        }
      } catch (error) {
        console.error("Error fetching store details:", error);
      }
    };

    fetchStoreDetails();
  }, [storeId, supabase]);

  // Update nearby device count when radius changes
  useEffect(() => {
    const fetchNearbyDeviceCount = async () => {
      try {
        const { data, error } = await supabase.rpc("get_nearby_device_count", {
          input_store_id: storeId,
          radius: formData.radius_meters
        });

        if (error) throw error;
        setNearbyDeviceCount(data);
      } catch (error) {
        console.error("Error fetching nearby device count:", error);
      }
    };

    fetchNearbyDeviceCount();
  }, [formData.radius_meters, storeId, supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === "is_active" && "checked" in e.target) {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else if (name === "radius_meters" || name === "max_claims") {
      const numValue = value === "" ? null : Number(value);
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Format data for submission
      const couponData = {
        store_id: storeId,
        name: formData.name,
        description: formData.description || null,
        warning: formData.warning || null,
        expiry_date: formData.expiry_date,
        radius_meters: formData.radius_meters,
        max_claims: formData.max_claims,
        is_active: formData.is_active
      };
      
      const { error } = await supabase
        .from("coupons")
        .insert(couponData);
      
      if (error) throw error;
      
      setSuccess(true);
      
      // Redirect to coupon list after successful creation
      setTimeout(() => {
        router.push(`/stores/${storeId}/coupons`);
      }, 2000);
      
    } catch (error: any) {
      setError(error.message || "쿠폰 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
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

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mr-2 text-primary"
          >
            <path d="M12 8.4A3.5 3.5 0 0 1 15.5 5H18a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3h2.5a3.5 3.5 0 0 1 3.5 3.4"></path>
            <polyline points="12 16 16 12 12 8"></polyline>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          새 쿠폰 만들기
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            쿠폰이 성공적으로 생성되었습니다. 잠시 후 쿠폰 목록 페이지로 이동합니다.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  쿠폰명 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="20% 할인 쿠폰"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  쿠폰 설명
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="모든 상품에 적용 가능한 20% 할인 쿠폰입니다."
                />
              </div>

              <div>
                <label htmlFor="warning" className="block text-sm font-medium text-gray-700 mb-1">
                  사용 조건 및 주의사항
                </label>
                <textarea
                  id="warning"
                  name="warning"
                  value={formData.warning}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="최소 구매 금액 10,000원 이상, 다른 쿠폰과 중복 사용 불가"
                />
              </div>

              <div>
                <label htmlFor="expiry_date" className="block text-sm font-medium text-gray-700 mb-1">
                  만료일 *
                </label>
                <input
                  type="datetime-local"
                  id="expiry_date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <label htmlFor="radius_meters" className="block text-sm font-medium text-gray-700 mb-1">
                  쿠폰 유효 반경 (미터) *
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    id="radius_meters"
                    name="radius_meters"
                    min="100"
                    max="5000"
                    step="100"
                    value={formData.radius_meters}
                    onChange={handleChange}
                    className="w-full"
                  />
                  <span className="whitespace-nowrap">{formData.radius_meters}m</span>
                </div>
                {nearbyDeviceCount !== null && (
                  <p className="text-sm text-gray-600 mt-2">
                    예상 발송 가능 인원: 약 {nearbyDeviceCount}명
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="max_claims" className="block text-sm font-medium text-gray-700 mb-1">
                  최대 발행 수량
                </label>
                <input
                  type="number"
                  id="max_claims"
                  name="max_claims"
                  value={formData.max_claims === null ? "" : formData.max_claims}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="선택사항, 비워두면 무제한"
                />
                <p className="text-sm text-gray-500 mt-1">비워두면 무제한으로 설정됩니다</p>
              </div>

              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={(e) => 
                    setFormData(prev => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                  즉시 활성화
                </label>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mt-6">
                <h3 className="font-medium text-gray-800 mb-2">쿠폰 배포 방식</h3>
                <p className="text-sm text-gray-600">
                  쿠폰은 지정한 반경 내에 있는 사용자들에게 자동으로 배포됩니다. 
                  사용자가 이 반경 안에 들어오면 위치 정보가 허용된 앱에 알림이 발송됩니다.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-4">
            <Link href={`/stores/${storeId}`}>
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                취소
              </button>
            </Link>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "처리 중..." : "쿠폰 생성하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 