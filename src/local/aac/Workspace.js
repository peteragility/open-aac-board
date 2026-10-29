import React, {
  useCallback,
  useEffect,
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
import { Icon, Modal, useDeviceVoices, useOfflineReady } from './UI';
import WorkspaceSettings from './WorkspaceSettings';
import WordEditor from './WordEditor';
import Routine from './Routine';
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
  const { language, preferences } = workspace;
  const c = copy(language);
  const voices = useDeviceVoices();
  const offlineReady = useOfflineReady();
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
  const [modal, setModal] = useState(null);
  const [rotated, setRotated] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);
  const scanGrid = useRef();
  const speechSequence = useRef(0);
  const words = useMemo(
    () =>
      catalog.words.map((word) => {
        const override = workspace.overrides[word.id];
        return {
          ...word,
          text: override?.[language] || word[language],
          image: override?.image || word.symbol,
          recording: override?.recordings?.[language]
        };
      }),
    [workspace.overrides, language]
  );
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
          label.toLocaleLowerCase().includes(query.toLocaleLowerCase())
        )
      : word.category === category
  );
  const segments =
    section === 'typing' || phrase
      ? []
      : selected.map((word) => ({
          text: word.text,
          recording: word.recording
        }));
  const presetPhrases = catalog.phrases.filter(
    (p) => phraseTab !== 'favourite' || workspace.favourites.includes(p.id)
  );
  const myPhrases = workspace.phrases.filter((p) => p.language === language);
  useEffect(() => () => speech.stop(), []);
  useEffect(() => {
    setScanning(false);
    setNotice('');
    speechSequence.current++;
    speech.stop();
    setSpeaking(false);
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
    } catch (error) {
      if (sequence === speechSequence.current)
        setNotice(
          error.message === 'missing-voice' ? c.noVoice : c.speechError
        );
    } finally {
      if (sequence === speechSequence.current) setSpeaking(false);
    }
  }
  function selectWord(word) {
    if (editing) {
      setEditWord(word.id);
      return;
    }
    if (tokens.length >= 30) return;
    setPhrase(null);
    setTokens((old) => [...old, word.id]);
    if (preferences.haptics) navigator.vibrate?.(35);
    if (preferences.speakOnTap)
      say(word.text, [{ text: word.text, recording: word.recording }]);
  }
  function switchSection(next) {
    setSection(next);
    setScanning(false);
    setEditing(false);
    setNotice('');
  }
  function activatePhrase(item) {
    setPhrase(item);
    setTokens([]);
    say(item[language] || item.text);
  }
  function savePhrase() {
    const message = text.trim();
    if (!message || workspace.phrases.length >= 100) return;
    if (!myPhrases.some((p) => p.text === message))
      update('save-phrase', {
        id: `phrase-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        language,
        text: message
      });
    setNotice(c.phraseSaved);
  }
  function clear() {
    stop();
    setTokens([]);
    setPhrase(null);
    if (section === 'typing') setTyped('');
  }
  const editorWord = catalog.words.find((word) => word.id === editWord);
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
          <div className="aac-offline">
            <Icon name={offlineReady ? 'shield' : 'download'} />
            <span>{offlineReady ? c.offline : c.downloading}</span>
          </div>
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
        <div className="aac-scroll-area">
          <div className="aac-page-heading">
            <div>
              <p className="aac-eyebrow">
                {section === 'board'
                  ? 'YOUR WORDS, YOUR WAY'
                  : 'OPEN AAC BOARD'}
              </p>
              <h1>{section === 'board' ? c.title : c[section]}</h1>
              <p>
                {section === 'board'
                  ? c.subtitle
                  : section === 'quick'
                    ? c.quickHint
                    : section === 'typing'
                      ? c.typeHint
                      : c.routineHint}
              </p>
            </div>
            <button
              className="aac-voice-pill"
              onClick={() => setModal('settings')}
            >
              <Icon name="speaker" />
              <span>{matchingVoice ? c.deviceReady : c.bundled}</span>
              <span className="aac-status-dot" />
            </button>
          </div>
          {section !== 'routine' && (
            <section className="aac-composer" aria-label={c.message}>
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
                  </button>
                  <button
                    className="aac-icon-button"
                    aria-label={c.clear}
                    disabled={!text}
                    onClick={clear}
                  >
                    <Icon name="trash" />
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
                  }}
                />
              ) : (
                <div className="aac-message" aria-live="polite">
                  {phrase ? (
                    <span className="aac-phrase-output">{text}</span>
                  ) : selected.length ? (
                    selected.map((word, index) => (
                      <span
                        className="aac-message-word"
                        key={`${word.id}-${index}`}
                      >
                        <img src={word.image} alt="" />
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
                  <button
                    className="aac-text-button"
                    disabled={!text}
                    onClick={() => {
                      setRotated(false);
                      setModal('partner');
                    }}
                  >
                    <Icon name="expand" />
                    {c.partner}
                  </button>
                  {section === 'typing' && (
                    <button
                      className="aac-text-button"
                      disabled={
                        !typed.trim() || workspace.phrases.length >= 100
                      }
                      onClick={savePhrase}
                    >
                      <Icon name="star" />
                      {c.savePhrase}
                    </button>
                  )}
                </div>
                <button
                  className="aac-primary aac-speak"
                  disabled={!text}
                  onClick={() => (speaking ? stop() : say(text, segments))}
                >
                  <Icon name={speaking ? 'pause' : 'speaker'} />
                  {speaking ? c.stop : c.speak}
                </button>
              </div>
            </section>
          )}
          {notice && (
            <div className="aac-notice" role="status">
              {notice}
              <button
                className="aac-text-button"
                onClick={() => setModal('settings')}
              >
                {c.settings}
                <Icon name="arrow" />
              </button>
            </div>
          )}
          {section === 'board' && (
            <>
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
                  onClick={() => {
                    setEditing(!editing);
                    setScanning(false);
                  }}
                >
                  <Icon name={editing ? 'check' : 'edit'} />
                  <span>{editing ? c.done : c.edit}</span>
                </button>
              </div>
              <div className="aac-categories" role="group" aria-label={c.board}>
                {catalog.categories.map((cat) => (
                  <button
                    key={cat.id}
                    aria-pressed={category === cat.id && !query}
                    className={category === cat.id && !query ? 'is-active' : ''}
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
                    : catalog.categories.find((cat) => cat.id === category)[
                        language
                      ]}
                  <span>{visible.length}</span>
                </h2>
                <button
                  className="aac-text-button"
                  aria-pressed={scanning}
                  onClick={() => {
                    setEditing(false);
                    setScanIndex(0);
                    setScanning(!scanning);
                    scanGrid.current?.focus();
                  }}
                >
                  <Icon name={scanning ? 'pause' : 'play'} />
                  {scanning ? c.stopScan : c.scan}
                </button>
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
                    <span className="aac-word-label">{word.text}</span>
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
              {!visible.length && <p className="aac-empty">{c.noResults}</p>}
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
          {section === 'routine' && (
            <Routine
              workspace={workspace}
              update={update}
              words={words}
              c={c}
              say={say}
            />
          )}
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
      {editorWord && (
        <WordEditor
          key={editorWord.id}
          word={editorWord}
          override={workspace.overrides[editorWord.id]}
          language={language}
          onClose={() => setEditWord(null)}
          onSave={(word) => {
            validateWorkspace({
              ...workspace,
              overrides: { ...workspace.overrides, [editorWord.id]: word }
            });
            update('word', { id: editorWord.id, word });
            setEditWord(null);
          }}
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
