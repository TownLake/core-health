// dashboard/src/utils/dataUtils.js

/**
 * Calculates the average of a specific key in a data array
 * @param {Array} data - The data array
 * @param {String} key - The key to extract
 * @param {Number} startIdx - Starting index
 * @param {Number} count - Number of items to average
 * @returns {Number|null} The average or null if no valid values
 */
export const getAverage = (data, key, startIdx, count) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    
    const values = data.slice(startIdx, startIdx + count)
      .map(d => d[key])
      .filter(v => v !== null && v !== undefined);
      
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : null;
  };
  
  /**
   * Analyzes trend information for a metric
   * @param {Array} data - The data array
   * @param {String} key - The key to analyze
   * @param {String} metric - Type of metric
   * @returns {Object} Trend information 
   */
  export const getTrendInfo = (data, key, metric) => {
    if (!data || data.length < 10) return { trend: 'Lacks data', color: 'text-gray-500', lineColor: '#94a3b8' };
    
    const recentAvg = getAverage(data, key, 0, 3);
    const previousAvg = getAverage(data, key, 3, 7);
    
    if (recentAvg === null || previousAvg === null) {
      return { trend: 'Lacks data', color: 'text-gray-500', lineColor: '#94a3b8' };
    }
  
    const diff = recentAvg - previousAvg;
    const percentChange = Math.abs(diff / previousAvg);
    const stable = percentChange < 0.02;
    
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
      case 'efficiency':
        const effValue = recentAvg;
        if (metric === 'efficiency' && effValue >= 96) {
          return { trend: 'Above target', color: colors.good.text, lineColor: colors.good.line };
        } else if (metric === 'efficiency') {
          return { trend: 'Below target', color: colors.bad.text, lineColor: colors.bad.line };
        }
        const sleepHours = recentAvg;
        if (sleepHours >= 7 && sleepHours <= 8.5) {
          return { trend: 'Within target', color: colors.good.text, lineColor: colors.good.line };
        }
        return { 
          trend: sleepHours < 7 ? 'Below target' : 'Above target', 
          color: colors.bad.text, 
          lineColor: colors.bad.line 
        };
        
      case 'deep_sleep':
        const deepSleepMins = recentAvg;
        if (deepSleepMins >= 60) {
          return { trend: 'Above target', color: colors.good.text, lineColor: colors.good.line };
        }
        return { trend: 'Below target', color: colors.bad.text, lineColor: colors.bad.line };
        
      case 'delay':
        const delayMins = recentAvg;
        if (delayMins >= 20) {
          return { trend: 'Above target', color: colors.bad.text, lineColor: colors.bad.line };
        }
        return { trend: 'Within target', color: colors.good.text, lineColor: colors.good.line };
        
      case 'vo2max':
        if (stable) return { trend: 'Stable', color: colors.stable.text, lineColor: colors.stable.line };
        if (diff > 0) {
          return { trend: 'Improving', color: colors.good.text, lineColor: colors.good.line };
        }
        return { trend: 'Declining', color: colors.bad.text, lineColor: colors.bad.line };
  
      case '5k_time':
        if (stable) return { trend: 'Stable', color: colors.stable.text, lineColor: colors.stable.line };
        if (diff < 0) {
          return { trend: 'Improving', color: colors.good.text, lineColor: colors.good.line };
        }
        return { trend: 'Slowing', color: colors.bad.text, lineColor: colors.bad.line };
        
      default:
        return { trend: 'No data', color: 'text-gray-500', lineColor: '#94a3b8' };
    }
  };
  
  /**
   * Creates data for sparkline charts
   * @param {Array} data - The source data
   * @param {String} key - The key to extract for values
   * @returns {Array} Formatted data for sparkline
   */
  export const createSparklineData = (data, key) => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    return [...data].reverse().map(d => ({ value: d[key] }));
  };
  
  /**
   * Checks if the app has valid data to display
   * @param {Array} ouraData - Oura data array
   * @param {Array} withingsData - Withings data array
   * @returns {Boolean} Whether valid data exists
   */
  export const hasValidData = (ouraData, withingsData) => {
    return Array.isArray(ouraData) && 
           Array.isArray(withingsData) && 
           ouraData.length > 0 && 
           withingsData.length > 0;
  };