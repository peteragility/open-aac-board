import React from 'react';
import ReactDOM from 'react-dom';
import 'fontsource-roboto';
import { Provider } from 'react-redux';
import { Router, Route } from 'react-router-dom';
import { TouchBackend } from 'react-dnd-touch-backend';
import { DndProvider } from 'react-dnd';
import { PersistGate } from 'redux-persist/es/integration/react';

import App from './components/App';
import {
  isCordova,
  onCordovaReady,
  initCordovaPlugins,
  initDeepLinking
} from './cordova-util';
import history from './history';
import './index.css';
import './polyfills';
import './env';
import LanguageProvider from './providers/LanguageProvider';
import SpeechProvider from './providers/SpeechProvider';
import ThemeProvider from './providers/ThemeProvider';
import configureStore, { getStore } from './store';

const { persistor } = configureStore();
const store = getStore();
const dndOptions = {
  enableTouchEvents: true,
  enableMouseEvents: true,
  enableKeyboardEvents: true
};

const renderApp = () => {
  if (isCordova()) {
    initCordovaPlugins();
    initDeepLinking(history);
  }
  ReactDOM.render(
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <SpeechProvider>
          <LanguageProvider>
            <ThemeProvider>
              <Router history={history}>
                <DndProvider backend={TouchBackend} options={dndOptions}>
                  <Route path="/" component={App} />
                </DndProvider>
              </Router>
            </ThemeProvider>
          </LanguageProvider>
        </SpeechProvider>
      </PersistGate>
    </Provider>,
    document.getElementById('root')
  );
};

isCordova() ? onCordovaReady(renderApp) : renderApp();
