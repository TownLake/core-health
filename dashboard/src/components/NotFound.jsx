// dashboard/src/components/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Page Not Found</h1>
      <p className="text-gray-700 dark:text-gray-300 mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link 
        to="/"
        className="inline-block px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  </div>
);

export default NotFound;