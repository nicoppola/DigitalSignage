import { useRef, useEffect, useCallback } from 'react';

interface UseTimeoutReturn {
  scheduleTimeout: (callback: () => void, delay: number) => void;
  clearScheduledTimeout: () => void;
}

/**
 * Custom hook for managing timeouts with automatic cleanup
 * Handles clearing timeouts on unmount to prevent memory leaks
 */
export const useTimeout = (): UseTimeoutReturn => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const scheduleTimeout = useCallback((callback: () => void, delay: number): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(callback, delay);
  }, []);

  const clearScheduledTimeout = useCallback((): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = null;
  }, []);

  return { scheduleTimeout, clearScheduledTimeout };
};
