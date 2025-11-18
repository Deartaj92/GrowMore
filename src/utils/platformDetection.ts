/**
 * Platform detection utility
 * Determines if the app is running on web, Electron, or Capacitor
 */

export const isElectron = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).electronAPI;
};

export const isCapacitor = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor;
};

export const isWeb = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !isElectron() && !isCapacitor();
};

export const isDesktop = (): boolean => {
  return isElectron();
};

export const isMobile = (): boolean => {
  return isCapacitor();
};

