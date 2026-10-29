// Open AAC Board addition, 2026-10-30. GPL-3.0-only; see LICENSE.txt.
import React, { useState } from 'react';
import { Modal, Icon } from './UI';
import PictureCard from './PictureCard';

export default function PinnedWordEditor({
  words,
  slots,
  initialSlot = 0,
  c,
  onSave,
  onClose
}) {
  const [draft, setDraft] = useState([...slots]);
  const [slot, setSlot] = useState(initialSlot);
  const [error, setError] = useState('');
  return (
    <Modal
      title={c.choosePins}
      closeLabel={c.close}
      onClose={onClose}
      className="aac-pin-editor"
    >
      <div className="aac-settings-body aac-pin-content">
        <p>{c.pinHelp}</p>
        <div className="aac-pin-picker" role="group" aria-label={c.pinnedWords}>
          {draft.map((id, index) => {
            const word = words.find((item) => item.id === id);
            return (
              <button
                className="aac-secondary"
                key={index}
                aria-pressed={slot === index}
                aria-label={`${c.pinSlot} ${index + 1}${word ? ': ' + word.text : ''}`}
                onClick={() => setSlot(index)}
              >
                <span>{index + 1}</span>
                {word ? <img src={word.image} alt="" /> : <Icon name="plus" />}
              </button>
            );
          })}
        </div>
        <p role="status">
          {c.choosePin} {slot + 1}
        </p>
        <button
          className="aac-text-button"
          disabled={!draft[slot]}
          onClick={() =>
            setDraft(draft.map((id, index) => (index === slot ? null : id)))
          }
        >
          <Icon name="trash" />
          {c.clearPin}
        </button>
        <div className="aac-pin-options">
          {words.map((word) => (
            <PictureCard
              key={word.id}
              word={word}
              c={c}
              highlighted={draft[slot] === word.id}
              attributes={{ 'aria-pressed': draft[slot] === word.id }}
              disabled={draft.includes(word.id) && draft[slot] !== word.id}
              onSelect={() =>
                setDraft(
                  draft.map((id, index) => (index === slot ? word.id : id))
                )
              }
            />
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="aac-button-row aac-pin-actions">
        <button
          className="aac-primary"
          onClick={() => {
            try {
              onSave(draft);
            } catch {
              setError(c.wordSaveError);
            }
          }}
        >
          {c.save}
        </button>
        <button className="aac-secondary" onClick={onClose}>
          {c.cancel}
        </button>
      </div>
    </Modal>
  );
}
