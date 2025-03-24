// dashboard/src/App.jsx
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HealthDataProvider } from './store/HealthDataContext';
import { Home, Pill, Sparkles, Moon, Sun } from 'lucide-react';
import { useHealthData } from './store/HealthDataContext';

// Lazy load components to prevent flash
const Dashboard = lazy(() => import('./components/Dashboard'));
const Supplements = lazy(() => import('./components/Supplements'));

// Loading fallback
const PageLoading = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
  </div>
);

function AppContent() {
  // Initialize path from window.location before component mounts
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname === '/supplements' ? '/supplements' : '/';
  });
  
  const { 
    theme, 
    toggleTheme, 
    getAIInsights, 
    isAnalyzing 
  } = useHealthData();

  useEffect(() => {
    // Update path when browser history changes (back/forward buttons)
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname === '/supplements' ? '/supplements' : '/');
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Function to navigate programmatically
  const navigate = (path) => {
    if (currentPath === path) return; // Prevent unnecessary renders
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Function to trigger AI insights and navigate home if needed
  const handleAIInsights = () => {
    if (currentPath !== '/') {
      navigate('/');
      // Small timeout to ensure navigation completes first
      setTimeout(() => getAIInsights(), 50);
    } else {
      getAIInsights();
    }
  };

  // Determine which component to render
  const renderComponent = () => {
    if (currentPath === '/supplements') {
      return <Supplements />;
    }
    return <Dashboard />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Main Content */}
      <div className="max-w-6xl mx-auto relative">
        {/* Page Content with Suspense for loading state */}
        <div className="pt-16 sm:pt-6 px-4">
          {/* Page Title - Now moved above the navigation on small screens */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-0 mt-2">
              {currentPath === '/supplements' ? 'My Supplement Routine' : 'Today'}
            </h1>
            
            {/* Navigation - Now rendered as part of the header on small screens */}
            <div className="fixed sm:static top-6 right-6 z-10 flex gap-2">
              <button
                onClick={() => navigate('/')}
                aria-label="Home Dashboard"
                className={`p-3 rounded-full shadow-lg transition-colors ${
                  currentPath === '/' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <Home className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => navigate('/supplements')}
                aria-label="View Supplements"
                className={`p-3 rounded-full shadow-lg transition-colors ${
                  currentPath === '/supplements' 
                    ? 'bg-pink-400 text-white' 
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <Pill className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleAIInsights}
                disabled={isAnalyzing}
                aria-label="Get AI Health Insights"
                className="p-3 rounded-full bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-lg disabled:opacity-50"
              >
                <Sparkles className="w-5 h-5" />
              </button>
              
              <button
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="p-3 rounded-full bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-lg"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Suspense fallback={<PageLoading />}>
            {renderComponent()}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <HealthDataProvider>
      <AppContent />
    </HealthDataProvider>
  );
}

export default App;