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

interface TransitCardTestResult {
  serialNumber: string;
  isTransit: boolean;
  confidence: number;
  reasons: {
    hasTransitPattern: boolean;
    hasTransitManufacturer: boolean;
    hasTransitNDEF: boolean;
    hasCorrectLength: boolean;
    manufacturerCode: string;
    serialLength: number;
  };
  timestamp: string;
  totalRecords: number;
}

interface TestResult {
  nfcId: string;
  formattedNfcId: string;
  dbResult: {
    found: boolean;
    walletData?: WalletData;
    error?: string;
  };
  transitCardResult?: TransitCardTestResult;
  overallTest: 'pass' | 'fail' | 'partial';
  testMessage: string;
}

export function WalletScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<ScanErrorDetails | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isNfcSupported, setIsNfcSupported] = useState<boolean | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
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
    // Trim whitespace, then remove colons, then convert to uppercase
    let processedId = nfcId.trim();
    if (processedId.includes(':')) {
      processedId = processedId.replace(/:/g, '');
    }
    return processedId.toUpperCase();
  };

  // Known patterns for Korean transit cards
  const TRANSIT_CARD_PATTERNS = {
    // T-money cards typically have these characteristics
    TMONEY_AID: [0x42, 0x00], // Application ID from the blog post
    
    // Common Korean transit card serial number patterns
    SERIAL_PATTERNS: [
      /^04[0-9A-F]{12}$/i,  // Common format for Korean transit cards
      /^08[0-9A-F]{12}$/i,  // Another common format
    ],
    
    // Known manufacturer codes for Korean transit cards
    MANUFACTURER_CODES: [
      '04', '08', '44', 'A4' // Common prefixes for Korean transit cards
    ]
  };

  const isTransitCard = (serialNumber: string, records: any[]): TransitCardTestResult => {
    const cleanSerial = serialNumber.replace(/[:\s-]/g, '').toUpperCase();
    
    // Check serial number patterns
    const hasTransitPattern = TRANSIT_CARD_PATTERNS.SERIAL_PATTERNS.some(
      pattern => pattern.test(cleanSerial)
    );
    
    // Check manufacturer code (first 2 hex digits)
    const manufacturerCode = cleanSerial.substring(0, 2);
    const hasTransitManufacturer = TRANSIT_CARD_PATTERNS.MANUFACTURER_CODES.includes(manufacturerCode);
    
    // Check for specific NDEF records that indicate transit cards
    const hasTransitNDEF = records.some(record => {
      // Look for specific record types or data patterns
      if (record.recordType === 'mime' && record.mediaType) {
        return record.mediaType.includes('transit') || 
               record.mediaType.includes('tmoney') ||
               record.mediaType.includes('korean');
      }
      return false;
    });

    // Check card length (Korean transit cards typically have 14-character serials)
    const hasCorrectLength = cleanSerial.length === 14;

    // Score-based detection
    let score = 0;
    if (hasTransitPattern) score += 3;
    if (hasTransitManufacturer) score += 2;
    if (hasTransitNDEF) score += 3;
    if (hasCorrectLength) score += 1;

    return {
      serialNumber,
      isTransit: score >= 2,
      confidence: Math.min(score / 4, 1),
      reasons: {
        hasTransitPattern,
        hasTransitManufacturer,
        hasTransitNDEF,
        hasCorrectLength,
        manufacturerCode,
        serialLength: cleanSerial.length
      },
      timestamp: new Date().toISOString(),
      totalRecords: records.length
    };
  };

  // Function to fetch wallet data by NFC ID
  const getWalletDataByNfcId = async (nfcId: string) => {
    const formattedNfcId = formatNfcId(nfcId);
    console.log('Fetching wallet data for NFC ID:', nfcId);
    console.log('Formatted NFC ID:', formattedNfcId);

    try {
      const { data, error, status } = await supabase
        .from('wallets')
        .select('*')
        .eq('nfc_id', formattedNfcId)
        .single(); // .single() expects 0 or 1 row. If >1, server might return 406.

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return {
            found: false,
            error: '등록되지 않은 SGT 카드입니다.'
          };
        } else {
          // For other PostgREST errors or network issues
          return {
            found: false,
            error: `서버 오류: ${error.message || '알 수 없는 오류가 발생했습니다.'}`
          };
        }
      }
      
      if (!data) {
        return {
          found: false,
          error: '데이터를 찾을 수 없습니다 (null 반환).'
        };
      }
      
      if (!data.wallet_address) {
        return {
          found: false,
          error: '유효하지 않은 지갑 데이터입니다.'
        };
      }
      
      return {
        found: true,
        walletData: data
      };
    } catch (error: any) {
      console.error('Critical error during getWalletDataByNfcId:', error);
      return {
        found: false,
        error: `지갑 정보 조회 중 심각한 오류 발생: ${error.message}`
      };
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
    setTestResult(null);

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
        console.log('NFC tag detected:', nfcId);
        
        if (!nfcId) {
          setScanError({
            message: 'NFC ID를 읽을 수 없습니다.',
            details: 'event.serialNumber가 비어있습니다.'
          });
          setIsScanning(false);
          return;
        }

        if (testMode) {
          // Run comprehensive test
          await runComprehensiveTest(nfcId, event);
        } else {
          // Normal wallet scan
          const data = await getWalletDataByNfcId(nfcId);
          if (data.found && data.walletData) {
            setWalletData(data.walletData);
          } else {
            setScanError({
              message: data.error || '알 수 없는 오류가 발생했습니다.',
              nfcId,
              formattedNfcId: formatNfcId(nfcId)
            });
          }
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

  const runComprehensiveTest = async (nfcId: string, event: any) => {
    const formattedNfcId = formatNfcId(nfcId);
    
    // Step 1: Check database
    const dbResult = await getWalletDataByNfcId(nfcId);
    
    // Step 2: Check if it's a transit card
    const records = event.message.records.map((record: any) => ({
      recordType: record.recordType,
      mediaType: record.mediaType,
      id: record.id,
      data: record.data ? Array.from(new Uint8Array(record.data)) : null
    }));
    
    const transitCardResult = isTransitCard(nfcId, records);
    
    // Step 3: Determine overall test result
    let overallTest: 'pass' | 'fail' | 'partial' = 'fail';
    let testMessage = '';
    
    if (dbResult.found && transitCardResult.isTransit) {
      overallTest = 'pass';
      testMessage = '✅ 데이터베이스에서 지갑을 찾았고, 교통카드로 인식됩니다.';
    } else if (dbResult.found && !transitCardResult.isTransit) {
      overallTest = 'partial';
      testMessage = '⚠️ 데이터베이스에서 지갑을 찾았지만, 교통카드로 인식되지 않습니다.';
    } else if (!dbResult.found && transitCardResult.isTransit) {
      overallTest = 'partial';
      testMessage = '⚠️ 교통카드로 인식되지만, 데이터베이스에 등록되지 않았습니다.';
    } else {
      overallTest = 'fail';
      testMessage = '❌ 데이터베이스에서 지갑을 찾을 수 없고, 교통카드로도 인식되지 않습니다.';
    }
    
    setTestResult({
      nfcId,
      formattedNfcId,
      dbResult,
      transitCardResult,
      overallTest,
      testMessage
    });
  };

  const resetScan = () => {
    setWalletData(null);
    setScanError(null);
    setTestResult(null);
    setIsScanning(false);
  };

  const toggleTestMode = () => {
    setTestMode(!testMode);
    resetScan();
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

  // Render test results
  const renderTestResults = () => {
    if (!testResult) return null;
    
    const getStatusColor = (status: 'pass' | 'fail' | 'partial') => {
      switch (status) {
        case 'pass': return 'bg-green-900/30 border-green-800 text-green-400';
        case 'fail': return 'bg-red-900/30 border-red-800 text-red-400';
        case 'partial': return 'bg-yellow-900/30 border-yellow-800 text-yellow-400';
      }
    };

    return (
      <div className={`p-4 rounded-lg border mb-4 text-left text-sm w-full ${getStatusColor(testResult.overallTest)}`}>
        <h3 className="text-lg font-semibold mb-2">테스트 결과</h3>
        <p className="text-white mb-3">{testResult.testMessage}</p>
        
        <div className="space-y-3">
          {/* Database Results */}
          <div className="bg-gray-800/50 p-3 rounded">
            <h4 className="font-semibold mb-2">📊 데이터베이스 검색 결과</h4>
            <p className="text-sm">
              <span className="font-semibold">NFC ID:</span> {testResult.nfcId}
            </p>
            <p className="text-sm">
              <span className="font-semibold">변환된 ID:</span> {testResult.formattedNfcId}
            </p>
            <p className="text-sm">
              <span className="font-semibold">상태:</span> 
              {testResult.dbResult.found ? (
                <span className="text-green-400"> ✅ 찾음</span>
              ) : (
                <span className="text-red-400"> ❌ 찾지 못함</span>
              )}
            </p>
            {testResult.dbResult.error && (
              <p className="text-sm text-gray-300">
                <span className="font-semibold">오류:</span> {testResult.dbResult.error}
              </p>
            )}
            {testResult.dbResult.walletData && (
              <div className="mt-2 p-2 bg-gray-700/50 rounded text-xs">
                <p><span className="font-semibold">지갑명:</span> {testResult.dbResult.walletData.wallet_name || 'N/A'}</p>
                <p><span className="font-semibold">잔액:</span> {testResult.dbResult.walletData.balance}원</p>
                <p><span className="font-semibold">지갑 주소:</span> {testResult.dbResult.walletData.wallet_address.substring(0, 10)}...</p>
              </div>
            )}
          </div>

          {/* Transit Card Results */}
          {testResult.transitCardResult && (
            <div className="bg-gray-800/50 p-3 rounded">
              <h4 className="font-semibold mb-2">🚇 교통카드 검증 결과</h4>
              <p className="text-sm">
                <span className="font-semibold">결과:</span>
                {testResult.transitCardResult.isTransit ? (
                  <span className="text-green-400"> ✅ 교통카드로 인식됨</span>
                ) : (
                  <span className="text-red-400"> ❌ 교통카드로 인식되지 않음</span>
                )}
              </p>
              <p className="text-sm">
                <span className="font-semibold">신뢰도:</span> {Math.round(testResult.transitCardResult.confidence * 100)}%
              </p>
              <p className="text-sm">
                <span className="font-semibold">제조사 코드:</span> {testResult.transitCardResult.reasons.manufacturerCode}
              </p>
              <p className="text-sm">
                <span className="font-semibold">시리얼 길이:</span> {testResult.transitCardResult.reasons.serialLength}자
              </p>
              <div className="mt-2 text-xs text-gray-300">
                <p>패턴 일치: {testResult.transitCardResult.reasons.hasTransitPattern ? '✅' : '❌'}</p>
                <p>제조사 일치: {testResult.transitCardResult.reasons.hasTransitManufacturer ? '✅' : '❌'}</p>
                <p>NDEF 일치: {testResult.transitCardResult.reasons.hasTransitNDEF ? '✅' : '❌'}</p>
                <p>길이 일치: {testResult.transitCardResult.reasons.hasCorrectLength ? '✅' : '❌'}</p>
              </div>
            </div>
          )}
        </div>
        
        <button 
          onClick={resetScan} 
          className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm w-full"
        >
          다시 테스트
        </button>
      </div>
    );
  };

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
            <span className="font-semibold">원본 NFC ID:</span> {scanError.nfcId}
          </p>
        )}
        
        {scanError.formattedNfcId && (
          <p className="text-gray-300 mb-1">
            <span className="font-semibold">변환된 NFC ID:</span> {scanError.formattedNfcId}
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
      {/* Test Mode Toggle */}
      <div className="mb-4 w-full">
        <button
          onClick={toggleTestMode}
          className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            testMode 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          {testMode ? '🧪 테스트 모드 활성화됨' : '🧪 테스트 모드로 전환'}
        </button>
      </div>

      {testResult ? renderTestResults() : scanError ? renderErrorDetails() : (
        <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-gray-900/30 w-full">
          <div className="text-5xl mb-6">
            {testMode ? '🧪' : '📱'}
          </div>
          <h2 className="text-xl font-bold mb-2">
            {testMode 
              ? (isScanning ? '카드를 태그하여 테스트하세요' : '종합 테스트 모드')
              : (isScanning ? 'SGT 카드를 태그해주세요' : 'SGT 카드 스캔')
            }
          </h2>
          <p className="text-gray-400 mb-6">
            {testMode
              ? (isScanning 
                  ? '카드를 태그하면 데이터베이스 검색과 교통카드 검증을 모두 수행합니다' 
                  : '카드를 스캔하여 데이터베이스 등록 여부와 교통카드 여부를 모두 확인하세요')
              : (isScanning 
                  ? '스마트폰에 SGT 카드를 가까이 대고 기다려주세요' 
                  : 'SGT 카드를 스캔하여 잔액을 확인하세요')
            }
          </p>
          
          <button
            onClick={isScanning ? resetScan : startScan}
            disabled={isScanning}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-all
              ${isScanning 
                ? 'bg-gray-700 cursor-not-allowed' 
                : testMode 
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isScanning ? '스캔 중...' : (testMode ? '테스트 시작' : '스캔 시작')}
          </button>
        </div>
      )}
      
      {!scanError && !testResult && (
        <div className="text-sm text-gray-500 mt-4">
          <p>* SGT 카드를 스캔하기 위해서는 NFC가 지원되는 기기와 브라우저가 필요합니다.</p>
          <p>* Android Chrome 브라우저를 사용하시는 것을 권장합니다.</p>
          {testMode && (
            <p className="mt-2 text-blue-400">* 테스트 모드에서는 데이터베이스 검색과 교통카드 검증을 모두 수행합니다.</p>
          )}
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