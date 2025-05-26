import React from 'react';

interface FeeBadgeProps {
  priceImpact: number;
  showWon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const FeeBadge: React.FC<FeeBadgeProps> = ({
  priceImpact,
  showWon = true,
  size = 'md',
  className = ''
}) => {
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
    if (priceImpact > 0) return 'text-green-600';
    if (priceImpact < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  // Determine the label text
  const getLabel = () => {
    if (priceImpact === 0) return '무료 옵션';
    return priceImpact > 0 ? '추가 요금' : '할인';
  };

  // Determine the badge background color
  const getBgColorClass = () => {
    if (priceImpact > 0) return 'bg-green-50';
    if (priceImpact < 0) return 'bg-red-50';
    return 'bg-gray-50';
  };

  return (
    <div className={`flex flex-col items-end ${className}`}>
      <div className={`flex items-center ${getBgColorClass()} rounded-md px-2 py-0.5`}>
        <span className={`font-medium ${getColorClass()} ${sizeClasses[size]}`}>
          {priceImpact > 0 ? '+' : priceImpact < 0 ? '-' : ''}
          {formatPrice(Math.abs(priceImpact))} SGT
        </span>
      </div>
      
      {showWon && priceImpact !== 0 && (
        <div className={`${sizeClasses[size === 'lg' ? 'md' : 'sm']} text-gray-500 mt-0.5`}>
          {getLabel()} {formatPrice(Math.abs(priceImpact * 1000))}원
        </div>
      )}
    </div>
  );
};

export default FeeBadge; 