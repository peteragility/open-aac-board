import React, { useEffect, useState } from 'react';
import { Icon, Modal } from './UI';
import { languageInfo } from './languages';

export default function Routine({
  workspace,
  update,
  words,
  c,
  say,
  onMissingTranslation
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [remaining, setRemaining] = useState(180);
  const [duration, setDuration] = useState(180);
  const [end, setEnd] = useState(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!end) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) setEnd(null);
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [end]);
  const items = workspace.routine
    .map((id) => words.find((w) => w.id === id))
    .filter(Boolean);
  const outstanding = items.filter(
    (w) => !workspace.routineDone.includes(w.id)
  );
  function chooseDuration(seconds) {
    setDuration(seconds);
    setRemaining(seconds);
    setEnd(null);
    setStarted(false);
  }
  return (
    <div className="aac-routine-layout">
      <section className="aac-routine-list">
        <div className="aac-section-row">
          <p className="aac-muted">{c.routineHint}</p>
          <button
            className="aac-secondary"
            onClick={() => {
              setDraft([...workspace.routine]);
              setEditing(true);
            }}
          >
            <Icon name="edit" />
            {c.editRoutine}
          </button>
        </div>
        {items.map((word) => {
          const done = workspace.routineDone.includes(word.id);
          const rank = outstanding.findIndex((w) => w.id === word.id);
          return (
            <article
              className={`aac-routine-step ${done ? 'is-complete' : ''} ${rank === 0 ? 'is-current' : ''}`}
              key={word.id}
            >
              <span className="aac-step-status">
                {done ? (
                  <Icon name="check" />
                ) : rank === 0 ? (
                  c.now
                ) : rank === 1 ? (
                  c.next
                ) : (
                  c.later
                )}
              </span>
              <button
                className="aac-routine-picture"
                onClick={() =>
                  word.translated
                    ? say(word.text, [
                        { text: word.text, recording: word.recording }
                      ])
                    : onMissingTranslation(word)
                }
              >
                <img src={word.image} alt="" />
                <strong lang={languageInfo(word.labelLanguage).html}>
                  {word.text}
                </strong>
                {!word.translated && (
                  <span className="aac-missing-label">
                    {c.translationShort}
                  </span>
                )}
              </button>
              <button
                className="aac-step-check"
                aria-label={`${c.completeStep}: ${word.text}`}
                aria-pressed={done}
                onClick={() => update('routine-done', word.id)}
              >
                <Icon name="check" />
              </button>
            </article>
          );
        })}
        {!outstanding.length && items.length > 0 && (
          <p className="aac-success" role="status">
            {c.allDone}
          </p>
        )}
        <button
          className="aac-text-button"
          onClick={() => update('reset-routine')}
        >
          <Icon name="refresh" />
          {c.resetRoutine}
        </button>
      </section>
      <section className="aac-timer">
        <span className="aac-eyebrow">
          <Icon name="clock" />
          {c.timer}
        </span>
        <div
          className="aac-timer-dial"
          style={{ '--progress': `${(remaining / duration) * 360}deg` }}
        >
          <span role="timer" aria-label={c.timer}>
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, '0')}
          </span>
        </div>
        <div className="aac-timer-presets">
          {[60, 180, 300].map((seconds) => (
            <button
              className={duration === seconds ? 'is-active' : ''}
              key={seconds}
              onClick={() => chooseDuration(seconds)}
            >
              {seconds / 60} {c.minutes}
            </button>
          ))}
        </div>
        <div className="aac-button-row">
          <button
            className="aac-primary"
            disabled={!remaining}
            onClick={() => {
              setStarted(true);
              setEnd(end ? null : Date.now() + remaining * 1000);
            }}
          >
            <Icon name={end ? 'pause' : 'play'} />
            {end ? c.pause : c.resume}
          </button>
          <button
            className="aac-icon-button"
            aria-label={c.resetTimer}
            onClick={() => chooseDuration(duration)}
          >
            <Icon name="refresh" />
          </button>
        </div>
        <p className="aac-muted" role="status">
          {started && !remaining ? c.timerDone : c.routineHint}
        </p>
      </section>
      {editing && (
        <Modal
          title={c.editRoutine}
          closeLabel={c.close}
          onClose={() => setEditing(false)}
        >
          <div className="aac-settings-body">
            <p>{c.routinePick}</p>
            <div className="aac-routine-options">
              {words.map((word) => (
                <button
                  key={word.id}
                  aria-pressed={draft.includes(word.id)}
                  disabled={!draft.includes(word.id) && draft.length >= 8}
                  onClick={() =>
                    setDraft(
                      draft.includes(word.id)
                        ? draft.filter((id) => id !== word.id)
                        : [...draft, word.id]
                    )
                  }
                >
                  <img src={word.image} alt="" />
                  <span lang={languageInfo(word.labelLanguage).html}>
                    {word.text}
                  </span>
                  {!word.translated && (
                    <span className="aac-missing-label">
                      {c.translationShort}
                    </span>
                  )}
                  {draft.includes(word.id) && (
                    <b>{draft.indexOf(word.id) + 1}</b>
                  )}
                </button>
              ))}
            </div>
            <button
              className="aac-primary"
              disabled={!draft.length}
              onClick={() => {
                update('routine', draft);
                setEditing(false);
              }}
            >
              {c.save}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
