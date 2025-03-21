// dashboard/src/components/MetricCard.jsx
import React, { useState, memo, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { X } from 'lucide-react';

// Memoized tooltip components to prevent unnecessary re-renders
const CustomTooltip = memo(({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
          {new Date(label).toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
        <p className="text-gray-900 dark:text-white font-semibold">
          {payload[0].value.toFixed(1)}{unit}
        </p>
      </div>
    );
  }
  return null;
});

const SparklineTooltip = memo(({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 px-2 py-1 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
        <p className="text-gray-900 dark:text-white text-sm font-medium">
          {payload[0].value.toFixed(1)}
        </p>
      </div>
    );
  }
  return null;
});

// Modal component for detailed chart view
const DetailedChartModal = memo(({ isOpen, onClose, title, data, dataKey, unit, icon: Icon }) => {
  if (!isOpen) return null;

  // Memoized chart data preparation
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return [...data].reverse();
  }, [data]);

  // Memoized min/max calculations
  const { minValue, maxValue, padding } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { minValue: 0, maxValue: 100, padding: 10 };
    }
    const min = Math.min(...chartData.map(d => d[dataKey] || 0));
    const max = Math.max(...chartData.map(d => d[dataKey] || 0));
    const pad = (max - min) * 0.1;
    return { minValue: min, maxValue: max, padding: pad };
  }, [chartData, dataKey]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-4xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            aria-label="Close detail view"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id={`detailGradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false}
                stroke="#E5E7EB"
                className="dark:opacity-20"
              />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { 
                  month: 'short', 
                  day: 'numeric' 
                })}
                tick={{ fill: '#6B7280' }}
                tickLine={{ stroke: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
                className="dark:opacity-50"
              />
              <YAxis 
                stroke="#6B7280"
                domain={[minValue - padding, maxValue + padding]}
                tickFormatter={(value) => `${value.toFixed(1)}${unit}`}
                tick={{ fill: '#6B7280' }}
                tickLine={{ stroke: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
                className="dark:opacity-50"
              />
              <Tooltip content={<CustomTooltip unit={unit} />} />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#detailGradient-${dataKey})`}
                dot={false}
                activeDot={{ 
                  r: 6, 
                  stroke: '#3B82F6',
                  strokeWidth: 2,
                  fill: '#FFFFFF'
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});

// Memoized MetricCard component to prevent unnecessary re-renders
const MetricCard = memo(({ 
  title, 
  value, 
  unit, 
  trend, 
  sparklineData, 
  icon: Icon, 
  trendColor = "text-blue-500", 
  lineColor = "#94a3b8",
  fullData,
  dataKey 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Generate unique gradientId for each metric
  const gradientId = useMemo(() => `sparkline-${dataKey}-gradient`, [dataKey]);

  return (
    <>
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
        onClick={() => setIsModalOpen(true)}
      >
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
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={lineColor} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={lineColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    content={<SparklineTooltip />}
                    cursor={{ stroke: lineColor, strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={lineColor}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#${gradientId})`}
                    dot={false}
                    isAnimationActive={false} // Disable animation for better performance
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <DetailedChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={title}
        data={fullData}
        dataKey={dataKey}
        unit={unit}
        icon={Icon}
      />
    </>
  );
});

// Add display names for better debugging
MetricCard.displayName = 'MetricCard';
DetailedChartModal.displayName = 'DetailedChartModal';
CustomTooltip.displayName = 'CustomTooltip';
SparklineTooltip.displayName = 'SparklineTooltip';

export default MetricCard;