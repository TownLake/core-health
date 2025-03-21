// dashboard/src/App.jsx
import React from 'react';
import { HealthDataProvider } from './store/HealthDataContext';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <HealthDataProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Dashboard />
      </div>
    </HealthDataProvider>
  );
}

export default App;