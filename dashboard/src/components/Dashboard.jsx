import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Moon, Heart, Scale, Activity, Timer, Sun } from 'lucide-react';

// Metric card component remains the same
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

// Theme toggle component remains the same
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

  // Fetch data from APIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ouraResponse, withingsResponse] = await Promise.all([
          fetch('/api/oura'),
          fetch('/api/withings')
        ]);

        const ouraData = await ouraResponse.json();
        const withingsData = await withingsResponse.json();

        // Reverse arrays so oldest data comes first in sparklines
        setOuraData(ouraData.reverse());
        setWithingsData(withingsData.reverse());
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Helper function to create sparkline data from historical values
  const createSparklineData = (data, key) => {
    return data.map(entry => ({
      value: key === 'total_sleep' ? entry[key] / 60 : entry[key]
    }));
  };

  // Calculate trend based on latest values
  const calculateTrend = (data, key) => {
    if (data.length < 2) return 'No trend';
    const latest = key === 'total_sleep' ? data[data.length - 1][key] / 60 : data[data.length - 1][key];
    const previous = key === 'total_sleep' ? data[data.length - 2][key] / 60 : data[data.length - 2][key];
    const diff = latest - previous;
    return diff > 0 ? 'Increasing' : diff < 0 ? 'Decreasing' : 'Stable';
  };

  const latestOura = ouraData[ouraData.length - 1] || {};
  const latestWithings = withingsData[withingsData.length - 1] || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Today</h1>
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="HRV"
            value={latestOura?.average_hrv?.toFixed(1) ?? '--'}
            unit="ms"
            trend={calculateTrend(ouraData, 'average_hrv')}
            sparklineData={createSparklineData(ouraData, 'average_hrv')}
            icon={Activity}
          />
          
          <MetricCard
            title="Resting Heart Rate"
            value={latestOura?.resting_heart_rate?.toFixed(1) ?? '--'}
            unit="bpm"
            trend={calculateTrend(ouraData, 'resting_heart_rate')}
            sparklineData={createSparklineData(ouraData, 'resting_heart_rate')}
            icon={Heart}
          />
          
          <MetricCard
            title="Weight"
            value={latestWithings?.weight?.toFixed(1) ?? '--'}
            unit="lbs"
            trend={calculateTrend(withingsData, 'weight')}
            sparklineData={createSparklineData(withingsData, 'weight')}
            icon={Scale}
          />
          
          <MetricCard
            title="Body Fat"
            value={latestWithings?.fat_ratio?.toFixed(1) ?? '--'}
            unit="%"
            trend={calculateTrend(withingsData, 'fat_ratio')}
            sparklineData={createSparklineData(withingsData, 'fat_ratio')}
            icon={Activity}
            trendColor="text-purple-500"
          />
          
          <MetricCard
            title="Total Sleep"
            value={latestOura?.total_sleep ? (latestOura.total_sleep / 60).toFixed(1) : '--'}
            unit="h"
            trend={calculateTrend(ouraData, 'total_sleep')}
            sparklineData={createSparklineData(ouraData, 'total_sleep')}
            icon={Moon}
          />
          
          <MetricCard
            title="Sleep Delay"
            value={latestOura?.delay ?? '--'}
            unit="min"
            trend={calculateTrend(ouraData, 'delay')}
            sparklineData={createSparklineData(ouraData, 'delay')}
            icon={Timer}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;