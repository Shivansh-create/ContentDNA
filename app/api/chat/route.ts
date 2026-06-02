import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { semanticSearch, SearchResult } from '@/lib/aiService';
import OpenAI from 'openai';

const apiKey = process.env.GROQ_API_KEY;
const openai = new OpenAI({ 
  apiKey: apiKey || '',
  baseURL: 'https://api.groq.com/openai/v1',
});

export async function POST(req: NextRequest) {
  try {
    const { comparisonId, message, chatSessionId: inputChatSessionId } = await req.json();

    if (!comparisonId || !message) {
      return new Response(JSON.stringify({ error: 'comparisonId and message are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Establish or Retrieve Chat Session
    let chatSessionId = inputChatSessionId;
    if (!chatSessionId) {
      const session = await db.chatSession.create({
        data: {
          comparisonId,
          title: `Chat on ${message.substring(0, 30)}...`,
        },
      });
      chatSessionId = session.id;
    }

    // 2. Save User Message
    await db.chatMessage.create({
      data: {
        chatSessionId,
        role: 'user',
        content: message,
      },
    });

    // 3. Conversational Memory: Fetch past 10 messages for context
    const history = await db.chatMessage.findMany({
      where: { chatSessionId },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    // 4. pgvector Semantic Search
    console.log(`[RAG API] Searching semantic chunks for query: "${message}"`);
    const chunks = await semanticSearch(comparisonId, message, 5);

    // Fetch video metadata to provide global context
    const videos = await db.video.findMany({
      where: { comparisonId },
    });

    const videoMap = new Map(videos.map(v => [v.id, v.title || 'Unknown']));

    // 3. Build context for the prompt AND calculate True Mathematical Confidence
    let totalConfidence = 0;
    const contextString = chunks.map((chunk: any, index: number) => {
      // @ts-ignore
      const confidence = chunk.distance !== undefined ? Math.round((1 - chunk.distance) * 100) : 85;
      totalConfidence += confidence;
      const title = videoMap.get(chunk.videoId) || 'Unknown';
      return `[Source: ${index}] (Confidence: ${confidence}%)\nVideo: ${title}\nTime: ${chunk.startTime}s - ${chunk.endTime}s\nTranscript: "${chunk.text}"`;
    }).join('\n\n');
    const avgConfidence = chunks.length > 0 ? Math.round(totalConfidence / chunks.length) : 0;
    const evidenceStrength = avgConfidence > 85 ? 'High' : avgConfidence > 70 ? 'Medium' : 'Low';

    const systemPrompt = `
You are an elite, venture-backed AI Strategy Consultant.
Your job is to answer questions about the video comparison with brutal honesty, extreme precision, and mathematical evidence.

### REAL-TIME RETRIEVAL MATH
- Retrieved Chunks: ${chunks.length}
- Average Mathematical Confidence: ${avgConfidence}%
- Overall Evidence Strength: ${evidenceStrength}

### AI EVIDENCE MODE MANDATE
You MUST strictly format every response as follows:

[Answer]
(Your direct, strategic conclusion)

[Evidence Used]
(List the exact evidence metrics backing your claim. You MUST use the true mathematical Confidence scores provided in the RAG CONTEXT below, e.g., "✓ Hook Strategy (Confidence: 91%)")

[Evidence Strength System]
Confidence: ${avgConfidence}%
Evidence Strength: ${evidenceStrength}
Supporting Sources: ${chunks.length}

[Citations]
(Provide citations at the bottom using [Source: X] format)

### RAG CONTEXT:
${contextString}

If the context does not contain the answer, say so. Do not hallucinate confidence numbers; use the exact math provided in the context. Never break the formatting mandate.
`;

    const chatHistoryMessages = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...chatHistoryMessages,
      { role: 'user' as const, content: message },
    ];

    // 6. Streaming SSE Response Setup
    const encoder = new TextEncoder();
    let accumulatedContent = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const chatStream = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            stream: true,
            temperature: 0.5,
          });

          // Yield Session ID as the first SSE chunk
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ chatSessionId, status: 'started' })}\n\n`)
          );

          // Yield Citations metadata so the client can map indexes [Source: i] to real timestamps/URLs
          const citationsMetadata = chunks.map((chunk, index) => {
            const isVideoA = videos[0] && chunk.videoId === videos[0].id;
            return {
              index,
              videoLabel: isVideoA ? 'Video A' : 'Video B',
              title: isVideoA ? videos[0].title : videos[1]?.title || 'Unknown',
              creator: isVideoA ? videos[0].creatorName : videos[1]?.creatorName || 'Unknown',
              startTime: chunk.startTime,
              endTime: chunk.endTime,
              text: chunk.text,
              url: isVideoA ? videos[0].url : videos[1]?.url || '',
              similarityScore: (1 - (chunk as any).distance).toFixed(4),
            };
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ citations: citationsMetadata })}\n\n`)
          );

          for await (const chunk of chatStream) {
            const token = chunk.choices[0]?.delta?.content || '';
            if (token) {
              accumulatedContent += token;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
            }
          }

          // 7. Save Assistant Message and close
          await db.chatMessage.create({
            data: {
              chatSessionId,
              role: 'assistant',
              content: accumulatedContent,
              citations: citationsMetadata as any,
            },
          });

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (streamError: any) {
          console.error('[RAG API] Error inside streaming:', streamError);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: streamError.message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('[RAG API] Failed to initiate chat:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
