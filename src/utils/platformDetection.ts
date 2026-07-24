/**
 * Platform detection utility
 * Determines if the app is running on web, Electron, or Capacitor
 * Hardcoded to Web-only for performance optimization.
 */

export const isElectron = (): boolean => {
  return false;
};

export const isCapacitor = (): boolean => {
  return false;
};

export const isWeb = (): boolean => {
  return true;
};

export const isDesktop = (): boolean => {
  return false;
};

export const isMobile = (): boolean => {
  return false;
};

