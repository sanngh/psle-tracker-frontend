import React, { createContext, useCallback, useRef, useState } from 'react';
import { API_BASE_URL } from '../appConfig';
import { setSessionToken as setGlobalSessionToken } from '../utils/apiClient';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [appState, setAppState] = useState('login');
  const [profileType, setProfileType] = useState('student');
  const [userKey, setUserKey] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const activeSessionIdRef = useRef(null);
  const sessionStartPromiseRef = useRef(null);

  const API_URL = API_BASE_URL;

  // Auth session token (separate from the app-session heartbeat above), minted by
  // onboard/pin-setup/pin-verify and required as a bearer token on all other API calls.
  const setAuthToken = useCallback((token) => {
    setGlobalSessionToken(token);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUserKey('');
    setAppState('login');
  }, [setAuthToken]);

  const startUserSession = useCallback(async (sessionUserKey = userKey, sessionRole = profileType) => {
    const cleanUserKey = String(sessionUserKey || '').trim();
    if (!cleanUserKey || activeSessionIdRef.current) return activeSessionIdRef.current;
    if (sessionStartPromiseRef.current) return sessionStartPromiseRef.current;

    sessionStartPromiseRef.current = fetch(`${API_URL}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userKey: cleanUserKey, role: sessionRole })
    })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to start user session.');
        activeSessionIdRef.current = result.sessionId;
        return result.sessionId;
      })
      .finally(() => {
        sessionStartPromiseRef.current = null;
      });

    return sessionStartPromiseRef.current;
  }, [API_URL, profileType, userKey]);

  const heartbeatUserSession = useCallback(async () => {
    const sessionId = activeSessionIdRef.current;
    const cleanUserKey = String(userKey || '').trim();
    if (!sessionId || !cleanUserKey) return;
    await fetch(`${API_URL}/sessions/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userKey: cleanUserKey })
    });
  }, [API_URL, userKey]);

  const endUserSession = useCallback(async (reason = 'app_background') => {
    const sessionId = activeSessionIdRef.current;
    const cleanUserKey = String(userKey || '').trim();
    if (!sessionId || !cleanUserKey) return;
    activeSessionIdRef.current = null;
    await fetch(`${API_URL}/sessions/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userKey: cleanUserKey, reason })
    });
  }, [API_URL, userKey]);

  const refreshData = async () => {
    if (!userKey) return;

    try {
      const response = await fetch(`${API_URL}/dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKey, profileType })
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Data sync failed:', error);
    }
  };

  return (
    <AppContext.Provider value={{
      appState,
      setAppState,
      profileType,
      setProfileType,
      userKey,
      setUserKey,
      phone: userKey,
      setPhone: setUserKey,
      avatar,
      setAvatar,
      dashboardData,
      setDashboardData,
      API_URL,
      refreshData,
      startUserSession,
      heartbeatUserSession,
      endUserSession,
      setAuthToken,
      logout
    }}>
      {children}
    </AppContext.Provider>
  );
};
