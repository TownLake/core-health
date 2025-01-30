import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X } from 'lucide-react';

const DetailedChartModal = ({ isOpen, onClose, title, data, dataKey, unit, icon: Icon }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-4xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[...data].reverse()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                tickFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <YAxis 
                stroke="#6B7280"
                tickFormatter={(value) => `${value}${unit}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#F3F4F6'
                }}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                formatter={(value) => [`${value}${unit}`, title]}
              />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Click and drag to zoom, double click to reset
        </div>
      </div>
    </div>
  );
};

// Enhanced MetricCard component with click handler
const MetricCard = ({ 
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
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <>
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
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
            <div style={{ color: lineColor }} className="text-sm">
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
};

export default MetricCard;