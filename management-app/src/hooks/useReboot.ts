import { deviceAPI } from '../services/api';
import { logger } from '../utils/logger.ts';

interface UseRebootReturn {
  reboot: () => Promise<void>;
}

/**
 * Custom hook for device reboot functionality
 * Handles user confirmation and API call
 */
export const useReboot = (): UseRebootReturn => {
  /**
   * Reboot the device after user confirmation
   */
  const reboot = async (): Promise<void> => {
    const confirmReboot = window.confirm(
      'Are you sure you want to reboot the Pi? You will need to refresh the page after it comes back up.'
    );

    if (!confirmReboot) return;

    try {
      const data = await deviceAPI.reboot();
      alert(data.message);
    } catch (err) {
      logger.error('Reboot failed', err);
      alert('Failed to reboot.');
    }
  };

  return { reboot };
};
