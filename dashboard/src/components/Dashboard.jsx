import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Moon, Heart, Scale, Activity, Timer, Sun } from 'lucide-react';

// Metric card component
const MetricCard = ({ title, value, unit, trend, sparklineData, icon: Icon, trendColor = "text-blue-500" }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
      <div className="flex items-center text-gray-500 dark:text-gray-400 mb-4">
        <Icon className="w-5 h-5 mr-2" />
        <span className="text-sm">{title}</span>
      </div>
      
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="text-4xl font-semibold text-gray-900 dark:text-white">
            {value}
            <span className="text-gray-400 dark:text-gray-500 text-2xl ml-1">{unit}</span>
          </div>
          <div className={`text-sm ${trendColor}`}>
            {trend}
          </div>
        </div>
        
        {sparklineData && sparklineData.length > 0 && (
          <div className="w-32 h-16">
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
    </div>
  );
};

// Theme toggle button
const ThemeToggle = ({ isDark, onToggle }) => (
  <button
    onClick={onToggle}
    className="p-3 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
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

  // Generate some sample sparkline data
  const generateSparklineData = (baseValue, count = 10) => {
    return Array(count).fill(null).map((_, i) => ({
      value: baseValue + (Math.random() - 0.5) * 10
    }));
  };

  useEffect(() => {
    const mockOuraData = [{
      average_hrv: 62.9,
      resting_heart_rate: 60.6,
      total_sleep: 444, // 7.4 hours in minutes
      delay: 22,
      vo2_max: 52.7
    }];
    
    const mockWithingsData = [{
      weight: 159.3,
      fat_ratio: 10.8
    }];
    
    setOuraData(mockOuraData);
    setWithingsData(mockWithingsData);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Today</h1>
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="VO₂ Max"
            value={ouraData[0]?.vo2_max?.toFixed(1) ?? '--'}
            unit=""
            trend="Excellent"
            sparklineData={generateSparklineData(52.7)}
            icon={Activity}
            trendColor="text-blue-500"
          />
          
          <MetricCard
            title="HRV"
            value={ouraData[0]?.average_hrv?.toFixed(1) ?? '--'}
            unit="ms"
            trend="Stabilizing"
            sparklineData={generateSparklineData(62.9)}
            icon={Activity}
          />
          
          <MetricCard
            title="Resting Heart Rate"
            value={ouraData[0]?.resting_heart_rate?.toFixed(1) ?? '--'}
            unit="bpm"
            trend="Excellent"
            sparklineData={generateSparklineData(60.6)}
            icon={Heart}
            trendColor="text-blue-500"
          />
          
          <MetricCard
            title="Weight"
            value={withingsData[0]?.weight?.toFixed(1) ?? '--'}
            unit="lbs"
            trend="Decreasing"
            sparklineData={generateSparklineData(159.3)}
            icon={Scale}
          />
          
          <MetricCard
            title="Total Sleep"
            value={ouraData[0]?.total_sleep ? (ouraData[0].total_sleep / 60).toFixed(1) : '--'}
            unit="h"
            trend="Normal"
            sparklineData={generateSparklineData(7.4)}
            icon={Moon}
          />
          
          <MetricCard
            title="Body Fat"
            value={withingsData[0]?.fat_ratio?.toFixed(1) ?? '--'}
            unit="%"
            trend="Athletic"
            sparklineData={generateSparklineData(10.8)}
            icon={Activity}
            trendColor="text-purple-500"
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;