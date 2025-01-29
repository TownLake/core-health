export async function onRequest(context) {
  const { env } = context;
  
  // Add CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle OPTIONS request
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    if (!env.DB) {
      throw new Error('Database binding not found');
    }

    console.log('Querying Oura data...');
    const data = await env.DB.prepare(`
      SELECT * FROM oura_data 
      ORDER BY date DESC 
      LIMIT 30
    `).all();

    console.log('Oura data retrieved:', data);
    
    return new Response(
      JSON.stringify(data.results || []), 
      { headers }
    );
  } catch (error) {
    console.error('Error in Oura API:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }), 
      { 
        status: 500, 
        headers 
      }
    );
  }
}