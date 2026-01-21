import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

/**
 * Custom hook for authentication management
 * Handles auth check on mount and provides logout functionality
 */
export const useAuth = (): UseAuthReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        const authenticated = await authAPI.checkAuth();
        setIsAuthenticated(authenticated);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = (): void => {
    setIsAuthenticated(false);
  };

  return { isAuthenticated, isLoading, logout };
};
