"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { WalletDetails } from './WalletDetails';
import { Alert } from '../ui/alert';
import Link from 'next/link';

interface WalletData {
  id: string;
  created_at: string;
  wallet_name: string | null;
  balance: number;
  nfc_id: string;
  wallet_address: string;
}

interface ScanErrorDetails {
  message: string;
  nfcId?: string;
  formattedNfcId?: string;
  statusCode?: number;
  errorCode?: string;
  details?: string;
}

export function WalletScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<ScanErrorDetails | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isNfcSupported, setIsNfcSupported] = useState<boolean | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Check if Web NFC is supported by this browser
    if ('NDEFReader' in window) {
      setIsNfcSupported(true);
    } else {
      setIsNfcSupported(false);
    }
  }, []);

  // Function to format NFC ID correctly
  const formatNfcId = (nfcId: string): string => {
    // If the ID contains colons (:), remove them.
    // NO LONGER FORCING TO UPPERCASE to see if case-sensitivity in DB is an issue.
    if (nfcId.includes(':')) {
      return nfcId.replace(/:/g, '');
    }
    return nfcId;
  };

  // Function to fetch wallet data by NFC ID
  const getWalletDataByNfcId = async (nfcId: string) => {
    const formattedNfcId = formatNfcId(nfcId);
    console.log('Fetching wallet data for NFC ID:', nfcId);
    console.log('Formatted (case-preserved) NFC ID for query:', formattedNfcId);

    try {
      const { data, error, status } = await supabase
        .from('wallets')
        .select('*')
        .eq('nfc_id', formattedNfcId) // Query will use case from event.serialNumber (after colon removal)
        .single(); 

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          setScanError({
            message: '등록되지 않은 SGT 카드입니다.',
            nfcId,
            formattedNfcId,
            statusCode: status || 404,
            errorCode: error.code,
            details: '해당 NFC ID로 등록된 지갑을 찾을 수 없습니다. (DB 조회 시 대소문자 구분 확인)'
          });
        } else {
          // For other PostgREST errors or network issues
          setScanError({
            message: `서버 오류: ${error.message || '알 수 없는 오류가 발생했습니다.'}`,
            nfcId,
            formattedNfcId,
            statusCode: status, 
            errorCode: error.code, 
            details: `Supabase query failed with status ${status}. Error code: ${error.code}. Query was for NFC ID: ${formattedNfcId}`
          });
        }
        return null;
      }
      
      if (!data) {
        setScanError({
          message: '데이터를 찾을 수 없습니다 (null 반환).',
          nfcId,
          formattedNfcId,
          statusCode: status, 
          details: '서버에서 데이터를 반환하지 않았지만 명시적인 오류는 없었습니다. 이는 .single() 사용 시 예기치 않은 상황입니다.'
        });
        return null;
      }
      
      if (!data.wallet_address) {
        setScanError({
          message: '유효하지 않은 지갑 데이터입니다.',
          nfcId,
          formattedNfcId,
          details: '지갑 데이터에 wallet_address 필드가 없습니다.'
        });
        return null;
      }
      
      setScanError(null);
      return data;
    } catch (error: any) {
      console.error('Critical error during getWalletDataByNfcId:', error);
      setScanError({
        message: '지갑 정보 조회 중 심각한 오류 발생.',
        nfcId,
        formattedNfcId,
        statusCode: error.status || error.response?.status, 
        errorCode: error.code,
        details: error.message
      });
      return null;
    }
  };

  const startScan = async () => {
    if (!isNfcSupported) {
      setScanError({
        message: '이 브라우저는 NFC를 지원하지 않습니다.'
      });
      return;
    }

    setIsScanning(true);
    setScanError(null);

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      ndef.onreadingerror = (event: any) => {
        console.error('NFC Reading Error:', event);
        setScanError({
          message: 'NFC 태그를 읽는데 실패했습니다. 다시 시도해주세요.',
          details: event.message || 'NFC onreadingerror 이벤트 발생'
        });
        setIsScanning(false);
      };

      ndef.onreading = async (event: any) => {
        const nfcId = event.serialNumber;
        console.log('NFC tag detected (raw serialNumber):', nfcId);
        
        if (!nfcId) {
          setScanError({
            message: 'NFC ID를 읽을 수 없습니다.',
            details: 'event.serialNumber가 비어있습니다.'
          });
          setIsScanning(false); 
          return;
        }

        const data = await getWalletDataByNfcId(nfcId);
        if (data) {
          setWalletData(data);
        } 
        setIsScanning(false);
      };
    } catch (error: any) {
      console.error('NFC Scan Start Error:', error);
      setScanError({
        message: `NFC 스캔 오류: ${error.message || '알 수 없는 오류가 발생했습니다.'}`,
        details: `NFC scan() 또는 NDEFReader 생성자에서 오류 발생: ${error.name}`
      });
      setIsScanning(false);
    }
  };

  const resetScan = () => {
    setWalletData(null);
    setScanError(null);
    setIsScanning(false);
  };

  // If wallet data is available, show wallet details
  if (walletData) {
    return (
      <WalletDetails 
        walletData={walletData}
        onClose={resetScan}
      />
    );
  }

  // Check browser compatibility
  if (isNfcSupported === false) {
    return (
      <div className="text-center p-4">
        <div className="bg-red-900/30 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-bold text-red-400 mb-2">브라우저 지원 오류</h2>
          <p className="text-gray-300 mb-4">
            이 브라우저는 NFC 기능을 지원하지 않습니다. Chrome for Android 또는 다른 NFC 지원 브라우저를 사용해주세요.
          </p>
          <Link href="/" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 inline-block rounded-lg text-white">
            메인으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // Render detailed error information if there's an error
  const renderErrorDetails = () => {
    if (!scanError) return null;
    
    return (
      <div className="bg-red-900/30 p-4 rounded-lg mb-4 border border-red-800 text-left text-sm w-full">
        <h3 className="text-lg font-semibold text-red-400 mb-2">오류 발생</h3>
        <p className="text-white mb-1"><span className="font-semibold">메시지:</span> {scanError.message}</p>
        
        {scanError.details && (
          <p className="text-gray-300 mb-3"><span className="font-semibold">상세:</span> {scanError.details}</p>
        )}
        
        {scanError.nfcId && (
          <p className="text-gray-300 mb-1">
            <span className="font-semibold">스캔된 원본 NFC ID:</span> {scanError.nfcId}
          </p>
        )}
        
        {scanError.formattedNfcId && (
          <p className="text-gray-300 mb-1">
            <span className="font-semibold">DB 조회용 NFC ID (대소문자 유지):</span> {scanError.formattedNfcId}
          </p>
        )}
        
        {scanError.statusCode !== undefined && (
          <p className="text-gray-300 mb-1">
            <span className="font-semibold">상태 코드:</span> {scanError.statusCode}
          </p>
        )}
        
        {scanError.errorCode && (
          <p className="text-gray-300 mb-1">
            <span className="font-semibold">오류 코드:</span> {scanError.errorCode}
          </p>
        )}
        
        <button 
          onClick={resetScan} 
          className="mt-3 px-4 py-2 bg-red-700 hover:bg-red-600 rounded text-white text-sm w-full"
        >
          닫고 다시 시도
        </button>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md text-center p-4 flex flex-col items-center justify-center min-h-screen">
      {scanError ? renderErrorDetails() : (
        <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-gray-900/30 w-full">
          <div className="text-5xl mb-6">📱</div>
          <h2 className="text-xl font-bold mb-2">
            {isScanning ? 'SGT 카드를 태그해주세요' : 'SGT 카드 스캔'}
          </h2>
          <p className="text-gray-400 mb-6">
            {isScanning 
              ? '스마트폰에 SGT 카드를 가까이 대고 기다려주세요' 
              : 'SGT 카드를 스캔하여 잔액을 확인하세요'}
          </p>
          
          <button
            onClick={isScanning ? resetScan : startScan}
            disabled={isScanning} // Disable button while scanning
            className={`w-full px-6 py-3 rounded-lg font-medium transition-all
              ${isScanning 
                ? 'bg-gray-700 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isScanning ? '스캔 중...' : '스캔 시작'}
          </button>
        </div>
      )}
      
      {!scanError && (
        <div className="text-sm text-gray-500 mt-4">
          <p>* SGT 카드를 스캔하기 위해서는 NFC가 지원되는 기기와 브라우저가 필요합니다.</p>
          <p>* Android Chrome 브라우저를 사용하시는 것을 권장합니다.</p>
        </div>
      )}

      <div className="mt-6">
        <Link href="/" className="text-gray-400 hover:text-white text-sm">
          ← 메인으로 돌아가기
        </Link>
      </div>
    </div>
  );
} 