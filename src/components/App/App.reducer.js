import {
  FINISH_FIRST_VISIT,
  UPDATE_CONNECTIVITY,
  UPDATE_DISPLAY_SETTINGS,
  UPDATE_NAVIGATION_SETTINGS,
  UPDATE_SYMBOLS_SETTINGS,
  DISABLE_TOUR,
  ENABLE_ALL_TOURS
} from './App.constants';
import {
  DISPLAY_SIZE_STANDARD,
  LABEL_POSITION_BELOW
} from '../Settings/Display/Display.constants';

import { DEFAULT_FONT_FAMILY } from './../../providers/ThemeProvider/ThemeProvider.constants';
import { NAVIGATION_BUTTONS_STYLE_SIDES } from '../Settings/Navigation/Navigation.constants';

const initialState = {
  isConnected: true,
  isFirstVisit: true,
  liveHelp: {
    isRootBoardTourEnabled: false,
    isUnlockedTourEnabled: false,
    isSettingsTourEnabled: false,
    communicatorTour: {
      isCommBoardsEnabled: false,
      isPublicBoardsEnabled: false,
      isAllMyBoardsEnabled: false
    },
    isAnalyticsTourEnabled: false,
    isSymbolSearchTourEnabled: false
  },
  displaySettings: {
    uiSize: DISPLAY_SIZE_STANDARD,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: DISPLAY_SIZE_STANDARD,
    hideOutputActive: false,
    increaseOutputButtons: false,
    labelPosition: LABEL_POSITION_BELOW,
    darkThemeActive: false
  },
  navigationSettings: {
    active: false,
    shareShowActive: false,
    bigScrollButtonsActive: false,
    navigationButtonsStyle: NAVIGATION_BUTTONS_STYLE_SIDES,
    caBackButtonActive: false,
    quickUnlockActive: false,
    removeOutputActive: false,
    vocalizeFolders: false,
    quietBuilderMode: false,
    liveMode: false,
    improvePhraseActive: false,
    pinLockEnabled: false,
    pinCode: ''
  },
  symbolsSettings: {
    arasaacActive: false
  },
  userData: {}
};

function appReducer(state = initialState, action) {
  let displaySettings = { ...state.displaySettings };
  let navigationSettings = { ...state.navigationSettings };
  let symbolsSettings = { ...state.symbolsSettings };

  switch (action.type) {
    case UPDATE_DISPLAY_SETTINGS:
      displaySettings = {
        ...state.displaySettings,
        ...action.payload
      };
      return {
        ...state,
        displaySettings
      };
    case UPDATE_NAVIGATION_SETTINGS:
      navigationSettings = {
        ...state.navigationSettings,
        ...action.payload
      };
      return {
        ...state,
        navigationSettings
      };
    case UPDATE_SYMBOLS_SETTINGS:
      symbolsSettings = {
        ...state.symbolsSettings,
        ...action.payload
      };
      return {
        ...state,
        symbolsSettings
      };
    case UPDATE_CONNECTIVITY:
      if (state.isConnected === action.payload) return state;
      return {
        ...state,
        isConnected: action.payload
      };
    case FINISH_FIRST_VISIT:
      return {
        ...state,
        isFirstVisit: false
      };
    case DISABLE_TOUR:
      return {
        ...state,
        liveHelp: {
          ...state.liveHelp,
          ...action.payload
        }
      };
    case ENABLE_ALL_TOURS:
      return {
        ...state,
        liveHelp: {
          isRootBoardTourEnabled: true,
          isUnlockedTourEnabled: true,
          isSettingsTourEnabled: true,
          communicatorTour: {
            isCommBoardsEnabled: true,
            isPublicBoardsEnabled: true,
            isAllMyBoardsEnabled: true
          },
          isAnalyticsTourEnabled: true,
          isSymbolSearchTourEnabled: true
        }
      };

    default:
      return state;
  }
}

export default appReducer;
