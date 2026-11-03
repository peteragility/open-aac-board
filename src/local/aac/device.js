// Open AAC Board addition, 2026-11-03. GPL-3.0-only; see LICENSE.txt.
import { useEffect } from 'react';

// A short two-note chime made on the device, so it also works offline.
export function playChime() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    [0, 0.4].forEach((offset, index) => {
      const start = context.currentTime + offset;
      const tone = context.createOscillator();
      const gain = context.createGain();
      tone.frequency.value = index ? 660 : 880;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      tone.connect(gain);
      gain.connect(context.destination);
      tone.start(start);
      tone.stop(start + 0.37);
    });
    setTimeout(() => context.close?.(), 1500);
  } catch {}
}

// Keep the screen on while the board is visible. Browsers release the lock when
// the page is hidden, so it is requested again when the page returns.
export function useWakeLock(enabled) {
  useEffect(() => {
    if (!enabled || !navigator.wakeLock?.request) return undefined;
    let lock = null;
    let active = true;
    const request = async () => {
      if (document.visibilityState !== 'visible' || lock) return;
      try {
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener?.('release', () => {
          lock = null;
        });
        if (!active) lock.release();
      } catch {
        lock = null;
      }
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', request);
      lock?.release().catch(() => {});
      lock = null;
    };
  }, [enabled]);
}
