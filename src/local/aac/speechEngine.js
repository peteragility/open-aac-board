import { selectVoice, normalizeSpeechText } from './languages.js';

export class SpeechEngine {
  constructor({
    catalog,
    getSynth,
    createUtterance,
    createAudio,
    isOnline = () => true
  }) {
    Object.assign(this, {
      catalog,
      getSynth,
      createUtterance,
      createAudio,
      isOnline
    });
    this.generation = 0;
  }
  stop() {
    this.generation++;
    this.getSynth()?.cancel();
    if (this.audio) {
      this.audio.pause();
      this.audio.onended = null;
      this.audio.onerror = null;
    }
    this.finish?.();
    this.finish = null;
  }
  included(text, language) {
    const normalized = normalizeSpeechText(text);
    const match = this.catalog.find(
      (item) => normalizeSpeechText(item[language]) === normalized
    );
    return match ? `/audio/${language}/${match.id}.mp3` : null;
  }
  speakDevice(text, voice, rate) {
    return new Promise((resolve, reject) => {
      this.finish = resolve;
      const utterance = this.createUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = rate;
      utterance.onend = resolve;
      utterance.onerror = (event) =>
        reject(new Error(event.error || 'speech-failed'));
      this.getSynth().speak(utterance);
    });
  }
  async speak({ text, language, preferredURI, segments = [], rate = 1 }) {
    this.stop();
    if (!text.trim()) return;
    const generation = this.generation;
    const synth = this.getSynth();
    const voice = selectVoice(
      synth?.getVoices?.() || [],
      language,
      preferredURI
    );
    const hasRecording = segments.some((segment) => segment.recording);
    const files =
      this.included(text, language) && !hasRecording
        ? [this.included(text, language)]
        : segments.map(
            (segment) =>
              segment.recording || this.included(segment.text, language)
          );
    const canUseDevice =
      voice && (this.isOnline() || voice.localService === true);
    if (canUseDevice && !hasRecording) {
      try {
        await this.speakDevice(text, voice, rate);
        return;
      } catch (error) {
        if (generation !== this.generation) return;
        if (!files.length || files.some((file) => !file)) throw error;
      }
    }
    if (!files.length || (!canUseDevice && files.some((file) => !file)))
      throw new Error('missing-voice');
    this.audio = this.audio || this.createAudio();
    for (const [index, file] of files.entries()) {
      if (generation !== this.generation) return;
      if (!file && canUseDevice) {
        await this.speakDevice(segments[index].text, voice, rate);
        continue;
      }
      await new Promise((resolve, reject) => {
        this.finish = resolve;
        this.audio.onended = resolve;
        this.audio.onerror = () => reject(new Error('audio-failed'));
        this.audio.src = file;
        this.audio.playbackRate = rate;
        this.audio.play().catch(reject);
      });
    }
  }
}
