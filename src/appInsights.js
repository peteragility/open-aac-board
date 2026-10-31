// The upstream instrumentation interface is retained for shared reducers.
// This distribution sends no application telemetry.
const noop = () => {};
export const appInsights = {
  trackEvent: noop,
  trackException: noop,
  trackPageView: noop,
  setAuthenticatedUserContext: noop,
  clearAuthenticatedUserContext: noop
};
export const initializeAppInsights = noop;
