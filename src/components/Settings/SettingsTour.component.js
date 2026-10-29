import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Joyride, { STATUS } from 'react-joyride';
import messages from './Settings.messages';
import { FormattedMessage, intlShape } from 'react-intl';

import './Settings.css';
import { isCordova } from '../../cordova-util';

const propTypes = {
  isSettingsTourEnabled: PropTypes.bool.isRequired,
  disableTour: PropTypes.func.isRequired,
  intl: intlShape.isRequired
};

const joyRideStyles = {
  options: {
    arrowColor: '#eee',
    backgroundColor: '#eee',
    primaryColor: '#aa00ff',
    textColor: '#333',
    width: 500,
    zIndex: 10000
  },
  tooltipContent: {
    padding: '5px 5px'
  }
};

const imgFolderPath = '../../../images/tour/settingsTour/';
let settingsTourImages = {
  display: [
    {
      src: imgFolderPath + 'elementsSize.png',
      description: messages.uiSizeDescrip,
      title: messages.uiSizeTitle
    },
    {
      src: imgFolderPath + 'fontSize.png',
      description: messages.fontSizeDescrip,
      title: messages.fontSizeTitle
    },
    {
      src: imgFolderPath + 'hideTheOutputBarOpt.png',
      description: messages.hideOutputBarDescrip,
      title: messages.hideOutputBarTitle
    },
    {
      src: imgFolderPath + 'labelPosition.png',
      description: messages.labelPositionDescrip,
      title: messages.labelPositionTitle
    },
    {
      src: imgFolderPath + 'enableDarkThemeOpt.png',
      description: messages.enableDarkThemeDescrip,
      title: messages.enableDarkThemeTitle
    }
  ],
  scanning: [
    {
      src: imgFolderPath + 'enableScanning2.gif',
      description: messages.enableScanningDescrip,
      title: messages.enableScanningTitle
    }
  ],
  navigation: [
    {
      src: imgFolderPath + 'enableContextAwareBackButton.png',
      description: messages.enableContextAwareBackButtonDescrip,
      title: messages.enableContextAwareBackButtonTitle
    },
    {
      src: imgFolderPath + 'showSharePhraseButton.png',
      description: messages.showSharePhraseButtonDescrip,
      title: messages.showSharePhraseButtonTitle
    },
    {
      src: imgFolderPath + 'removeSymbolsFromTheOutputBar.png',
      description: messages.removeSymbolsFromTheOutputBarDescrip,
      title: messages.removeSymbolsFromTheOutputBarTitle
    },
    {
      src: imgFolderPath + 'folderVocalization.png',
      description: messages.folderVocalizationDescrip,
      title: messages.folderVocalizationTitle
    }
  ]
};

function TourSlides({ items, intl }) {
  const [index, setIndex] = useState(0);
  const item = items[index];
  return (
    <section aria-label="Settings examples">
      <h2>
        <FormattedMessage {...item.title} />
      </h2>
      <img
        src={item.src}
        alt={intl.formatMessage(item.title)}
        style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
      />
      <p>
        <FormattedMessage {...item.description} />
      </p>
      {items.length > 1 && (
        <div>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
            aria-label="Previous example"
          >
            ←
          </button>
          <span aria-live="polite">
            {' '}
            {index + 1} / {items.length}{' '}
          </span>
          <button
            type="button"
            disabled={index === items.length - 1}
            onClick={() => setIndex(index + 1)}
            aria-label="Next example"
          >
            →
          </button>
        </div>
      )}
    </section>
  );
}

function SettingsTour({ intl, disableTour, isSettingsTourEnabled }) {
  let settingsTourSteps = [
    {
      target: 'body',
      placement: 'center',
      hideCloseButton: true,
      content: (
        <div>
          <h2>
            <FormattedMessage {...messages.walkthroughSettings} />
          </h2>
          <h5>
            <FormattedMessage {...messages.walkthroughSettingsDesc} />
          </h5>
        </div>
      )
    },
    {
      hideCloseButton: true,
      target: '#Language',
      content: (
        <div>
          <FormattedMessage {...messages.walkthroughLanguage} />
        </div>
      )
    },
    {
      hideCloseButton: true,
      target: '#Speech',
      content: (
        <div>
          <FormattedMessage {...messages.walkthroughSpeech} />
        </div>
      )
    },
    {
      hideCloseButton: true,
      target: '#Export',
      content: (
        <div>
          <FormattedMessage {...messages.walkthroughExport} />
        </div>
      )
    },
    {
      hideCloseButton: true,
      target: '#Import',
      content: (
        <div>
          <FormattedMessage {...messages.walkthroughImport} />
        </div>
      )
    },
    {
      hideCloseButton: true,
      target: '#Display',
      content: (
        <TourSlides
          key="display"
          items={settingsTourImages.display}
          intl={intl}
        />
      )
    },
    {
      hideCloseButton: true,
      target: '#Scanning',
      content: (
        <TourSlides
          key="scanning"
          items={settingsTourImages.scanning}
          intl={intl}
        />
      )
    },
    {
      hideCloseButton: true,
      target: '#Navigation',
      content: (
        <TourSlides
          key="navigation"
          items={settingsTourImages.navigation}
          intl={intl}
        />
      )
    }
  ];

  const formatImgForCordova = () => {
    for (const section in settingsTourImages) {
      settingsTourImages[section].forEach((img, indx) => {
        const src = img.src;
        const searchTerm = '/images';
        const indexOfFirst = src.indexOf(searchTerm);
        const tableOfContents = src.substring(0, indexOfFirst - 1);
        const srcCva = src.replace(tableOfContents, '');
        console.log(srcCva);
        settingsTourImages[section][indx].src = srcCva;
      });
    }
  };

  if (isCordova()) formatImgForCordova();

  return (
    <div>
      <Joyride
        callback={(data) => {
          const { status } = data;
          if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            disableTour({ isSettingsTourEnabled: false });
          }
        }}
        steps={settingsTourSteps}
        continuous={true}
        showSkipButton={true}
        //disableScrollParentFix={true}
        showProgress={false}
        disableOverlayClose={true}
        run={isSettingsTourEnabled}
        scrollOffset={500}
        spotlightPadding={4}
        styles={joyRideStyles}
        scrollDuration={100}
        disableBeacon={true}
        locale={{
          last: intl.formatMessage(messages.walkthroughEndTour),
          skip: intl.formatMessage(messages.walkthroughCloseTour),
          next: intl.formatMessage(messages.walkthroughNext),
          back: intl.formatMessage(messages.walkthroughBack)
        }}
      />
    </div>
  );
}
SettingsTour.propTypes = propTypes;

export default SettingsTour;
