import React, { useEffect, useRef, useState } from 'react';
import { LANGUAGES } from './languages';
import { copy } from './copy';
import { readLocalMedia } from '../media';
import { Icon, Modal } from './UI';

export default function WordEditor({
  word,
  override,
  language,
  isNew = false,
  onDelete,
  onSave,
  onReset,
  onClose
}) {
  const c = copy(language);
  const [draft, setDraft] = useState({
    ...word,
    ...override,
    recordings: { ...word.recordings, ...override?.recordings }
  });
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const session = useRef(null);
  const labelInput = useRef(null);
  const mounted = useRef(true);
  const previewURL =
    draft.image || word.symbol || '/symbols/open-aac/friend.svg';
  const steps = [c.wordPhoto, c.wordLabel, c.wordVoice];
  useEffect(() => {
    if (isNew && step === 1) labelInput.current?.focus();
  }, [isNew, step]);
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
      if (mounted.current) {
        setDraft((old) => ({ ...old, image }));
        setError('');
      }
    } catch {
      setError(c.mediaError);
    }
  }
  function labelField(l) {
    return (
      <label className="aac-field" key={l.id}>
        <span>
          {l.label}
          {l.id !== language && <small> · {c.optional}</small>}
        </span>
        <input
          ref={l.id === language ? labelInput : undefined}
          aria-label={l.label}
          required={l.id === language}
          maxLength={80}
          value={draft[l.id] || ''}
          onChange={(event) => {
            setDraft({ ...draft, [l.id]: event.target.value });
            setError('');
          }}
        />
      </label>
    );
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
    <Modal
      title={isNew ? c.addWord : c.edit}
      closeLabel={c.close}
      onClose={onClose}
      className="aac-word-editor"
    >
      <form
        className="aac-word-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (isNew && step < 2) {
            setStep((old) => old + 1);
            return;
          }
          try {
            onSave(draft);
          } catch {
            setError(c.wordSaveError);
          }
        }}
      >
        <div className="aac-settings-body aac-editor-content">
          {isNew && (
            <ol className="aac-editor-steps" aria-label={c.addWord}>
              {steps.map((label, index) => (
                <li
                  key={label}
                  aria-current={step === index ? 'step' : undefined}
                >
                  <b>{index + 1}</b>
                  {label}
                </li>
              ))}
            </ol>
          )}
          <div className="aac-editor-preview">
            <img src={previewURL} alt="" />
            <strong>{draft[language]}</strong>
          </div>
          {(!isNew || step === 0) && (
            <>
              {isNew && <p>{c.photoOptional}</p>}
              <label className="aac-secondary aac-file-button">
                {c.photo}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={photo}
                />
              </label>
            </>
          )}
          {(!isNew || step === 1) && (
            <>
              {isNew && <p className="aac-muted">{c.labelHelp}</p>}
              {labelField(LANGUAGES.find((l) => l.id === language))}
              {isNew ? (
                <details className="aac-optional-translations">
                  <summary>{c.addTranslations}</summary>
                  {LANGUAGES.filter((l) => l.id !== language).map(labelField)}
                </details>
              ) : (
                LANGUAGES.filter((l) => l.id !== language).map(labelField)
              )}
            </>
          )}
          {(!isNew || step === 2) && (
            <>
              <h3>
                {c.voice} · {LANGUAGES.find((l) => l.id === language).label}
              </h3>
              <p className="aac-muted">{c.recordOptional}</p>
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
            </>
          )}
          <p role="alert">{error}</p>
          {override && (
            <button className="aac-text-button" type="button" onClick={onReset}>
              {c.resetWord}
            </button>
          )}
          {onDelete && (
            <div className="aac-delete-word">
              {confirmDelete ? (
                <>
                  <p>{c.deleteWordConfirm}</p>
                  <div className="aac-button-row">
                    <button
                      type="button"
                      className="aac-secondary"
                      disabled={Boolean(recording)}
                      onClick={onDelete}
                    >
                      {c.deleteWord}
                    </button>
                    <button
                      type="button"
                      className="aac-text-button"
                      onClick={() => setConfirmDelete(false)}
                    >
                      {c.cancel}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  disabled={Boolean(recording)}
                  className="aac-text-button"
                  onClick={() => setConfirmDelete(true)}
                >
                  {c.deleteWord}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="aac-button-row aac-editor-actions">
          <button
            className="aac-primary"
            disabled={
              Boolean(recording) ||
              ((!isNew || step > 0) && !draft[language]?.trim())
            }
            type="submit"
          >
            {isNew && step < 2 ? c.nextStep : c.save}
          </button>
          {isNew && step > 0 && (
            <button
              type="button"
              disabled={Boolean(recording)}
              className="aac-secondary"
              onClick={() => {
                setStep((old) => old - 1);
                setError('');
              }}
            >
              {c.previousStep}
            </button>
          )}
          <button className="aac-secondary" type="button" onClick={onClose}>
            {c.cancel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
