// Open AAC Board additions, 2026-10-29. GPL-3.0-only.
import React, { useState } from 'react';
import { Icon, Modal } from './UI';
import { DEFAULT_RESPONSES } from './model';

export default function QuickResponses({
  c,
  language,
  phrases,
  selected = DEFAULT_RESPONSES,
  onSave,
  onSpeak,
  speaking,
  notice,
  onStop,
  onClose
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([...selected]);
  return (
    <Modal
      title={editing ? c.chooseResponses : c.responses}
      closeLabel={c.close}
      onClose={onClose}
    >
      <div className="aac-settings-body aac-responses">
        <p className="aac-muted">{editing ? c.responsePick : c.responseHint}</p>
        {editing ? (
          <>
            {phrases.map((phrase) => (
              <label className="aac-response-choice" key={phrase.id}>
                <input
                  type="checkbox"
                  checked={draft.includes(phrase.id)}
                  disabled={!draft.includes(phrase.id) && draft.length >= 4}
                  onChange={(event) =>
                    setDraft((old) =>
                      event.target.checked
                        ? [...old, phrase.id]
                        : old.filter((id) => id !== phrase.id)
                    )
                  }
                />
                <span>{phrase[language]}</span>
              </label>
            ))}
            <div className="aac-button-row">
              <button
                className="aac-primary"
                disabled={!draft.length}
                onClick={() => {
                  onSave(draft);
                  setEditing(false);
                }}
              >
                {c.save}
              </button>
              <button
                className="aac-secondary"
                onClick={() => {
                  setDraft([...selected]);
                  setEditing(false);
                }}
              >
                {c.cancel}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="aac-response-grid">
              {selected
                .map((id) => phrases.find((phrase) => phrase.id === id))
                .filter(Boolean)
                .map((phrase) => (
                  <button
                    className="aac-secondary"
                    key={phrase.id}
                    onClick={() => onSpeak(phrase[language])}
                  >
                    <img src={phrase.symbol} alt="" />
                    <span>{phrase[language]}</span>
                    <Icon name="speaker" />
                  </button>
                ))}
            </div>
            {notice && <p role="status">{notice}</p>}
            <div className="aac-button-row">
              {speaking && (
                <button className="aac-primary" onClick={onStop}>
                  <Icon name="pause" />
                  {c.stop}
                </button>
              )}
              <button className="aac-secondary" onClick={onClose}>
                {c.returnMessage}
              </button>
              <button
                className="aac-text-button"
                onClick={() => {
                  onStop();
                  setEditing(true);
                }}
              >
                {c.chooseResponses}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
