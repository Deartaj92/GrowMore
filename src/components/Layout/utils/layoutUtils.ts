/**
 * Normalizes various ID list formats to a number array
 */
export const normalizeIdList = (raw: any): number[] => {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(value => Number(value))
      .filter(value => Number.isFinite(value));
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const withoutBraces = trimmed.replace(/[{}]/g, '');
    if (!withoutBraces) return [];
    return withoutBraces
      .split(',')
      .map(part => Number(part.trim()))
      .filter(value => Number.isFinite(value));
  }
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? [raw] : [];
  }
  return [];
};

/**
 * Checks internet connectivity by attempting to fetch a resource
 */
export const checkConnection: (
  setIsOnline: React.Dispatch<React.SetStateAction<boolean>>,
  setIsWeakConnection: React.Dispatch<React.SetStateAction<boolean>>,
  setIsCheckingConnection: React.Dispatch<React.SetStateAction<boolean>>
) => Promise<void> = async (
  setIsOnline,
  setIsWeakConnection,
  setIsCheckingConnection
) => {
  try {
    setIsCheckingConnection(true);
    const startTime = performance.now();
    const controller = new AbortController();

    // Increase timeout to 60 seconds for very slow connections
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    // Only mark as weak connection if it's really slow (>20 seconds)
    setIsWeakConnection(responseTime > 20000);

    // Always mark as online if we get any response (even slow)
    setIsOnline(true);
  } catch (error) {
    // Only mark as offline if it's a network error, not a timeout
    if (error instanceof Error && error.name === 'AbortError') {
      // Timeout occurred - this might be a very slow connection, not necessarily offline
      // Always assume online for timeouts on slow connections
      if (navigator.onLine) {
        setIsOnline(true);
        setIsWeakConnection(true); // Mark as weak but not offline
      } else {
        // Only mark as offline if navigator.onLine is false
        setIsOnline(false);
        setIsWeakConnection(false);
      }
    } else {
      // Real network error - definitely offline
      setIsOnline(false);
      setIsWeakConnection(false);
    }
  } finally {
    setIsCheckingConnection(false);
  }
};

/**
 * Matches dynamic route patterns like '/students/:id' to '/students/123'
 */
export function matchRoutePattern(pattern: string, pathname: string): boolean {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, i) => part.startsWith(':') || part === pathParts[i]);
}

