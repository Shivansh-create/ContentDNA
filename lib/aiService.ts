import OpenAI from 'openai';
import { db } from './db';
import { VideoMetadata, TranscriptSegment } from './videoService';
import { pipeline } from '@xenova/transformers';

// Initialize Groq client using the OpenAI SDK (100% compatible)
const apiKey = process.env.GROQ_API_KEY;
const openai = new OpenAI({ 
  apiKey: apiKey || '',
  baseURL: 'https://api.groq.com/openai/v1',
});

// Singleton pipeline for local embeddings (to prevent memory leaks)
let extractorPipeline: any = null;
async function getExtractor() {
  if (!extractorPipeline) {
    console.log('[Worker] Loading local embedding model: Xenova/all-MiniLM-L6-v2');
    extractorPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractorPipeline;
}

export interface ChunkWithMetadata {
  chunkIndex: number;
  text: string;
  startTime: number;
  endTime: number;
}

// 1. Precise Semantic Segment-Merging Chunker (Preserves Timestamps!)
export function chunkTranscript(segments: TranscriptSegment[], targetLength = 600, overlap = 150): ChunkWithMetadata[] {
  if (segments.length === 0) return [];

  const chunks: ChunkWithMetadata[] = [];
  let currentText = '';
  let chunkStartIndex = 0;
  let chunkIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    if (currentText.length > 0) {
      currentText += ' ' + segment.text;
    } else {
      currentText = segment.text;
      chunkStartIndex = i;
    }

    const currentLength = currentText.length;
    
    // If we've reached the target length or are at the last segment
    if (currentLength >= targetLength || i === segments.length - 1) {
      const startTime = segments[chunkStartIndex].startTime;
      const endTime = segment.endTime;
      
      chunks.push({
        chunkIndex,
        text: currentText,
        startTime,
        endTime,
      });

      chunkIndex++;

      // Implement overlapping by rolling back some segments
      let rollbackIndex = i;
      let tempText = '';
      
      // Step backwards to create the overlap
      while (rollbackIndex > chunkStartIndex && tempText.length < overlap) {
        tempText = segments[rollbackIndex].text + ' ' + tempText;
        rollbackIndex--;
      }
      
      // Reset variables for next chunk
      i = rollbackIndex;
      currentText = '';
    }
  }

  return chunks;
}

// 2. Local Embedding Generation using Transformers.js (100% Free, Runs on CPU)
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const extractor = await getExtractor();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    // Convert Float32Array to standard array
    return Array.from(output.data);
  } catch (error: any) {
    console.error('Local embedding generation failed:', error);
    throw new Error(`Embedding failed: ${error.message}`);
  }
}

// 3. Save Vector Chunk using raw SQL into pgvector
export async function saveVectorChunk(
  id: string,
  videoId: string,
  chunkIndex: number,
  text: string,
  startTime: number,
  endTime: number,
  embedding: number[]
) {
  try {
    await db.$executeRawUnsafe(
      `INSERT INTO "VideoChunk" ("id", "videoId", "chunkIndex", "text", "startTime", "endTime", "embedding")
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector)`,
      id,
      videoId,
      chunkIndex,
      text,
      startTime,
      endTime,
      JSON.stringify(embedding)
    );
  } catch (error: any) {
    console.error('Failed to insert vector chunk:', error);
    throw new Error(`Prisma raw SQL vector insert failed: ${error.message}`);
  }
}

