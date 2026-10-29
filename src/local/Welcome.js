import React from 'react';
import { connect } from 'react-redux';
import { finishFirstVisit } from '../components/App/App.actions';
import './local.css';
import { copy } from './aac/copy';
import { ACTION } from './aac/model';
import { LANGUAGES, languageInfo } from './aac/languages';
import catalog from './aac/catalog.json';
import Helmet from 'react-helmet';

export function Welcome({
  finishFirstVisit,
  language = 'yue',
  changeLanguage
}) {
  const c = copy(language);
  const tr = (yue, en, cmn) =>
    language === 'en' ? en : language === 'cmn' ? cmn : yue;
  return (
    <main className="local-welcome" lang={languageInfo(language).html}>
      <Helmet>
        <html lang={languageInfo(language).html} />
        <title>{c.brand} · Open AAC Board</title>
      </Helmet>
      <header className="local-brand">
        <img src="/app-icon.svg" alt="" />
        {c.brand}
        <div
          className="local-welcome-languages"
          role="group"
          aria-label={c.language}
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              aria-pressed={language === l.id}
              onClick={() => changeLanguage(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>
      <div className="local-welcome-content">
        <section>
          <p className="local-eyebrow">COMMUNICATION BELONGS TO EVERYONE</p>
          <h1 style={{ whiteSpace: 'pre-line' }}>{c.welcomeTitle}</h1>
          <p className="local-intro">{c.welcomeIntro}</p>
          <button className="local-primary" onClick={finishFirstVisit}>
            {c.start} <span aria-hidden="true">→</span>
          </button>
          <p className="local-caption">{c.noAccount}</p>
        </section>
        <div className="local-preview" aria-label="Communication board">
          <div className="local-preview-message">
            {tr('我想飲水', 'I want to drink water', '我想喝水')}{' '}
            <span aria-hidden="true">♫</span>
          </div>
          <div className="local-example-tiles">
            {['i', 'want', 'water', 'help'].map((id, i) => {
              const word = catalog.words.find((w) => w.id === id);
              return (
                <div className={'local-example-tile tone-' + i} key={id}>
                  <img src={word.symbol} alt="" />
                  {word[language]}
                </div>
              );
            })}
          </div>
          <p>{c.tagline}</p>
        </div>
      </div>
      <div className="local-benefits">
        <section>
          <strong>
            {tr('屬於你嘅表達', 'Personal to you', '属于你的表达')}
          </strong>
          <p>
            {tr(
              '改字詞、加相片、錄低熟悉嘅聲音。',
              'Edit words, add photos, and record a familiar voice.',
              '改词语、加照片、录下熟悉的声音。'
            )}
          </p>
        </section>
        <section>
          <strong>
            {tr('廣東話，開箱即用', 'Cantonese, ready to go', '粤语，开箱即用')}
          </strong>
          <p>
            {tr(
              '內置三語字詞同句子錄音，唔使申請語音服務。',
              'Included audio in three languages. No speech service signup.',
              '内置三语词语和句子语音，无需申请语音服务。'
            )}
          </p>
        </section>
        <section>
          <strong>
            {tr(
              '手機、平板，隨時講',
              'Made to go with you',
              '手机、平板，随时说'
            )}
          </strong>
          <p>
            {tr(
              '下載完成後可離線用，記得匯出備份。',
              'Works offline after the first download. Keep a backup.',
              '下载完成后可离线使用，记得导出备份。'
            )}
          </p>
        </section>
      </div>
      <footer className="local-footer">
        {tr(
          '獨立開源項目，基於 ',
          'An independent project based on ',
          '独立开源项目，基于 '
        )}
        <a
          href="https://github.com/cboard-org/cboard"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cboard
        </a>
        . Code licensed under GPLv3.
      </footer>
    </main>
  );
}
export default connect((state) => ({ language: state.workspace.language }), {
  finishFirstVisit,
  changeLanguage: (payload) => ({
    type: ACTION,
    operation: 'language',
    payload
  })
})(Welcome);
