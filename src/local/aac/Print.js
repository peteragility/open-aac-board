// Open AAC Board addition, 2026-11-03. GPL-3.0-only; see LICENSE.txt.
// A paper copy of the board, for when the device is flat or not allowed.
import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import React from 'react';
import { languageInfo } from './languages';

export function PrintSheet({ sheet, brand, onDone }) {
  useEffect(() => {
    if (!sheet) return undefined;
    let cancelled = false;
    const after = () => onDone();
    window.addEventListener('afterprint', after);
    // Print only once every picture has loaded.
    const images = [...document.querySelectorAll('.aac-print-sheet img')];
    Promise.all(
      images.map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.onload = image.onerror = resolve;
            })
      )
    ).then(() => {
      if (!cancelled) window.print();
    });
    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', after);
    };
  }, [sheet, onDone]);
  if (!sheet) return null;
  return ReactDOM.createPortal(
    <div className="aac-print-sheet" lang={languageInfo(sheet.language).html}>
      <header>
        <strong>{brand}</strong> · {sheet.title}
      </header>
      {sheet.groups.map((group) => (
        <section key={group.title}>
          {sheet.groups.length > 1 && <h2>{group.title}</h2>}
          <div className="aac-print-grid">
            {group.words.map((word) => (
              <div className={`aac-print-cell tone-${word.tone}`} key={word.id}>
                <img src={word.image} alt="" />
                <span>{word.text}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>,
    document.body
  );
}
