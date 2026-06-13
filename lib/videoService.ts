import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import { YoutubeTranscript } from 'youtube-transcript';
import OpenAI from 'openai';
import { db } from './db';

const execAsync = promisify(exec);

export interface ExtractionLogEntry {
  metric: string;
  attempt: number;
  status: 'Success' | 'Failed';
  reason?: string;
  source?: string;
  value?: any;
}

export interface VideoMetadata {
  platform: 'YOUTUBE' | 'INSTAGRAM';
  externalId: string;
  url: string;
  title: string;
  creatorName: string;
  followerCount?: number | null; // Instagram only
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  uploadDate?: Date | null;
  duration?: number | null; // in seconds
  thumbnailUrl: string;
  extractionMethod: string;
  rawMetadata: any;
  extractionLogs: ExtractionLogEntry[];
}

export interface TranscriptSegment {
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
}

// Helper to parse URLs
export function parseVideoUrl(url: string): { platform: 'YOUTUBE' | 'INSTAGRAM'; externalId: string } | null {
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const instagramRegex = /instagram\.com\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/i;

  const ytMatch = url.match(youtubeRegex);
  if (ytMatch) {
    return { platform: 'YOUTUBE', externalId: ytMatch[1] };
  }

  const igMatch = url.match(instagramRegex);
  if (igMatch) {
    return { platform: 'INSTAGRAM', externalId: igMatch[1] };
  }

  return null;
}

