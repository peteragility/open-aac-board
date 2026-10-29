import React from 'react';
import { connect } from 'react-redux';
import { finishFirstVisit } from '../components/App/App.actions';
import './local.css';

export function Welcome({ finishFirstVisit }) {
  return (
    <main className="local-welcome">
      <header className="local-brand"><img src="/app-icon.svg" alt="" />Open AAC Board<span>Free & open source</span></header>
      <div className="local-welcome-content">
        <section>
          <p className="local-eyebrow">COMMUNICATION BELONGS TO EVERYONE</p>
          <h1>Your words.<br />Your voice.</h1>
          <p className="local-intro">Tap pictures, build a message, and say what matters. Make the board your own with familiar words, photos, and recordings.</p>
          <button className="local-primary" onClick={finishFirstVisit}>Open my communication board <span aria-hidden="true">→</span></button>
          <p className="local-caption">Ready to use. No account or subscription needed.</p>
        </section>
        <div className="local-preview" aria-label="Example communication board">
          <div className="local-preview-message">I want to say something <span aria-hidden="true">♫</span></div>
          <div className="local-example-tiles">
            {[['I', 'person'], ['want', 'want'], ['water', 'water'], ['help', 'help']].map(([label], i) => (
              <div className={'local-example-tile tone-' + i} key={label}><span aria-hidden="true">{['🙋', '👐', '💧', '🤝'][i]}</span>{label}</div>
            ))}
          </div>
          <p>Space for every thought, big or small.</p>
        </div>
      </div>
      <div className="local-benefits">
        <section><strong>Personal to you</strong><p>Edit words, add photos, and record a familiar voice.</p></section>
        <section><strong>Saved on this device</strong><p>Your boards stay in this browser. Export a backup to keep another copy.</p></section>
        <section><strong>Made to go with you</strong><p>Install to your home screen. Download a device voice for speech without internet.</p></section>
      </div>
      <footer className="local-footer">An independent project based on <a href="https://github.com/cboard-org/cboard" target="_blank" rel="noopener noreferrer">Cboard</a>. Code licensed under GPLv3.</footer>
    </main>
  );
}
export default connect(null, { finishFirstVisit })(Welcome);
