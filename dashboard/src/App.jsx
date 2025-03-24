// dashboard/src/App.jsx
import React, { useState, useEffect } from 'react';
import { HealthDataProvider } from './store/HealthDataContext';
import Dashboard from './components/Dashboard';
import Supplements from './components/Supplements';
import { Home, Pill, Sparkles, Moon, Sun } from 'lucide-react';
import { useHealthData } from './store/HealthDataContext';

function AppContent() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const { 
    theme, 
    toggleTheme, 
    getAIInsights, 
    isAnalyzing 
  } = useHealthData();

  useEffect(() => {
    // Update path when browser history changes (back/forward buttons)
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Function to navigate programmatically
  const navigate = (path) => {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Main Content */}
      <div className="max-w-6xl mx-auto relative">
        {/* Floating Navigation */}
        <div className="fixed top-6 right-6 z-10 flex gap-2">
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

        {/* Page Content */}
        {currentPath === '/' && <Dashboard />}
        {currentPath === '/supplements' && <Supplements />}
        
        {/* Fallback for unknown routes */}
        {currentPath !== '/' && currentPath !== '/supplements' && (
          <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Page Not Found</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-6">The page you're looking for doesn't exist.</p>
            <button 
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}
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