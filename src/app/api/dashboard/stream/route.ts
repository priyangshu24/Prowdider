import { getDashboardSnapshot } from '@/lib/dashboard';
import { POLLING_INTERVAL_MS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Controller may already be closed
        }
      };

      // Send initial snapshot immediately
      try {
        const snapshot = await getDashboardSnapshot();
        send(snapshot);
      } catch {
        // Ignore; next tick will retry
      }

      // Poll on interval
      intervalId = setInterval(async () => {
        try {
          const snapshot = await getDashboardSnapshot();
          send(snapshot);
        } catch {
          // Ignore transient DB errors
        }
      }, POLLING_INTERVAL_MS);

      // Clean up when the client disconnects
      request.signal.addEventListener('abort', () => {
        if (intervalId !== undefined) clearInterval(intervalId);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel() {
      if (intervalId !== undefined) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
