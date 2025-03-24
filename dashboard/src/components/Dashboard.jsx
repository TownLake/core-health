// dashboard/src/components/Dashboard.jsx
import React from 'react';
import { Heart, Scale, Activity, Hourglass, Waves, Ruler, HeartPulse, ClipboardCheck,
         Footprints, Wind, Timer, BedDouble, PlugZap } from 'lucide-react';
import MetricCard from './MetricCard';
import { useHealthData } from '../store/HealthDataContext';
import { getTrendInfo, createSparklineData, hasValidData } from '../utils/dataUtils';
import SocialLinks from './SocialLinks';
import LoadingView from './LoadingView';
import ErrorView from './ErrorView';
import AIInsightsCard from './AIInsightsCard';
import MetricSection from './MetricSection';

const Dashboard = () => {
  const { 
    ouraData, 
    withingsData, 
    runningData, 
    aiResponse, 
    isLoading, 
    isAnalyzing,
    error,
  } = useHealthData();

  if (isLoading) {
    return <LoadingView />;
  }

  if (!hasValidData(ouraData, withingsData)) {
    return <ErrorView message={error || 'No data available'} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div>
        {error && <ErrorView message={error} />}

        {aiResponse && !isAnalyzing && <AIInsightsCard response={aiResponse} />}
        {isAnalyzing && <AIInsightsCard isLoading={true} />}
        
        <div className="grid grid-cols-1 gap-8">
          <MetricSection
            title="Heart"
            icon={Heart}
            metrics={[
              {
                title: "HRV",
                value: ouraData[0]?.average_hrv?.toFixed(0) ?? '--',
                unit: "ms",
                ...getTrendInfo(ouraData, 'average_hrv', 'hrv'),
                sparklineData: createSparklineData(ouraData, 'average_hrv'),
                icon: Activity,
                fullData: ouraData,
                dataKey: "average_hrv"
              },
              {
                title: "Resting Heart Rate",
                value: ouraData[0]?.resting_heart_rate?.toFixed(0) ?? '--',
                unit: "bpm",
                ...getTrendInfo(ouraData, 'resting_heart_rate', 'rhr'),
                sparklineData: createSparklineData(ouraData, 'resting_heart_rate'),
                icon: HeartPulse,
                fullData: ouraData,
                dataKey: "resting_heart_rate"
              }
            ]}
          />

          <MetricSection
            title="Body"
            icon={ClipboardCheck}
            metrics={[
              {
                title: "Weight",
                value: withingsData[0]?.weight?.toFixed(1) ?? '--',
                unit: "lbs",
                ...getTrendInfo(withingsData, 'weight', 'weight'),
                sparklineData: createSparklineData(withingsData, 'weight'),
                icon: Scale,
                fullData: withingsData,
                dataKey: "weight"
              },
              {
                title: "Body Fat",
                value: withingsData[0]?.fat_ratio?.toFixed(1) ?? '--',
                unit: "%",
                ...getTrendInfo(withingsData, 'fat_ratio', 'bodyFat'),
                sparklineData: createSparklineData(withingsData, 'fat_ratio'),
                icon: Ruler,
                fullData: withingsData,
                dataKey: "fat_ratio"
              }
            ]}
          />

          <MetricSection
            title="Sleep"
            icon={BedDouble}
            metrics={[
              {
                title: "Total Sleep",
                value: ouraData[0]?.total_sleep?.toFixed(1) ?? '--',
                unit: "h",
                ...getTrendInfo(ouraData, 'total_sleep', 'sleep'),
                sparklineData: createSparklineData(ouraData, 'total_sleep'),
                icon: BedDouble,
                fullData: ouraData,
                dataKey: "total_sleep"
              },
              {
                title: "Deep Sleep",
                value: ouraData[0]?.deep_sleep_minutes?.toFixed(0) ?? '--',
                unit: "min",
                ...getTrendInfo(ouraData, 'deep_sleep_minutes', 'deep_sleep'),
                sparklineData: createSparklineData(ouraData, 'deep_sleep_minutes'),
                icon: Waves,
                fullData: ouraData,
                dataKey: "deep_sleep_minutes"
              },
              {
                title: "Sleep Efficiency",
                value: ouraData[0]?.efficiency?.toFixed(0) ?? '--',
                unit: "%",
                ...getTrendInfo(ouraData, 'efficiency', 'efficiency'),
                sparklineData: createSparklineData(ouraData, 'efficiency'),
                icon: PlugZap,
                fullData: ouraData,
                dataKey: "efficiency"
              },
              {
                title: "Sleep Delay",
                value: ouraData[0]?.delay?.toFixed(0) ?? '--',
                unit: "min",
                ...getTrendInfo(ouraData, 'delay', 'delay'),
                sparklineData: createSparklineData(ouraData, 'delay'),
                icon: Hourglass,
                fullData: ouraData,
                dataKey: "delay"
              }
            ]}
          />

          <MetricSection
            title="Running"
            icon={Footprints}
            metrics={[
              {
                title: "VO2 Max",
                value: runningData[0]?.vo2_max?.toFixed(1) ?? '--',
                unit: "ml/kg/min",
                ...getTrendInfo(runningData, 'vo2_max', 'vo2max'),
                sparklineData: createSparklineData(runningData, 'vo2_max'),
                icon: Wind,
                fullData: runningData,
                dataKey: "vo2_max"
              },
              {
                title: "5K Time",
                value: runningData[0]?.five_k_minutes?.toFixed(1) ?? '--',
                unit: "min",
                ...getTrendInfo(runningData, 'five_k_minutes', '5k_time'),
                sparklineData: createSparklineData(runningData, 'five_k_minutes'),
                icon: Timer,
                fullData: runningData,
                dataKey: "five_k_minutes"
              }
            ]}
          />
        </div>

        <SocialLinks />
      </div>
    </div>
  );
};

export default Dashboard;