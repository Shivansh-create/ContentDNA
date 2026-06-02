import { Worker, Job } from 'bullmq';
import { db } from './db';
import { connection, QUEUE_NAME } from './queue';
import {
  fetchVideoMetadata,
  downloadAudio,
  transcribeAudio,
  getYouTubeTranscript,
  TranscriptSegment,
} from './videoService';
import {
  chunkTranscript,
  generateEmbedding,
  saveVectorChunk,
  generateComparativeReport,
} from './aiService';
import { v4 as uuidv4 } from 'uuid';

async function updateJobState(comparisonId: string, progress: number, currentStep: string) {
  await db.comparison.update({
    where: { id: comparisonId },
    data: { progress, currentStep },
  });
}

// Orchestrator processing function
async function processVideoComparison(job: Job) {
  const { comparisonId, videoUrls } = job.data;
  console.log(`[Worker] Starting job for Comparison ID: ${comparisonId} with ${videoUrls?.length || 0} videos`);

  // Fetch comparison record
  const comparison = await db.comparison.findUnique({
    where: { id: comparisonId },
  });

  if (!comparison) {
    throw new Error(`Comparison with ID ${comparisonId} not found.`);
  }

  const urlsToProcess = videoUrls || (comparison as any).inputUrls;

  if (!urlsToProcess || urlsToProcess.length < 2) {
    throw new Error(`At least 2 videos are required.`);
  }

  try {
    // 1. Initial State Update
    await updateJobState(comparisonId, 5, 'Extracting Metadata...');

    // 2. Fetch Metadata in Parallel
    console.log(`[Worker] Extracting metadata for ${urlsToProcess.length} videos concurrently`);
    const metadataPromises = urlsToProcess.map((url: string) => fetchVideoMetadata(url));
    const metadatas = await Promise.all(metadataPromises);

    // Save all Videos to DB in Parallel
    const dbVideos = await Promise.all(
      metadatas.map(async (meta: any) => {
        let engagementRate: number | null = null;
        if (meta.views && meta.likes !== null && meta.comments !== null) {
          engagementRate = meta.views > 0 ? ((meta.likes + meta.comments) / meta.views) * 100 : 0.0;
        }

        return db.video.create({
          data: {
            comparisonId,
            platform: meta.platform,
            externalId: meta.externalId,
            url: meta.url,
            title: meta.title,
            creatorName: meta.creatorName,
            followerCount: meta.followerCount,
            views: meta.views,
            likes: meta.likes,
            comments: meta.comments,
            uploadDate: meta.uploadDate,
            duration: meta.duration,
            thumbnailUrl: meta.thumbnailUrl,
            extractionMethod: meta.extractionMethod,
            rawMetadata: meta.rawMetadata,
            extractionLogs: meta.extractionLogs,
            engagementRate,
          },
        });
      })
    );

    await updateJobState(comparisonId, 25, 'Retrieving Transcripts in Parallel...');

    // 3. Transcript Extraction (Parallelized)
    const transcripts: { [videoId: string]: TranscriptSegment[] } = {};

    const processTranscript = async (dbVideo: any) => {
      console.log(`[Worker] Gathering transcript for Video ${dbVideo.id}`);
      if (dbVideo.platform === 'YOUTUBE') {
        try {
          const segments = await getYouTubeTranscript(dbVideo.externalId);
          transcripts[dbVideo.id] = segments;
        } catch (err) {
          console.warn(`YouTube subtitle scrape failed for ${dbVideo.id}, falling back to audio & Whisper...`);
          const audioPath = await downloadAudio(dbVideo.url, dbVideo.externalId);
          transcripts[dbVideo.id] = await transcribeAudio(audioPath);
        }
      } else {
        // Instagram Reel
        const audioPath = await downloadAudio(dbVideo.url, dbVideo.externalId);
        transcripts[dbVideo.id] = await transcribeAudio(audioPath);
      }
      
      // Save full transcript text back to DB
      const fullText = transcripts[dbVideo.id].map(t => t.text).join(' ');
      await db.video.update({ where: { id: dbVideo.id }, data: { transcript: fullText } });
    };

    await Promise.all(dbVideos.map(processTranscript));

    // 4. Semantic Chunking & Vector Indexing (Parallelized)
    await updateJobState(comparisonId, 60, 'Generating Chunk Embeddings...');

    const processChunksAndVectors = async (videoId: string, segments: TranscriptSegment[]) => {
      const chunks = chunkTranscript(segments, 600, 150);
      console.log(`[Worker] Splitting Video ${videoId} into ${chunks.length} semantic chunks`);
      
      // We can parallelize embeddings generation per video, but let's batch to avoid rate limits
      // We'll do it sequentially per chunk for safety, but parallel per video
      for (const chunk of chunks) {
        const chunkId = uuidv4();
        const embedding = await generateEmbedding(chunk.text);
        await saveVectorChunk(
          chunkId,
          videoId,
          chunk.chunkIndex,
          chunk.text,
          chunk.startTime,
          chunk.endTime,
          embedding
        );
      }
    };

    await Promise.all(dbVideos.map((v: any) => processChunksAndVectors(v.id, transcripts[v.id])));

    // 5. Deep Comparative Analysis Report (GPT-4o/Llama3.3)
    await updateJobState(comparisonId, 85, 'Generating AI Content Intelligence Report...');
    console.log(`[Worker] Running structured deep comparative report for ${dbVideos.length} videos...`);

    // Prepare data array for AI
    const aiPayload = dbVideos.map((dbVideo: any) => ({
      metadata: metadatas.find((m: any) => m.externalId === dbVideo.externalId)!,
      fullText: transcripts[dbVideo.id].map(t => t.text).join(' ')
    }));

    const report = await generateComparativeReport(aiPayload);

    // Save report to database
    // The AnalysisReport schema expects legacy fields (summary, hookAnalysis, etc.)
    // We will shove the new JSON into rawGptOutput and dummy data into the rest to avoid Prisma schema breaks
    await db.analysisReport.create({
      data: {
        comparisonId,
        summary: "Multi-video analysis generated",
        hookAnalysis: "Stored in JSON",
        pacingStructure: "Stored in JSON",
        ctaEffectiveness: "Stored in JSON",
        keyTakeaways: "Stored in JSON",
        rawGptOutput: report, // The new massive multi-video JSON payload
      },
    });

    // 6. Complete
    console.log(`[Worker] Job completed successfully for Comparison ID: ${comparisonId}`);
    await db.comparison.update({
      where: { id: comparisonId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        currentStep: 'Completed',
      },
    });

  } catch (error: any) {
    console.error(`[Worker] Job failed for Comparison ID: ${comparisonId}. Error:`, error);
    await db.comparison.update({
      where: { id: comparisonId },
      data: {
        status: 'FAILED',
        error: error.message || 'Unknown processing error',
        currentStep: 'Failed',
        progress: 100,
      },
    });
    throw error;
  }
}

// Start worker
export function startWorker() {
  const worker = new Worker(QUEUE_NAME, processVideoComparison, {
    connection: connection as any,
    concurrency: 2, // Limit concurrent processing to prevent CPU/memory bottlenecks
  });

  worker.on('active', (job) => {
    console.log(`[Worker] Job ${job.id} has started processing.`);
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} has successfully finished.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err);
  });

  console.log(`[Worker] BullMQ queue worker started. Listening on queue "${QUEUE_NAME}"...`);
  return worker;
}

// Enable direct script execution via tsx
if (require.main === module) {
  startWorker();
}
