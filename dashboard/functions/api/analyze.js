// dashboard/api/analyze.js
export async function onRequest(context) {
  const { request, env, waitUntil } = context;
    
  // Add CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // Validate request
    if (!request.body) {
      throw new Error('Request body is required');
    }

    const { ouraData, withingsData, runningData } = await request.json();
    
    if (!ouraData || !withingsData) {
      throw new Error('Missing required data in request');
    }

    // Create a unique cache key based on the data
    const dataChecksum = await computeChecksum(JSON.stringify({ 
      oura: ouraData[0], 
      withings: withingsData[0],
      running: runningData?.[0] || {} 
    }));
    
    const cacheKey = new Request(`${request.url}?checksum=${dataChecksum}`, {
      method: 'GET'
    });
    
    const cache = caches.default;
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving AI analysis from cache');
      return cachedResponse;
    }

    // Create a prompt with the health data
    const prompt = buildAIPrompt(ouraData, withingsData, runningData);

    // Record start time for performance monitoring
    const startTime = Date.now();
  
    // Call Cloudflare Workers AI gateway
    const response = await fetch(
      `https://gateway.ai.cloudflare.com/v1/${env.CF_AI_GATEWAY}/health-analysis/workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.CF_AI_TOKEN}`
        },
        body: JSON.stringify({ prompt })
      }
    );

    // Log AI response time
    console.log(`AI response time: ${Date.now() - startTime}ms`);

    if (!response.ok) {
      console.error('AI Gateway Error:', await response.text());
      throw new Error('Failed to get AI analysis');
    }

    const data = await response.json();
    
    if (!data.result || !data.result.response) {
      throw new Error('Invalid response format from AI service');
    }
    
    // Create and cache the response
    const aiResponse = new Response(
      JSON.stringify({ 
        response: data.result.response,
        timestamp: new Date().toISOString()
      }), 
      { headers }
    );
    
    // Cache for 24 hours since AI analysis is expensive
    waitUntil(cache.put(cacheKey, aiResponse.clone()));
    
    return aiResponse;
  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString(),
        timestamp: new Date().toISOString()
      }), 
      {
        status: 500,
        headers
      }
    );
  }
}

// Helper function to compute a simple checksum for caching
async function computeChecksum(str) {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// Helper function to build the AI prompt
function buildAIPrompt(ouraData, withingsData, runningData) {
  const calculateTrendSummary = (ouraData, withingsData, runningData) => {
    const getAverage = (data, key, startIdx, count) => {
      const values = data.slice(startIdx, startIdx + count)
                          .map(d => d[key])
                          .filter(v => v !== null && v !== undefined);
      return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : null;
    };
  
    const metrics = [
      { data: ouraData, key: 'average_hrv', name: 'HRV' },
      { data: ouraData, key: 'resting_heart_rate', name: 'RHR' },
      { data: ouraData, key: 'total_sleep', name: 'Sleep Duration' },
      { data: ouraData, key: 'delay', name: 'Sleep Delay' },
      { data: withingsData, key: 'weight', name: 'Weight' },
      { data: withingsData, key: 'fat_ratio', name: 'Body Fat' }
    ];

    // Add running metrics if available
    if (runningData && runningData.length > 0) {
      metrics.push(
        { data: runningData, key: 'vo2_max', name: 'VO2 Max' },
        { data: runningData, key: 'five_k_minutes', name: '5K Time' }
      );
    }
  
    return metrics.map(({ data, key, name }) => {
      if (!data || data.length < 3) return `${name}: insufficient data`;
      
      const recentAvg = getAverage(data, key, 0, 3);
      const previousAvg = getAverage(data, key, 3, 7);
      
      if (recentAvg === null || previousAvg === null) {
        return `${name}: insufficient data`;
      }
      
      const diff = recentAvg - previousAvg;
      const percentChange = (diff / previousAvg) * 100;
      
      return `${name}: ${percentChange > 0 ? 'up' : 'down'} ${Math.abs(percentChange).toFixed(1)}%`;
    }).join('\n');
  };

  return `You are a health insights assistant. Analyze the following health data for a 34 year old male.

  Your output should consist of the following sections:

  ## Vitals
  * Compare the results of HRV, Resting Heart Rate, Weight, Body Fat to known standards for a 34 year old male. For example, "A RHR of XX is excellent for a person your age."
  * Use emojis as bullet points. Pick an emoji tailored to the point.

  ## Trends
  * Call out any trends worthy of note.
  * Use emojis as bullet points. Pick an emoji tailored to the point.

  ## Summary
  * 1-2 sentence summary.

Latest metrics:
- HRV: ${ouraData[0].average_hrv}ms
- Resting Heart Rate: ${ouraData[0].resting_heart_rate}bpm
- Sleep Duration: ${ouraData[0].total_sleep}h
- Sleep Delay: ${ouraData[0].delay}min
- Weight: ${withingsData[0].weight}lbs
- Body Fat: ${withingsData[0].fat_ratio}%
${runningData && runningData.length > 0 ? `- VO2 Max: ${runningData[0].vo2_max}ml/kg/min
- 5K Time: ${runningData[0].five_k_minutes}min` : ''}

Recent trends (comparing 3-day vs previous 7-day averages):
${calculateTrendSummary(ouraData, withingsData, runningData)}

Be direct and specific in your recommendations.`;
}