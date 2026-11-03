import { isAndroid } from '../../cordova-util';
import {
  IS_BROWSING_FROM_APPLE_TOUCH,
  IS_BROWSING_FROM_SAFARI
} from '../../constants';
import { getStore } from '../../store';

// Device (platform) speech only. Cloud voices are not part of this distribution.
let synth = window.speechSynthesis;

var platformVoices = [];

const getStateVoices = () => {
  const store = getStore();
  const {
    speech: { voices }
  } = store.getState();
  return voices;
};

const getConnectionStatus = () => {
  const store = getStore();
  const {
    app: { isConnected }
  } = store.getState();
  return isConnected;
};

const tts = {
  isSupported() {
    return 'speechSynthesis' in window;
  },

  getVoiceByVoiceURI(VoiceURI) {
    const voices = getStateVoices();
    return voices.find((voice) => voice.voiceURI === VoiceURI);
  },

  isConnected() {
    return getConnectionStatus();
  },

  getLocalVoiceByVoiceURI(VoiceURI) {
    return platformVoices.find((voice) => voice.voiceURI === VoiceURI);
  },

  _getPlatformVoices() {
    try {
      const voices = synth.getVoices();
      // On Cordova, voice results are under `._list`
      const voiceList = voices._list || voices;
      return Array.isArray(voiceList) ? voiceList : [];
    } catch (err) {
      console.error('Error getting platform voices:', err.message);
      synth = window.speechSynthesis;
      return [];
    }
  },

  async getPlatformVoicesAsync() {
    return new Promise((resolve) => {
      const VOICES_TIMEOUT = 7000;

      const resolveWithVoices = () => {
        const voices = this._getPlatformVoices();
        platformVoices = voices;
        resolve(voices);
      };

      const supportsVoicesChanged = 'onvoiceschanged' in synth;
      const initialVoices = this._getPlatformVoices();

      if (initialVoices.length > 0 || !supportsVoicesChanged) {
        platformVoices = initialVoices;
        resolve(initialVoices);
        return;
      }

      const timeoutId = setTimeout(() => {
        synth.removeEventListener('voiceschanged', handleVoicesChanged);
        resolveWithVoices();
      }, VOICES_TIMEOUT);

      const handleVoicesChanged = () => {
        clearTimeout(timeoutId);
        synth.removeEventListener('voiceschanged', handleVoicesChanged);
        resolveWithVoices();
      };

      synth.addEventListener('voiceschanged', handleVoicesChanged);
    });
  },

  async getVoices() {
    const voices = await this.getPlatformVoicesAsync();
    return Array.isArray(voices) ? voices : [];
  },

  setTtsEngine(ttsEngineName) {
    if (!isAndroid()) {
      return Promise.resolve([]);
    }

    if (synth === undefined) {
      synth = window.speechSynthesis;
    }

    console.log('[TTS] Setting engine to:', ttsEngineName);
    return new Promise((resolve, reject) => {
      let callbackExecuted = false;

      const timeoutId = setTimeout(() => {
        if (!callbackExecuted) {
          callbackExecuted = true;
          console.warn('[TTS] setEngine timeout after 7 seconds, rejecting');
          reject(new Error('TTS engine setup timeout after 7 seconds'));
        }
      }, 7000);

      synth.setEngine(ttsEngineName, function (voicesData) {
        if (callbackExecuted) return;
        callbackExecuted = true;
        clearTimeout(timeoutId);

        console.log(
          '[TTS] setEngine callback received, voices:',
          voicesData ? voicesData.length : 0
        );

        if (voicesData && voicesData.length) {
          return resolve(voicesData);
        }

        return reject(new Error('TTS engine did not return valid voices'));
      });
    });
  },

  //Use getTTsEngine only in Android
  getTtsEngines() {
    if (!isAndroid()) {
      return [];
    } else {
      if (synth === undefined) {
        synth = window.speechSynthesis;
      }
      const ttsEngs = synth.getEngines() || {};
      return ttsEngs._list || [];
    }
  },
  //Use getTTsDefaultEngine only in Android
  getTtsDefaultEngine() {
    if (!isAndroid()) {
      return;
    } else {
      const ttsDefaultEng = synth.getDefaultEngine() || {};
      return ttsDefaultEng;
    }
  },

  cancel() {
    synth.cancel();
  },

  async speak(text, { voiceURI, pitch = 1, rate = 1, volume = 1, onend }) {
    if (!platformVoices.length) {
      try {
        await this.getVoices();
      } catch (err) {
        console.error(err.message);
      }
    }
    if (platformVoices.length) {
      const localVoice = this.getLocalVoiceByVoiceURI(voiceURI);
      if (localVoice) {
        const msg = new SpeechSynthesisUtterance(text);
        msg.text = text;
        msg.voice = localVoice;
        msg.name = localVoice.name;
        msg.lang = localVoice.lang;
        msg.voiceURI = localVoice.voiceURI;
        msg.pitch = pitch;
        msg.rate = rate;
        msg.volume = volume;
        msg.onend = onend;
        if (IS_BROWSING_FROM_SAFARI || IS_BROWSING_FROM_APPLE_TOUCH)
          synth.cancel();
        synth.speak(msg);
      }
    }
  }
};

export default tts;
