// dashboard/src/App.jsx
import React, { useState, useEffect } from 'react';
import { HealthDataProvider } from './store/HealthDataContext';
import Dashboard from './components/Dashboard';
import Supplements from './components/Supplements';
import { Home, Pill, Sparkles, Moon, Sun } from 'lucide-react';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [theme, setTheme] = useState(() => {
    // Initialize theme from localStorage or system preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

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

  // Function to toggle theme
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  // Function to trigger AI insights
  const getAIInsights = () => {
    // Navigate to home first if on a different page
    if (currentPath !== '/') {
      navigate('/');
    }
    // We'll need to pass this down to the Dashboard component
  };

  return (
    <HealthDataProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Persistent Header with Navigation */}
        <header className="sticky top-0 z-10 bg-white dark:bg-slate-800 shadow-md">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Core Health</h1>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/')}
                  aria-label="Home Dashboard"
                  className={`p-3 rounded-full transition-colors ${
                    currentPath === '/' 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' 
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <Home className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => navigate('/supplements')}
                  aria-label="View Supplements"
                  className={`p-3 rounded-full transition-colors ${
                    currentPath === '/supplements' 
                      ? 'bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300' 
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <Pill className="w-5 h-5" />
                </button>
                
                <button
                  onClick={getAIInsights}
                  aria-label="Get AI Health Insights"
                  className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                </button>
                
                <button
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="p-3 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-4">
          {currentPath === '/' && <Dashboard aiButtonInHeader={true} />}
          {currentPath === '/supplements' && <Supplements />}
          
          {/* Fallback for unknown routes */}
          {currentPath !== '/' && currentPath !== '/supplements' && (
            <div className="flex flex-col items-center justify-center h-[80vh] p-4 text-center">
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
        </main>
      </div>
    </HealthDataProvider>
  );
}

export default App;