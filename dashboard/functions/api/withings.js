export async function onRequest(context) {
    const { env } = context;
    
    try {
      const data = await env.DB.prepare(`
        SELECT * FROM withings_data 
        ORDER BY date DESC 
        LIMIT 30
      `).all();
      
      return new Response(JSON.stringify(data.results), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }