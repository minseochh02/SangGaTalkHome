"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Alert } from '../ui/alert';

interface WalletData {
  id: string;
  created_at: string;
  wallet_name: string | null;
  balance: number;
  nfc_id: string;
  wallet_address: string;
}

interface Transaction {
  id?: string;
  transaction_id?: string;
  amount: number;
  created_at: string;
  completed_at: string;
  receiver_wallet_address: string;
  sender_wallet_address: string;
  transaction_fee?: number;
  notes?: string;
  location?: string;
  status?: number;
  type?: number;
}

interface WalletDetailsProps {
  walletData: WalletData;
  onClose: () => void;
}

export function WalletDetails({ walletData, onClose }: WalletDetailsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchTransactions();
  }, [walletData.wallet_address]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`sender_wallet_address.eq."${walletData.wallet_address}",receiver_wallet_address.eq."${walletData.wallet_address}"`)
        .order('completed_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('거래 내역을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="w-full max-w-md bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      <div className="p-6 bg-black border-b border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">SGT 지갑 정보</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            닫기
          </button>
        </div>

        <div className="flex flex-col items-center mb-4">
          <p className="text-gray-400 text-sm mb-1">
            {walletData.wallet_name || '이름 없는 지갑'}
          </p>
          <h3 className="text-3xl font-bold text-white mb-1">
            {walletData.balance.toFixed(2)} <span className="text-lg font-normal text-gray-400">SGT</span>
          </h3>
          <p className="text-gray-500 text-sm">
            {(walletData.balance * 1000).toLocaleString()}원
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3 mt-4 text-xs text-gray-400">
          <p className="mb-1">지갑 주소: {walletData.wallet_address.substring(0, 10)}...{walletData.wallet_address.substring(walletData.wallet_address.length - 10)}</p>
          <p>NFC ID: {walletData.nfc_id}</p>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">최근 거래 내역</h3>
        
        {error && (
          <Alert className="mb-4 bg-red-900/30 border border-red-800">
            <p className="text-red-400">{error}</p>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-green-500 rounded-full border-t-transparent"></div>
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-gray-400 py-4">거래 내역이 없습니다</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {transactions.map((tx) => {
              const isOutgoing = tx.sender_wallet_address === walletData.wallet_address;
              return (
                <div key={tx.id || tx.transaction_id} className="py-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-medium ${isOutgoing ? 'text-red-400' : 'text-green-400'}`}>
                      {isOutgoing ? '출금' : '입금'}
                    </span>
                    <span className="text-white font-medium">
                      {isOutgoing ? '-' : '+'}{tx.amount.toFixed(2)} SGT
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{formatDate(tx.completed_at)}</span>
                    <span>{tx.notes || (isOutgoing ? '보내기' : '받기')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 