import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LANGUAGES, matchesLanguage } from './languages';
import { copy } from './copy';
import { createWorkspaceBackup, parseWorkspaceBackup } from './model';
import { Icon, Modal } from './UI';

export default function WorkspaceSettings({
  workspace,
  update,
  voices,
  onClose,
  tryVoice,
  onGuide
}) {
  const c = copy(workspace.language);
  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState('');
  const p = workspace.preferences;
  const matching = voices.filter((v) => matchesLanguage(v, workspace.language));
  function download() {
    const blob = new Blob([createWorkspaceBackup(workspace)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'open-aac-workspace.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function restore(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 32 * 1024 * 1024) throw new Error('oversize');
      setPending(parseWorkspaceBackup(await file.text()));
      setMessage('');
    } catch {
      setMessage(c.invalidBackup);
    }
  }
  return (
    <Modal title={c.settings} closeLabel={c.close} onClose={onClose}>
      <div className="aac-settings-body">
        <section>
          <h3>{c.voice}</h3>
          <label className="aac-field">
            {c.language}
            <select
              value={workspace.language}
              onChange={(e) => update('language', e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option value={l.id} key={l.id}>
                  {l.label} · {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="aac-field">
            {c.deviceVoice}
            <select
              value={workspace.voices[workspace.language]}
              onChange={(e) => update('voice', e.target.value)}
            >
              <option value="">{c.autoVoice}</option>
              {matching.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                  {v.localService ? ' · offline' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="aac-field">
            {c.rate}
            <select
              value={p.rate}
              onChange={(e) =>
                update('preferences', { rate: Number(e.target.value) })
              }
            >
              <option value={0.75}>0.75×</option>
              <option value={1}>1×</option>
              <option value={1.25}>1.25×</option>
            </select>
          </label>
          <button className="aac-secondary" onClick={tryVoice}>
            <Icon name="speaker" />
            {c.testVoice}
          </button>
          {!matching.length && <p className="aac-callout">{c.noVoice}</p>}
          <p className="aac-muted">{c.voiceHelp}</p>
        </section>
        <section>
          <h3>{c.appearance}</h3>
          <label className="aac-field">
            {c.density}
            <select
              value={p.density}
              onChange={(e) =>
                update('preferences', { density: e.target.value })
              }
            >
              {['comfortable', 'large', 'compact'].map((value) => (
                <option key={value} value={value}>
                  {c[value]}
                </option>
              ))}
            </select>
          </label>
          {['contrast', 'largeText', 'speakOnTap', 'haptics'].map((field) => (
            <label className="aac-toggle" key={field}>
              <span>{c[field]}</span>
              <input
                type="checkbox"
                checked={p[field]}
                onChange={(e) =>
                  update('preferences', { [field]: e.target.checked })
                }
              />
            </label>
          ))}
          <label className="aac-field">
            {c.scanDelay}
            <select
              value={p.scanDelay}
              onChange={(e) =>
                update('preferences', { scanDelay: Number(e.target.value) })
              }
            >
              {[1, 2, 3, 4].map((delay) => (
                <option key={delay} value={delay}>
                  {delay}
                </option>
              ))}
            </select>
          </label>
        </section>
        <section>
          <h3>{c.backup}</h3>
          <p className="aac-muted">{c.backupHint}</p>
          <div className="aac-button-row">
            <button className="aac-secondary" onClick={download}>
              <Icon name="download" />
              {c.export}
            </button>
            <label className="aac-secondary aac-file-button">
              {c.restore}
              <input
                type="file"
                accept=".json,application/json"
                onChange={restore}
              />
            </label>
          </div>
          {pending && (
            <div className="aac-callout">
              <p>{c.restoreConfirm}</p>
              <div className="aac-button-row">
                <button
                  className="aac-primary"
                  onClick={() => {
                    update('restore', pending);
                    setPending(null);
                    setMessage(c.restored);
                  }}
                >
                  {c.confirmRestore}
                </button>
                <button
                  className="aac-secondary"
                  onClick={() => setPending(null)}
                >
                  {c.cancel}
                </button>
              </div>
            </div>
          )}
          <p role="status">{message}</p>
        </section>
        <section className="aac-settings-links">
          <button className="aac-secondary" onClick={onGuide}>
            {c.guideTitle}
            <Icon name="arrow" />
          </button>
          <Link to="/boards" onClick={onClose}>
            {c.advanced}
            <Icon name="arrow" />
          </Link>
          <Link to="/settings/device" onClick={onClose}>
            {c.advancedBackup}
            <Icon name="arrow" />
          </Link>
          <Link to="/settings/about" onClick={onClose}>
            {c.about}
            <Icon name="arrow" />
          </Link>
        </section>
        <p className="aac-muted">
          <Icon name="shield" /> {c.local}
        </p>
      </div>
    </Modal>
  );
}
