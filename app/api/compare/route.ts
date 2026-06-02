import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { videoComparisonQueue } from '@/lib/queue';
import { parseVideoUrl } from '@/lib/videoService';

export async function POST(req: NextRequest) {
  try {
    const { videoUrls } = await req.json();

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length < 2 || videoUrls.length > 4) {
      return NextResponse.json(
        { error: 'You must provide between 2 and 4 video URLs.' },
        { status: 400 }
      );
    }

    // Validate URLs
    for (let i = 0; i < videoUrls.length; i++) {
      const parsed = parseVideoUrl(videoUrls[i]);
      if (!parsed) {
        return NextResponse.json(
          { error: `Invalid URL at position ${i + 1}. Must be a valid YouTube or Instagram URL.` },
          { status: 400 }
        );
      }
    }

    // Create the comparison database entry
    const comparison = await db.comparison.create({
      data: {
        inputUrls: videoUrls,
        status: 'PENDING',
        progress: 0,
        currentStep: 'Enqueued',
      },
    });

    // Enqueue the background BullMQ job
    const job = await videoComparisonQueue.add(
      `compare-${comparison.id}`,
      { comparisonId: comparison.id, videoUrls },
      { jobId: comparison.id } // Ensures deduplication if submitted twice rapidly
    );

    console.log(`[API] Enqueued comparison job ${job.id} for comparison ${comparison.id}`);

    return NextResponse.json({
      comparisonId: comparison.id,
      status: comparison.status,
      message: 'Job successfully enqueued in BullMQ background processor.',
    });

  } catch (error: any) {
    console.error('[API] Ingestion failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
