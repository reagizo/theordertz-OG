import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        const payload = {
          status: 'ok',
          timestamp: new Date().toISOString(),
        };
        return Response.json(payload);
      },
    },
  },
});
