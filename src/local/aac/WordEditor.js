import React, { useEffect, useRef, useState } from 'react';
import { LANGUAGES } from './languages';
import { copy } from './copy';
import { readLocalMedia } from '../media';
import { Icon, Modal } from './UI';

export default function WordEditor({
  word,
  override,
  language,
  onSave,
  onReset,
  onClose
}) {
  const c = copy(language);
  const [draft, setDraft] = useState({
    yue: word.yue,
    en: word.en,
    cmn: word.cmn,
    ...override,
    recordings: { ...override?.recordings }
  });
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const session = useRef(null);
  const mounted = useRef(true);
  const previewURL = draft.image || word.symbol;
  useEffect(
    () => () => {
      mounted.current = false;
      const current = session.current;
      if (current) {
        clearTimeout(current.timeout);
        if (current.recorder?.state === 'recording') current.recorder.stop();
        current.stream?.getTracks().forEach((t) => t.stop());
      }
    },
    []
  );
  async function photo(event) {
    try {
      const file = event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024)
        throw new Error('invalid-picture');
      const image = await readLocalMedia(file);
      if (mounted.current) setDraft((old) => ({ ...old, image }));
    } catch {
      setError(c.mediaError);
    }
  }
  async function record() {
    if (recording === 'recording') {
      session.current?.recorder?.stop();
      return;
    }
    setError('');
    setRecording('starting');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const type = ['audio/webm;codecs=opus', 'audio/mp4'].find((mime) =>
        window.MediaRecorder.isTypeSupported(mime)
      );
      const recorder = new window.MediaRecorder(
        stream,
        type ? { mimeType: type } : undefined
      );
      const parts = [];
      let bytes = 0;
      const current = { recorder, stream };
      session.current = current;
      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          parts.push(event.data);
          bytes += event.data.size;
          if (bytes > 1024 * 1024 && recorder.state === 'recording')
            recorder.stop();
        }
      };
      recorder.onerror = () => {
        setError(c.mediaError);
        if (recorder.state !== 'inactive') recorder.stop();
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.onstop = async () => {
        clearTimeout(current.timeout);
        stream.getTracks().forEach((t) => t.stop());
        if (!mounted.current) return;
        setRecording(false);
        try {
          if (!bytes || bytes > 1024 * 1024)
            throw new Error('invalid-recording');
          const file = new File(parts, 'voice', {
            type: recorder.mimeType || parts[0]?.type
          });
          const audio = await readLocalMedia(file);
          if (mounted.current)
            setDraft((old) => ({
              ...old,
              recordings: { ...old.recordings, [language]: audio }
            }));
        } catch {
          if (mounted.current) setError(c.mediaError);
        }
      };
      recorder.start(250);
      setRecording('recording');
      current.timeout = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 15000);
    } catch {
      stream?.getTracks().forEach((t) => t.stop());
      if (mounted.current) {
        setRecording(false);
        setError(c.mediaError);
      }
    }
  }
  return (
    <Modal title={c.edit} closeLabel={c.close} onClose={onClose}>
      <form
        className="aac-settings-body"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onSave(draft);
          } catch {
            setError(c.mediaError);
          }
        }}
      >
        <div className="aac-editor-preview">
          <img src={previewURL} alt="" />
          <strong>{draft[language]}</strong>
        </div>
        {LANGUAGES.map((l) => (
          <label className="aac-field" key={l.id}>
            {l.label}
            <input
              required
              maxLength={80}
              value={draft[l.id]}
              onChange={(e) => setDraft({ ...draft, [l.id]: e.target.value })}
            />
          </label>
        ))}
        <label className="aac-secondary aac-file-button">
          {c.photo}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={photo}
          />
        </label>
        <h3>
          {c.voice} · {LANGUAGES.find((l) => l.id === language).label}
        </h3>
        <button
          type="button"
          disabled={recording === 'starting'}
          className={`aac-secondary ${recording ? 'aac-recording' : ''}`}
          onClick={record}
        >
          <Icon name="microphone" />
          {recording ? c.stopRecord : c.record}
        </button>
        {recording && <p role="status">{c.recording}</p>}
        {draft.recordings[language] && (
          <div>
            <p>{c.recordingReady}</p>
            <audio controls src={draft.recordings[language]} />
            <button
              type="button"
              className="aac-text-button"
              onClick={() =>
                setDraft({
                  ...draft,
                  recordings: { ...draft.recordings, [language]: '' }
                })
              }
            >
              {c.removeRecording}
            </button>
          </div>
        )}
        <p role="alert">{error}</p>
        <div className="aac-button-row">
          <button
            className="aac-primary"
            disabled={recording || LANGUAGES.some((l) => !draft[l.id].trim())}
            type="submit"
          >
            {c.save}
          </button>
          <button className="aac-secondary" type="button" onClick={onClose}>
            {c.cancel}
          </button>
        </div>
        {override && (
          <button className="aac-text-button" type="button" onClick={onReset}>
            {c.resetWord}
          </button>
        )}
      </form>
    </Modal>
  );
}
