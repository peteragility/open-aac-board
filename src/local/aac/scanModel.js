// Open AAC Board addition, 2026-11-03. GPL-3.0-only; see LICENSE.txt.
// Pure scanning rules, kept free of React so they can be unit tested.
// The message controls come first so a finished message can be spoken quickly
// (they are disabled, and skipped, while the message is empty).
export const SCAN_ORDER = [
  'message',
  'essential',
  'board',
  'folders',
  'categories',
  'picture-nav',
  'pins',
  'stop'
];
const ROW_GROUPS = ['essential', 'board', 'folders', 'pins'];

// Pure: targets in document order ({ group, top, ... }) -> ordered scan groups.
// With rows, grids are split into their visual rows.
export function scanGroups(targets, { rows = false } = {}) {
  const groups = new Map();
  for (const target of targets) {
    const id =
      rows && ROW_GROUPS.includes(target.group)
        ? `${target.group}:${Math.round(target.top)}`
        : target.group;
    if (!groups.has(id)) groups.set(id, { id, group: target.group, items: [] });
    groups.get(id).items.push(target);
  }
  const rank = (group) => {
    const index = SCAN_ORDER.indexOf(group);
    return index < 0 ? SCAN_ORDER.length : index;
  };
  return [...groups.values()].sort((a, b) => rank(a.group) - rank(b.group));
}

// Pure: what a switch press means. Auto scanning uses one switch (any press
// selects); step scanning uses two (Space moves, Enter selects).
export function switchAction(key, mode) {
  if (key === 'Escape') return 'stop';
  if (key !== ' ' && key !== 'Enter') return null;
  if (mode === 'step' && key === ' ') return 'next';
  return 'select';
}
