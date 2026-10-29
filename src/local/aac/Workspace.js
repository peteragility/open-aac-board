import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import catalog from './catalog.json';
import { ACTION, validateWorkspace } from './model';
import {
  LANGUAGES,
  languageInfo,
  joinWords,
  normalizeSpeechText,
  selectVoice
} from './languages';
import { copy } from './copy';
import { speech } from './speech';
import { Icon, Modal, useDeviceVoices, useOfflineStatus } from './UI';
import VoiceCheck from './VoiceCheck';
import WorkspaceSettings from './WorkspaceSettings';
import WordEditor from './WordEditor';
import Routine from './Routine';
import QuickResponses from './QuickResponses';
import { workspaceWords, pictureSegments } from './vocabulary';
import './workspace.css';

const sections = [
  ['board', 'grid'],
  ['quick', 'chat'],
  ['typing', 'type'],
  ['routine', 'plan']
];

export function Workspace({ workspace, dispatch }) {
  const update = useCallback(
    (operation, payload) => dispatch({ type: ACTION, operation, payload }),
    [dispatch]
  );
  const { language, preferences, overrides, customWords } = workspace;
  const c = copy(language);
  const voices = useDeviceVoices();
  const { status: offlineStatus, retry: retryOffline } = useOfflineStatus();
  const offlineReady = offlineStatus === 'ready';
  const matchingVoice = selectVoice(
    voices,
    language,
    workspace.voices[language]
  );
  const [section, setSection] = useState('board');
  const [category, setCategory] = useState('core');
  const [query, setQuery] = useState('');
  const [tokens, setTokens] = useState([]);
  const [phrase, setPhrase] = useState(null);
  const [typed, setTyped] = useState('');
  const [phraseTab, setPhraseTab] = useState('allPhrases');
  const [editing, setEditing] = useState(false);
  const [editWord, setEditWord] = useState(null);
  const [addingWord, setAddingWord] = useState(false);
  const [modal, setModal] = useState(null);
  const [rotated, setRotated] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState('');
  const [undoDraft, setUndoDraft] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);
  const scanGrid = useRef();
  const scrollArea = useRef();
  const scrollPositions = useRef({});
  const speechSequence = useRef(0);
  const words = useMemo(
    () => workspaceWords(catalog.words, { overrides, customWords }, language),
    [overrides, customWords, language]
  );
  const categories = [
    ...catalog.categories,
    { id: 'personal', icon: 'people', [language]: c.myWords }
  ];
  const selected = tokens
    .map((id) => words.find((word) => word.id === id))
    .filter(Boolean);
  const text =
    section === 'typing'
      ? typed
      : phrase
        ? phrase[language] || phrase.text
        : joinWords(
            selected.map((word) => word.text),
            language
          );
  const visible = words.filter((word) =>
    query
      ? [word.yue, word.en, word.cmn, word.text].some((label) =>
          (label || '').toLocaleLowerCase().includes(query.toLocaleLowerCase())
        )
      : word.category === category
  );
  const segments =
    section === 'typing'
      ? []
      : phrase?.segments || (phrase ? [] : pictureSegments(selected));
  const messagePictures =
    section === 'typing' ? [] : phrase?.segments || (phrase ? [] : selected);
  const missingTranslation =
    section !== 'typing' &&
    !phrase &&
    selected.some((word) => !word.translated);
  const presetPhrases = catalog.phrases.filter(
    (p) => phraseTab !== 'favourite' || workspace.favourites.includes(p.id)
  );
  const myPhrases = workspace.phrases.filter((p) => p.language === language);
  const draftKind = section === 'typing' ? 'typing' : 'board';
  const canUndo = undoDraft?.kind === draftKind;
  const offlineLabel = c[`offline_${offlineStatus}`];
  const voiceChecked = workspace.voiceChecks?.includes(language);
  useLayoutEffect(() => {
    if (scrollArea.current)
      scrollArea.current.scrollTop = scrollPositions.current[section] || 0;
  }, [section]);
  useEffect(() => () => speech.stop(), []);
  useEffect(() => {
    setScanning(false);
    setNotice('');
    setUndoDraft(null);
    speechSequence.current++;
    speech.stop();
    setSpeaking(false);
    setPhrase((old) =>
      old?.language && old.language !== language ? null : old
    );
  }, [language]);
  useEffect(() => {
    if (!scanning || !visible.length) return;
    const timer = setInterval(
      () => setScanIndex((index) => (index + 1) % visible.length),
      preferences.scanDelay * 1000
    );
    return () => clearInterval(timer);
  }, [scanning, visible.length, preferences.scanDelay]);

  function stop() {
    speechSequence.current++;
    speech.stop();
    setSpeaking(false);
  }
  async function say(message, messageSegments = []) {
    const sequence = ++speechSequence.current;
    setNotice('');
    setSpeaking(true);
    try {
      await speech.speak({
        text: message,
        segments: messageSegments,
        language,
        preferredURI: workspace.voices[language],
        rate: preferences.rate
      });
      return sequence === speechSequence.current;
    } catch (error) {
      if (sequence === speechSequence.current)
        setNotice(
          error.message === 'missing-voice' ? c.noVoice : c.speechError
        );
      return false;
    } finally {
      if (sequence === speechSequence.current) setSpeaking(false);
    }
  }
  function selectWord(word) {
    if (editing) {
      setEditWord(word.id);
      return;
    }
    if (!word.translated) {
      setNotice(c.translationMissing);
      return;
    }
    if (tokens.length >= 30) return;
    if (undoDraft?.kind === 'board') setUndoDraft(null);
    setPhrase(null);
    setTokens((old) => [...old, word.id]);
    if (preferences.haptics) navigator.vibrate?.(35);
    if (preferences.speakOnTap)
      say(word.text, [{ text: word.text, recording: word.recording }]);
  }
  function switchSection(next) {
    if (next === section) {
      scrollArea.current.scrollTop = 0;
      return;
    }
    scrollPositions.current[section] = scrollArea.current.scrollTop;
    setSection(next);
    setScanning(false);
    setEditing(false);
    setNotice('');
  }
  function activatePhrase(item) {
    if (undoDraft?.kind === 'board') setUndoDraft(null);
    setPhrase(item);
    setTokens([]);
    say(item[language] || item.text, item.segments || []);
  }
  function savePhrase() {
    const message = text.trim();
    if (!message || missingTranslation || workspace.phrases.length >= 100)
      return;
    try {
      const saved = {
        id: `phrase-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        language,
        text: message,
        ...(messagePictures.length
          ? { segments: pictureSegments(messagePictures) }
          : {})
      };
      if (
        !myPhrases.some(
          (item) =>
            item.text === saved.text &&
            JSON.stringify(item.segments) === JSON.stringify(saved.segments)
        )
      )
        update('save-phrase', saved);
      setNotice(c.phraseSaved);
    } catch {
      setNotice(c.workspaceFull);
    }
  }
  function clear() {
    stop();
    setNotice('');
    setUndoDraft({ kind: draftKind, tokens: [...tokens], phrase, typed });
    if (draftKind === 'typing') setTyped('');
    else {
      setTokens([]);
      setPhrase(null);
    }
  }
  function undoClear() {
    if (!canUndo) return;
    stop();
    if (draftKind === 'typing') setTyped(undoDraft.typed);
    else {
      setTokens(undoDraft.tokens);
      setPhrase(undoDraft.phrase);
    }
    setUndoDraft(null);
  }
  const editorWord =
    catalog.words.find((word) => word.id === editWord) ||
    (workspace.customWords || []).find((word) => word.id === editWord);
  const suggestions = catalog.phrases
    .filter(
      (item) =>
        !typed.trim() ||
        normalizeSpeechText(item[language]).includes(normalizeSpeechText(typed))
    )
    .slice(0, 6);

  return (
    <div
      className={`aac-workspace density-${preferences.density} ${preferences.contrast ? 'aac-high-contrast' : ''} ${preferences.largeText ? 'aac-large-text' : ''}`}
      lang={languageInfo(language).html}
    >
      <Helmet>
        <html lang={languageInfo(language).html} dir="ltr" />
        <title>{c.brand} · Open AAC Board</title>
      </Helmet>
      <aside className="aac-sidebar">
        <div className="aac-brand">
          <img src="/app-icon.svg" alt="" />
          <div>
            <strong>{c.brand}</strong>
            <span>OPEN AAC BOARD</span>
          </div>
        </div>
        <p className="aac-sidebar-caption">{c.tagline}</p>
        <nav aria-label={c.brand}>
          {sections.map(([id, icon]) => (
            <button
              key={id}
              className={section === id ? 'is-active' : ''}
              aria-current={section === id ? 'page' : undefined}
              onClick={() => switchSection(id)}
            >
              <Icon name={icon} />
              <span>{c[id]}</span>
              {section === id && <span className="aac-nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="aac-sidebar-footer">
          <button onClick={() => setModal('settings')}>
            <Icon name="settings" />
            {c.settings}
          </button>
          <p>
            <span className="aac-status-dot" />
            {c.local}
          </p>
        </div>
      </aside>
      <main className="aac-main">
        <header className="aac-topbar">
          <div className="aac-mobile-brand">
            <img src="/app-icon.svg" alt="" />
            <strong>{c.brand}</strong>
          </div>
          <span className="aac-header-greeting">{c.greet}</span>
          <div
            className="aac-language-picker"
            role="group"
            aria-label={c.language}
          >
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                lang={l.html}
                aria-pressed={language === l.id}
                onClick={() => {
                  update('language', l.id);
                  setScanning(false);
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            className="aac-icon-button aac-mobile-settings"
            aria-label={c.settings}
            onClick={() => setModal('settings')}
          >
            <Icon name="settings" />
          </button>
        </header>
        <div className="aac-readiness-bar">
          <button
            className={`aac-readiness-voice ${voiceChecked ? '' : 'needs-check'}`}
            onClick={() => setModal('voice')}
            aria-label={`${languageInfo(language).label} · ${c.testVoice}`}
          >
            <Icon name="speaker" />
            {languageInfo(language).label} ·{' '}
            {voiceChecked ? c.listen : c.checkVoice}
          </button>
          <button
            className="aac-response-trigger"
            aria-label={c.responses}
            title={c.responses}
            onClick={() => {
              setScanning(false);
              setNotice('');
              setModal('responses');
            }}
          >
            <Icon name="chat" />
            <span>{c.responsesShort}</span>
          </button>
          <span role="status" className="aac-offline-status">
            <button
              onClick={() => setModal('offline')}
              aria-label={`${c.offlineDetails}: ${offlineLabel}`}
            >
              <Icon name={offlineReady ? 'shield' : 'download'} />
              {offlineLabel}
            </button>
          </span>
        </div>
        <div className="aac-communication-panel">
          {section !== 'routine' && (
            <section
              className={`aac-composer ${section === 'typing' ? 'is-typing' : ''}`}
              aria-label={c.message}
            >
              <div className="aac-composer-top">
                <span>{c.message}</span>
                <div>
                  <button
                    className="aac-icon-button"
                    aria-label={c.backspace}
                    disabled={!text}
                    onClick={() => {
                      if (section === 'typing')
                        setTyped((old) =>
                          Array.from(old).slice(0, -1).join('')
                        );
                      else if (phrase) setPhrase(null);
                      else setTokens((old) => old.slice(0, -1));
                    }}
                  >
                    <Icon name="back" />
                    <span>{c.backShort}</span>
                  </button>
                  <button
                    className="aac-icon-button"
                    aria-label={c.clear}
                    disabled={!text}
                    onClick={clear}
                  >
                    <Icon name="trash" />
                    <span>{c.clear}</span>
                  </button>
                </div>
              </div>
              {section === 'typing' ? (
                <textarea
                  className="aac-type-input"
                  aria-label={c.typing}
                  placeholder={c.typePlaceholder}
                  maxLength={500}
                  value={typed}
                  onChange={(event) => {
                    setTyped(event.target.value);
                    setNotice('');
                    if (undoDraft?.kind === 'typing') setUndoDraft(null);
                  }}
                />
              ) : (
                <div className="aac-message" aria-live="polite">
                  {phrase && !phrase.segments ? (
                    <span className="aac-phrase-output">{text}</span>
                  ) : messagePictures.length ? (
                    messagePictures.map((word, index) => (
                      <span
                        className="aac-message-word"
                        key={index}
                        lang={
                          word.labelLanguage
                            ? languageInfo(word.labelLanguage).html
                            : undefined
                        }
                      >
                        {word.image && <img src={word.image} alt="" />}
                        {word.text}
                      </span>
                    ))
                  ) : (
                    <span className="aac-message-placeholder">{c.tapHint}</span>
                  )}
                </div>
              )}
              <div className="aac-composer-bottom">
                <div>
                  {(!canUndo || text) && (
                    <button
                      className="aac-text-button"
                      aria-label={c.partner}
                      title={c.partner}
                      disabled={!text}
                      onClick={() => {
                        setRotated(false);
                        setModal('partner');
                      }}
                    >
                      <Icon name="expand" />
                      <span className="aac-composer-label">{c.partner}</span>
                    </button>
                  )}
                  {canUndo && (
                    <button
                      className="aac-text-button aac-undo"
                      onClick={undoClear}
                    >
                      <Icon name="refresh" />
                      {c.undo}
                    </button>
                  )}
                  <button
                    className="aac-text-button"
                    aria-label={c.savePhrase}
                    title={c.savePhrase}
                    disabled={
                      !text.trim() ||
                      missingTranslation ||
                      workspace.phrases.length >= 100
                    }
                    onClick={savePhrase}
                  >
                    <Icon name="star" />
                    <span className="aac-composer-label">{c.savePhrase}</span>
                  </button>
                </div>
                <button
                  className="aac-primary aac-speak"
                  disabled={!text || missingTranslation}
                  onClick={() => (speaking ? stop() : say(text, segments))}
                >
                  <Icon name={speaking ? 'pause' : 'speaker'} />
                  {speaking ? c.stop : c.speak}
                </button>
              </div>
            </section>
          )}
        </div>
        <div className="aac-scroll-area" ref={scrollArea}>
          <h1 className="aac-sr-only">{c[section]}</h1>
          {(notice || missingTranslation) && (
            <div className="aac-notice" role="status">
              {missingTranslation ? c.translationMissing : notice}
              <button
                className="aac-text-button"
                onClick={() => {
                  if (notice === c.phraseSaved) {
                    switchSection('quick');
                    setPhraseTab('saved');
                  } else if (
                    missingTranslation ||
                    notice === c.translationMissing
                  ) {
                    setSection('board');
                    setEditing(true);
                    setNotice('');
                  } else setModal('settings');
                }}
              >
                {notice === c.phraseSaved
                  ? c.saved
                  : missingTranslation || notice === c.translationMissing
                    ? c.edit
                    : c.settings}
                <Icon name="arrow" />
              </button>
            </div>
          )}
          {section === 'board' && (
            <>
              <div className="aac-board-controls">
                <div className="aac-board-tools">
                  <label className="aac-search">
                    <Icon name="search" />
                    <input
                      aria-label={c.searchLabel}
                      type="search"
                      placeholder={c.search}
                      maxLength={80}
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setScanning(false);
                        setScanIndex(0);
                      }}
                    />
                  </label>
                  <button
                    className={`aac-secondary ${editing ? 'is-active' : ''}`}
                    aria-pressed={editing}
                    aria-label={editing ? c.done : c.edit}
                    onClick={() => {
                      setEditing(!editing);
                      setScanning(false);
                    }}
                  >
                    <Icon name={editing ? 'check' : 'edit'} />
                    <span>{editing ? c.done : c.edit}</span>
                  </button>
                  <button
                    className="aac-secondary aac-add-word"
                    aria-label={c.addWord}
                    title={c.addWord}
                    disabled={(workspace.customWords || []).length >= 100}
                    onClick={() => {
                      setAddingWord(true);
                      setScanning(false);
                    }}
                  >
                    <Icon name="plus" />
                    <span>{c.addWord}</span>
                  </button>
                  <button
                    className="aac-secondary aac-scan-button"
                    aria-label={scanning ? c.stopScan : c.scan}
                    title={scanning ? c.stopScan : c.scan}
                    aria-pressed={scanning}
                    onClick={() => {
                      setEditing(false);
                      setScanIndex(0);
                      setScanning(!scanning);
                      scanGrid.current?.focus();
                    }}
                  >
                    <Icon name={scanning ? 'pause' : 'play'} />
                    <span>{scanning ? c.stopScan : c.scan}</span>
                  </button>
                </div>
                <div
                  className="aac-categories"
                  role="group"
                  aria-label={c.board}
                >
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      aria-pressed={category === cat.id && !query}
                      className={
                        category === cat.id && !query ? 'is-active' : ''
                      }
                      onClick={() => {
                        setCategory(cat.id);
                        setQuery('');
                        setScanning(false);
                        setScanIndex(0);
                      }}
                    >
                      <Icon name={cat.icon} />
                      {cat[language]}
                    </button>
                  ))}
                </div>
                <div className="aac-section-row aac-grid-heading">
                  <h2>
                    {query
                      ? c.allResults
                      : categories.find((cat) => cat.id === category)[language]}
                    <span>{visible.length}</span>
                  </h2>
                </div>
              </div>
              {scanning && <p className="aac-scan-hint">{c.scanHint}</p>}
              <div
                className="aac-word-grid"
                ref={scanGrid}
                tabIndex={scanning ? 0 : -1}
                role="group"
                aria-label={c.board}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setScanning(false);
                  if (scanning && [' ', 'Enter'].includes(event.key)) {
                    event.preventDefault();
                    const word = visible[scanIndex % visible.length];
                    if (word) selectWord(word);
                  }
                }}
              >
                {visible.map((word, index) => (
                  <button
                    className={`aac-word tone-${word.tone} ${scanning && scanIndex === index ? 'aac-scan-focus' : ''} ${editing ? 'is-editing' : ''}`}
                    key={word.id}
                    data-word-id={word.id}
                    disabled={!editing && tokens.length >= 30}
                    onClick={() => selectWord(word)}
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
                      <span className="aac-missing-label">
                        {c.translationShort}
                      </span>
                    )}
                    {editing && (
                      <span className="aac-word-edit">
                        <Icon name="edit" />
                      </span>
                    )}
                    {word.recording && (
                      <span
                        className="aac-recording-badge"
                        aria-label={c.recordingReady}
                      >
                        <Icon name="microphone" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {!visible.length && (
                <div className="aac-empty">
                  <p>
                    {category === 'personal' && !query
                      ? c.emptyMyWords
                      : c.noResults}
                  </p>
                  <button
                    className="aac-secondary"
                    onClick={() => setAddingWord(true)}
                    disabled={(workspace.customWords || []).length >= 100}
                  >
                    <Icon name="plus" />
                    {c.addWord}
                  </button>
                </div>
              )}
              <p className="aac-stability">
                <Icon name="grid" />
                {c.stable}
              </p>
            </>
          )}
          {section === 'quick' && (
            <>
              <div className="aac-tabs" role="group" aria-label={c.quick}>
                {['allPhrases', 'favourite', 'saved'].map((tab) => (
                  <button
                    key={tab}
                    aria-pressed={phraseTab === tab}
                    onClick={() => setPhraseTab(tab)}
                  >
                    {tab === 'favourite' && <Icon name="star" />}
                    {c[tab]}
                  </button>
                ))}
              </div>
              <div className="aac-phrase-grid">
                {(phraseTab === 'saved' ? myPhrases : presetPhrases).map(
                  (item) => (
                    <article className="aac-phrase-card" key={item.id}>
                      <button onClick={() => activatePhrase(item)}>
                        {item.symbol && <img src={item.symbol} alt="" />}
                        {item.segments && (
                          <span
                            className="aac-phrase-pictures"
                            aria-hidden="true"
                          >
                            {item.segments
                              .filter((segment) => segment.image)
                              .slice(0, 4)
                              .map((segment, index) => (
                                <img src={segment.image} alt="" key={index} />
                              ))}
                          </span>
                        )}
                        <span>{item[language] || item.text}</span>
                        <Icon name="speaker" />
                      </button>
                      {phraseTab === 'saved' ? (
                        <button
                          className="aac-icon-button"
                          aria-label={`${c.delete}: ${item.text}`}
                          onClick={() => update('delete-phrase', item.id)}
                        >
                          <Icon name="trash" />
                        </button>
                      ) : (
                        <button
                          className={`aac-icon-button ${workspace.favourites.includes(item.id) ? 'is-favourite' : ''}`}
                          aria-label={`${workspace.favourites.includes(item.id) ? c.unpin : c.pin}: ${item[language]}`}
                          aria-pressed={workspace.favourites.includes(item.id)}
                          onClick={() => update('favourite', item.id)}
                        >
                          <Icon name="star" />
                        </button>
                      )}
                    </article>
                  )
                )}
              </div>
              {phraseTab === 'saved' && !myPhrases.length && (
                <p className="aac-empty">{c.emptySaved}</p>
              )}
            </>
          )}
          {section === 'typing' && (
            <section className="aac-suggestions">
              <div className="aac-section-row">
                <h2>{c.suggestions}</h2>
                <span className="aac-muted">{typed.length} / 500</span>
              </div>
              {suggestions.map((item) => (
                <button key={item.id} onClick={() => setTyped(item[language])}>
                  {item[language]}
                  <Icon name="arrow" />
                </button>
              ))}
            </section>
          )}
          <div hidden={section !== 'routine'}>
            <Routine
              workspace={workspace}
              update={update}
              words={words}
              c={c}
              say={say}
            />
          </div>
        </div>
        <nav className="aac-mobile-nav" aria-label={c.brand}>
          {sections.map(([id, icon]) => (
            <button
              key={id}
              aria-current={section === id ? 'page' : undefined}
              className={section === id ? 'is-active' : ''}
              onClick={() => switchSection(id)}
            >
              <Icon name={icon} />
              <span>{c[id]}</span>
            </button>
          ))}
        </nav>
      </main>
      {modal === 'responses' && (
        <QuickResponses
          c={c}
          language={language}
          phrases={catalog.phrases}
          selected={workspace.quickResponses}
          onSave={(ids) => update('quick-responses', ids)}
          onSpeak={say}
          speaking={speaking}
          notice={notice}
          onStop={stop}
          onClose={() => {
            stop();
            setModal(null);
          }}
        />
      )}
      {modal === 'voice' && (
        <VoiceCheck
          c={c}
          language={language}
          voice={matchingVoice}
          phrase={catalog.phrases[0][language]}
          tryVoice={() => say(catalog.phrases[0][language])}
          onClose={() => {
            stop();
            setModal(null);
          }}
          onConfirmed={() => {
            update('voice-check', language);
            setModal(null);
          }}
        />
      )}
      {modal === 'offline' && (
        <Modal
          title={c.offlineDetails}
          closeLabel={c.close}
          onClose={() => setModal(null)}
        >
          <div className="aac-settings-body">
            <h3 role="status">{offlineLabel}</h3>
            <p>{offlineReady ? c.offlineReadyHelp : c.offlineDownloadHelp}</p>
            <p className="aac-muted">{c.offlineVoiceHelp}</p>
            {!offlineReady && (
              <button className="aac-secondary" onClick={retryOffline}>
                {c.retryOffline}
              </button>
            )}
          </div>
        </Modal>
      )}
      {modal === 'settings' && (
        <WorkspaceSettings
          workspace={workspace}
          update={update}
          voices={voices}
          onClose={() => setModal(null)}
          tryVoice={() => say(catalog.phrases[0][language])}
        />
      )}
      {modal === 'partner' && (
        <Modal
          title={c.partnerTitle}
          closeLabel={c.close}
          onClose={() => setModal(null)}
          className="aac-partner-dialog"
        >
          <div className={`aac-partner-message ${rotated ? 'is-rotated' : ''}`}>
            <p>{c.partnerHint}</p>
            <strong>{text}</strong>
          </div>
          <div className="aac-button-row">
            <button
              className="aac-secondary"
              onClick={() => setRotated(!rotated)}
            >
              <Icon name="refresh" />
              {c.rotate}
            </button>
            <button
              className="aac-primary"
              onClick={() => (speaking ? stop() : say(text, segments))}
            >
              <Icon name="speaker" />
              {speaking ? c.stop : c.speak}
            </button>
          </div>
        </Modal>
      )}
      {(editorWord || addingWord) && (
        <WordEditor
          key={addingWord ? 'new-word' : editorWord.id}
          word={
            addingWord
              ? {
                  yue: '',
                  en: '',
                  cmn: '',
                  symbol: '/symbols/open-aac/friend.svg'
                }
              : editorWord
          }
          isNew={addingWord}
          override={
            addingWord || editorWord.id.startsWith('custom-')
              ? undefined
              : workspace.overrides[editorWord.id]
          }
          language={language}
          onClose={() => {
            setEditWord(null);
            setAddingWord(false);
          }}
          onSave={(word) => {
            if (addingWord || editorWord.id.startsWith('custom-')) {
              const id = addingWord
                ? `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
                : editorWord.id;
              const originalLanguage =
                !addingWord && word[editorWord.language]?.trim()
                  ? editorWord.language
                  : language;
              update('custom-word', {
                ...word,
                id,
                language: originalLanguage
              });
              if (addingWord) {
                setCategory('personal');
                setQuery('');
                setEditing(false);
                if (scrollArea.current) scrollArea.current.scrollTop = 0;
              }
              setAddingWord(false);
              setEditWord(null);
              setNotice(c.wordSaved);
              return;
            }
            validateWorkspace({
              ...workspace,
              overrides: { ...workspace.overrides, [editorWord.id]: word }
            });
            update('word', { id: editorWord.id, word });
            setEditWord(null);
          }}
          onDelete={
            editorWord?.id.startsWith('custom-')
              ? () => {
                  stop();
                  update('delete-custom-word', editorWord.id);
                  setTokens((old) => old.filter((id) => id !== editorWord.id));
                  setUndoDraft(null);
                  setEditWord(null);
                }
              : undefined
          }
          onReset={() => {
            update('reset-word', editorWord.id);
            setEditWord(null);
          }}
        />
      )}
    </div>
  );
}

export default connect((state) => ({ workspace: state.workspace }))(Workspace);
