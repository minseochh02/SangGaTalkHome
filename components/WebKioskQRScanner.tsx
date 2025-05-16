'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface WebKioskQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

const WebKioskQRScanner: React.FC<WebKioskQRScannerProps> = ({ isOpen, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const router = useRouter();
  const html5QrcodeScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader';
  const supabase = createClient();

  useEffect(() => {
    // Initialize scanner when component mounts and modal is open
    if (isOpen && !scannerInitialized) {
      initializeScanner();
    }

    // Clean up scanner when component unmounts or modal closes
    return () => {
      if (html5QrcodeScannerRef.current) {
        try {
          html5QrcodeScannerRef.current.stop().then(() => {
            console.log('Scanner stopped');
            html5QrcodeScannerRef.current = null;
            setScannerInitialized(false);
          }).catch(err => {
            console.error('Error stopping scanner:', err);
          });
        } catch (err) {
          console.error('Error in scanner cleanup:', err);
        }
      }
    };
  }, [isOpen, scannerInitialized]);

  const initializeScanner = async () => {
    // Check if scanner element exists yet
    const scannerElement = document.getElementById(scannerContainerId);
    if (!scannerElement) {
      // The element isn't ready yet, retry after a short delay
      setTimeout(initializeScanner, 500);
      return;
    }

    try {
      if (!html5QrcodeScannerRef.current) {
        const html5QrcodeScanner = new Html5Qrcode(scannerContainerId);
        html5QrcodeScannerRef.current = html5QrcodeScanner;
      }

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      await html5QrcodeScannerRef.current.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
      );
      setIsScanning(true);
      setScannerInitialized(true);
      setError(null);
    } catch (err) {
      console.error('Error initializing QR scanner:', err);
      setError('카메라를 활성화하지 못했습니다. 카메라 권한을 확인해주세요.');
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setIsScanning(false);
      
      // When we successfully scan a QR code, stop the scanner
      if (html5QrcodeScannerRef.current) {
        await html5QrcodeScannerRef.current.stop();
      }
      
      console.log('QR Code scanned:', decodedText);
      
      // Verify the scanned QR code is a valid kiosk key
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('store_id, store_name, kiosk_key')
        .eq('kiosk_key', decodedText)
        .single();

      if (storeError || !storeData) {
        setError('유효하지 않은 키오스크 코드입니다.');
        setTimeout(() => {
          if (html5QrcodeScannerRef.current) {
            initializeScanner();
          }
        }, 2000);
        return;
      }

      // Valid kiosk key found, navigate to the kiosk page
      onClose();
      router.push(`/kiosk/${storeData.store_id}`);
    } catch (err) {
      console.error('Error processing scanned QR code:', err);
      setError('QR 코드 처리 중 오류가 발생했습니다.');
      
      // Restart scanner after error
      setTimeout(() => {
        if (html5QrcodeScannerRef.current) {
          initializeScanner();
        }
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const onScanFailure = (error: string) => {
    // This is often called when no QR code is in view, so we don't need to set an error
    console.debug('QR scan error (expected when no QR in view):', error);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              키오스크 QR 코드 스캔
            </h3>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center">
            <div id={scannerContainerId} className="w-full h-64 relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
              
              {!scannerInitialized && (
                <div className="flex items-center justify-center h-full bg-gray-100">
                  <p className="text-gray-500">카메라 초기화 중...</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-gray-600">
                {isScanning 
                  ? '키오스크 QR 코드를 스캔해 주세요.' 
                  : isLoading 
                    ? 'QR 코드를 처리 중입니다...' 
                    : '스캐너 준비 중...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebKioskQRScanner; 