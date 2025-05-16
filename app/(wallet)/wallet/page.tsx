"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { WalletScanner } from '@/components/wallet/WalletScanner';
import WebKioskQRScanner from '@/components/WebKioskQRScanner';
import { useSearchParams } from 'next/navigation';

// Client component that uses useSearchParams
function KioskQRScannerWrapper() {
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Check if the URL has the scanner=kiosk parameter
    if (searchParams.get('scanner') === 'kiosk') {
      setQrScannerOpen(true);
    }
  }, [searchParams]);

  return (
    <>
      <div className="mt-8">
        <button 
          onClick={() => setQrScannerOpen(true)}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-md text-white font-medium transition-colors flex items-center"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          키오스크 QR 스캔
        </button>
      </div>

      {qrScannerOpen && (
        <WebKioskQRScanner
          isOpen={qrScannerOpen}
          onClose={() => setQrScannerOpen(false)}
        />
      )}
    </>
  );
}

export default function WalletPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <WalletScanner />
        
        <Suspense fallback={
          <div className="mt-8">
            <button 
              disabled
              className="px-6 py-3 bg-gray-600 rounded-md text-white font-medium flex items-center opacity-70"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 mr-2 animate-pulse" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              로딩 중...
            </button>
          </div>
        }>
          <KioskQRScannerWrapper />
        </Suspense>
      </div>
    </div>
  );
} 