// dashboard/src/App.jsx
import React, { useState, useEffect } from 'react';
import { HealthDataProvider } from './store/HealthDataContext';
import Dashboard from './components/Dashboard';
import Supplements from './components/Supplements';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

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

  return (
    <HealthDataProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {currentPath === '/' && <Dashboard navigateTo={navigate} />}
        {currentPath === '/supplements' && <Supplements navigateTo={navigate} />}
        {/* Fallback if path doesn't match any known route */}
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
    </HealthDataProvider>
  );
}

export default App;