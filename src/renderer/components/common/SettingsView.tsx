import React from 'react';
import { useAppStore } from '../../stores/appStore';

export const SettingsView: React.FC = () => {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);

  const email = settings.email;

  return (
    <div className="view-container">
      <h2>Settings</h2>
      <div className="card">
        <h3>General Settings</h3>
        <div className="setting-item">
          <label>Dark Mode</label>
          <input type="checkbox" defaultChecked />
        </div>
        <div className="setting-item">
          <label>Auto Start Agents</label>
          <input type="checkbox" defaultChecked />
        </div>
        <div className="setting-item">
          <label>Self Evolve System</label>
          <input type="checkbox" defaultChecked />
        </div>
        <div className="setting-item">
          <label>Auto Correct</label>
          <input type="checkbox" defaultChecked />
        </div>
        <div className="setting-item">
          <label>Desktop Notifications</label>
          <input type="checkbox" defaultChecked />
        </div>
      </div>

      <div className="card">
        <h3>Email Connectors</h3>
        <div className="setting-item">
          <label>Outlook Client ID</label>
          <input
            value={email.outlookClientId}
            onChange={(e) => setSettings({ ...settings, email: { ...email, outlookClientId: e.target.value } })}
            placeholder="Azure App (client) ID"
          />
        </div>
        <div className="setting-item">
          <label>Outlook Tenant</label>
          <input
            value={email.outlookTenant}
            onChange={(e) => setSettings({ ...settings, email: { ...email, outlookTenant: e.target.value } })}
            placeholder="common"
          />
        </div>
        <div className="setting-item">
          <label>Gmail Client ID</label>
          <input
            value={email.gmailClientId}
            onChange={(e) => setSettings({ ...settings, email: { ...email, gmailClientId: e.target.value } })}
            placeholder="Google OAuth client ID"
          />
        </div>
      </div>

      <div className="card">
        <h3>AI Settings</h3>
        <div className="setting-item">
          <label>Default Model Provider</label>
          <select>
            <option>Auto Detect</option>
            <option>Ollama</option>
            <option>LM Studio</option>
            <option>Jan</option>
          </select>
        </div>
        <div className="setting-item">
          <label>Max Concurrent Agents</label>
          <input type="number" defaultValue={4} min={1} max={16} />
        </div>
      </div>
    </div>
  );
};
