// dashboard/src/App.jsx
import React, { useState } from 'react';
import { HealthDataProvider } from './store/HealthDataContext';
import Dashboard from './components/Dashboard';
import Supplements from './components/Supplements';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <HealthDataProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {currentPage === 'dashboard' && <Dashboard navigateTo={setCurrentPage} />}
        {currentPage === 'supplements' && <Supplements navigateTo={setCurrentPage} />}
      </div>
    </HealthDataProvider>
  );
}

export default App;