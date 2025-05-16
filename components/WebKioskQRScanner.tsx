'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface WebKioskQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'loading';

const WebKioskQRScanner: React.FC<WebKioskQRScannerProps> = ({ isOpen, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<PermissionStatus>('prompt');
  const router = useRouter();
  const html5QrcodeScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'html5qr-code-full-region';
  const isMountedRef = useRef(true);
  const supabase = createClient();

  // Initialize scanner when component mounts
  useEffect(() => {
    console.log('WebKioskQRScanner component mounted');
    isMountedRef.current = true;

    // Check initial camera permission status
    checkCameraPermission();

    // Component cleanup function
    return () => {
      console.log('WebKioskQRScanner component unmounting, cleaning up...');
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

  // Check camera permission status
  const checkCameraPermission = async () => {
    console.log('Checking camera permission...');
    try {
      setCameraPermission('loading');
      
      // Check if navigator.permissions is supported
      if (navigator.permissions && navigator.permissions.query) {
        // Modern browsers
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        
        console.log('Camera permission status:', permissionStatus.state);
        setCameraPermission(permissionStatus.state as PermissionStatus);
        
        // Listen for permission changes
        permissionStatus.onchange = () => {
          console.log('Camera permission changed to:', permissionStatus.state);
          setCameraPermission(permissionStatus.state as PermissionStatus);
          
          // If permission was just granted, start the scanner
          if (permissionStatus.state === 'granted' && isOpen && !isScanning) {
            startScanner();
          }
        };
      } else {
        // Fallback for browsers that don't support navigator.permissions
        console.log('navigator.permissions not supported, defaulting to prompt');
        setCameraPermission('prompt');
      }
    } catch (err) {
      console.error('Error checking camera permission:', err);
      setCameraPermission('prompt');
    }
  };
  
  // Request camera permission explicitly
  const requestCameraPermission = async () => {
    console.log('Requesting camera permission...');
    try {
      setIsLoading(true);
      setError(null);
      
      // Try to access the camera - this will trigger the permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      // If we get here, permission was granted
      console.log('Camera permission granted!', stream.getVideoTracks()[0].label);
      setCameraPermission('granted');
      
      // Always close tracks when we're done
      stream.getTracks().forEach(track => track.stop());
      
      // Start the scanner now that we have permission
      startScanner();
    } catch (err) {
      console.error('Camera permission denied:', err);
      setCameraPermission('denied');
      setError('카메라 접근이 거부되었습니다. 브라우저 설정에서 카메라 접근을 허용해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start/stop scanner when isOpen changes
  useEffect(() => {
    console.log('isOpen changed to:', isOpen, 'cameraPermission:', cameraPermission);
    if (isOpen) {
      // Only try to start scanner if we already have permission
      if (cameraPermission === 'granted') {
        startScanner();
      }
    } else {
      stopScanner();
    }
  }, [isOpen, cameraPermission]);

  const startScanner = async () => {
    console.log('Starting QR scanner...');
    if (isScanning || isLoading) {
      console.log('Scanner already running or loading, aborting start');
      return;
    }
    
    // If we don't have camera permission yet, request it first
    if (cameraPermission !== 'granted') {
      console.log('Camera permission not granted yet, requesting...');
      requestCameraPermission();
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if the scanner element exists in the DOM
      const scannerElement = document.getElementById(scannerContainerId);
      if (!scannerElement) {
        console.error(`Scanner element with ID ${scannerContainerId} not found in DOM`);
        setError('스캐너 요소를 찾을 수 없습니다. 페이지를 새로고침 해보세요.');
        return;
      }
      
      console.log('Scanner element found:', scannerElement);
      
      if (!html5QrcodeScannerRef.current) {
        // Create HTML5 QR scanner instance only once
        console.log('Creating new Html5Qrcode instance...');
        const html5QrcodeScanner = new Html5Qrcode(scannerContainerId);
        html5QrcodeScannerRef.current = html5QrcodeScanner;
      }
        
      if (html5QrcodeScannerRef.current) {
        // Use more specific camera config
        const cameraConfig = {
          facingMode: "environment",
          aspectRatio: 1.0,
        };
        
        const scannerConfig = { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
          videoConstraints: cameraConfig
        };
        
        console.log('Starting QR scanner with config:', scannerConfig);
        
        await html5QrcodeScannerRef.current.start(
          cameraConfig,
          scannerConfig,
          onScanSuccess,
          onScanFailure
        );
        
        if (isMountedRef.current) {
          console.log('Scanner started successfully!');
          setIsScanning(true);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Error initializing QR scanner:', err);
      // Log more details about the error
      if (err instanceof Error) {
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      }
      
      if (isMountedRef.current) {
        // If we get a NotAllowedError, it's a permission issue
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          console.error('Camera permission was denied by the browser');
          setCameraPermission('denied');
          setError('카메라 접근이 거부되었습니다. 브라우저 설정에서 카메라 접근을 허용해 주세요.');
        } else {
          console.error('Other camera initialization error:', err);
          setError('카메라를 활성화하지 못했습니다. 카메라 장치를 확인해주세요.');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const stopScanner = async () => {
    if (!html5QrcodeScannerRef.current || !isScanning) {
      console.log('No scanner to stop or not scanning');
      return;
    }
    
    console.log('Stopping QR scanner...');
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
    console.log('QR Code scanned successfully:', decodedText);
    if (isLoading || !isMountedRef.current) return;

    try {
      setIsLoading(true);
      
      // Stop scanning but don't reset the scanner
      await stopScanner();
      
      if (!isMountedRef.current) return;
      
      // Extract storeId and key from URL if present
      let storeId: string | null = null;
      let kioskKey: string = decodedText;
      
      // Try to parse as URL
      try {
        const url = new URL(decodedText);
        
        // Check if the URL path contains "/kiosk/{storeId}"
        const pathMatch = url.pathname.match(/\/kiosk\/([^\/]+)/);
        if (pathMatch && pathMatch[1]) {
          storeId = pathMatch[1];
          console.log('Extracted storeId from URL:', storeId);
          
          // Try to get key from query params
          const keyParam = url.searchParams.get('key');
          if (keyParam) {
            kioskKey = keyParam;
            console.log('Extracted key from URL query params:', kioskKey);
          }
        }
      } catch (urlError) {
        console.log('Not a valid URL, treating as raw kiosk key');
      }
      
      // If we found a store ID in the URL, navigate directly
      if (storeId) {
        console.log('Navigating directly to kiosk page with extracted storeId:', storeId);
        onClose();
        router.push(`/kiosk/${storeId}`);
        return;
      }
      
      // Otherwise, verify the kiosk key with Supabase
      console.log('Verifying kiosk key with Supabase:', kioskKey);
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('store_id, store_name, kiosk_key')
        .eq('kiosk_key', kioskKey)
        .single();

      if (!isMountedRef.current) return;

      if (storeError || !storeData) {
        console.error('Invalid kiosk key or error verifying:', storeError);
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
      console.log('Valid kiosk key found, navigating to store:', storeData.store_id);
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
    // but we can log it at debug level for troubleshooting
    // console.debug('QR scan failure (expected when no QR in view):', error);
  };

  // Handle close with proper cleanup
  const handleClose = async () => {
    console.log('Closing QR scanner...');
    await stopScanner();
    onClose();
  };

  // Render permission request UI when needed
  const renderPermissionUI = () => {
    if (cameraPermission === 'denied') {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">카메라 접근 거부됨</h3>
          <p className="text-gray-600 mb-4">
            QR 코드를 스캔하려면 카메라 접근 권한이 필요합니다. 브라우저 설정에서 카메라 접근을 허용해 주세요.
          </p>
          <ol className="text-left text-sm text-gray-600 mb-4 space-y-2">
            <li>1. 브라우저 주소창의 🔒 또는 ⓘ 아이콘을 클릭하세요</li>
            <li>2. "사이트 설정" 또는 "권한"을 선택하세요</li>
            <li>3. 카메라 설정을 "허용"으로 변경하세요</li>
            <li>4. 페이지를 새로고침하세요</li>
          </ol>
          <button 
            onClick={checkCameraPermission}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      );
    }
    
    if (cameraPermission === 'prompt') {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <svg className="w-16 h-16 text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">카메라 접근 필요</h3>
          <p className="text-gray-600 mb-4">
            QR 코드를 스캔하려면 카메라 접근 권한이 필요합니다.
          </p>
          <button 
            onClick={requestCameraPermission}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                처리 중...
              </>
            ) : '카메라 접근 허용'}
          </button>
        </div>
      );
    }
    
    return null;
  };

  // Keep the scanner DOM element in the page even when not open
  // but only display it when the modal is open
  return (
    <>
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
                {cameraPermission !== 'granted' ? (
                  renderPermissionUI()
                ) : (
                  <>
                    <div className="w-full h-64 relative border rounded bg-gray-100">
                      {/* Video feed container */}
                      <div id={scannerContainerId} className="absolute inset-0"></div>
                      
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WebKioskQRScanner; 