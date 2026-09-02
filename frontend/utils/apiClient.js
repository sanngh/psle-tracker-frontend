import { API_BASE_URL } from '../appConfig';

// Module-level session token store. Set once a session is minted by onboard/pin-setup/pin-verify,
// and attached automatically to every subsequent request this app makes to our own backend.
let currentSessionToken = null;

export function setSessionToken(token) {
  currentSessionToken = token || null;
}

export function getSessionToken() {
  return currentSessionToken;
}

// Patches the global fetch exactly once so every call site (screens, hooks, utils) automatically
// sends "Authorization: Bearer <token>" to our API without each call site managing it manually.
if (!global.__psleFetchPatched) {
  global.__psleFetchPatched = true;
  const originalFetch = global.fetch.bind(global);
  global.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (currentSessionToken && url && API_BASE_URL && url.startsWith(API_BASE_URL)) {
      const headers = { ...(init.headers || {}) };
      if (!headers.Authorization && !headers.authorization) {
        headers.Authorization = `Bearer ${currentSessionToken}`;
      }
      init = { ...init, headers };
    }
    return originalFetch(input, init);
  };
}
