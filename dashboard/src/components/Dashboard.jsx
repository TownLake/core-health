import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Moon, Heart, Scale, Activity, Timer, Home, ClipboardList, Running } from 'lucide-react';

// Metric card component
const MetricCard = ({ title, value, unit, trend, sparklineData, icon: Icon, trendColor = "text-blue-500" }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center text-gray-500 mb-4">
        <Icon className="w-5 h-5 mr-2" />
        <span className="text-sm">{title}</span>
      </div>
      
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="text-4xl font-semibold">
            {value}
            <span className="text-gray-400 text-2xl ml-1">{unit}</span>
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

// Navigation bar component
const NavBar = () => (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-4">
    <div className="flex flex-col items-center text-gray-400">
      <Home className="w-6 h-6" />
      <span className="text-xs mt-1">Home</span>
    </div>
    <div className="flex flex-col items-center text-gray-400">
      <ClipboardList className="w-6 h-6" />
      <span className="text-xs mt-1">Journal</span>
    </div>
    <div className="flex flex-col items-center text-gray-400">
      <Running className="w-6 h-6" />
      <span className="text-xs mt-1">Fitness</span>
    </div>
    <div className="flex flex-col items-center text-gray-900">
      <Heart className="w-6 h-6" />
      <span className="text-xs mt-1">Biology</span>
    </div>
  </div>
);

// Main dashboard component
const Dashboard = () => {
  const [ouraData, setOuraData] = useState([]);
  const [withingsData, setWithingsData] = useState([]);

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
      fat_ratio: 10.8,
      lean_mass: 142.2
    }];
    
    setOuraData(mockOuraData);
    setWithingsData(mockWithingsData);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Biology</h1>
        
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
            title="Lean Body Mass"
            value={withingsData[0]?.lean_mass?.toFixed(1) ?? '--'}
            unit="lbs"
            trend="Decreasing"
            sparklineData={generateSparklineData(142.2)}
            icon={Activity}
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
      
      <NavBar />
    </div>
  );
};

export default Dashboard;