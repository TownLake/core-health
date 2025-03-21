// dashboard/src/App.jsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HealthDataProvider } from './store/HealthDataContext';
import LoadingView from './components/LoadingView';

// Lazy load components for code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const Settings = lazy(() => import('./components/Settings'));
const NotFound = lazy(() => import('./components/NotFound'));

function App() {
  return (
    <HealthDataProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Suspense fallback={<LoadingView />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </div>
    </HealthDataProvider>
  );
}

export default App;