// dashboard/src/components/MetricCard.jsx
import React, { useState, memo, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar } from 'recharts';
import { X, BarChart2, LineChart as LineChartIcon } from 'lucide-react';
import { createMonthlyAverageData, formatSecondsToMMSS } from '../utils/dataUtils';

// Memoized tooltip components to prevent unnecessary re-renders
const CustomTooltip = memo(({ active, payload, label, unit, dataKey }) => {
  if (active && payload && payload.length) {
    const isFilled = payload[0].payload[`is_fill_value_${dataKey.split('_')[0]}`];
    const value = payload[0].value;
    const displayValue = dataKey === 'five_k_seconds' ? 
      formatSecondsToMMSS(value) : 
      value.toFixed(1);
    
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
          {displayValue}{unit}
          {isFilled && (
            <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">
              (carried forward)
            </span>
          )}
        </p>
      </div>
    );
  }
  return null;
});

const MonthlyTooltip = memo(({ active, payload, unit, dataKey }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const displayValue = dataKey === 'five_k_seconds' ? 
      formatSecondsToMMSS(value) : 
      value.toFixed(1);
    
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
          {payload[0].payload.monthName}
        </p>
        <p className="text-gray-900 dark:text-white font-semibold">
          {displayValue}{unit} <span className="text-sm font-normal">(avg)</span>
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
          From {payload[0].payload.count} data points
        </p>
      </div>
    );
  }
  return null;
});

const SparklineTooltip = memo(({ active, payload, dataKey }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const isFilled = payload[0].payload.isFilled;
    const displayValue = dataKey === 'five_k_seconds' ? 
      formatSecondsToMMSS(value) : 
      value.toFixed(1);
    
    return (
      <div className="bg-white dark:bg-slate-800 px-2 py-1 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
        <p className="text-gray-900 dark:text-white text-sm font-medium">
          {displayValue}
          {isFilled && (
            <span className="text-xs ml-1 text-gray-500">*</span>
          )}
        </p>
      </div>
    );
  }
  return null;
});

