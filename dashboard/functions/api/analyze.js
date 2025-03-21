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

// Helper function to compute a simple checksum for