import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Comparison ID required' }, { status: 400 });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;

        req.signal.addEventListener('abort', () => {
          isClosed = true;
        });

        // Push initial state immediately
        const pushState = async () => {
          if (isClosed) return true; // signal to stop loop
          const comparison = await db.comparison.findUnique({
            where: { id },
            select: { id: true, status: true, progress: true, currentStep: true, error: true },
          });

          if (!comparison) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Not found' })}\n\n`));
            controller.close();
            return true;
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(comparison)}\n\n`));

          if (comparison.status === 'COMPLETED' || comparison.status === 'FAILED') {
            controller.close();
            return true;
          }
          return false;
        };

        // Poll the DB internally every 800ms and stream via SSE (avoids client network spam)
        const pollLoop = async () => {
          let done = await pushState();
          while (!done && !isClosed) {
            await new Promise((r) => setTimeout(r, 800));
            done = await pushState();
          }
        };

        pollLoop();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
