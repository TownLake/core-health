// dashboard/src/components/Settings.jsx
import React from 'react';
import { useHealthData } from '../store/HealthDataContext';
import { ArrowLeft, Moon, Sun, RefreshCw } from 'lucide-react';

const Settings = () => {
  const { theme, toggleTheme, fetchAllData } = useHealthData();
  
  const handleRefreshData = async () => {
    await fetchAllData();
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg divide-y divide-gray-200 dark:divide-gray-700">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 dark:text-gray-300">Theme</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {theme === 'dark' ? 'Using dark theme' : 'Using light theme'}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="p-3 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 dark:text-gray-300">Refresh Data</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Fetch the latest data from all sources
                </p>
              </div>
              <button
                onClick={handleRefreshData}
                className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                aria-label="Refresh all data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">About</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Core Health Dashboard v1.2.0
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              A personal health metrics visualization platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;