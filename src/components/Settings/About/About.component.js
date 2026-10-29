import React from 'react';
import FullScreenDialog, {
  FullScreenDialogContent
} from '../../UI/FullScreenDialog';
import '../../../local/local.css';

export default function About({ history }) {
  const commit = process.env.REACT_APP_BUILD_COMMIT;
  const sourceDirectory = /^[a-f0-9]{40}$/.test(commit || '')
    ? `/source/${commit}`
    : '/source';
  return (
    <FullScreenDialog
      open
      title="About Open AAC Board"
      onClose={history.goBack}
    >
      <FullScreenDialogContent>
        <div className="local-settings">
          <h2>Open AAC Board</h2>
          <p>
            A free, independent communication app based on Cboard. Personalize
            boards, build messages, use device speech, and record familiar
            voices.
          </p>
          <p>
            Offered free of charge for noncommercial NGO and community use. The
            GPL code and separately licensed artwork retain their respective
            license terms.
          </p>
          <h3>Your data</h3>
          <p>
            Your boards, photos, and recordings stay in this browser. This
            version has no accounts, cloud sync, subscriptions, or application
            analytics. Our hosting provider receives ordinary requests for app
            files. Some device voices use the operating system’s online speech
            service; choose a downloaded voice for offline speech. Imported
            boards may contain links to pictures hosted elsewhere.
          </p>
          <h3>Credits and licenses</h3>
          <p>
            Based on{' '}
            <a
              href="https://github.com/cboard-org/cboard"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cboard
            </a>
            , copyright © 2017–2024 Assistive Technology LLC and Cboard
            contributors. Open AAC Board modifications © 2026 its contributors.
            This derivative is licensed under the GNU GPL version 3 and comes
            without warranty.
          </p>
          <ul>
            <li>
              <a
                href="https://github.com/peteragility/open-aac-board"
                target="_blank"
                rel="noopener noreferrer"
              >
                Public source repository and change history
              </a>
            </li>
            <li>
              <a href={`${sourceDirectory}/open-aac-board-source.tar.gz`}>
                Download the corresponding source code
              </a>{' '}
              (available on deployed releases).
            </li>
            <li>
              <a href={`${sourceDirectory}/release.json`}>
                Release commit and source archive checksum
              </a>
            </li>
            <li>
              <a href="/LICENSE.txt">GNU GPL version 3</a>
            </li>
            <li>
              <a href="/THIRD_PARTY_NOTICES.txt">
                Full third-party credits and license notices
              </a>
            </li>
            <li>
              <a href="/licenses/dependency-notices.txt">
                Dependency license texts
              </a>{' '}
              · <a href="/licenses/dependencies.json">Package inventory</a> ·{' '}
              <a href="/licenses/assets.json">Artwork and media inventory</a>
            </li>
            <li>
              <a href="https://mulberrysymbols.org/">
                Mulberry Symbols by Steve Lee
              </a>
              : Creative Commons Attribution-ShareAlike 4.0.
            </li>
            <li>
              Bundled ARASAAC pictograms: Sergio Palao / Government of Aragon,{' '}
              <a href="https://arasaac.org/">ARASAAC</a>,{' '}
              <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">
                Creative Commons Attribution-NonCommercial-ShareAlike 4.0
              </a>
              .
            </li>
          </ul>
          <p>
            Symbol artwork retains its separate license. The original Cboard
            project, its sponsors and the OpenAAC initiative do not endorse this
            independent app. The current name is a working project name; no
            trade mark registration or clearance is claimed.
          </p>
        </div>
      </FullScreenDialogContent>
    </FullScreenDialog>
  );
}
