import { useEffect, useState, ChangeEvent } from 'react';
import { configAPI } from '../../services/api';
import { useTimeout } from '../../hooks/useTimeout.ts';
import { logger } from '../../utils/logger.ts';
import { TIMEOUTS } from '../../constants.ts';
import { validateConfigResponse } from '../../utils/validators.ts';
import './ConfigPanel.css';

interface ConfigPanelProps {
  side: string;
}

interface ConfigState {
  secondsBetweenImages: string | number;
}

const ConfigPanel = ({ side }: ConfigPanelProps) => {
  const [config, setConfig] = useState<ConfigState>({
    secondsBetweenImages: '',
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);
  const { scheduleTimeout } = useTimeout();

  // Load config on mount or when `side` changes
  useEffect(() => {
    if (!side) return;

    const loadConfig = async (): Promise<void> => {
      setLoading(true);
      try {
        const data = await configAPI.getConfig(side);

        // Validate response structure and values
        const validated = validateConfigResponse(data);
        setConfig({
          secondsBetweenImages: validated.secondsBetweenImages,
          // add more config keys here if needed in the future
        });
      } catch (err) {
        logger.error('Failed to fetch config', err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [side]);


  // Handle input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value, type } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  // Save config to server
  const handleSave = async (): Promise<void> => {
    if (!side) {
      setStatus('No side specified');
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      await configAPI.updateConfig(side, config);
      setStatus('Saved!');
    } catch (err) {
      logger.error('Failed to save config', err);
      setStatus('Save failed.');
    } finally {
      setSaving(false);
      scheduleTimeout(() => setStatus(null), TIMEOUTS.STATUS_MESSAGE_SHORT);
    }
  };

  return (
    <div className="config-panel">
      <h2>Config for "{side}"</h2>

      {loading ? (
        <p role="status" aria-live="polite">Loading...</p>
      ) : (
        <>
          <label className="config-label">
            Seconds between images:
            <input
              type="number"
              name="secondsBetweenImages"
              value={config.secondsBetweenImages}
              onChange={handleChange}
              className="config-input"
              min={0}
            />
          </label>

          <button
            onClick={handleSave}
            disabled={saving}
            className="config-btn"
            aria-label={saving ? 'Saving configuration' : 'Save configuration'}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>

          {status && (
            <p className="config-status" role="status" aria-live="polite">
              {status}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default ConfigPanel;
