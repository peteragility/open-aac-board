import React, { useEffect, useRef, useState } from 'react';

const paths = {
  pictures: 'M3 5h18v16H3zM6 2h15M7 9h.01M4 18l5-6 4 4 3-3 5 6',
  plus: 'M12 4v16M4 12h16',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  chat: 'M21 11a9 9 0 0 1-9 9H4l-3 3V11a10 10 0 0 1 20 0ZM6 9h10M6 13h7',
  type: 'M3 4h18M12 4v16M8 20h8',
  plan: 'M8 5h13M8 12h13M8 19h13M2 5l1 1 2-2M2 12l1 1 2-2M2 19l1 1 2-2',
  speaker: 'M3 9h4l6-5v16l-6-5H3zM17 8q5 4 0 8M20 4q8 8 0 16',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 2h6l1 4 4 1 2 5-3 3v4l-5 3-3-2-4 1-4-4 1-4-2-3 3-5 4 1Z',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM15 15l6 6',
  close: 'm5 5 14 14M19 5 5 19',
  back: 'm8 5-7 7 7 7h13V5ZM11 9l6 6M17 9l-6 6',
  trash: 'M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  star: 'm12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z',
  edit: 'm15 3 6 6-12 12H3v-6ZM12 6l6 6',
  check: 'm4 12 5 5L20 6',
  heart: 'M12 21 3 12C-3 4 7-2 12 6 17-2 27 4 21 12Z',
  cup: 'M4 3h12v13q-6 6-12 0ZM16 5h3q6 5-3 8M2 22h17',
  people:
    'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM2 22v-5a7 7 0 0 1 14 0v5M17 3a4 4 0 0 1 0 8M19 14q4 1 4 6',
  home: 'm2 10 10-8 10 8M5 8v14h14V8M9 22v-8h6v8',
  arrow: 'M3 12h17M14 5l7 7-7 7',
  download: 'M12 3v12M6 10l6 6 6-6M3 17v5h18v-5',
  shield: 'm12 2 9 4v6q-1 7-9 11-8-4-9-11V6ZM7 12l3 3 7-7',
  expand: 'M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 6v6l4 3',
  pause: 'M7 4v16M17 4v16',
  play: 'm7 3 15 9-15 9Z',
  microphone:
    'M8 5a4 4 0 0 1 8 0v8a4 4 0 0 1-8 0ZM4 10v3a8 8 0 0 0 16 0v-3M12 21v3',
  refresh: 'M20 8A9 9 0 1 0 21 15M20 2v7h-7'
};
export function Icon({ name, ...props }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}

export function Modal({
  title,
  closeLabel,
  onClose,
  children,
  className = ''
}) {
  const ref = useRef();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const cancel = (event) => {
      event.preventDefault();
      close.current();
    };
    dialog.addEventListener('cancel', cancel);
    return () => {
      dialog.removeEventListener('cancel', cancel);
      dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`aac-dialog ${className}`}
      aria-labelledby="aac-dialog-title"
    >
      <header className="aac-dialog-head">
        <h2 id="aac-dialog-title">{title}</h2>
        <button
          className="aac-icon-button"
          aria-label={closeLabel}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function useDeviceVoices() {
  const [voices, setVoices] = useState([]);
  useEffect(() => {
    const synth = window.speechSynthesis;
    const update = () => {
      try {
        setVoices(synth?.getVoices?.() || []);
      } catch {
        setVoices([]);
      }
    };
    update();
    synth?.addEventListener?.('voiceschanged', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      synth?.removeEventListener?.('voiceschanged', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return voices;
}

export function useOfflineStatus() {
  const [status, setStatus] = useState('preparing');
  const refresh = useRef(() => {});
  const failed = useRef(false);
  useEffect(() => {
    let active = true;
    const started = Date.now();
    const serviceWorker = navigator.serviceWorker;
    if (!serviceWorker || process.env.NODE_ENV !== 'production') {
      setStatus('unavailable');
      return;
    }
    async function check() {
      try {
        const registration = await serviceWorker.getRegistration();
        if (!active) return;
        if (registration?.active?.state === 'activated') setStatus('ready');
        else if (!navigator.onLine) setStatus('paused');
        else if (registration?.installing || registration?.waiting)
          setStatus('preparing');
        else if (failed.current || Date.now() - started > 10000)
          setStatus('unavailable');
        else setStatus('preparing');
      } catch {
        if (active) setStatus('unavailable');
      }
    }
    function onFailure() {
      failed.current = true;
      check();
    }
    refresh.current = check;
    check();
    serviceWorker.ready.then(check);
    serviceWorker.addEventListener('controllerchange', check);
    window.addEventListener('online', check);
    window.addEventListener('offline', check);
    window.addEventListener('aac-offline-error', onFailure);
    const interval = setInterval(check, 3000);
    return () => {
      active = false;
      clearInterval(interval);
      serviceWorker.removeEventListener('controllerchange', check);
      window.removeEventListener('online', check);
      window.removeEventListener('offline', check);
      window.removeEventListener('aac-offline-error', onFailure);
      refresh.current = () => {};
    };
  }, []);
  async function retry() {
    if (!navigator.serviceWorker || process.env.NODE_ENV !== 'production')
      return;
    failed.current = false;
    setStatus(navigator.onLine ? 'preparing' : 'paused');
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) await registration.update();
      else
        await navigator.serviceWorker.register(
          `${process.env.PUBLIC_URL}/service-worker.js`
        );
    } catch {
      failed.current = true;
    }
    refresh.current();
  }
  return { status, retry };
}
