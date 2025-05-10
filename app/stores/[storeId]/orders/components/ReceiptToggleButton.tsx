import React, { useState } from 'react';
import { Switch } from '../../../../../components/ui/switch';
import { createClient } from '@/utils/supabase/client';

interface ReceiptToggleButtonProps {
  orderId: string;
  initialReceiptEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  className?: string;
}

export default function ReceiptToggleButton({
  orderId,
  initialReceiptEnabled = false,
  onToggle,
  className = '',
}: ReceiptToggleButtonProps) {
  const [isReceiptEnabled, setIsReceiptEnabled] = useState(initialReceiptEnabled);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleToggle = async (enabled: boolean) => {
    setIsLoading(true);
    
    try {
      // Update receipt preference in the database
      const { error } = await supabase
        .from('orders')
        .update({ 
          generate_receipt: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId);
      
      if (error) {
        console.error('Error updating receipt preference:', error);
        return;
      }
      
      setIsReceiptEnabled(enabled);
      
      // Call the onToggle callback if provided
      if (onToggle) {
        onToggle(enabled);
      }
    } catch (error) {
      console.error('Error toggling receipt generation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Switch
        id={`receipt-toggle-${orderId}`}
        checked={isReceiptEnabled}
        onCheckedChange={handleToggle}
        disabled={isLoading}
        aria-label="Toggle receipt generation"
      />
      <label 
        htmlFor={`receipt-toggle-${orderId}`} 
        className="text-sm cursor-pointer"
      >
        {isLoading ? '처리 중...' : isReceiptEnabled ? '영수증 활성화됨' : '영수증 비활성화됨'}
      </label>
    </div>
  );
} 