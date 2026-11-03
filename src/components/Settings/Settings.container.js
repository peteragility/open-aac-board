import React, { Component } from 'react';
import { connect } from 'react-redux';
import { PropTypes } from 'prop-types';

import SettingsComponent from './Settings.component';
import { injectIntl, intlShape } from 'react-intl';
import { disableTour } from '../../components/App/App.actions';

export class SettingsContainer extends Component {
  static propTypes = {
    intl: intlShape.isRequired,
    isDownloadingLang: PropTypes.bool
  };

  render() {
    return <SettingsComponent {...this.props} />;
  }
}

const mapStateToProps = (state) => ({
  isSettingsTourEnabled: state.app.liveHelp.isSettingsTourEnabled,
  isDownloadingLang: state.language.downloadingLang.isdownloading
});

const mapDispatchToProps = {
  disableTour
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(injectIntl(SettingsContainer));
