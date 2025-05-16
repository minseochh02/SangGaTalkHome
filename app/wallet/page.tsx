"use client";

import React from 'react';
import { WalletScanner } from '@/components/wallet/WalletScanner';

export default function WalletPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <WalletScanner />
      </div>
    </div>
  );
} 