// dashboard/api/withings.js
export async function onRequest(context) {
  const { request, env, waitUntil } = context;
  
  // Add CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=300' // 5-minute cache
  };

  // Handle OPTIONS request (preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Check for cached response
  const cacheKey = new Request(request.url, { method: 'GET' });
  const cache = caches.default;
  let cachedResponse = await cache.match(cacheKey);
  
  if (cachedResponse) {
    console.log('Serving Withings data from cache');
    return cachedResponse;
  }

  try {
    if (!env.DB) {
      throw new Error('Database binding not found');
    }

    console.log('Querying Withings data...');
    const data = await env.DB.prepare(`
      SELECT * FROM withings_data 
      ORDER BY date DESC 
      LIMIT 30
    `).all();

    if (!data || !data.results) {
      throw new Error('Failed to retrieve data from database');
    }

    console.log('Withings data retrieved:', data.results.length, 'records');
    
    const response = new Response(
      JSON.stringify(data.results || []), 
      { headers }
    );

    // Cache the response (only if successful)
    waitUntil(cache.put(cacheKey, response.clone()));
    
    return response;
  } catch (error) {
    console.error('Error in Withings API:', error);
    
    // Structured error response
    return new Response(
      JSON.stringify({ 
        error: error.message,
        code: 'DB_ERROR',
        timestamp: new Date().toISOString(),
        details: error.toString()
      }), 
      { 
        status: 500, 
        headers 
      }
    );
  }
}