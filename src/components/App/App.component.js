import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Helmet from 'react-helmet';
import { Route, Switch, Redirect } from 'react-router-dom';
import classNames from 'classnames';

import BoardContainer from '../Board';
import OfflineNotificationModal from '../OfflineNotification';
import Notifications from '../Notifications';
import NotFound from '../NotFound';
import Settings from '../Settings';
import WelcomeScreen from '../../local/Welcome';
import StorageNotice from '../../local/StorageNotice';
import Workspace from '../../local/aac/Workspace';
import GazeSwitchProvider from '../../providers/GazeSwitchProvider';
import './App.css';

export class App extends Component {
  static propTypes = {
    /**
     * App language direction
     */
    dir: PropTypes.string.isRequired,
    /**
     * If 'true', user first visit
     */
    isFirstVisit: PropTypes.bool,
    /**
     * If 'true', user is logged in
     */
    isLogged: PropTypes.bool,
    /**
     * If 'true', user is downloading a new lang
     */
    isDownloadingLang: PropTypes.bool,
    /**
     * App language
     */
    lang: PropTypes.string.isRequired,
    /**
     * If 'true', dark mode is enabled
     */
    dark: PropTypes.bool
  };

  render() {
    const { lang, dir, isFirstVisit, isLogged, dark, isDownloadingLang } =
      this.props;

    return (
      <div className={classNames('App', { 'is-dark': dark })}>
        <Helmet>
          <html lang={lang} dir={dir} />
        </Helmet>

        <Notifications />
        <Switch>
          <Route path="/settings" component={Settings} />
          <Route path="/board/:id" component={BoardContainer} />
          <Route path="/boards" component={BoardContainer} />
          {isDownloadingLang && (
            <Route exact path={'/'}>
              <Redirect to={'/settings/language'} />
            </Route>
          )}
          <Route
            exact
            path="/"
            component={isFirstVisit && !isLogged ? WelcomeScreen : Workspace}
          />
          <Route component={NotFound} />
        </Switch>
        <StorageNotice />
        <OfflineNotificationModal />
        <GazeSwitchProvider />
      </div>
    );
  }
}

export default App;
