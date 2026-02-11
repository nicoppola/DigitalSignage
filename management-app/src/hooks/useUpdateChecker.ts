import { useState } from 'react';
import { updateAPI } from '../services/api';
import { useTimeout } from './useTimeout';
import { logger } from '../utils/logger.ts';
import { TIMEOUTS } from '../constants.ts';
import { validateUpdateCheckResponse, validateUpdateResultResponse } from '../utils/validators.ts';

interface UseUpdateCheckerReturn {
  checking: boolean;
  updateStatus: string;
  checkForUpdates: () => Promise<void>;
}

/**
 * Custom hook for managing application update checking and installation
 * Handles all update-related state and user interactions
 */
export const useUpdateChecker = (): UseUpdateCheckerReturn => {
  const [checking, setChecking] = useState<boolean>(false);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const { scheduleTimeout } = useTimeout();

  /**
   * Check for updates and optionally install them
   * Handles user confirmation and all state transitions
   */
  const checkForUpdates = async (): Promise<void> => {
    setChecking(true);
    setUpdateStatus('Checking for updates...');

    try {
      const data = await updateAPI.checkForUpdates();

      // Validate check response
      const validated = validateUpdateCheckResponse(data);

      if (!validated.updatesAvailable) {
        setUpdateStatus('✅ You are up to date.');
        scheduleTimeout(() => setUpdateStatus(''), TIMEOUTS.UPDATE_SUCCESS);
        return;
      }

      // Updates available - ask user
      const confirmUpdate = window.confirm(
        'Updates are available. Would you like to update now?'
      );

      if (!confirmUpdate) {
        setUpdateStatus('⚠️ Update skipped.');
        scheduleTimeout(() => setUpdateStatus(''), TIMEOUTS.UPDATE_ERROR);
        return;
      }

      // Perform update
      setUpdateStatus('Updating...');
      const updateResult = await updateAPI.performUpdate();

      // Validate update result
      const validatedResult = validateUpdateResultResponse(updateResult);

      if (validatedResult.success === false) {
        setUpdateStatus(validatedResult.message || '❌ Update failed.');
      } else {
        setUpdateStatus(validatedResult.message);
      }
    } catch (err) {
      logger.error('Update check failed', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to check for updates.';
      setUpdateStatus(`❌ ${errorMessage}`);
      scheduleTimeout(() => setUpdateStatus(''), TIMEOUTS.UPDATE_ERROR);
    } finally {
      setChecking(false);
    }
  };

  return {
    checking,
    updateStatus,
    checkForUpdates,
  };
};
