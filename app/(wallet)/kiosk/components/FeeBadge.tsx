import React, { useState, useEffect } from 'react';
import { fetchOptionFeeById } from '../utils/optionUtils';

interface FeeBadgeProps {
  priceImpact?: number;
  optionId?: string;
  showWon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  refreshInterval?: number;
  wonPrice?: number | null;
}

const FeeBadge: React.FC<FeeBadgeProps> = ({
  priceImpact,
  optionId,
  showWon = true,
  size = 'md',
  className = '',
  refreshInterval = 0,
  wonPrice = null
}) => {
  const [fetchedImpact, setFetchedImpact] = useState<number | null>(null);
  const [fetchedWonPrice, setFetchedWonPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const effectivePriceImpact = priceImpact !== undefined ? priceImpact : fetchedImpact ?? 0;
  
  const effectiveWonPrice = wonPrice !== null ? wonPrice : 
                          fetchedWonPrice !== null ? fetchedWonPrice : 
                          effectivePriceImpact * 1000;
  
  useEffect(() => {
    console.log(`[FeeBadge] Initialized with priceImpact=${priceImpact}, optionId=${optionId}, wonPrice=${wonPrice}`);
    
    let intervalId: NodeJS.Timeout | null = null;
    let isMounted = true;
    
    const fetchOptionData = async () => {
      if (!optionId) return;
      
      setIsLoading(true);
      try {
        const optionData = await fetchOptionFeeById(optionId);
        console.log(`[FeeBadge] Fetched data for option ${optionId}:`, optionData);
        
        if (isMounted && optionData) {
          setFetchedImpact(optionData.price_impact);
          setFetchedWonPrice(optionData.won_price);
          console.log(`[FeeBadge] Updated state: impact=${optionData.price_impact}, wonPrice=${optionData.won_price}`);
        }
      } catch (err) {
        console.error('Error fetching option fee data:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    if (optionId && priceImpact === undefined) {
      fetchOptionData();
    }
    
    if (refreshInterval > 0 && optionId) {
      intervalId = setInterval(fetchOptionData, refreshInterval);
    }
    
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [optionId, priceImpact, wonPrice, refreshInterval]);

  useEffect(() => {
    console.log(`[FeeBadge] Rendering with effectivePriceImpact=${effectivePriceImpact}, effectiveWonPrice=${effectiveWonPrice}`);
  }, [effectivePriceImpact, effectiveWonPrice]);

  // Format price with commas
  const formatPrice = (price: number): string => {
    return price.toLocaleString();
  };

  // Size-based styling
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Determine color and prefix based on price impact
  const getColorClass = () => {
    if (effectivePriceImpact > 0) return 'text-green-600';
    if (effectivePriceImpact < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  // Determine the label text
  const getLabel = () => {
    if (effectivePriceImpact === 0) return '무료 옵션';
    return effectivePriceImpact > 0 ? '추가 요금' : '할인';
  };

  // Determine the badge background color
  const getBgColorClass = () => {
    if (effectivePriceImpact > 0) return 'bg-green-50';
    if (effectivePriceImpact < 0) return 'bg-red-50';
    return 'bg-gray-50';
  };

  if (isLoading && fetchedImpact === null) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="animate-pulse bg-gray-200 h-5 w-16 rounded"></div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-end ${className}`}>
      <div className={`flex items-center ${getBgColorClass()} rounded-md px-2 py-0.5`}>
        <span className={`font-medium ${getColorClass()} ${sizeClasses[size]}`}>
          {effectivePriceImpact > 0 ? '+' : effectivePriceImpact < 0 ? '-' : ''}
          {formatPrice(Math.abs(effectivePriceImpact))} SGT
        </span>
      </div>
      
      {showWon && effectivePriceImpact !== 0 && (
        <div className={`${sizeClasses[size === 'lg' ? 'md' : 'sm']} text-gray-500 mt-0.5`}>
          {getLabel()} {formatPrice(Math.abs(effectiveWonPrice))}원
        </div>
      )}
    </div>
  );
};

export default FeeBadge; 