// 4. Generate Deep Comparative Report using Groq's Llama-3.1-70B
export async function generateComparativeReport(
  videos: { metadata: any, fullText: string }[]
) {
  if (!apiKey || apiKey.startsWith('gsk_') === false) {
    throw new Error('GROQ_API_KEY is not configured. Please get one from console.groq.com.');
  }

  let prompt = `
You are an expert Social Media Strategist, Video Editor, and Audience Retention Engineer.
Your job is to analyze ${videos.length} social media videos and discover the underlying patterns driving their performance.

`;

  let baseConfidence = 100;

  videos.forEach((v, idx) => {
    let engagementStr = "Unavailable";
    if (v.metadata.views && v.metadata.likes !== null && v.metadata.comments !== null) {
      engagementStr = (((v.metadata.likes + v.metadata.comments) / v.metadata.views) * 100).toFixed(2) + "%";
    } else {
      baseConfidence -= 15; // Penalty for missing engagement data
    }
    
    if (v.metadata.platform === 'INSTAGRAM' && v.metadata.followerCount === null) {
      baseConfidence -= 6; // Penalty for missing follower count
    }
    
    prompt += `
### VIDEO ${idx + 1} METADATA:
- Platform: ${v.metadata.platform}
- Title: ${v.metadata.title}
- Creator: ${v.metadata.creatorName}
- Views: ${v.metadata.views ?? "Unavailable"}
- Likes: ${v.metadata.likes ?? "Unavailable"}
- Comments: ${v.metadata.comments ?? "Unavailable"}
- Engagement Rate: ${engagementStr}
- Duration: ${v.metadata.duration ? v.metadata.duration + " seconds" : "Unavailable"}

### VIDEO ${idx + 1} TRANSCRIPT:
"""
${v.fullText.substring(0, 10000)}
"""
`;
  });

  prompt += `
### ABSOLUTE RULE:
You are strictly forbidden from generating, estimating, inferring, guessing, approximating, or hallucinating social media statistics. You may ONLY use metrics supplied in the metadata above. If a metric is missing or labeled "Unavailable", you must explicitly acknowledge that it is unavailable and you must not use substitute values.

### CONFIDENCE DEGRADATION:
Because some metadata could not be verified by the extraction layer, your absolute maximum confidence ceiling for this analysis is ${Math.max(10, baseConfidence)}%. You must reflect this honest uncertainty in your Executive Decision confidence score. Do not exceed this ceiling.

### INSTRUCTIONS:
Conduct a rigorous structural and tactical comparison of these ${videos.length} videos. You are delivering this to an Executive. Provide your output ONLY as a valid JSON object containing exactly the following fields:

1. "executiveDecision": Object containing:
   - "winner": "Video X" (String)
   - "confidence": 0-100 (Number)
   - "highestImpactOpportunity": String
   - "expectedImprovement": String (e.g. "+18%")
   - "recommendedAction": String
2. "leaderboard": Array of objects. Each object must have "rank" (Number), "video" (String, e.g. "Video 1"), "score" (0-100 Number).
3. "contentDnaScores": Array of objects (one per video). Each object must have "video" (String), "hookStrength" (0-100), "storytelling" (0-100), "pacing" (0-100), "retention" (0-100), "cta" (0-100), "overall" (0-100).
4. "whyItWon": Array of 4-5 strings (bullet points) explaining exactly why the #1 ranked video won.
5. "winningPatterns": Array of strings representing shared traits among the top performing videos.
6. "goldenBlueprint": Object containing: "idealHookLength" (String), "idealCtaPosition" (String), "idealStoryStructure" (String), "idealEmotionalJourney" (String).
7. "whatIfScenario": Object containing "question", "predictedLift" (String, e.g. "+18%"), and "reasoning" (String).
8. "recommendations": Array of objects. Each object must have "action" (String), "impact" (String, must be exactly "HIGH", "MEDIUM", or "LOW"), "expectedLift" (String), "confidence" (0-100 Number), and "evidence" (String).
9. "businessImpact": Object containing:
   - "estimatedReach": String (e.g. "+24%")
   - "estimatedRetention": String (e.g. "+13%")
   - "estimatedConversion": String (e.g. "+11%")

Provide your output ONLY as a valid JSON object. Do not include markdown wraps or backticks outside of valid JSON strings.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return result;
  } catch (error) {
    console.error('Groq Llama 3.3 generation failed:', error);
    return { error: 'Failed to generate report' };
  }
}


// 5. pgvector Semantic Search
export interface SearchResult {
  id: string;
  videoId: string;
  text: string;
  startTime: number;
  endTime: number;
  chunkIndex: number;
  platform: 'YOUTUBE' | 'INSTAGRAM';
  externalId: string;
  distance: number;
}

export async function semanticSearch(
  comparisonId: string,
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);

  try {
    // cosine similarity via pgvector <=> operator
    const results = await db.$queryRawUnsafe<SearchResult[]>(
      `SELECT vc.id, vc."videoId", vc.text, vc."startTime", vc."endTime", vc."chunkIndex", v.platform, v."externalId",
       (vc.embedding <=> $1::vector) as distance
       FROM "VideoChunk" vc
       JOIN "Video" v ON vc."videoId" = v.id
       WHERE v."comparisonId" = $2
       ORDER BY distance ASC
       LIMIT $3`,
      JSON.stringify(queryEmbedding),
      comparisonId,
      limit
    );

    return results;
  } catch (error: any) {
    console.error('Vector search query failed:', error);
    throw new Error(`Vector search failed: ${error.message}`);
  }
}
