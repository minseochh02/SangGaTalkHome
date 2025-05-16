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
  const router = useRouter();
  const html5QrcodeScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader';
  const isMountedRef = useRef(true);
  const supabase = createClient();

  // Initialize scanner when component mounts
  useEffect(() => {
    isMountedRef.current = true;

    // Component cleanup function
    return () => {
      isMountedRef.current = false;
      if (html5QrcodeScannerRef.current) {
        try {
          html5QrcodeScannerRef.current.stop().catch(err => {
            console.error('Error stopping scanner during unmount:', err);
          });
        } catch (err) {
          console.error('Failed to stop scanner during unmount:', err);
        }
      }
    };
  }, []);

  // Start/stop scanner when isOpen changes
  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }
  }, [isOpen]);

  const startScanner = async () => {
    if (isScanning || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (!html5QrcodeScannerRef.current) {
        // Create HTML5 QR scanner instance only once
        const html5QrcodeScanner = new Html5Qrcode(scannerContainerId);
        html5QrcodeScannerRef.current = html5QrcodeScanner;
      }
        
      if (html5QrcodeScannerRef.current) {
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        await html5QrcodeScannerRef.current.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          onScanFailure
        );
        
        if (isMountedRef.current) {
          setIsScanning(true);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Error initializing QR scanner:', err);
      if (isMountedRef.current) {
        setError('카메라를 활성화하지 못했습니다. 카메라 권한을 확인해주세요.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const stopScanner = async () => {
    if (!html5QrcodeScannerRef.current || !isScanning) return;
    
    try {
      await html5QrcodeScannerRef.current.stop();
      console.log('Scanner stopped successfully');
    } catch (err) {
      console.error('Error stopping scanner:', err);
    } finally {
      if (isMountedRef.current) {
        setIsScanning(false);
      }
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    if (isLoading || !isMountedRef.current) return;

    try {
      setIsLoading(true);
      
      // Stop scanning but don't reset the scanner
      await stopScanner();
      
      if (!isMountedRef.current) return;
      
      console.log('QR Code scanned:', decodedText);
      
      // Verify the scanned QR code is a valid kiosk key
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('store_id, store_name, kiosk_key')
        .eq('kiosk_key', decodedText)
        .single();

      if (!isMountedRef.current) return;

      if (storeError || !storeData) {
        setError('유효하지 않은 키오스크 코드입니다.');
        // Resume scanning after a short delay
        setTimeout(() => {
          if (isMountedRef.current && isOpen) {
            startScanner();
          }
        }, 2000);
        return;
      }

      // Valid kiosk key found, navigate to the kiosk page
      onClose();
      router.push(`/kiosk/${storeData.store_id}`);
    } catch (err) {
      console.error('Error processing scanned QR code:', err);
      if (isMountedRef.current) {
        setError('QR 코드 처리 중 오류가 발생했습니다.');
        // Resume scanning after error
        setTimeout(() => {
          if (isMountedRef.current && isOpen) {
            startScanner();
          }
        }, 2000);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const onScanFailure = (error: string) => {
    // This is often called when no QR code is in view, so we don't need to set an error
  };

  // Handle close with proper cleanup
  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  // Keep the scanner DOM element in the page even when not open
  // but only display it when the modal is open
  return (
    <>
      {/* This div is always in the DOM but hidden when not active */}
      <div id={scannerContainerId} className="hidden"></div>
      
      {/* Modal is conditionally rendered */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  키오스크 QR 코드 스캔
                </h3>
                <button
                  onClick={handleClose}
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
                <div className="w-full h-64 relative border rounded bg-gray-100">
                  {/* Video feed container - manipulated by the html5-qrcode library */}
                  <div id="qr-video-container" className="absolute inset-0"></div>
                  
                  {/* Scanner overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-green-500 w-64 h-64 rounded-md"></div>
                  </div>
                  
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
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
      )}
    </>
  );
};

export default WebKioskQRScanner; 