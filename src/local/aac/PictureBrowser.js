// Open AAC Board addition, 2026-10-30. GPL-3.0-only; see LICENSE.txt.
import React, { useLayoutEffect, useRef } from 'react';
import PictureCard from './PictureCard';
import { Icon } from './UI';
import { PICTURE_GROUPS, ESSENTIAL_WORDS, wordsInGroup } from './pictureGroups';

export default function PictureBrowser({
  words,
  group,
  onGroup,
  slots,
  onPins,
  onSelect,
  onAdd,
  c,
  editing,
  disabled,
  highlighted,
  scanGrid,
  scanning,
  scanIndex,
  onScanKey
}) {
  const heading = useRef();
  const previousGroup = useRef(group);
  useLayoutEffect(() => {
    if (previousGroup.current !== group) {
      heading.current?.focus({ preventScroll: true });
      previousGroup.current = group;
    }
  }, [group]);
  const active = PICTURE_GROUPS.find((item) => item.id === group);
  const visible = wordsInGroup(words, group);
  const title =
    group === 'core'
      ? c.pictureCore
      : active
        ? c[active.title]
        : c.browsePictures;
  const card = (word, index, prefix = '') => (
    <PictureCard
      key={prefix + word.id}
      word={word}
      c={c}
      onSelect={onSelect}
      editing={editing}
      disabled={disabled}
      highlighted={highlighted === word.id}
      attributes={
        scanning && !prefix && scanIndex === index
          ? { 'data-scan-focus': true }
          : {}
      }
    />
  );
  return (
    <section className="aac-picture-browser" aria-label={c.browsePictures}>
      <div className="aac-picture-nav">
        <button
          className="aac-secondary"
          onClick={() => onGroup(null)}
          disabled={!group}
          aria-label={c.pictureBack}
        >
          <Icon name="arrow" className="aac-arrow-back" />
          <Icon name="pictures" />
          <span>{c.pictureBackShort}</span>
        </button>
        <h2 ref={heading} tabIndex={-1}>
          {title}
        </h2>
        <button
          className="aac-secondary aac-core-shortcut"
          aria-label={c.pictureCore}
          aria-pressed={group === 'core'}
          onClick={() => onGroup('core')}
        >
          <span className="aac-core-thumbnails" aria-hidden="true">
            {['i', 'want'].map((id) => (
              <img
                key={id}
                src={words.find((w) => w.id === id)?.image}
                alt=""
              />
            ))}
          </span>
          <span>{c.pictureCoreShort}</span>
        </button>
      </div>
      <div
        className="aac-essential-pictures"
        role="group"
        aria-label={c.essentialWords}
      >
        {ESSENTIAL_WORDS.map((id, index) =>
          card(
            words.find((word) => word.id === id),
            index,
            'essential-'
          )
        )}
      </div>
      {!group ? (
        <>
          <div className="aac-picture-groups">
            {PICTURE_GROUPS.map((item) => {
              const personal = words
                .filter((word) => word.personal)
                .slice(0, 3);
              const examples =
                item.id === 'personal' && personal.length
                  ? personal
                  : item.examples.map((id) =>
                      words.find((word) => word.id === id)
                    );
              return (
                <button
                  className="aac-picture-folder"
                  key={item.id}
                  data-picture-group={item.id}
                  aria-label={c[item.title]}
                  onClick={() => onGroup(item.id)}
                >
                  <span className="aac-folder-collage" aria-hidden="true">
                    {examples.map((word) => (
                      <img key={word.id} src={word.image} alt="" />
                    ))}
                  </span>
                  <span className="aac-folder-label">
                    {c[item.title]}
                    <Icon name="arrow" />
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div
            className="aac-word-grid aac-visual-words"
            role="group"
            aria-label={title}
            ref={scanGrid}
            tabIndex={scanning ? 0 : -1}
            onKeyDown={onScanKey}
          >
            {visible.map((word, index) => card(word, index))}
          </div>
          {!visible.length && (
            <div className="aac-empty">
              <p>{c.emptyMyWords}</p>
              <button className="aac-secondary" onClick={onAdd}>
                <Icon name="plus" />
                {c.addWord}
              </button>
            </div>
          )}
          {['people', 'personal'].includes(group) && (
            <p className="aac-photo-tip">{c.photoTip}</p>
          )}
        </>
      )}
      <section className="aac-pinned-pictures" aria-label={c.pinnedWords}>
        <div className="aac-section-row">
          <h3>
            <Icon name="star" />
            {c.pinnedWords}
          </h3>
          <button className="aac-text-button" onClick={onPins}>
            <Icon name="edit" />
            {c.choosePins}
          </button>
        </div>
        <div className="aac-pin-slots">
          {slots.map((id, index) => {
            const word = words.find((item) => item.id === id);
            return (
              <div className="aac-pin-slot" key={index} data-pin-slot={index}>
                {word ? (
                  card(word, index, `pin-${index}-`)
                ) : (
                  <button
                    className="aac-empty-pin"
                    aria-label={`${c.choosePin} ${index + 1}`}
                    onClick={() => onPins(index)}
                  >
                    <Icon name="plus" />
                    <span>
                      {c.pinSlot} {index + 1}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
