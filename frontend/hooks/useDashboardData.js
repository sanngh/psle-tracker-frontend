import { useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { APP_REFRESH_INTERVAL_MS } from '../appConfig';

export function useDashboardData() {
  const { appState, userKey, profileType, refreshData } = useContext(AppContext);

  useEffect(() => {
    if (appState !== 'dashboard' || !userKey) return undefined;

    if (profileType === 'parent') return undefined;

    refreshData();

    const interval = setInterval(() => refreshData(), APP_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
    // dashboardData intentionally excluded: refreshData() sets it, including it here
    // would re-run this effect on every refresh and re-fetch immediately in a tight loop.
  }, [appState, userKey, profileType]);
}
