// dashboard/src/components/AIInsightsCard.jsx
import React from 'react';

const AIInsightsCard = ({ response, isLoading }) => (
  <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
    {isLoading ? (
      <div className="flex items-center justify-center text-gray-700 dark:text-gray-300">
        Analyzing your health data...
      </div>
    ) : (
      <>
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Health Insights</h2>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{response}</p>
      </>
    )}
  </div>
);

export default AIInsightsCard;