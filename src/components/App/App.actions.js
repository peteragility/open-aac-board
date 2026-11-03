import {
  FINISH_FIRST_VISIT,
  UPDATE_DISPLAY_SETTINGS,
  UPDATE_NAVIGATION_SETTINGS,
  DISABLE_TOUR,
  ENABLE_ALL_TOURS,
  UPDATE_SYMBOLS_SETTINGS,
  UPDATE_CONNECTIVITY
} from './App.constants';

export function updateConnectivity({ isConnected = false }) {
  return {
    type: UPDATE_CONNECTIVITY,
    payload: isConnected
  };
}

export function updateDisplaySettings(payload = {}) {
  return {
    type: UPDATE_DISPLAY_SETTINGS,
    payload
  };
}

export function updateNavigationSettings(payload = {}) {
  return {
    type: UPDATE_NAVIGATION_SETTINGS,
    payload
  };
}

export function updateSymbolsSettings(payload = {}) {
  return {
    type: UPDATE_SYMBOLS_SETTINGS,
    payload
  };
}

export function finishFirstVisit() {
  return {
    type: FINISH_FIRST_VISIT
  };
}

export function disableTour(payload = {}) {
  return {
    type: DISABLE_TOUR,
    payload
  };
}

export function enableAllTours() {
  return {
    type: ENABLE_ALL_TOURS
  };
}
