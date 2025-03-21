// dashboard/src/components/ErrorView.jsx
import React from 'react';

const ErrorView = ({ message }) => (
  <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
    {message}
  </div>
);

export default ErrorView;