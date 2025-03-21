// dashboard/src/store/HealthDataContext.jsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Initial state
const initialState = {
  ouraData: [],
  withingsData: [],
  runningData: [],
  aiResponse: null,
  isLoading: true,
  isAnalyzing: false,
  error: null,
  theme: 'light',
};

// Action types
const ActionTypes = {
  SET_OURA_DATA: 'SET_OURA_DATA',
  SET_WITHINGS_DATA: 'SET_WITHINGS_DATA',
  SET_RUNNING_DATA: 'SET_RUNNING_DATA',
  SET_AI_RESPONSE: 'SET_AI_RESPONSE',
  SET_LOADING: 'SET_LOADING',
  SET_ANALYZING: 'SET_ANALYZING',
  SET_ERROR: 'SET_ERROR',
  TOGGLE_THEME: 'TOGGLE_THEME',
  SET_THEME: 'SET_THEME',
};

// Reducer function
function healthDataReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_OURA_DATA:
      return { ...state, ouraData: action.payload };
    case ActionTypes.SET_WITHINGS_DATA:
      return { ...state, withingsData: action.payload };
    case ActionTypes.SET_RUNNING_DATA:
      return { ...state, runningData: action.payload };
    case ActionTypes.SET_AI_RESPONSE:
      return { ...state, aiResponse: action.payload };
    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ActionTypes.SET_ANALYZING:
      return { ...state, isAnalyzing: action.payload };
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    case ActionTypes.TOGGLE_THEME:
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      // Update document class
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { ...state, theme: newTheme };
    case ActionTypes.SET_THEME:
      // Update document class
      if (action.payload === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { ...state, theme: action.payload };
    default:
      return state;
  }
}

// Create context
const HealthDataContext = createContext();

// Create a provider component
export function HealthDataProvider({ children }) {
  const [state, dispatch] = useReducer(healthDataReducer, initialState);

  // API service functions
  const fetchOuraData = async () => {
    try {
      const response = await fetch('/api/oura');
      if (!response.ok) throw new Error('Failed to fetch Oura data');
      const data = await response.json();
      dispatch({ type: ActionTypes.SET_OURA_DATA, payload: data });
      return data;
    } catch (error) {
      console.error('Error fetching Oura data:', error);
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      return [];
    }
  };

  const fetchWithingsData = async () => {
    try {
      const response = await fetch('/api/withings');
      if (!response.ok) throw new Error('Failed to fetch Withings data');
      const data = await response.json();
      dispatch({ type: ActionTypes.SET_WITHINGS_DATA, payload: data });
      return data;
    } catch (error) {
      console.error('Error fetching Withings data:', error);
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      return [];
    }
  };

  const fetchRunningData = async () => {
    try {
      const response = await fetch('/api/running');
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: ActionTypes.SET_RUNNING_DATA, payload: data });
        return data;
      }
      return [];
    } catch (error) {
      console.log('Running data not available yet:', error);
      // Initialize with default data
      const mockData = [
        { date: new Date().toISOString(), vo2_max: 42.5, five_k_minutes: 25.3 },
        { date: new Date(Date.now() - 86400000).toISOString(), vo2_max: 42.1, five_k_minutes: 25.6 },
        { date: new Date(Date.now() - 86400000 * 2).toISOString(), vo2_max: 41.8, five_k_minutes: 25.9 },
        { date: new Date(Date.now() - 86400000 * 3).toISOString(), vo2_max: 41.5, five_k_minutes: 26.2 },
        { date: new Date(Date.now() - 86400000 * 4).toISOString(), vo2_max: 41.2, five_k_minutes: 26.5 },
      ];
      dispatch({ type: ActionTypes.SET_RUNNING_DATA, payload: mockData });
      return mockData;
    }
  };

  const fetchAllData = async () => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    await Promise.all([fetchOuraData(), fetchWithingsData(), fetchRunningData()]);
    dispatch({ type: ActionTypes.SET_LOADING, payload: false });
  };

  const getAIInsights = async () => {
    dispatch({ type: ActionTypes.SET_ANALYZING, payload: true });
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ouraData: state.ouraData,
          withingsData: state.withingsData,
          runningData: state.runningData
        })
      });

      if (!response.ok) {
        throw new Error('AI analysis failed');
      }
      
      const data = await response.json();
      if (!data.response) {
        throw new Error('Invalid response format');
      }
      
      dispatch({ type: ActionTypes.SET_AI_RESPONSE, payload: data.response });
    } catch (error) {
      console.error('AI analysis error:', error);
      dispatch({ type: ActionTypes.SET_ERROR, payload: 'Failed to get AI insights' });
    } finally {
      dispatch({ type: ActionTypes.SET_ANALYZING, payload: false });
    }
  };

  const toggleTheme = () => {
    dispatch({ type: ActionTypes.TOGGLE_THEME });
  };

  // Initialize theme based on system preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    const setThemeFromSystem = (e) => {
      const isDarkMode = e.matches;
      dispatch({ 
        type: ActionTypes.SET_THEME, 
        payload: isDarkMode ? 'dark' : 'light' 
      });
    };

    setThemeFromSystem(prefersDark);
    prefersDark.addEventListener('change', setThemeFromSystem);

    return () => {
      prefersDark.removeEventListener('change', setThemeFromSystem);
    };
  }, []);

  // Fetch data on initial load
  useEffect(() => {
    fetchAllData();
  }, []);

  // Exposed context value
  const contextValue = {
    ...state,
    fetchAllData,
    fetchOuraData,
    fetchWithingsData,
    fetchRunningData,
    getAIInsights,
    toggleTheme,
    ActionTypes,
    dispatch,
  };

  return (
    <HealthDataContext.Provider value={contextValue}>
      {children}
    </HealthDataContext.Provider>
  );
}

// Custom hook for using the context
export function useHealthData() {
  const context = useContext(HealthDataContext);
  if (!context) {
    throw new Error('useHealthData must be used within a HealthDataProvider');
  }
  return context;
}