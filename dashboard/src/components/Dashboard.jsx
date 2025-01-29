import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Moon, Heart, Scale, Activity, Timer, Sun } from 'lucide-react';

// Metric card component
const MetricCard = ({ title, value, unit, trend, sparklineData, icon: Icon }) => {
  return (
    <Card className="w-full bg-white dark:bg-slate-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {title}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}{unit}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{trend}</div>
        <div className="h-16 mt-4">
          {sparklineData && sparklineData.length > 0 && (
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
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Theme toggle button
const ThemeToggle = ({ isDark, onToggle }) => (
  <button
    onClick={onToggle}
    className="fixed top-4 right-4 p-2 rounded-full bg-slate-200 dark:bg-slate-700"
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

  // Fetch data
  useEffect(() => {
    console.log('Dashboard mounted');
    const fetchData = async () => {
      try {
        console.log('Setting mock data...');
        // Mock data for initial testing
        const mockOuraData = Array(30).fill(null).map((_, i) => ({
          average_hrv: 62.9 + Math.random() * 5,
          resting_heart_rate: 60.6 + Math.random() * 3,
          total_sleep: 420 + Math.random() * 60,
          delay: 15 + Math.random() * 10,
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }));
        
        const mockWithingsData = Array(30).fill(null).map((_, i) => ({
          weight: 159.3 + Math.random() * 2,
          fat_ratio: 10.8 + Math.random() * 1,
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }));
        
        setOuraData(mockOuraData.reverse());
        setWithingsData(mockWithingsData.reverse());
        console.log('Mock data set');
      } catch (error) {
        console.error('Error setting mock data:', error);
      }
    };

    fetchData();
  }, []);

  const createSparklineData = (data, key) => {
    return data.map(d => ({ value: d[key] }));
  };

  console.log('Rendering dashboard with data length:', { 
    oura: ouraData.length, 
    withings: withingsData.length 
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
      <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      
      <div className="container mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold mb-6">Today</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="HRV"
            value={ouraData[0]?.average_hrv?.toFixed(1) ?? '--'}
            unit=" ms"
            trend="Stabilizing"
            sparklineData={createSparklineData(ouraData, 'average_hrv')}
            icon={Activity}
          />
          
          <MetricCard
            title="Resting Heart Rate"
            value={ouraData[0]?.resting_heart_rate?.toFixed(1) ?? '--'}
            unit=" bpm"
            trend="Excellent"
            sparklineData={createSparklineData(ouraData, 'resting_heart_rate')}
            icon={Heart}
          />
          
          <MetricCard
            title="Weight"
            value={withingsData[0]?.weight?.toFixed(1) ?? '--'}
            unit=" lbs"
            trend="Decreasing"
            sparklineData={createSparklineData(withingsData, 'weight')}
            icon={Scale}
          />
          
          <MetricCard
            title="Body Fat"
            value={withingsData[0]?.fat_ratio?.toFixed(1) ?? '--'}
            unit="%"
            trend="Athletic"
            sparklineData={createSparklineData(withingsData, 'fat_ratio')}
            icon={Activity}
          />
          
          <MetricCard
            title="Total Sleep"
            value={ouraData[0]?.total_sleep ? (ouraData[0].total_sleep / 60).toFixed(1) : '--'}
            unit="h"
            trend="Normal"
            sparklineData={ouraData.map(d => ({ value: d.total_sleep ? d.total_sleep / 60 : null }))}
            icon={Moon}
          />
          
          <MetricCard
            title="Sleep Delay"
            value={ouraData[0]?.delay?.toFixed(0) ?? '--'}
            unit="min"
            trend="Improving"
            sparklineData={createSparklineData(ouraData, 'delay')}
            icon={Timer}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;