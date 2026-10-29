import React from 'react';
import FullScreenDialog, { FullScreenDialogContent } from '../../UI/FullScreenDialog';
import '../../../local/local.css';

export default function About({ history }) {
  return <FullScreenDialog open title="About Open AAC Board" onClose={history.goBack}>
    <FullScreenDialogContent><div className="local-settings">
      <h2>Open AAC Board</h2>
      <p>A free, independent communication app based on Cboard. Personalize boards, build messages, use device speech, and record familiar voices.</p>
      <h3>Your data</h3>
      <p>Your boards, photos, and recordings stay in this browser. This version has no accounts, cloud sync, subscriptions, or application analytics. Our hosting provider receives ordinary requests for app files. Some device voices use the operating system’s online speech service; choose a downloaded voice for offline speech. Imported boards may contain links to pictures hosted elsewhere.</p>
      <h3>Credits and licenses</h3>
      <p>Based on <a href="https://github.com/cboard-org/cboard" target="_blank" rel="noopener noreferrer">Cboard</a>, copyright © 2017–2024 Assistive Technology LLC and Cboard contributors. Open AAC Board modifications © 2026 its contributors. This derivative is licensed under the GNU GPL version 3 and comes without warranty.</p>
      <ul>
        <li><a href="/source/open-aac-board-source.tar.gz">Download the corresponding source code</a> (available on deployed releases).</li>
        <li><a href="/LICENSE.txt">GNU GPL version 3</a></li>
        <li><a href="https://mulberrysymbols.org/">Mulberry Symbols by Steve Lee</a>: Creative Commons Attribution-ShareAlike 4.0.</li>
        <li>Bundled ARASAAC pictograms: Sergio Palao / Government of Aragon, <a href="https://arasaac.org/">ARASAAC</a>, Creative Commons Attribution-NonCommercial-ShareAlike 4.0.</li>
      </ul>
      <p>Symbol artwork retains its separate license. The original Cboard project and its sponsors do not endorse this independent app.</p>
    </div></FullScreenDialogContent>
  </FullScreenDialog>;
}
