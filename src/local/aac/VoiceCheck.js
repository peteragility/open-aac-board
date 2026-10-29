import React, { useEffect, useRef, useState } from 'react';
import { Icon, Modal } from './UI';
import { languageInfo } from './languages';

export default function VoiceCheck({
  c,
  language,
  voice,
  phrase,
  tryVoice,
  onClose,
  onConfirmed
}) {
  const [state, setState] = useState('idle');
  const [help, setHelp] = useState(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );
  async function listen() {
    setState('playing');
    const played = await tryVoice();
    if (mounted.current) {
      setState(played ? 'played' : 'error');
      if (!played) setHelp(true);
    }
  }
  return (
    <Modal
      title={`${languageInfo(language).label} · ${c.testVoice}`}
      closeLabel={c.close}
      onClose={onClose}
    >
      <div className="aac-settings-body aac-voice-check">
        <p>{c.voiceCheckIntro}</p>
        <blockquote>{phrase}</blockquote>
        <p className="aac-muted">
          {voice ? `${c.deviceVoice}: ${voice.name}` : c.bundled}
        </p>
        <button
          className="aac-primary"
          disabled={state === 'playing'}
          onClick={listen}
        >
          <Icon name="speaker" />
          {state === 'playing' ? c.voicePlaying : c.testVoice}
        </button>
        <p role="status">
          {state === 'error'
            ? c.speechError
            : state === 'played'
              ? c.voiceCheckQuestion
              : c.voiceCheckHint}
        </p>
        <div className="aac-button-row">
          <button
            className="aac-primary"
            disabled={state !== 'played'}
            onClick={onConfirmed}
          >
            {c.voiceHeard}
          </button>
          <button className="aac-secondary" onClick={() => setHelp(true)}>
            {c.voiceNotHeard}
          </button>
        </div>
        {help && (
          <div className="aac-callout">
            <p>{c.volumeHelp}</p>
            {!voice && <p>{c.noVoice}</p>}
            <p>{c.voiceHelp}</p>
          </div>
        )}
        <button className="aac-text-button" onClick={onClose}>
          {c.voiceLater}
        </button>
      </div>
    </Modal>
  );
}
