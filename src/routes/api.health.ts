// Health check endpoint for the API gateway
// Accessible at /api/health

export async function GET() {
  const payload = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
