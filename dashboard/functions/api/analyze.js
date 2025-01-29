export async function onRequest(context) {
    const { request, env } = context;
    
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
  
    try {
      const { ouraData, withingsData } = await request.json();
  
      // Create a prompt with the health data
      const prompt = `You are a health insights assistant. Analyze the following health data and provide a concise, helpful summary of trends and suggestions. Focus on actionable insights.
  
  Latest metrics:
  - HRV: ${ouraData[0].average_hrv}ms
  - Resting Heart Rate: ${ouraData[0].resting_heart_rate}bpm
  - Sleep Duration: ${ouraData[0].total_sleep}h
  - Sleep Delay: ${ouraData[0].delay}min
  - Weight: ${withingsData[0].weight}lbs
  - Body Fat: ${withingsData[0].fat_ratio}%
  
  Recent trends (comparing 3-day vs previous 7-day averages):
  ${calculateTrendSummary(ouraData, withingsData)}
  
  Provide a 2-3 sentence analysis focused on the most noteworthy changes and specific recommendations.`;
  
      // Call Cloudflare Workers AI
      const AI = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [{ role: 'user', content: prompt }],
        stream: false
      });
  
      return new Response(JSON.stringify({ response: AI.response }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  function calculateTrendSummary(ouraData, withingsData) {
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
  
    return metrics.map(({ data, key, name }) => {
      const recentAvg = getAverage(data, key, 0, 3);
      const previousAvg = getAverage(data, key, 3, 7);
      const diff = recentAvg - previousAvg;
      const percentChange = (diff / previousAvg) * 100;
      
      return `${name}: ${percentChange > 0 ? 'up' : 'down'} ${Math.abs(percentChange).toFixed(1)}%`;
    }).join('\n');
  }