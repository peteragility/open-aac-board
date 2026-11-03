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
  // Some browsers never fire onend (Chrome stops long utterances after about
  // 15 s; a stalled synthesizer fires nothing). Give up after a generous time
  // so the button never stays on "Stop" and the bundled audio can take over.
  speechTimeout(text, rate) {
    return (3000 + Array.from(text).length * 400) / Math.max(rate, 0.5);
  }
  speakDevice(text, voice, rate, volume = 1) {
    return new Promise((resolve, reject) => {
      const done = (callback) => (value) => {
        clearTimeout(watchdog);
        callback(value);
      };
      const watchdog = setTimeout(
        () => {
          this.getSynth()?.cancel();
          reject(new Error('speech-timeout'));
        },
        this.speechTimeout(text, rate)
      );
      this.finish = done(resolve);
      const utterance = this.createUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = rate;
      utterance.volume = volume;
      utterance.onend = done(resolve);
      utterance.onerror = (event) =>
        done(reject)(new Error(event.error || 'speech-failed'));
      this.getSynth().speak(utterance);
    });
  }
  async speak({
    text,
    language,
    preferredURI,
    segments = [],
    rate = 1,
    volume = 1
  }) {
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
        await this.speakDevice(text, voice, rate, volume);
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
        await this.speakDevice(segments[index].text, voice, rate, volume);
        continue;
      }
      await new Promise((resolve, reject) => {
        this.finish = resolve;
        this.audio.onended = resolve;
        this.audio.onerror = () => reject(new Error('audio-failed'));
        this.audio.src = file;
        this.audio.playbackRate = rate;
        this.audio.volume = volume;
        this.audio.play().catch(reject);
      });
    }
  }
}
