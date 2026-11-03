// Open AAC Board addition, 2026-11-03. GPL-3.0-only; see LICENSE.txt.
// Shown while the saved board is still being read. The app waits for the read
// rather than starting empty, so a slow device sees this instead of a blank page.
import React, { useEffect, useState } from 'react';
import './local.css';

export default function StartupNotice() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 3000),
      setTimeout(() => setStage(2), 15000)
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  if (!stage) return null;
  return (
    <div className="local-startup" role="status">
      <p>
        <span lang="zh-HK">正在開啟你嘅溝通板…</span>{' '}
        <span lang="en">Opening your saved board…</span>
      </p>
      {stage > 1 && (
        <button onClick={() => window.location.reload()}>
          <span lang="zh-HK">重新載入</span> · <span lang="en">Reload</span>
        </button>
      )}
    </div>
  );
}
