// Open AAC Board addition, 2026-10-30. GPL-3.0-only; see LICENSE.txt.
import React from 'react';
import { Icon } from './UI';
import { languageInfo } from './languages';

export default function PictureCard({
  word,
  c,
  onSelect,
  disabled,
  editing,
  highlighted,
  attributes = {}
}) {
  return (
    <button
      className={`aac-word tone-${word.tone} ${editing ? 'is-editing' : ''} ${highlighted ? 'aac-just-picked' : ''}`}
      data-word-id={word.id}
      disabled={disabled}
      onClick={() => onSelect(word)}
      {...attributes}
    >
      <span className="aac-word-picture">
        <img src={word.image} alt="" draggable="false" />
      </span>
      <span
        className="aac-word-label"
        lang={languageInfo(word.labelLanguage).html}
      >
        {word.text}
      </span>
      {!word.translated && (
        <span className="aac-missing-label">{c.translationShort}</span>
      )}
      {editing && (
        <span className="aac-word-edit">
          <Icon name="edit" />
        </span>
      )}
      {word.recording && (
        <span className="aac-recording-badge" aria-label={c.recordingReady}>
          <Icon name="microphone" />
        </span>
      )}
      {highlighted && (
        <span className="aac-picked-check" aria-hidden="true">
          <Icon name="check" />
        </span>
      )}
    </button>
  );
}
