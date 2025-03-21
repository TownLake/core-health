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
  
      console.log('Querying running data...');
      const data = await env.DB.prepare(`
        SELECT date, collected_at, five_k_minutes, vo2_max
        FROM running_data 
        ORDER BY date DESC 
        LIMIT 60
      `).all();
  
      console.log('Running data retrieved:', data);
      
      return new Response(
        JSON.stringify(data.results || []), 
        { headers }
      );
    } catch (error) {
      console.error('Error in Running API:', error);
      
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