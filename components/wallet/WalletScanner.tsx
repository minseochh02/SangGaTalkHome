"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { WalletDetails } from './WalletDetails';
import { Alert } from '../ui/alert';

interface WalletData {
  id: string;
  created_at: string;
  wallet_name: string | null;
  balance: number;
  nfc_id: string;
  wallet_address: string;
}

export function WalletScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isNfcSupported, setIsNfcSupported] = useState<boolean | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualNfcId, setManualNfcId] = useState('');
  const [isManualLoading, setIsManualLoading] = useState(false);
  const supabase = createClient();
  const nfcInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if Web NFC is supported by this browser
    if ('NDEFReader' in window) {
      setIsNfcSupported(true);
    } else {
      setIsNfcSupported(false);
    }
  }, []);

  // Focus input when manual entry is shown
  useEffect(() => {
    if (showManualInput && nfcInputRef.current) {
      nfcInputRef.current.focus();
    }
  }, [showManualInput]);

  // Function to format NFC ID correctly
  const formatNfcId = (nfcId: string): string => {
    // If the ID contains colons (:), remove them and convert to uppercase
    if (nfcId.includes(':')) {
      return nfcId.replace(/:/g, '').toUpperCase();
    }
    return nfcId.toUpperCase();
  };

  // Function to fetch wallet data by NFC ID
  const getWalletDataByNfcId = async (nfcId: string) => {
    try {
      // Format the NFC ID correctly before querying
      const formattedNfcId = formatNfcId(nfcId);
      console.log('Fetching wallet data for NFC ID:', nfcId);
      console.log('Formatted NFC ID:', formattedNfcId);
      
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('nfc_id', formattedNfcId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          setScanError('등록되지 않은 SGT 카드입니다.');
          return null;
        }
        throw error;
      }
      
      if (!data.wallet_address) {
        setScanError('유효하지 않은 지갑입니다.');
        return null;
      }
      
      // Reset any errors when successful
      setScanError(null);
      return data;
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setScanError('지갑 정보를 불러오는데 실패했습니다.');
      return null;
    }
  };

  const startScan = async () => {
    if (!isNfcSupported) {
      setScanError('이 브라우저는 NFC를 지원하지 않습니다.');
      return;
    }

    setIsScanning(true);
    setScanError(null);

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      ndef.onreadingerror = () => {
        setScanError('NFC 태그를 읽는데 실패했습니다. 다시 시도해주세요.');
        setIsScanning(false);
      };

      ndef.onreading = async (event: any) => {
        // Extract serialNumber which is the NFC ID we need
        const nfcId = event.serialNumber;
        console.log('NFC tag detected:', nfcId);
        
        if (!nfcId) {
          setScanError('NFC ID를 읽을 수 없습니다.');
          return;
        }

        // Fetch wallet data using the NFC ID
        const data = await getWalletDataByNfcId(nfcId);
        if (data) {
          setWalletData(data);
          setIsScanning(false);
        }
      };
    } catch (error) {
      console.error('Error starting NFC scan:', error);
      setScanError('NFC 스캔을 시작하는데 실패했습니다. NFC가 활성화되어 있는지 확인해주세요.');
      setIsScanning(false);
    }
  };

  const resetScan = () => {
    setWalletData(null);
    setScanError(null);
    setIsScanning(false);
    setShowManualInput(false);
    setManualNfcId('');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNfcId.trim()) {
      setScanError('NFC ID를 입력해주세요.');
      return;
    }

    setIsManualLoading(true);
    setScanError(null);

    try {
      const data = await getWalletDataByNfcId(manualNfcId);
      if (data) {
        setWalletData(data);
      }
    } finally {
      setIsManualLoading(false);
    }
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
        <div className="bg-red-900/30 p-4 rounded-lg mb-4">
          <h2 className="text-lg font-bold text-red-400 mb-2">브라우저 지원 오류</h2>
          <p className="text-gray-300">
            이 브라우저는 NFC 기능을 지원하지 않습니다. Chrome for Android 또는 다른 NFC 지원 브라우저를 사용해주세요.
          </p>
          <button
            onClick={() => setShowManualInput(true)}
            className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
          >
            수동으로 NFC ID 입력하기
          </button>
        </div>
      </div>
    );
  }

  if (showManualInput) {
    return (
      <div className="w-full max-w-md">
        <form onSubmit={handleManualSubmit} className="bg-gray-900/30 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-white text-center">NFC ID 수동 입력</h2>
          
          {scanError && (
            <Alert className="mb-4 bg-red-900/30 border border-red-800">
              <p className="text-red-400">{scanError}</p>
            </Alert>
          )}
          
          <div className="mb-4">
            <label htmlFor="nfcId" className="block text-gray-300 mb-1 text-sm">
              NFC ID
            </label>
            <input
              ref={nfcInputRef}
              id="nfcId"
              type="text"
              value={manualNfcId}
              onChange={(e) => setManualNfcId(e.target.value)}
              placeholder="예: 04E15FCC290289"
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              disabled={isManualLoading}
            />
            <p className="text-xs text-gray-400 mt-1">
              * 콜론(:)이 있는 경우 자동으로 제거됩니다.
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={isManualLoading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 rounded-lg text-white"
            >
              {isManualLoading ? '로딩중...' : '확인'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowManualInput(false);
                setScanError(null);
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md text-center">
      {scanError && (
        <Alert className="mb-4 bg-red-900/30 border border-red-800">
          <p className="text-red-400">{scanError}</p>
        </Alert>
      )}

      <div className="flex flex-col items-center justify-center p-8 mb-4 rounded-lg bg-gray-900/30">
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
          className={`w-full px-6 py-3 rounded-lg font-medium transition-all mb-2
            ${isScanning 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'}`}
        >
          {isScanning ? '스캔 취소' : '스캔 시작'}
        </button>
        
        <button
          onClick={() => setShowManualInput(true)}
          className="w-full px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm"
        >
          직접 NFC ID 입력하기
        </button>
      </div>
      
      <div className="text-sm text-gray-500">
        <p>* SGT 카드를 스캔하기 위해서는 NFC가 지원되는 기기와 브라우저가 필요합니다.</p>
        <p>* Android Chrome 브라우저를 사용하시는 것을 권장합니다.</p>
      </div>
    </div>
  );
} 