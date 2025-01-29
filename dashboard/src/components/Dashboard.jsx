import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Moon, Heart, Scale, Activity, Timer, Sun } from 'lucide-react';

// Metric card component
const MetricCard = ({ title, value, unit, trend, sparklineData, icon: Icon }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-slate-500" />
        <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      
      <div className="space-y-1">
        <div className="text-3xl font-bold text-slate-900 dark:text-white">
          {value}{unit}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {trend}
        </div>
      </div>

      {sparklineData && sparklineData.length > 0 && (
        <div className="h-16 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#94a3b8"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// Theme toggle button
const ThemeToggle = ({ isDark, onToggle }) => (
  <button
    onClick={onToggle}
    className="fixed top-4 right-4 p-3 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
  >
    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
  </button>
);

// Main dashboard component
const Dashboard = () => {
  const [ouraData, setOuraData] = useState([]);
  const [withingsData, setWithingsData] = useState([]);
  const [isDark, setIsDark] = useState(false);

  // Handle theme toggle
  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  // Initialize theme
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Mock data for testing
  useEffect(() => {
    const mockOuraData = [{
      average_hrv: 65.6,
      resting_heart_rate: 63.0,
      total_sleep: 444, // 7.4 hours in minutes
      delay: 22
    }];
    
    const mockWithingsData = [{
      weight: 160.8,
      fat_ratio: 11.0
    }];
    
    setOuraData(mockOuraData);
    setWithingsData(mockWithingsData);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">Today</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="HRV"
            value={ouraData[0]?.average_hrv?.toFixed(1) ?? '--'}
            unit=" ms"
            trend="Stabilizing"
            sparklineData={[]}
            icon={Activity}
          />
          
          <MetricCard
            title="Resting Heart Rate"
            value={ouraData[0]?.resting_heart_rate?.toFixed(1) ?? '--'}
            unit=" bpm"
            trend="Excellent"
            sparklineData={[]}
            icon={Heart}
          />
          
          <MetricCard
            title="Weight"
            value={withingsData[0]?.weight?.toFixed(1) ?? '--'}
            unit=" lbs"
            trend="Decreasing"
            sparklineData={[]}
            icon={Scale}
          />
          
          <MetricCard
            title="Body Fat"
            value={withingsData[0]?.fat_ratio?.toFixed(1) ?? '--'}
            unit="%"
            trend="Athletic"
            sparklineData={[]}
            icon={Activity}
          />
          
          <MetricCard
            title="Total Sleep"
            value={ouraData[0]?.total_sleep ? (ouraData[0].total_sleep / 60).toFixed(1) : '--'}
            unit="h"
            trend="Normal"
            sparklineData={[]}
            icon={Moon}
          />
          
          <MetricCard
            title="Sleep Delay"
            value={ouraData[0]?.delay ?? '--'}
            unit="min"
            trend="Improving"
            sparklineData={[]}
            icon={Timer}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;