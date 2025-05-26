import { useState, useEffect } from 'react';
import { fetchProductOptionFees, OptionGroup, calculateTotalFeeImpact } from '../utils/optionUtils';

export const useProductOptionFees = (productId: string | null) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchOptions = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const options = await fetchProductOptionFees(productId);
        if (isMounted) {
          setOptionGroups(options);
        }
      } catch (err) {
        console.error('Error in useProductOptionFees:', err);
        if (isMounted) {
          setError('옵션 정보를 불러오는데 실패했습니다.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOptions();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  return { optionGroups, loading, error };
};

export const useTotalFeeImpact = (selectedOptionIds: string[]) => {
  const [totalImpact, setTotalImpact] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const calculateTotal = async () => {
      setLoading(true);
      try {
        const impact = await calculateTotalFeeImpact(selectedOptionIds);
        if (isMounted) {
          setTotalImpact(impact);
        }
      } catch (err) {
        console.error('Error calculating total fee impact:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    calculateTotal();

    return () => {
      isMounted = false;
    };
  }, [selectedOptionIds]);

  return { totalImpact, loading };
}; 