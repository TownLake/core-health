// dashboard/src/components/NotFound.jsx
import React from 'react';

const NotFound = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Page Not Found</h1>
      <p className="text-gray-700 dark:text-gray-300 mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
    </div>
  </div>
);

export default NotFound;