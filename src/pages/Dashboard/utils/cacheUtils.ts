import { TAB_CACHE_TTL } from '../constants';

export const getTabCacheKey = (tab: string, params?: Record<string, any>) => {
  const paramsStr = params ? JSON.stringify(params) : '';
  return `${tab}:${paramsStr}`;
};

export const isTabCacheValid = (
  cached: { timestamp: number; params?: string } | undefined,
  params?: Record<string, any>
): boolean => {
  if (!cached) return false;
  
  const now = Date.now();
  if (now - cached.timestamp > TAB_CACHE_TTL) return false;
  
  // Check if parameters changed
  if (params) {
    const paramsStr = JSON.stringify(params);
    if (cached.params !== paramsStr) return false;
  }
  
  return true;
};

export const getCachedTabData = (cached: { data: any } | undefined): any => {
  return cached?.data;
};

export const createTabCacheEntry = (data: any, params?: Record<string, any>) => {
  const paramsStr = params ? JSON.stringify(params) : '';
  return {
    data,
    timestamp: Date.now(),
    params: paramsStr
  };
};