// Fetch video metadata using Multi-Strategy Pipeline
export async function fetchVideoMetadata(url: string): Promise<VideoMetadata> {
  const parsed = parseVideoUrl(url);
  if (!parsed) {
    throw new Error('Unsupported or invalid video URL.');
  }

  let binaryPath = '';
  if (process.platform === 'win32') {
    binaryPath = path.resolve(process.cwd(), 'yt-dlp.exe');
    if (!fs.existsSync(binaryPath)) {
      throw new Error(`yt-dlp.exe binary not found at ${binaryPath}. Ensure it has been downloaded.`);
    }
  } else {
    binaryPath = 'yt-dlp';
  }

  const logs: ExtractionLogEntry[] = [];
  let rawMetadata: any = {};

  const addLog = (metric: string, attempt: number, status: 'Success' | 'Failed', reason?: string, source?: string, value?: any) => {
    logs.push({ metric, attempt, status, reason, source, value });
  };

  try {
    // Strategy 1: yt-dlp --dump-single-json
    let info: any = {};
    let ytDlpSuccess = false;
    try {
      const { stdout } = await execAsync(`"${binaryPath}" --dump-single-json "${url}"`);
      info = JSON.parse(stdout);
      rawMetadata = { ...info, _source: 'yt-dlp' };
      ytDlpSuccess = true;
    } catch (e: any) {
      addLog('Base Extraction', 1, 'Failed', e.message, 'yt-dlp');
    }

    const title = info.title || info.description?.substring(0, 50) || 'Untitled Video';
    const creatorName = info.uploader || info.channel || 'Unknown Creator';
    
    // Core Metrics
    let views: number | null = null;
    let likes: number | null = null;
    let comments: number | null = null;
    let duration: number | null = null;
    let followerCount: number | null = null;
    
    // Evaluate Views
    if (info.view_count !== undefined && info.view_count !== null) {
      views = info.view_count;
      addLog('Views', 1, 'Success', undefined, 'yt-dlp', views);
    } else {
      addLog('Views', 1, 'Failed', 'view_count missing from yt-dlp response', 'yt-dlp');
      // If YouTube views fail, it's a critical bug. We log it.
      if (parsed.platform === 'YOUTUBE') {
        console.error(`[BUG] YouTube view_count missing for ${url}. Raw payload keys:`, Object.keys(info));
      }
    }

    // Evaluate Likes
    if (info.like_count !== undefined && info.like_count !== null) {
      likes = info.like_count;
      addLog('Likes', 1, 'Success', undefined, 'yt-dlp', likes);
    } else {
      addLog('Likes', 1, 'Failed', 'like_count missing from yt-dlp response', 'yt-dlp');
    }

    // Evaluate Comments
    if (info.comment_count !== undefined && info.comment_count !== null) {
      comments = info.comment_count;
      addLog('Comments', 1, 'Success', undefined, 'yt-dlp', comments);
    } else {
      addLog('Comments', 1, 'Failed', 'comment_count missing from yt-dlp response', 'yt-dlp');
    }

    // Duration and Upload date
    if (info.duration !== undefined && info.duration !== null) {
      duration = Math.round(info.duration);
      addLog('Duration', 1, 'Success', undefined, 'yt-dlp', duration);
    } else {
      addLog('Duration', 1, 'Failed', 'duration missing from yt-dlp response', 'yt-dlp');
    }

    let uploadDate: Date | null = null;
    if (info.upload_date) {
      const year = parseInt(info.upload_date.substring(0, 4), 10);
      const month = parseInt(info.upload_date.substring(4, 6), 10) - 1;
      const day = parseInt(info.upload_date.substring(6, 8), 10);
      uploadDate = new Date(year, month, day);
    }

    const thumbnailUrl = info.thumbnail || '';
    
    // Evaluate Followers (Multi-Strategy)
    if (parsed.platform === 'INSTAGRAM') {
      if (info.channel_follower_count !== undefined && info.channel_follower_count !== null) {
        followerCount = info.channel_follower_count;
        addLog('Followers', 1, 'Success', undefined, 'yt-dlp', followerCount);
      } else if (info.subscribers !== undefined && info.subscribers !== null) {
        followerCount = info.subscribers;
        addLog('Followers', 1, 'Success', undefined, 'yt-dlp (subscribers fallback)', followerCount);
      } else {
        addLog('Followers', 1, 'Failed', 'channel_follower_count missing from yt-dlp', 'yt-dlp');
        
        // Strategy 2: HTML Regex Parsing Fallback
        try {
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36' } });
          const html = await res.text();
          
          // Look for 'og:description' which often contains 'X Likes, Y Comments'
          const metaMatch = html.match(/content="([\d,]+)\s+Likes,\s+([\d,]+)\s+Comments/i);
          if (metaMatch && likes === null) {
             likes = parseInt(metaMatch[1].replace(/,/g, ''), 10);
             addLog('Likes', 2, 'Success', 'Regex og:description fallback', 'Reel HTML Parse', likes);
          }
          if (metaMatch && comments === null) {
             comments = parseInt(metaMatch[2].replace(/,/g, ''), 10);
             addLog('Comments', 2, 'Success', 'Regex og:description fallback', 'Reel HTML Parse', comments);
          }
          
          const followerMatch = html.match(/"edge_followed_by":\s*\{\s*"count":\s*(\d+)\s*\}/);
          if (followerMatch) {
             followerCount = parseInt(followerMatch[1], 10);
             addLog('Followers', 2, 'Success', 'Regex edge_followed_by fallback', 'Reel HTML Parse', followerCount);
          } else {
             addLog('Followers', 2, 'Failed', 'edge_followed_by not found in HTML', 'Reel HTML Parse');
          }
          rawMetadata._htmlStrategyUsed = true;
        } catch (e: any) {
          addLog('Followers', 2, 'Failed', e.message, 'Reel HTML Parse');
        }

        // Strategy 3: Creator Profile Discovery
        if (followerCount === null && creatorName && creatorName !== 'Unknown Creator') {
          try {
            const profileUsername = info.channel || creatorName.replace(/\s+/g, '');
            const profileUrl = `https://www.instagram.com/${profileUsername}/`;
            const res = await fetch(profileUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
            const profileHtml = await res.text();
            
            // "823K Followers, 1,200 Following, 300 Posts"
            const profileMetaMatch = profileHtml.match(/content="([\d,\.KMB]+)\s+Followers/i);
            if (profileMetaMatch) {
              let parsedFollowers = profileMetaMatch[1].replace(/,/g, '');
              let multiplier = 1;
              if (parsedFollowers.endsWith('K') || parsedFollowers.endsWith('k')) { multiplier = 1000; parsedFollowers = parsedFollowers.slice(0, -1); }
              else if (parsedFollowers.endsWith('M') || parsedFollowers.endsWith('m')) { multiplier = 1000000; parsedFollowers = parsedFollowers.slice(0, -1); }
              else if (parsedFollowers.endsWith('B') || parsedFollowers.endsWith('b')) { multiplier = 1000000000; parsedFollowers = parsedFollowers.slice(0, -1); }
              
              followerCount = Math.floor(parseFloat(parsedFollowers) * multiplier);
              addLog('Followers', 3, 'Success', 'Profile Page Extraction', 'Profile Meta Parse', followerCount);
            } else {
              addLog('Followers', 3, 'Failed', 'Follower count not found on profile page', 'Profile Meta Parse');
            }
          } catch (e: any) {
            addLog('Followers', 3, 'Failed', e.message, 'Profile Meta Parse');
          }
        }

        // Strategy 4: Historical Cache Lookup
        if (followerCount === null && creatorName && creatorName !== 'Unknown Creator') {
          try {
            const cached = await db.creatorCache.findUnique({
              where: {
                platform_username: {
                  platform: 'INSTAGRAM',
                  username: creatorName
                }
              }
            });
            if (cached) {
              followerCount = cached.followerCount;
              addLog('Followers', 4, 'Success', `Recovered from cache retrieved at ${cached.retrievedAt.toISOString()}`, 'Historical Cache', followerCount);
            } else {
              addLog('Followers', 4, 'Failed', 'No cache found for creator', 'Historical Cache');
            }
          } catch (e: any) {
            addLog('Followers', 4, 'Failed', e.message, 'Historical Cache');
          }
        }
      }
      
      // Upsert into CreatorCache if we successfully found it via Strategy 1, 2, or 3
      if (followerCount !== null && creatorName && creatorName !== 'Unknown Creator') {
        const lastLog = logs[logs.length - 1]; // Find the last log to see if it was cache (Attempt 4)
        const isFromCache = logs.some((l) => l.metric === 'Followers' && l.attempt === 4 && l.status === 'Success');
        
        if (!isFromCache) {
          try {
            await db.creatorCache.upsert({
              where: {
                platform_username: {
                  platform: 'INSTAGRAM',
                  username: creatorName
                }
              },
              update: {
                followerCount: followerCount,
                retrievedAt: new Date(),
                source: 'Multi-Strategy Pipeline',
                confidence: 100.0
              },
              create: {
                platform: 'INSTAGRAM',
                username: creatorName,
                followerCount: followerCount,
                source: 'Multi-Strategy Pipeline',
                confidence: 100.0
              }
            });
          } catch (e) {
            console.warn("Failed to update CreatorCache:", e);
          }
        }
      }
      
    } else if (parsed.platform === 'YOUTUBE') {
      if (info.channel_follower_count !== undefined && info.channel_follower_count !== null) {
        followerCount = info.channel_follower_count;
        addLog('Followers', 1, 'Success', undefined, 'yt-dlp', followerCount);
      } else if (info.subscribers !== undefined && info.subscribers !== null) {
        followerCount = info.subscribers;
        addLog('Followers', 1, 'Success', undefined, 'yt-dlp (subscribers fallback)', followerCount);
      } else {
        addLog('Followers', 1, 'Failed', 'subscribers missing from yt-dlp', 'yt-dlp');
      }
    }

    return {
      platform: parsed.platform,
      externalId: parsed.externalId,
      url,
      title,
      creatorName,
      followerCount,
      views,
      likes,
      comments,
      uploadDate,
      duration,
      thumbnailUrl,
      extractionMethod: 'Multi-Strategy Pipeline',
      rawMetadata,
      extractionLogs: logs,
    };
  } catch (error: any) {
    console.error('Failed to extract metadata in multi-strategy pipeline:', error);
    throw new Error(`Failed to extract metadata: ${error.message}`);
  }
}

// Download Audio stream directly using yt-dlp (M4A format 140 is audio-only, extremely fast and light)
export async function downloadAudio(url: string, externalId: string): Promise<string> {
  let binaryPath = '';
  if (process.platform === 'win32') {
    binaryPath = path.resolve(process.cwd(), 'yt-dlp.exe');
  } else {
    binaryPath = 'yt-dlp';
  }
  
  const scratchDir = path.resolve(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const outputPath = path.join(scratchDir, `audio-${externalId}.m4a`);

  // If file already exists, reuse it to save bandwidth and compute
  if (fs.existsSync(outputPath)) {
    return outputPath;
  }

  try {
    // Format 140 is standard M4A audio. If that fails, fallback to general bestaudio
    await execAsync(`"${binaryPath}" -f 140/bestaudio -o "${outputPath}" "${url}"`);
    return outputPath;
  } catch (error) {
    console.warn('Failed to download audio as format 140, attempting bestaudio fallback...', error);
    try {
      await execAsync(`"${binaryPath}" -f bestaudio -x --audio-format m4a -o "${outputPath}" "${url}"`);
      return outputPath;
    } catch (fallbackError: any) {
      throw new Error(`Audio download failed: ${fallbackError.message}`);
    }
  }
}

// Transcribe Audio via Whisper (Using Groq API)
export async function transcribeAudio(audioPath: string): Promise<TranscriptSegment[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith('gsk_') === false) {
    throw new Error('GROQ_API_KEY environment variable is not configured.');
  }

  const openai = new OpenAI({ 
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-large-v3',
      response_format: 'verbose_json',
    });

    const segments: TranscriptSegment[] = [];
    
    // Parse Whisper segments for high-fidelity timestamps
    if (transcription.segments) {
      for (const seg of transcription.segments) {
        segments.push({
          text: seg.text.trim(),
          startTime: seg.start,
          endTime: seg.end,
        });
      }
    } else {
      // Fallback if segments are missing
      segments.push({
        text: transcription.text,
        startTime: 0,
        endTime: 0,
      });
    }

    return segments;
  } catch (error: any) {
    console.error('Whisper transcription failed:', error);
    throw new Error(`Whisper transcription failed: ${error.message}`);
  }
}

// Fetch YouTube Transcripts using scraper (with fallback)
export async function getYouTubeTranscript(videoId: string): Promise<TranscriptSegment[]> {
  try {
    console.log(`Attempting instant subtitle scrape for YouTube ID: ${videoId}`);
    const transcriptList = await YoutubeTranscript.fetchTranscript(videoId);
    
    return transcriptList.map((item: any) => {
      // YoutubeTranscript item: { text: string, duration: number, offset: number }
      // offset is in milliseconds
      const start = item.offset / 1000;
      const end = start + (item.duration / 1000);
      return {
        text: item.text,
        startTime: start,
        endTime: end,
      };
    });
  } catch (error) {
    console.warn(`Instant subtitle scrape failed for video ${videoId}, will fall back to audio download & Whisper...`, error);
    throw error; // Let the worker know to fall back
  }
}
