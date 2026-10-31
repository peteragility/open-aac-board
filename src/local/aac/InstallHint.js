// Open AAC Board addition, 2026-10-31. GPL-3.0-only; see LICENSE.txt.
import React from 'react';
import { copy } from './copy.js';
import { Icon } from './UI.js';

// iOS Safari has no automatic install prompt for progressive web apps, so
// first-time iPhone and iPad users are shown the Add to Home Screen steps
// once. Installed web apps, Android and desktop browsers see nothing.
export function needsInstallHint() {
  if (typeof navigator === 'undefined') return false;
  const iOSDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installed =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  return iOSDevice && !installed;
}

export default function InstallHint({ language, dismissed, onDismiss }) {
  if (dismissed || !needsInstallHint()) return null;
  const c = copy(language);
  return (
    <div className="aac-install-hint" role="note">
      <Icon name="download" />
      <div>
        <strong>{c.installHintTitle}</strong>
        <p>{c.installHintSteps}</p>
      </div>
      <button className="aac-text-button" onClick={onDismiss}>
        {c.installHintDismiss}
      </button>
    </div>
  );
}
