// Open AAC Board addition, 2026-11-03. GPL-3.0-only; see LICENSE.txt.
// Switch scanning over every control a switch user needs, not only the word
// cards. Targets are marked in the DOM with data-scan-target and grouped by the
// nearest data-scan-group, so new controls join the scan without extra wiring.
import { useEffect, useRef } from 'react';

import { scanGroups, switchAction } from './scanModel.js';

const isTyping = (element) =>
  element?.closest?.('input, textarea, select, [contenteditable="true"]');

function usable(element) {
  return (
    !element.disabled &&
    element.getAttribute('aria-disabled') !== 'true' &&
    !element.closest('[hidden], [inert]') &&
    element.getClientRects().length > 0
  );
}

function readTargets(root) {
  return [...root.querySelectorAll('[data-scan-target]')]
    .filter(usable)
    .map((element) => ({
      element,
      group: element.closest('[data-scan-group]')?.dataset.scanGroup || 'board',
      top: element.getBoundingClientRect().top
    }));
}

export function useSwitchScanning({
  root,
  active,
  mode = 'auto',
  delay = 2,
  hold = 0,
  rows = false,
  paused = false,
  onPreview,
  onStop
}) {
  const state = useRef({ level: 'group', group: 0, item: 0 });
  const options = useRef({});
  options.current = { mode, hold, rows, paused, onPreview, onStop };

  useEffect(() => {
    if (!active) return undefined;
    const scope = root.current;
    if (!scope) return undefined;
    state.current = { level: rows ? 'group' : 'item', group: 0, item: 0 };
    let timer = null;
    let holdTimer = null;
    let pressed = null;
    let lastPreview = null;

    const groups = () =>
      scanGroups(readTargets(scope), { rows: options.current.rows });
    const flat = () => groups().flatMap((group) => group.items);

    function clear() {
      scope
        .querySelectorAll('[data-scan-focus], [data-scan-group-focus]')
        .forEach((element) => {
          element.removeAttribute('data-scan-focus');
          element.removeAttribute('data-scan-group-focus');
        });
    }
    function current() {
      const s = state.current;
      if (!options.current.rows) {
        const items = flat();
        if (!items.length) return { items: [] };
        s.item %= items.length;
        return { items: [items[s.item]], single: items[s.item] };
      }
      const list = groups();
      if (!list.length) return { items: [] };
      s.group %= list.length;
      const group = list[s.group];
      if (s.level === 'group' && group.items.length > 1)
        return { items: group.items, group };
      s.item %= group.items.length;
      return { items: [group.items[s.item]], single: group.items[s.item] };
    }
    function show() {
      clear();
      const { items, single } = current();
      if (!items.length) return;
      for (const { element } of items)
        element.setAttribute(
          single ? 'data-scan-focus' : 'data-scan-group-focus',
          'true'
        );
      const first = items[0].element;
      first.focus({ preventScroll: true });
      first.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      if (single && single.element !== lastPreview)
        options.current.onPreview?.(single.element);
      lastPreview = single?.element || null;
    }
    function next() {
      const s = state.current;
      if (!options.current.rows) s.item++;
      else if (s.level === 'group') s.group++;
      else {
        const list = groups();
        const group = list[s.group % Math.max(list.length, 1)];
        s.item++;
        // After one pass through a row, go back to choosing rows.
        if (!group || s.item >= group.items.length) {
          s.level = 'group';
          s.item = 0;
          s.group++;
        }
      }
      show();
    }
    function restart() {
      state.current = {
        level: options.current.rows ? 'group' : 'item',
        group: 0,
        item: 0
      };
      lastPreview = null;
      schedule();
      // Let the click update the page before highlighting again.
      requestAnimationFrame(show);
    }
    function select() {
      const s = state.current;
      const { single, group } = current();
      if (options.current.rows && s.level === 'group' && group) {
        s.level = 'item';
        s.item = 0;
        schedule();
        show();
        return;
      }
      if (!single) return;
      single.element.click();
      restart();
    }
    function schedule() {
      clearInterval(timer);
      if (options.current.mode !== 'auto') return;
      timer = setInterval(() => {
        if (!options.current.paused) next();
      }, delay * 1000);
    }
    function act(action) {
      if (action === 'stop') options.current.onStop?.();
      else if (action === 'next') next();
      else if (action === 'select') select();
    }
    function keydown(event) {
      const action = switchAction(event.key, options.current.mode);
      if (!action) return;
      if (action !== 'stop' && isTyping(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      if (action === 'stop') return act('stop');
      if (event.repeat || pressed) return;
      pressed = action;
      // A switch must be held this long to count, which filters tremor.
      if (!options.current.hold) return act(action);
      holdTimer = setTimeout(() => {
        if (pressed === action) act(action);
        holdTimer = null;
      }, options.current.hold);
    }
    function keyup(event) {
      if (!switchAction(event.key, options.current.mode)) return;
      if (isTyping(event.target)) return;
      // Also stop the browser's own Space activation, which happens on keyup.
      event.preventDefault();
      event.stopPropagation();
      clearTimeout(holdTimer);
      holdTimer = null;
      pressed = null;
    }
    function focusin(event) {
      // A keyboard user who moves focus themselves continues from there.
      if (options.current.rows) return;
      const items = flat();
      const index = items.findIndex((item) => item.element === event.target);
      if (index >= 0 && index !== state.current.item) {
        state.current.item = index;
        show();
      }
    }
    window.addEventListener('keydown', keydown, true);
    window.addEventListener('keyup', keyup, true);
    scope.addEventListener('focusin', focusin);
    schedule();
    requestAnimationFrame(show);
    return () => {
      clearInterval(timer);
      clearTimeout(holdTimer);
      window.removeEventListener('keydown', keydown, true);
      window.removeEventListener('keyup', keyup, true);
      scope.removeEventListener('focusin', focusin);
      clear();
    };
  }, [active, root, delay, mode, rows]);
}
