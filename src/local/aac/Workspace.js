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
import {
  HoldButton,
  Icon,
  Modal,
  useDeviceVoices,
  useOfflineStatus
} from './UI';
import { PrintSheet } from './Print';
import VoiceCheck from './VoiceCheck';
import WorkspaceSettings from './WorkspaceSettings';
import WordEditor from './WordEditor';
import Routine from './Routine';
import QuickResponses from './QuickResponses';
import QuickGuide from './QuickGuide';
import CategoryTabs from './CategoryTabs';
import InstallHint from './InstallHint';
import PictureBrowser from './PictureBrowser';
import PictureCard from './PictureCard';
import PinnedWordEditor from './PinnedWordEditor';
import { wordsInGroup, DEFAULT_PINNED_WORDS } from './pictureGroups';
import { COMMUNICATION_ACTION, initialCommunication } from './communication';
import { matchesQuery, workspaceWords, pictureSegments } from './vocabulary';
import { useSwitchScanning } from './scanning';
import { playChime, useWakeLock } from './device';
import './workspace.css';
import './pictures.css';

const sections = [
  ['board', 'grid'],
  ['quick', 'chat'],
  ['typing', 'type'],
  ['routine', 'plan']
];

export function Workspace({
  workspace,
  communication = initialCommunication,
  dispatch
}) {
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
  const { section, category, tokens, typed } = communication;
  const phrase =
    communication.phrase?.language === language
      ? workspace.phrases.find(
          (item) =>
            item.id === communication.phrase.id && item.language === language
        ) ||
        catalog.phrases.find((item) => item.id === communication.phrase.id) ||
        communication.phrase
      : null;
  const changeDraft = useCallback(
    (payload) => dispatch({ type: COMMUNICATION_ACTION, payload }),
    [dispatch]
  );
  const setSection = (value) => changeDraft({ section: value });
  const setCategory = (value) => changeDraft({ category: value });
  const setTokens = (value) =>
    changeDraft({
      tokens: typeof value === 'function' ? value(tokens) : value
    });
  const setTyped = (value) =>
    changeDraft({ typed: typeof value === 'function' ? value(typed) : value });
  const setPhrase = (value) => {
    const item = typeof value === 'function' ? value(phrase) : value;
    changeDraft({
      phrase: item
        ? { id: item.id, language, text: item[language] || item.text }
        : null
    });
  };
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [pinSlot, setPinSlot] = useState(0);
  const [lastPicked, setLastPicked] = useState(null);
  const pictureBrowsing = Boolean(preferences.pictureBrowsing);
  const pictureGroup = communication.pictureGroup || null;
  const [phraseTab, setPhraseTab] = useState('allPhrases');
  const [editing, setEditing] = useState(false);
  const [editWord, setEditWord] = useState(null);
  const [addingWord, setAddingWord] = useState(false);
  const [modal, setModal] = useState(
    communication.guideRequested ? 'guide' : null
  );
  const [rotated, setRotated] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState('');
  const [undoDraft, setUndoDraft] = useState(null);
  // Most recent last; each can be undone in turn.
  const [deletedPhrases, setDeletedPhrases] = useState([]);
  const [translationWord, setTranslationWord] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [timerDone, setTimerDone] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [printSheet, setPrintSheet] = useState(null);
  const mainArea = useRef();
  const messageArea = useRef();
  const scrollArea = useRef();
  const scrollPositions = useRef({});
  const speechSequence = useRef(0);
  const words = useMemo(
    () => workspaceWords(catalog.words, { overrides, customWords }, language),
    [overrides, customWords, language]
  );
  // Words offered on the boards; language-only grammar words are left out.
  const boardWords = useMemo(
    () => words.filter((word) => word.available !== false),
    [words]
  );
  // The caregiver lock hides everything that changes the board.
  const locked = Boolean(preferences.editLock) && !unlocked;
  const categories = [
    catalog.categories[0],
    { id: 'personal', icon: 'people', [language]: c.myWords },
    ...catalog.categories.slice(1)
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
  const visible = pictureBrowsing
    ? wordsInGroup(boardWords, pictureGroup)
    : query
      ? boardWords.filter((word) => matchesQuery(word, query))
      : wordsInGroup(boardWords, category);
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
    if (!lastPicked) return;
    const timer = setTimeout(() => setLastPicked(null), 850);
    return () => clearTimeout(timer);
  }, [lastPicked]);
  useEffect(() => {
    setScanning(false);
    setNotice('');
    setTranslationWord(null);
    setUndoDraft(null);
    speechSequence.current++;
    speech.stop();
    setSpeaking(false);
  }, [language]);
  useSwitchScanning({
    root: mainArea,
    active: scanning && section === 'board' && !modal && !editWord,
    mode: preferences.scanMode || 'auto',
    delay: preferences.scanDelay,
    hold: preferences.scanHold || 0,
    rows: Boolean(preferences.scanRows),
    // Wait while a selection is being spoken, so nothing interrupts it.
    paused: speaking,
    onPreview: previewTarget,
    onStop: () => setScanning(false)
  });
  useWakeLock(preferences.keepAwake !== false);
  // Short confirmations clear themselves; notices that need an action stay.
  const actionNotices = [
    c.phraseSaved,
    c.translationMissing,
    c.timerDone,
    c.noVoice,
    c.speechError
  ];
  useEffect(() => {
    if (!notice || actionNotices.includes(notice)) return undefined;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);
  // The message area keeps a fixed height; keep its newest words in view.
  useLayoutEffect(() => {
    const area = messageArea.current;
    if (area) area.scrollTop = area.scrollHeight;
  }, [tokens.length, phrase?.id]);

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
      // Stopped or replaced by newer speech: not a failure.
      return sequence === speechSequence.current ? true : 'cancelled';
    } catch (error) {
      if (sequence !== speechSequence.current) return 'cancelled';
      setNotice(error.message === 'missing-voice' ? c.noVoice : c.speechError);
      return false;
    } finally {
      if (sequence === speechSequence.current) setSpeaking(false);
    }
  }
  // Quietly name each item as scanning highlights it. A word without a label in
  // this language is never read with another language's text.
  function previewTarget(element) {
    if (!preferences.scanPreview || speaking) return;
    const word =
      element.dataset.wordId &&
      words.find((item) => item.id === element.dataset.wordId);
    if (word && !word.translated) return;
    const label = word
      ? word.text
      : (
          element.getAttribute('aria-label') ||
          element.textContent ||
          ''
        ).trim();
    if (!label) return;
    speech
      .speak({
        text: label,
        segments: word ? [{ text: word.text, recording: word.recording }] : [],
        language,
        preferredURI: workspace.voices[language],
        rate: preferences.rate,
        volume: 0.6
      })
      .catch(() => {});
  }
  const closePrint = useCallback(() => setPrintSheet(null), []);
  function printBoard(all) {
    setModal(null);
    setScanning(false);
    const usable = (list) => list.filter((word) => word.translated);
    const title = (id) =>
      categories.find((cat) => cat.id === id)?.[language] || c.board;
    setPrintSheet({
      language,
      title: c.printTitle,
      groups: all
        ? categories
            .map((cat) => ({
              title: title(cat.id),
              words: usable(wordsInGroup(boardWords, cat.id))
            }))
            .filter((group) => group.words.length)
        : [
            {
              title: pictureBrowsing ? c.browsePictures : title(category),
              words: usable(visible)
            }
          ]
    });
  }
  // Share the built message through the system share sheet when available
  // (WhatsApp, WeChat, Messages…), falling back to the clipboard.
  async function shareMessage() {
    const message = text.trim();
    if (!message) return;
    stop();
    setNotice('');
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: message });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      setNotice(c.copied);
    } catch {
      setNotice(c.copyFailed);
    }
  }
  function selectWord(word) {
    if (editing) {
      setEditWord(word.id);
      return;
    }
    if (!word.translated) {
      missingWord(word);
      return;
    }
    if (tokens.length >= 30) {
      setNotice(c.messageFull);
      return;
    }
    // Replacing a whole phrase can be undone; adding to built words cannot.
    if (phrase) setUndoDraft({ kind: 'board', tokens: [...tokens], phrase });
    else if (undoDraft?.kind === 'board') setUndoDraft(null);
    setPhrase(null);
    setTokens((old) => [...old, word.id]);
    setAnnouncement(word.text);
    setLastPicked({ id: word.id, time: Date.now() });
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
    if (next === 'routine') setTimerDone(false);
  }
  function breakOver() {
    if (section !== 'routine') setTimerDone(true);
    setNotice(c.timerDone);
    navigator.vibrate?.([300, 150, 300]);
    playChime();
  }
  function missingWord(word) {
    stop();
    setTranslationWord(word.id);
    setNotice(c.translationMissing);
  }
  function selectPictureGroup(group) {
    changeDraft({ pictureGroup: group });
    setNotice('');
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
  }
  function switchPictureView() {
    stop();
    setScanning(false);
    setEditing(false);
    setQuery('');
    setShowSearch(false);
    update('preferences', { pictureBrowsing: !pictureBrowsing });
    if (!pictureBrowsing) changeDraft({ pictureGroup: null });
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
  }
  function openPins(index) {
    setPinSlot(Number.isInteger(index) ? index : 0);
    setScanning(false);
    setModal('pins');
  }
  function toggleScan() {
    setModal(null);
    setEditing(false);
    setShowSearch(false);
    setQuery('');
    setScanning(!scanning);
  }
  function finishGuide() {
    stop();
    changeDraft({ guideRequested: false });
    setModal(null);
  }
  function deletePhrase(item) {
    setNotice('');
    setDeletedPhrases((old) => [
      ...old.slice(-9),
      {
        phrase: item,
        index: workspace.phrases.findIndex((p) => p.id === item.id)
      }
    ]);
    update('delete-phrase', item.id);
  }
  function undoDelete() {
    const last = deletedPhrases[deletedPhrases.length - 1];
    if (!last) return;
    try {
      update('restore-phrase', last);
      setDeletedPhrases((old) => old.slice(0, -1));
      setNotice('');
    } catch {
      setNotice(c.workspaceFull);
    }
  }
  function activatePhrase(item) {
    // An unfinished message is kept for Undo instead of being discarded.
    if (tokens.length || phrase)
      setUndoDraft({ kind: 'board', tokens: [...tokens], phrase });
    else if (undoDraft?.kind === 'board') setUndoDraft(null);
    setPhrase(item);
    setTokens([]);
    setAnnouncement(item[language] || item.text);
    say(item[language] || item.text, item.segments || []);
  }
  function savePhrase() {
    const message = text.trim();
    if (!message || missingTranslation) return;
    if (workspace.phrases.length >= 100) {
      setNotice(c.phrasesFull);
      return;
    }
    if (message.length > 500) {
      setNotice(c.messageTooLong);
      return;
    }
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
  const noticeAction =
    !missingTranslation && notice === c.phraseSaved
      ? {
          label: c.saved,
          run: () => {
            switchSection('quick');
            setPhraseTab('saved');
          }
        }
      : locked && notice !== c.timerDone
        ? null
        : missingTranslation || notice === c.translationMissing
          ? {
              label: c.edit,
              run: () => {
                const word =
                  translationWord ||
                  selected.find((item) => !item.translated)?.id;
                if (word) setEditWord(word);
                setNotice('');
              }
            }
          : notice === c.timerDone
            ? { label: c.routine, run: () => switchSection('routine') }
            : notice === c.noVoice || notice === c.speechError
              ? { label: c.settings, run: () => setModal('settings') }
              : null;
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
      className={`aac-workspace density-${preferences.density} ${pictureBrowsing ? 'is-picture-browsing' : ''} ${preferences.contrast ? 'aac-high-contrast' : ''} ${preferences.largeText ? 'aac-large-text' : ''}`}
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
              {id === 'routine' && timerDone && (
                <span
                  className="aac-nav-badge"
                  role="img"
                  aria-label={c.timerDoneShort}
                >
                  <Icon name="clock" />
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="aac-sidebar-footer">
          {locked ? (
            <HoldButton
              label={c.holdToUnlock}
              onComplete={() => setUnlocked(true)}
            >
              <Icon name="lock" />
              {c.holdShort}
            </HoldButton>
          ) : (
            <button onClick={() => setModal('settings')}>
              <Icon name="settings" />
              {c.settings}
            </button>
          )}
          {preferences.editLock && unlocked && (
            <button onClick={() => setUnlocked(false)}>
              <Icon name="unlock" />
              {c.lockNow}
            </button>
          )}
          <p>
            <span className="aac-status-dot" />
            {c.local}
          </p>
        </div>
      </aside>
      <main className="aac-main" ref={mainArea}>
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
          {locked ? (
            <HoldButton
              className="aac-icon-button aac-mobile-settings"
              label={c.holdToUnlock}
              onComplete={() => setUnlocked(true)}
            >
              <Icon name="lock" />
            </HoldButton>
          ) : (
            <button
              className="aac-icon-button aac-mobile-settings"
              aria-label={c.settings}
              onClick={() => setModal('settings')}
            >
              <Icon name="settings" />
            </button>
          )}
        </header>
        <InstallHint
          language={language}
          dismissed={preferences.installHintDismissed}
          onDismiss={() =>
            update('preferences', { installHintDismissed: true })
          }
        />
        <div className="aac-readiness-bar">
          <button
            className={`aac-readiness-voice ${voiceChecked ? '' : 'needs-check'}`}
            onClick={() => setModal('voice')}
            aria-label={`${languageInfo(language).label} · ${voiceChecked ? c.listen : c.checkVoice}`}
          >
            <Icon name="speaker" />
            {languageInfo(language).label} ·{' '}
            {voiceChecked ? c.listen : c.checkVoice}
          </button>
          <button
            className="aac-response-trigger"
            aria-label={`${c.responsesShort}: ${c.responses}`}
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
          <span className="aac-offline-status">
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
              data-scan-group="message"
            >
              <div className="aac-composer-top">
                <span>{c.message}</span>
                <div>
                  <button
                    className="aac-icon-button"
                    aria-label={c.backspace}
                    data-scan-target=""
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
                    data-scan-target=""
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
                <div className="aac-message" ref={messageArea}>
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
                      disabled={!text || missingTranslation}
                      onClick={() => {
                        setRotated(false);
                        setModal('partner');
                      }}
                    >
                      <Icon name="expand" />
                      <span className="aac-composer-label">
                        {c.partnerShort}
                      </span>
                    </button>
                  )}
                  {canUndo && (
                    <button
                      className="aac-text-button aac-undo"
                      data-scan-target=""
                      onClick={undoClear}
                    >
                      <Icon name="refresh" />
                      {c.undo}
                    </button>
                  )}
                  {text.trim() && (
                    <button
                      className="aac-text-button aac-share"
                      aria-label={c.share}
                      title={c.share}
                      onClick={shareMessage}
                    >
                      <Icon name="share" />
                      <span className="aac-composer-label">{c.shareShort}</span>
                    </button>
                  )}
                  <button
                    className="aac-text-button"
                    aria-label={c.savePhrase}
                    title={c.savePhrase}
                    disabled={!text.trim() || missingTranslation}
                    onClick={savePhrase}
                  >
                    <Icon name="star" />
                    <span className="aac-composer-label">{c.saveShort}</span>
                  </button>
                </div>
                <button
                  className="aac-primary aac-speak"
                  data-scan-target=""
                  disabled={!text || missingTranslation}
                  onClick={() => (speaking ? stop() : say(text, segments))}
                >
                  <Icon name={speaking ? 'pause' : 'speaker'} />
                  {speaking ? c.stop : c.speak}
                </button>
              </div>
            </section>
          )}
          <span className="aac-sr-only" aria-live="polite">
            {announcement}
          </span>
        </div>
        <div className="aac-scroll-area" ref={scrollArea}>
          <h1 className="aac-sr-only">{c[section]}</h1>
          {section === 'board' && (
            <>
              <div className="aac-board-controls">
                <div
                  className={`aac-board-tools ${preferences.showScanControl || scanning ? 'has-scan-control' : ''}`}
                >
                  <div className="aac-discovery-tools">
                    {!showSearch || pictureBrowsing ? (
                      <button
                        className="aac-secondary aac-browse-toggle"
                        aria-label={
                          pictureBrowsing ? c.wordBoardView : c.browsePictures
                        }
                        onClick={switchPictureView}
                      >
                        <Icon name={pictureBrowsing ? 'grid' : 'pictures'} />
                        <span>
                          {pictureBrowsing ? c.wordBoardShort : c.browseShort}
                        </span>
                      </button>
                    ) : (
                      <label className="aac-search">
                        <Icon name="search" />
                        <input
                          aria-label={c.searchLabel}
                          type="search"
                          autoFocus
                          placeholder={c.search}
                          maxLength={80}
                          value={query}
                          onChange={(e) => {
                            setQuery(e.target.value);
                            setScanning(false);
                          }}
                        />
                      </label>
                    )}
                    {!pictureBrowsing && (
                      <button
                        className="aac-icon-button"
                        aria-label={showSearch ? c.close : c.searchLabel}
                        aria-expanded={showSearch}
                        onClick={() => {
                          setShowSearch(!showSearch);
                          setQuery('');
                        }}
                      >
                        <Icon name={showSearch ? 'close' : 'search'} />
                      </button>
                    )}
                  </div>
                  {!locked && (
                    <button
                      className="aac-secondary aac-add-word"
                      aria-label={c.addWord}
                      title={c.addWord}
                      onClick={() => {
                        setScanning(false);
                        if ((workspace.customWords || []).length >= 100)
                          setNotice(c.wordsFull);
                        else setAddingWord(true);
                      }}
                    >
                      <Icon name="plus" />
                      <span>{c.addWordShort}</span>
                    </button>
                  )}
                  <button
                    className={`aac-secondary ${editing ? 'is-active' : ''}`}
                    aria-label={editing ? c.done : c.tools}
                    aria-haspopup={editing ? undefined : 'dialog'}
                    onClick={() =>
                      editing ? setEditing(false) : setModal('tools')
                    }
                  >
                    <Icon name={editing ? 'check' : 'settings'} />
                    <span>{editing ? c.done : c.tools}</span>
                  </button>
                  {(preferences.showScanControl || scanning) && (
                    <button
                      className="aac-secondary aac-scan-button"
                      aria-label={scanning ? c.stopScan : c.scan}
                      title={scanning ? c.stopScan : c.scan}
                      aria-pressed={scanning}
                      onClick={toggleScan}
                      {...(scanning
                        ? { 'data-scan-target': '', 'data-scan-group': 'stop' }
                        : {})}
                    >
                      <Icon name={scanning ? 'pause' : 'play'} />
                      <span>{scanning ? c.stopScan : c.scan}</span>
                    </button>
                  )}
                </div>
                {!pictureBrowsing && (
                  <>
                    <CategoryTabs
                      categories={categories}
                      language={language}
                      category={category}
                      query={query}
                      c={c}
                      onSelect={(id) => {
                        setCategory(id);
                        setQuery('');
                        setScanning(false);
                        if (scrollArea.current)
                          scrollArea.current.scrollTop = 0;
                      }}
                    />
                    <div className="aac-section-row aac-grid-heading">
                      <h2>
                        {query
                          ? c.allResults
                          : categories.find((cat) => cat.id === category)[
                              language
                            ]}
                        <span>{visible.length}</span>
                      </h2>
                    </div>
                  </>
                )}
              </div>
              {pictureBrowsing ? (
                <PictureBrowser
                  words={boardWords}
                  locked={locked}
                  group={pictureGroup}
                  onGroup={selectPictureGroup}
                  slots={workspace.pinnedWords || DEFAULT_PINNED_WORDS}
                  onPins={openPins}
                  onSelect={selectWord}
                  onAdd={() => setAddingWord(true)}
                  c={c}
                  editing={editing}
                  highlighted={lastPicked?.id}
                />
              ) : (
                <div
                  className="aac-word-grid"
                  role="group"
                  aria-label={c.board}
                  data-scan-group="board"
                >
                  {visible.map((word) => (
                    <PictureCard
                      key={word.id}
                      word={word}
                      c={c}
                      editing={editing}
                      onSelect={selectWord}
                      highlighted={lastPicked?.id === word.id}
                    />
                  ))}
                </div>
              )}
              {!pictureBrowsing && !visible.length && (
                <div className="aac-empty">
                  <p>
                    {category === 'personal' && !query
                      ? c.emptyMyWords
                      : c.noResults}
                  </p>
                  {!locked && (
                    <button
                      className="aac-secondary"
                      onClick={() =>
                        (workspace.customWords || []).length >= 100
                          ? setNotice(c.wordsFull)
                          : setAddingWord(true)
                      }
                    >
                      <Icon name="plus" />
                      {c.addWord}
                    </button>
                  )}
                </div>
              )}
              {!pictureBrowsing && (
                <p className="aac-stability">
                  <Icon name="grid" />
                  {c.stable}
                </p>
              )}
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
                        !locked && (
                          <button
                            className="aac-icon-button"
                            aria-label={`${c.delete}: ${item.text}`}
                            onClick={() => deletePhrase(item)}
                          >
                            <Icon name="trash" />
                          </button>
                        )
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
              words={boardWords}
              locked={locked}
              c={c}
              say={say}
              onMissingTranslation={missingWord}
              onTimerDone={breakOver}
            />
          </div>
          {/* Notices float over the bottom of the board, so showing one never
              moves the pictures a user is about to tap. */}
          <div className="aac-toasts">
            {deletedPhrases.length > 0 && (
              <div className="aac-notice aac-deletion-notice" role="status">
                <span>{c.phraseDeleted}</span>
                <button className="aac-text-button" onClick={undoDelete}>
                  {c.undoDelete}
                </button>
              </div>
            )}
            {(notice || missingTranslation) && (
              <div className="aac-notice" role="status">
                <span>
                  {missingTranslation ? c.translationMissing : notice}
                </span>
                {noticeAction && (
                  <button
                    className="aac-text-button"
                    onClick={noticeAction.run}
                  >
                    {noticeAction.label}
                    <Icon name="arrow" />
                  </button>
                )}
                {notice && !missingTranslation && (
                  <button
                    className="aac-icon-button aac-notice-close"
                    aria-label={c.close}
                    onClick={() => setNotice('')}
                  >
                    <Icon name="close" />
                  </button>
                )}
              </div>
            )}
            {section === 'board' && editing && (
              <p className="aac-notice aac-scan-hint" role="status">
                {c.editingHelp}
              </p>
            )}
            {section === 'board' && scanning && (
              <p className="aac-notice aac-scan-hint">
                {preferences.scanMode === 'step' ? c.scanStepHint : c.scanHint}
              </p>
            )}
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
              {id === 'routine' && timerDone && (
                <span
                  className="aac-nav-badge"
                  role="img"
                  aria-label={c.timerDoneShort}
                >
                  <Icon name="clock" />
                </span>
              )}
            </button>
          ))}
        </nav>
      </main>
      <PrintSheet sheet={printSheet} brand={c.brand} onDone={closePrint} />
      {modal === 'pins' && (
        <PinnedWordEditor
          words={boardWords}
          slots={workspace.pinnedWords || DEFAULT_PINNED_WORDS}
          initialSlot={pinSlot}
          c={c}
          onClose={() => setModal(null)}
          onSave={(slots) => {
            update('pinned-words', slots);
            setModal(null);
          }}
        />
      )}
      {modal === 'tools' && (
        <Modal
          title={c.tools}
          closeLabel={c.close}
          onClose={() => setModal(null)}
        >
          <div className="aac-settings-body aac-tools-panel">
            {!locked && (
              <>
                <button className="aac-secondary" onClick={() => openPins()}>
                  <Icon name="star" />
                  {c.choosePins}
                </button>
                <button
                  className="aac-secondary"
                  onClick={() => {
                    setModal(null);
                    setEditing(true);
                    setScanning(false);
                  }}
                >
                  <Icon name="edit" />
                  {c.edit}
                </button>
              </>
            )}
            <button className="aac-secondary" onClick={() => printBoard(false)}>
              <Icon name="print" />
              {c.printBoard}
            </button>
            <button className="aac-secondary" onClick={() => printBoard(true)}>
              <Icon name="print" />
              {c.printAll}
            </button>
            <button className="aac-secondary" onClick={toggleScan}>
              <Icon name={scanning ? 'pause' : 'play'} />
              {scanning ? c.stopScan : c.scan}
            </button>
            <label className="aac-toggle">
              <span>{c.showScanControl}</span>
              <input
                type="checkbox"
                checked={Boolean(preferences.showScanControl)}
                onChange={(event) =>
                  update('preferences', {
                    showScanControl: event.target.checked
                  })
                }
              />
            </label>
            <button
              className="aac-secondary"
              onClick={() => {
                setNotice('');
                setModal('guide');
              }}
            >
              {c.guideTitle}
              <Icon name="arrow" />
            </button>
          </div>
        </Modal>
      )}
      {modal === 'guide' && (
        <QuickGuide
          c={c}
          language={language}
          words={['i', 'want', 'water'].map((id) =>
            catalog.words.find((word) => word.id === id)
          )}
          sample={catalog.phrases[0][language]}
          onSpeak={say}
          onStop={stop}
          notice={notice}
          voiceChecked={voiceChecked}
          onVoiceConfirmed={() => update('voice-check', language)}
          onClose={finishGuide}
          onAddWord={
            locked
              ? undefined
              : () => {
                  finishGuide();
                  setSection('board');
                  setAddingWord(true);
                }
          }
        />
      )}
      {modal === 'responses' && (
        <QuickResponses
          c={c}
          language={language}
          phrases={catalog.phrases}
          selected={workspace.quickResponses}
          onSave={locked ? undefined : (ids) => update('quick-responses', ids)}
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
          update={(operation, payload) => {
            if (operation === 'restore') {
              stop();
              setDeletedPhrases([]);
              setUndoDraft(null);
            }
            update(operation, payload);
          }}
          voices={voices}
          onClose={() => {
            setModal(null);
            if (workspace.preferences.editLock) setUnlocked(false);
          }}
          tryVoice={() => say(catalog.phrases[0][language])}
          onGuide={() => {
            stop();
            setNotice('');
            setModal('guide');
          }}
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
              disabled={missingTranslation}
              onClick={() =>
                speaking ? stop() : !missingTranslation && say(text, segments)
              }
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
                if (pictureBrowsing) selectPictureGroup('personal');
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

export default connect((state) => ({
  workspace: state.workspace,
  communication: state.communication
}))(Workspace);
