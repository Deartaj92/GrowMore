import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utility
 * Determines if the app is running on web, Electron, or Capacitor
 */

export const isElectron = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).electronAPI;
};

export const isCapacitor = (): boolean => {
  // usage of Capacitor.isNativePlatform() ensures we only identify as capacitor
  // when running on native iOS or Android, not when running in web with capacitor core installed
  return Capacitor.isNativePlatform();
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

