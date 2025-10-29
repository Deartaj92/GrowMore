import { useEffect } from 'react';
import { useLoading } from '../contexts/LoadingContext';

export const usePageReady = (isReady: boolean = true) => {
  const { setLoading } = useLoading();

  useEffect(() => {
    if (isReady) {
      setLoading(false);
    }
  }, [isReady, setLoading]);
}; 