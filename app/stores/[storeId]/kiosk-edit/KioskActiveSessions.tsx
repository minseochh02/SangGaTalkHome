import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { KioskSession } from '@/utils/type';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface KioskActiveSessionsProps {
  storeId: string;
}

export default function KioskActiveSessions({ storeId }: KioskActiveSessionsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<KioskSession[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger refreshes
  const supabase = createClient();

  useEffect(() => {
    // Function to fetch active sessions
    async function fetchSessions() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('kiosk_sessions')
          .select('*')
          .eq('store_id', storeId)
          .eq('status', 'active')
          .order('device_number', { ascending: true });

        if (error) {
          console.error('Error fetching kiosk sessions:', error);
          throw error;
        }

        setSessions(data || []);
      } catch (error) {
        console.error('Failed to fetch kiosk sessions:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (storeId) {
      fetchSessions();
      
      // Set up interval to refresh the sessions list every 30 seconds
      const interval = setInterval(() => {
        setRefreshKey(prev => prev + 1);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [storeId, refreshKey]);

  // Function to format dates
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 MM월 dd일 HH:mm:ss', { locale: ko });
    } catch (e) {
      return dateString || '날짜 없음';
    }
  };

  // Function to get time ago
  const getTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ko });
    } catch (e) {
      return '';
    }
  };

  // Function to disconnect a session
  const handleDisconnect = async (sessionId: string) => {
    if (!confirm('정말로 이 키오스크 세션을 종료하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('kiosk_sessions')
        .update({ status: 'disconnected' })
        .eq('kiosk_session_id', sessionId);

      if (error) {
        console.error('Error disconnecting session:', error);
        alert('세션 종료 중 오류가 발생했습니다.');
        return;
      }

      // Refresh the list
      setRefreshKey(prev => prev + 1);
      alert('키오스크 세션이 종료되었습니다.');
    } catch (error) {
      console.error('Failed to disconnect session:', error);
      alert('세션 종료 중 오류가 발생했습니다.');
    }
  };

  if (isLoading && sessions.length === 0) {
    return (
      <div className="mt-8 p-4">
        <h2 className="text-xl font-bold mb-4">활성 키오스크 단말기</h2>
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
        <h2 className="text-xl font-bold">활성 키오스크 단말기</h2>
        <button 
          onClick={() => setRefreshKey(prev => prev + 1)}
          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          새로고침
        </button>
      </div>
      
      {sessions.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          현재 활성화된 키오스크 세션이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">단말기 번호</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">세션 ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">생성 시간</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">마지막 활동</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">만료 시간</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.kiosk_session_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      단말기 {session.device_number}번
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.kiosk_session_id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(session.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getTimeAgo(session.last_active_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(session.expired_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDisconnect(session.kiosk_session_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      연결 해제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>참고: 키오스크 세션은 마지막 활동 후 4시간이 지나면 자동으로 만료됩니다.</p>
      </div>
    </div>
  );
} 