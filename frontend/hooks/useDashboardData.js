import { useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';

export function useDashboardData() {
  const { appState, userKey, profileType, refreshData } = useContext(AppContext);

  useEffect(() => {
    if (appState === 'dashboard' && userKey) {
      refreshData();

      const interval = setInterval(refreshData, 15000);
      return () => clearInterval(interval);
    }
  }, [appState, userKey, profileType]);
}
