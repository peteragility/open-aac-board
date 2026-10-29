import catalog from './catalog.json';
import { SpeechEngine } from './speechEngine.js';

export const speech = new SpeechEngine({
  catalog: [...catalog.words, ...catalog.phrases],
  getSynth: () => window.speechSynthesis,
  createUtterance: (text) => new window.SpeechSynthesisUtterance(text),
  createAudio: () => new window.Audio(),
  isOnline: () => navigator.onLine
});
