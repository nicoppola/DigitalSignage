// ConfigPanel.jsx
import React, { useEffect, useState } from 'react';
import './ConfigPanel.css';

const ConfigPanel = ({ side }) => {
  const [config, setConfig] = useState({
    secondsBetweenImages: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  // Load config on mount or when `side` changes
  useEffect(() => {
    if (!side) return;

    setLoading(true);
    fetch(`/config?side=${encodeURIComponent(side)}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        // Defensive: if secondsBetweenImages missing, fallback to empty string
        setConfig({
          secondsBetweenImages: data.secondsBetweenImages ?? '',
          // add more config keys here if needed in the future
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch config:', err);
        setLoading(false);
      });
  }, [side]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  // Save config to server
  const handleSave = async () => {
    if (!side) {
      setStatus('No side specified');
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const res = await fetch('/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side, config }),
         credentials: 'include' 
      });

      if (!res.ok) throw new Error('Failed to save');

      setStatus('Saved!');
    } catch (err) {
      console.error(err);
      setStatus('Save failed.');
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 2000);
    }
  };

  return (
    <div className="config-panel">
      {/* Optional heading, remove if you want */}
      <h2>Config for "{side}"</h2>

      {loading ? (
        <p>Loading...</p>
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
          >
            {saving ? 'Saving...' : 'Save'}
          </button>

          {status && <p className="config-status">{status}</p>}
        </>
      )}
    </div>
  );
};

export default ConfigPanel;
