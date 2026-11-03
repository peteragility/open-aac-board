// Subscriptions and payments are not part of this distribution. src/reducers.js
// still mounts this slice, so it keeps an empty, inert state.
const initialState = {};

function subscriptionProviderReducer(state = initialState) {
  return state;
}

export default subscriptionProviderReducer;
