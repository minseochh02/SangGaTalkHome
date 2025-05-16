'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WebKioskPage() {
  const params = useParams();
  const router = useRouter();
  const [storeName, setStoreName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const storeId = params.storeId as string;
  const supabase = createClient();

  useEffect(() => {
    const fetchStoreInfo = async () => {
      if (!storeId) return;

      try {
        setIsLoading(true);
        
        const { data, error: storeError } = await supabase
          .from('stores')
          .select('store_name')
          .eq('store_id', storeId)
          .single();
          
        if (storeError || !data) {
          console.error('Error fetching store info:', storeError);
          setError('스토어 정보를 불러오는데 실패했습니다.');
          return;
        }
        
        setStoreName(data.store_name);
      } catch (err) {
        console.error('Error in fetchStoreInfo:', err);
        setError('스토어 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStoreInfo();
  }, [storeId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">키오스크 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            <p className="text-lg font-bold">오류 발생</p>
            <p>{error}</p>
          </div>
          <Link href="/" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-500 rounded-full mx-auto flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">키오스크 연결 성공!</h1>
        <p className="text-xl text-gray-600 mb-6">{storeName}</p>
        
        <div className="mb-8">
          <p className="text-gray-600 mb-2">
            키오스크가 성공적으로 연결되었습니다.
          </p>
          <p className="text-gray-600">
            이 페이지를 열어두면 키오스크 모드로 계속 사용할 수 있습니다.
          </p>
        </div>
        
        <div className="flex flex-col space-y-4">
          <Link 
            href={`/stores/${storeId}/kiosk-edit`}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            키오스크 관리 페이지로 이동
          </Link>
          
          <Link 
            href="/"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
} 