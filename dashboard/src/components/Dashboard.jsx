import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Moon, Heart, Scale, Activity, Timer, Sun } from 'lucide-react';

// Metric card component
const MetricCard = ({ 
  title, 
  value, 
  unit, 
  trend, 
  sparklineData, 
  icon: Icon, 
  trendColor = "text-blue-500",
  lineColor = "#94a3b8" 
}) => {
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
                  stroke={lineColor}
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

// Theme toggle remains the same
const ThemeToggle = ({ isDark, onToggle }) => (
  <button
    onClick={onToggle}
    className="p-3 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
  >
    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
  </button>
);

const Dashboard = () => {
  const [ouraData, setOuraData] = useState([]);
  const [withingsData, setWithingsData] = useState([]);
  const [isDark, setIsDark] = useState(false);
  const [error, setError] = useState(null);
  const [aiResponse, setAiResponse] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getAIInsights = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ouraData,
          withingsData
        })
      });

      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      setAiResponse(data.response);
    } catch (error) {
      console.error('AI analysis error:', error);
      setError('Failed to get AI insights');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ouraResponse, withingsResponse] = await Promise.all([
          fetch('/api/oura'),
          fetch('/api/withings')
        ]);

        if (!ouraResponse.ok || !withingsResponse.ok) {
          throw new Error('One or more API calls failed');
        }

        const ouraData = await ouraResponse.json();
        const withingsData = await withingsResponse.json();

        setOuraData(ouraData);
        setWithingsData(withingsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
      }
    };

    fetchData();
  }, []);

  const createSparklineData = (data, key) => {
    if (!data || !Array.isArray(data)) return [];
    return [...data].reverse().map(d => ({ value: d[key] }));
  };

  const getAverage = (data, key, startIdx, count) => {
    const values = data.slice(startIdx, startIdx + count)
                      .map(d => d[key])
                      .filter(v => v !== null && v !== undefined);
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : null;
  };

  const getTrendInfo = (data, key, metric) => {
    if (!data || data.length < 10) return { trend: 'No data', color: 'text-gray-500', lineColor: '#94a3b8' };
    
    const recentAvg = getAverage(data, key, 0, 3);  // Last 3 days
    const previousAvg = getAverage(data, key, 3, 7); // Prior 7 days
    
    if (recentAvg === null || previousAvg === null) {
      return { trend: 'Insufficient data', color: 'text-gray-500', lineColor: '#94a3b8' };
    }

    const diff = recentAvg - previousAvg;
    const percentChange = Math.abs(diff / previousAvg);
    const stable = percentChange < 0.02; // 2% threshold
    
    // Default colors for stable trend
    const colors = {
      stable: { text: 'text-blue-500', line: '#3b82f6' },
      good: { text: 'text-green-500', line: '#22c55e' },
      bad: { text: 'text-red-500', line: '#ef4444' }
    };

    switch(metric) {
      case 'hrv':
        if (stable) return { trend: 'Stable', color: colors.stable.text, lineColor: colors.stable.line };
        if (diff > 0) {
          return { trend: 'Increasing', color: colors.good.text, lineColor: colors.good.line };
        }
        return { trend: 'Decreasing', color: colors.bad.text, lineColor: colors.bad.line };
        
      case 'rhr':
      case 'weight':
      case 'bodyFat':
        if (stable) return { trend: 'Stable', color: colors.stable.text, lineColor: colors.stable.line };
        if (diff < 0) {
          return { trend: 'Decreasing', color: colors.good.text, lineColor: colors.good.line };
        }
        return { trend: 'Increasing', color: colors.bad.text, lineColor: colors.bad.line };
        
      case 'sleep':
        const hours = latest;
        if (hours >= 7 && hours <= 8.5) {
          return { trend: 'Within target', color: colors.good.text, lineColor: colors.good.line };
        }
        return { 
          trend: hours < 7 ? 'Below target' : 'Above target', 
          color: colors.bad.text, 
          lineColor: colors.bad.line 
        };
        
      case 'delay':
        if (latest >= 20) {
          return { trend: 'Above target', color: colors.bad.text, lineColor: colors.bad.line };
        }
        return { trend: 'Within target', color: colors.good.text, lineColor: colors.good.line };
        
      default:
        return { trend: 'No data', color: 'text-gray-500', lineColor: '#94a3b8' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Today</h1>
          <div className="flex gap-2">
            <button
              onClick={getAIInsights}
              className="p-3 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              <svg 
                viewBox="0 0 24 24" 
                className="w-5 h-5"
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
              </svg>
            </button>
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </div>
        {aiResponse && (
          <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">AI Health Insights</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{aiResponse}</p>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            Error loading data: {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="HRV"
            value={ouraData[0]?.average_hrv?.toFixed(0) ?? '--'}
            unit="ms"
            {...getTrendInfo(ouraData, 'average_hrv', 'hrv')}
            sparklineData={createSparklineData(ouraData, 'average_hrv')}
            icon={Activity}
          />
          
          <MetricCard
            title="Resting Heart Rate"
            value={ouraData[0]?.resting_heart_rate?.toFixed(0) ?? '--'}
            unit="bpm"
            {...getTrendInfo(ouraData, 'resting_heart_rate', 'rhr')}
            sparklineData={createSparklineData(ouraData, 'resting_heart_rate')}
            icon={Heart}
          />
          
          <MetricCard
            title="Weight"
            value={withingsData[0]?.weight?.toFixed(1) ?? '--'}
            unit="lbs"
            {...getTrendInfo(withingsData, 'weight', 'weight')}
            sparklineData={createSparklineData(withingsData, 'weight')}
            icon={Scale}
          />
          
          <MetricCard
            title="Body Fat"
            value={withingsData[0]?.fat_ratio?.toFixed(1) ?? '--'}
            unit="%"
            {...getTrendInfo(withingsData, 'fat_ratio', 'bodyFat')}
            sparklineData={createSparklineData(withingsData, 'fat_ratio')}
            icon={Activity}
          />
          
          <MetricCard
            title="Total Sleep"
            value={ouraData[0]?.total_sleep?.toFixed(1) ?? '--'}
            unit="h"
            {...getTrendInfo(ouraData, 'total_sleep', 'sleep')}
            sparklineData={createSparklineData(ouraData, 'total_sleep')}
            icon={Moon}
          />
          
          <MetricCard
            title="Sleep Delay"
            value={ouraData[0]?.delay?.toFixed(0) ?? '--'}
            unit="min"
            {...getTrendInfo(ouraData, 'delay', 'delay')}
            sparklineData={createSparklineData(ouraData, 'delay')}
            icon={Timer}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;