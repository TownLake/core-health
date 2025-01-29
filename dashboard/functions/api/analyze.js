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
      const prompt = `You are a health insights assistant. Analyze the following health data for a 34 year old male. First section on Vitals that covers HRV, Resting Heart Rate, Weight, Body Fat. Then a section on Sleep. Use emojis as bullet points. Pick an emoji tailored to the point. Provide 1-2 sentences focusing on the most significant findings and specific, actionable recommendations.
  
  Latest metrics:
  - HRV: ${ouraData[0].average_hrv}ms
  - Resting Heart Rate: ${ouraData[0].resting_heart_rate}bpm
  - Sleep Duration: ${ouraData[0].total_sleep}h
  - Sleep Delay: ${ouraData[0].delay}min
  - Weight: ${withingsData[0].weight}lbs
  - Body Fat: ${withingsData[0].fat_ratio}%
  
  Recent trends (comparing 3-day vs previous 7-day averages):
  ${calculateTrendSummary(ouraData, withingsData)}
  
  Be direct and specific in your recommendations.`;
  
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
  
      if (!response.ok) {
        console.error('AI Gateway Error:', await response.text());
        throw new Error('Failed to get AI analysis');
      }
  
      const data = await response.json();
      return new Response(JSON.stringify({ response: data.result.response }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      console.error('Analysis error:', error);
      return new Response(JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }), {
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
