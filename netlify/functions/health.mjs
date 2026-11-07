export default async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      service: 'ark-os-netlify-api',
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers }
  );
};
