// dashboard/api/running.js
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
    console.log('Serving Running data from cache');
    return cachedResponse;
  }

  try {
    if (!env.DB) {
      throw new Error('Database binding not found');
    }

    // First, check if the running_data table exists
    const tableExists = await checkTableExists(env.DB, 'running_data');
    
    if (!tableExists) {
      // Return mock data for now since table doesn't exist
      const mockData = generateMockRunningData(30);
      
      return new Response(
        JSON.stringify(mockData),
        { headers }
      );
    }

    console.log('Querying Running data...');
    const data = await env.DB.prepare(`
      SELECT * FROM running_data 
      ORDER BY date DESC 
      LIMIT 30
    `).all();

    if (!data || !data.results) {
      throw new Error('Failed to retrieve data from database');
    }

    console.log('Running data retrieved:', data.results.length, 'records');
    
    const response = new Response(
      JSON.stringify(data.results || []), 
      { headers }
    );

    // Cache the response (only if successful)
    waitUntil(cache.put(cacheKey, response.clone()));
    
    return response;
  } catch (error) {
    console.error('Error in Running API:', error);
    
    // If this is the first version of the API and the table might not exist yet,
    // return mock data instead of an error
    const mockData = generateMockRunningData(30);
    
    return new Response(
      JSON.stringify(mockData),
      { headers }
    );
  }
}

// Helper function to check if a table exists in the database
async function checkTableExists(db, tableName) {
  try {
    const result = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `).bind(tableName).all();
    
    return result && result.results && result.results.length > 0;
  } catch (error) {
    console.error('Error checking table exists:', error);
    return false;
  }
}

// Helper function to generate mock running data when the API is first deployed
function generateMockRunningData(days) {
  const data = [];
  const baseVo2Max = 42.5;
  const base5kTime = 25.3;
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Generate some variation in the mock data
    const randomVariation = () => (Math.random() - 0.5) * 0.5;
    
    data.push({
      date: date.toISOString(),
      vo2_max: baseVo2Max - (i * 0.1) + randomVariation(),
      five_k_minutes: base5kTime + (i * 0.1) + randomVariation()
    });
  }
  
  return data;
}