// Separate daily chart component
const DailyChart = memo(({ chartData, dataKey, unit, lineColor, minValue, maxValue, padding }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
      <defs>
        <linearGradient id={`detailGradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={lineColor || "#3B82F6"} stopOpacity={0.3}/>
          <stop offset="95%" stopColor={lineColor || "#3B82F6"} stopOpacity={0}/>
        </linearGradient>
        <linearGradient id={`detailGradientFilled-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={lineColor || "#3B82F6"} stopOpacity={0.15}/>
          <stop offset="95%" stopColor={lineColor || "#3B82F6"} stopOpacity={0}/>
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
        tickFormatter={(value) => {
          if (dataKey === 'five_k_seconds') {
            return formatSecondsToMMSS(value);
          }
          return `${Math.round(value)}`;
        }}
        tick={{ fill: '#6B7280' }}
        tickLine={{ stroke: '#6B7280' }}
        axisLine={{ stroke: '#E5E7EB' }}
        className="dark:opacity-50"
      />
      <Tooltip content={<CustomTooltip unit={unit} dataKey={dataKey} />} />
      {/* Create two separate areas - one for filled values and one for actual values */}
      <Area
        type="monotone"
        dataKey={dataKey}
        stroke="none"
        strokeWidth={0}
        fillOpacity={1}
        fill={`url(#detailGradientFilled-${dataKey})`}
        dot={false}
        activeDot={false}
        name="filledData"
        connectNulls={false}
        isAnimationActive={false}
        // Only show points that are filled
        data={chartData.map(point => ({
          ...point,
          [dataKey]: point[`is_fill_value_${dataKey.split('_')[0]}`] ? point[dataKey] : null
        }))}
      />
      <Area
        type="monotone"
        dataKey={dataKey}
        stroke={lineColor || "#3B82F6"}
        strokeWidth={2}
        fillOpacity={1}
        fill={`url(#detailGradient-${dataKey})`}
        dot={false}
        activeDot={{ 
          r: 6, 
          stroke: lineColor || "#3B82F6",
          strokeWidth: 2,
          fill: '#FFFFFF'
        }}
        connectNulls={false}
        // Only show points that are not filled
        data={chartData.map(point => ({
          ...point,
          [dataKey]: point[`is_fill_value_${dataKey.split('_')[0]}`] ? null : point[dataKey]
        }))}
      />
    </AreaChart>
  </ResponsiveContainer>
));

// Separate monthly chart component
const MonthlyChart = memo(({ monthlyData, unit, minValue, maxValue, padding, dataKey }) => {
  // Use a neutral color for all monthly bars regardless of trend
  const neutralBarColor = "#4B5563"; // A neutral gray that works in both light/dark mode
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid 
          strokeDasharray="3 3" 
          vertical={false}
          stroke="#E5E7EB"
          className="dark:opacity-20"
        />
        <XAxis 
          dataKey="monthName" 
          stroke="#6B7280"
          tick={{ fill: '#6B7280' }}
          tickLine={{ stroke: '#6B7280' }}
          axisLine={{ stroke: '#E5E7EB' }}
          className="dark:opacity-50"
        />
        <YAxis 
          stroke="#6B7280"
          domain={[minValue - padding, maxValue + padding]}
          tickFormatter={(value) => {
            if (dataKey === 'five_k_seconds') {
              return formatSecondsToMMSS(value);
            }
            return `${Math.round(value)}`;
          }}
          tick={{ fill: '#6B7280' }}
          tickLine={{ stroke: '#6B7280' }}
          axisLine={{ stroke: '#E5E7EB' }}
          className="dark:opacity-50"
        />
        <Tooltip content={<MonthlyTooltip unit={unit} dataKey={dataKey} />} />
        <Bar 
          dataKey="average" 
          fill={neutralBarColor} 
          radius={[4, 4, 0, 0]}
          maxBarSize={50}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});

// Modal component for detailed chart view
const DetailedChartModal = memo(({ isOpen, onClose, title, data, dataKey, unit, icon: Icon, lineColor }) => {
  const [viewMode, setViewMode] = useState('monthly'); // Default to monthly view
  
  if (!isOpen) return null;

  // Memoized chart data preparation
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return [...data].reverse();
  }, [data]);
  
  // Memoized monthly data calculation
  const monthlyData = useMemo(() => {
    // For monthly data, only use non-filled values for the averaging
    const filteredData = data.filter(item => !item[`is_fill_value_${dataKey.split('_')[0]}`]);
    return createMonthlyAverageData(filteredData, dataKey);
  }, [data, dataKey]);

  // Memoized min/max calculations for daily view
  const dailyChartValues = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { minValue: 0, maxValue: 100, padding: 10 };
    }
    const values = chartData.map(d => d[dataKey] || 0).filter(v => v !== null && v !== undefined);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.1;
    return { minValue: min, maxValue: max, padding: pad };
  }, [chartData, dataKey]);

  // Memoized min/max calculations for monthly view
  const monthlyChartValues = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) {
      return { minValue: 0, maxValue: 100, padding: 10 };
    }
    const values = monthlyData.map(d => d.average).filter(v => v !== null && v !== undefined);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.1;
    return { minValue: min, maxValue: max, padding: pad };
  }, [monthlyData]);

  // View toggle handler
  const toggleView = () => {
    setViewMode(viewMode === 'daily' ? 'monthly' : 'daily');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-4xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">({unit})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleView}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              aria-label={viewMode === 'daily' ? 'Switch to monthly view' : 'Switch to daily view'}
            >
              {viewMode === 'daily' ? 
                <BarChart2 className="w-5 h-5 text-gray-500 dark:text-gray-400" /> : 
                <LineChartIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              }
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              aria-label="Close detail view"
            >
              <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
        
        <div className="h-[400px] w-full">
          {viewMode === 'daily' ? (
            <DailyChart
              chartData={chartData}
              dataKey={dataKey}
              unit={unit}
              lineColor={lineColor}
              minValue={dailyChartValues.minValue}
              maxValue={dailyChartValues.maxValue}
              padding={dailyChartValues.padding}
            />
          ) : (
            <MonthlyChart
              monthlyData={monthlyData}
              unit={unit}
              lineColor={lineColor}
              minValue={monthlyChartValues.minValue}
              maxValue={monthlyChartValues.maxValue}
              padding={monthlyChartValues.padding}
              dataKey={dataKey}
            />
          )}
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

  // Process sparkline data to include isFilled flag
  const processedSparklineData = useMemo(() => {
    if (!sparklineData) return [];
    
    return sparklineData.map((item, index) => {
      const isFilled = fullData && 
                       fullData[fullData.length - 1 - index] && 
                       fullData[fullData.length - 1 - index][`is_fill_value_${dataKey.split('_')[0]}`];
      return {
        ...item,
        isFilled
      };
    });
  }, [sparklineData, fullData, dataKey]);

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
          
          {processedSparklineData && processedSparklineData.length > 0 && (
            <div className="w-32 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={processedSparklineData}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={lineColor} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={lineColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    content={<SparklineTooltip dataKey={dataKey} />}
                    cursor={{ stroke: lineColor, strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={lineColor}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#${gradientId})`}
                    dot={(props) => {
                      // Add a small dot just for filled values
                      if (props.payload.isFilled) {
                        return (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={2}
                            fill={lineColor}
                            fillOpacity={0.5}
                          />
                        );
                      }
                      return null; // No dots for normal values
                    }}
                    isAnimationActive={false} // Disable animation for better performance
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <DetailedChartModal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title={title}
          data={fullData}
          dataKey={dataKey}
          unit={unit}
          icon={Icon}
          lineColor={lineColor}
        />
      )}
    </>
  );
});

// Add display names for better debugging
MetricCard.displayName = 'MetricCard';
DetailedChartModal.displayName = 'DetailedChartModal';
CustomTooltip.displayName = 'CustomTooltip';
SparklineTooltip.displayName = 'SparklineTooltip';
MonthlyTooltip.displayName = 'MonthlyTooltip';
DailyChart.displayName = 'DailyChart';
MonthlyChart.displayName = 'MonthlyChart';

export default MetricCard;