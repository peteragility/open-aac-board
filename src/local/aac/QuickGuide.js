// Open AAC Board addition, 2026-10-29. GPL-3.0-only; see LICENSE.txt.
import React, { useEffect, useRef, useState } from 'react';
import { Icon, Modal } from './UI';
import { joinWords } from './languages';

export default function QuickGuide({
  c,
  language,
  words,
  sample,
  onSpeak,
  onStop,
  notice,
  onVoiceConfirmed,
  voiceChecked,
  onAddWord,
  onClose
}) {
  const [step, setStep] = useState(0);
  const [voiceState, setVoiceState] = useState('idle');
  const [practice, setPractice] = useState([]);
  const active = useRef(true);
  useEffect(
    () => () => {
      active.current = false;
    },
    []
  );
  const selected = practice.map((id) => words.find((word) => word.id === id));
  const message = joinWords(
    selected.map((word) => word[language]),
    language
  );
  async function listen() {
    setVoiceState('playing');
    const success = await onSpeak(sample);
    if (active.current) setVoiceState(success ? 'played' : 'error');
  }
  function changeStep(next) {
    onStop();
    setStep(next);
  }
  return (
    <Modal
      title={c.guideTitle}
      closeLabel={c.close}
      onClose={onClose}
      className="aac-guide-dialog"
    >
      <div className="aac-settings-body aac-guide-content">
        <p className="aac-muted">{c.guideIntro}</p>
        <ol className="aac-editor-steps aac-guide-steps">
          {[c.guideVoice, c.guidePictures, c.guidePersonal].map(
            (title, index) => (
              <li
                key={title}
                aria-current={step === index ? 'step' : undefined}
                className={step === index ? 'is-active' : ''}
              >
                <span>{index + 1}</span>
                {title}
              </li>
            )
          )}
        </ol>
        {step === 0 && (
          <section className="aac-guide-voice">
            <h3>{c.guideVoice}</h3>
            <p>{c.voiceCheckIntro}</p>
            <blockquote>{sample}</blockquote>
            <button
              className="aac-primary"
              disabled={voiceState === 'playing'}
              onClick={listen}
            >
              <Icon name="speaker" />
              {voiceState === 'playing' ? c.voicePlaying : c.testVoice}
            </button>
            <p role="status">
              {voiceState === 'error'
                ? c.speechError
                : voiceState === 'played'
                  ? c.voiceCheckQuestion
                  : c.voiceCheckHint}
            </p>
            <button
              className="aac-secondary"
              disabled={voiceState !== 'played' || voiceChecked}
              onClick={onVoiceConfirmed}
            >
              <Icon name="check" />
              {voiceChecked ? c.voiceConfirmed : c.voiceHeard}
            </button>
            {voiceState === 'error' && (
              <p className="aac-callout">{c.volumeHelp}</p>
            )}
          </section>
        )}
        {step === 1 && (
          <section>
            <h3>{c.guidePictures}</h3>
            <p>{c.guidePictureHelp}</p>
            <div className="aac-guide-words">
              {words.map((word) => (
                <button
                  className={`aac-word tone-${word.tone}`}
                  key={word.id}
                  disabled={practice.length >= 6}
                  onClick={() => setPractice([...practice, word.id])}
                >
                  <span className="aac-word-picture">
                    <img src={word.symbol} alt="" />
                  </span>
                  <span className="aac-word-label">{word[language]}</span>
                </button>
              ))}
            </div>
            <div className="aac-guide-message" role="status">
              {message || c.tapHint}
            </div>
            <div className="aac-button-row">
              <button
                className="aac-primary"
                disabled={!message}
                onClick={() =>
                  onSpeak(
                    message,
                    selected.map((word) => ({ text: word[language] }))
                  )
                }
              >
                <Icon name="speaker" />
                {c.speak}
              </button>
              <button
                className="aac-secondary"
                disabled={!message}
                onClick={() => {
                  onStop();
                  setPractice([]);
                }}
              >
                {c.clear}
              </button>
            </div>
            {notice && <p role="status">{notice}</p>}
          </section>
        )}
        {step === 2 && (
          <section>
            <h3>{c.guidePersonal}</h3>
            <p>{c.guidePersonalHelp}</p>
            <button className="aac-primary" onClick={onAddWord}>
              <Icon name="plus" />
              {c.addWord}
            </button>
            <p className="aac-muted">{c.guideReplayHelp}</p>
          </section>
        )}
      </div>
      <div className="aac-button-row aac-guide-actions">
        {step > 0 && (
          <button
            className="aac-secondary"
            onClick={() => changeStep(step - 1)}
          >
            {c.previousStep}
          </button>
        )}
        <button
          className="aac-primary"
          onClick={() => (step === 2 ? onClose() : changeStep(step + 1))}
        >
          {step === 2 ? c.guideFinish : c.nextStep}
        </button>
        <button className="aac-text-button" onClick={onClose}>
          {c.guideSkip}
        </button>
      </div>
    </Modal>
  );
}
