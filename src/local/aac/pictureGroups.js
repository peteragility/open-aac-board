// Open AAC Board addition, 2026-10-30. GPL-3.0-only; see LICENSE.txt.
export const PICTURE_GROUPS = [
  { id: 'food', title: 'pictureFood', examples: ['rice', 'bread', 'water'] },
  {
    id: 'feelings',
    title: 'pictureFeelings',
    examples: ['happy', 'pain', 'tired']
  },
  { id: 'people', title: 'picturePeople', examples: ['mum', 'dad', 'friend'] },
  { id: 'places', title: 'picturePlaces', examples: ['home', 'school', 'bus'] },
  {
    id: 'activities',
    title: 'pictureActivities',
    examples: ['play', 'sleep', 'brush']
  },
  { id: 'personal', title: 'myWords', examples: ['friend', 'apple', 'play'] }
];
export const ESSENTIAL_WORDS = ['yes', 'no', 'help', 'stop'];
export const DEFAULT_PINNED_WORDS = ['water', 'toilet', null, null, null, null];
const related = {
  food: ['eat', 'drink', 'water', 'hungry', 'thirsty'],
  feelings: ['happy', 'pain', 'like', 'not-want', 'rest', 'help'],
  people: ['i', 'you'],
  places: ['home', 'toilet'],
  activities: [
    'eat',
    'drink',
    'go',
    'rest',
    'play',
    'sleep',
    'brush',
    'wait',
    'finished',
    'again'
  ]
};

// Return the same word objects, with extra references after the familiar order.
export function wordsInGroup(words, group) {
  if (group === 'activities')
    return related.activities
      .map((id) => words.find((word) => word.id === id))
      .filter(Boolean);
  const original = words.filter((word) => word.category === group);
  return [
    ...original,
    ...(related[group] || [])
      .filter((id) => !original.some((word) => word.id === id))
      .map((id) => words.find((word) => word.id === id))
      .filter(Boolean)
  ];
}
