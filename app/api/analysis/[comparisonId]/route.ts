import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ comparisonId: string }> }
) {
  try {
    const { comparisonId } = await params;

    if (!comparisonId) {
      return NextResponse.json({ error: 'Comparison ID is required.' }, { status: 400 });
    }

    const comparison = await db.comparison.findUnique({
      where: { id: comparisonId },
      include: {
        videos: true,
        analysis: true,
      },
    });

    if (!comparison) {
      return NextResponse.json({ error: 'Comparison analysis not found.' }, { status: 404 });
    }

    return NextResponse.json({
      comparison: {
        id: comparison.id,
        status: comparison.status,
        progress: comparison.progress,
        currentStep: comparison.currentStep,
        error: comparison.error,
        inputUrls: comparison.inputUrls,
        createdAt: comparison.createdAt,
      },
      videos: comparison.videos,
      report: comparison.analysis,
    });

  } catch (error: any) {
    console.error('[API] Failed to fetch analytical report:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
