import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FullScreenDialog, {
  FullScreenDialogContent
} from '../components/UI/FullScreenDialog';
import './local.css';

export default function DeviceSettings({ history }) {
  const [protection, setProtection] = useState('Checking browser storage…');
  const [working, setWorking] = useState(false);
  const [cached, setCached] = useState(false);
  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const persistent = await navigator.storage?.persisted?.();
        if (active)
          setProtection(
            persistent
              ? 'Persistent storage is enabled.'
              : 'Keep a backup: the browser may clear saved data.'
          );
        if (active) setCached(!!navigator.serviceWorker?.controller);
      } catch {
        if (active)
          setProtection(
            'Storage protection could not be checked. Keep a backup.'
          );
      }
    }
    check();
    return () => {
      active = false;
    };
  }, []);
  async function protect() {
    setWorking(true);
    try {
      const granted = await navigator.storage?.persist?.();
      setProtection(
        granted
          ? 'Persistent storage is enabled. Keep backups as well.'
          : 'This browser did not grant persistent storage. Export backups regularly.'
      );
    } catch {
      setProtection(
        'Storage protection is unavailable. Export a backup instead.'
      );
    } finally {
      setWorking(false);
    }
  }
  return (
    <FullScreenDialog open title="Storage and backups" onClose={history.goBack}>
      <FullScreenDialogContent>
        <div className="local-settings">
          <h2>Your communication boards belong to you.</h2>
          <p>
            Boards, uploaded pictures, and recordings are saved in this browser
            on this device. Clearing website data or using another device will
            not bring them with you.
          </p>
          <div className="local-settings-actions">
            <Link className="local-primary" to="/settings/export">
              Export a backup
            </Link>
            <Link className="local-secondary" to="/settings/import">
              Restore a backup
            </Link>
          </div>
          <h3>Protect this device’s copy</h3>
          <p role="status">{protection}</p>
          <button
            className="local-secondary"
            disabled={working}
            onClick={protect}
          >
            {working ? 'Requesting…' : 'Ask browser to keep my boards'}
          </button>
          <h3>Using the app offline</h3>
          <p>
            {cached
              ? 'The app’s offline service is active.'
              : 'Open the deployed app online and allow its initial download to finish, then reopen it.'}{' '}
            Test your boards in airplane mode before relying on them offline.
            Device voices may need a separate download in your system settings.
            Recordings saved in tiles are another option.
          </p>
          <h3>Move to another device</h3>
          <p>
            Export all boards, keep the downloaded file somewhere safe, then
            import it on the other device. Check that your photos and recordings
            work after restoring.
          </p>
          <p>
            <Link to="/settings/about">
              About Open AAC Board and its licenses
            </Link>
          </p>
        </div>
      </FullScreenDialogContent>
    </FullScreenDialog>
  );
}
