# System Limitations & Future Roadmap

This document outlines the known architectural weaknesses, edge cases, failure modes, and API limits of **ContentDNA**, along with a highly tactical future roadmap for continuous production improvement.

---

## 1. Known Architectural Weaknesses & Edge Cases

### A. Subtitle Scraper Fragility (YouTube timedtext)
- **Weakness**: Scraped subtitles fetch data from YouTube's internal Web Player endpoints using anonymous requests. This is fragile because:
  1. YouTube periodically updates its timedtext signatures or HTML layouts, which can temporarily break packages like `youtube-transcript`.
  2. If the worker server runs on a cloud provider IP range (e.g. AWS EC2, GCP GCE), YouTube quickly flag and block the IP, returning a 429 Too Many Requests or a captcha challenge.
- **Current Mitigation**: Handled gracefully. When the scrape fails, the system automatically falls back to downloading the M4A stream via `yt-dlp` and transcribing it using **OpenAI Whisper**.
- **Edge Case**: If BOTH the subtitle scraper fails AND the creator's OpenAI API key is rate-limited, the job will fail.

### B. High-Fidelity Audio Scrape Constraints (yt-dlp)
- **Weakness**: Instagram Reels are heavily protected by Meta's bot-detection algorithms.
- **Edge Case**: If `yt-dlp` makes too many sequential requests to Instagram from the same IP, Meta will block the IP, and `yt-dlp` will return a `"Sign in to view this video"` or connection reset error.
- **Current Mitigation**: We catch all child-process exceptions, update the DB status to `FAILED`, and log the error stack.

### C. Multi-Turn Memory Exceeding Context Limits
- **Weakness**: The RAG chatbot maintains context history by pulling the past 10 messages from the database.
- **Edge Case**: If the user sends massive paragraphs or the LLM returns extensive outputs, 10 messages can exceed 15,000 tokens. This causes higher latency and rising OpenAI input costs.
- **Current Mitigation**: We use a tight sliding memory window of 10 messages and leverage `gpt-4o-mini` which is highly resilient and cost-effective.

---

## 2. Real-World Failure Cases & Resolution Paths

| Failure Scenario | Technical Cause | System Reaction / Recovery Path |
| :--- | :--- | :--- |
| **Silent Video Upload** | Creator compares a video with no speech (e.g., a background music montage). | Whisper returns an empty transcript. The segment chunker emits 0 chunks. The system gracefully continues, generating the comparative report with a warning: *"Video contains no spoken transcripts, analysis based on engagement rates and metadata."* |
| **Extremely Long Videos** | Creator submits two 2-hour podcast links instead of short social videos. | Downloading and transcribing 4 hours of audio will: (a) Time out the Whisper API (max file size 25MB), (b) Overload the node worker memory. |
| **Duplicate URL Submissions** | Two creators submit the same comparison pair simultaneously. | BullMQ handles this natively by setting the comparison ID as the `jobId`. Redis rejects the duplicate queue entry, and both client pages hook into the exact same active background job. |
| **Vector DB Connection Blip** | DB socket closes during batch vector inserts. | BullMQ intercepts the error, leaves the job in `failed`, and triggers the retry mechanism (attempt 2 of 3) after a 5-second exponential backoff delay. |

---

## 3. API & Infrastructure Limits

1. **OpenAI Whisper API File Limit**:
   - OpenAI's `/v1/audio/transcriptions` endpoint is limited to **25MB**.
   - If we download a video's audio and the resulting `.m4a` file is larger than 25MB, the Whisper API will reject the request with HTTP 400.
   - *Current Workaround*: We download only native high-compression audio (`-f 140` is ~128kbps, meaning a 25MB file allows up to **27 minutes** of audio, which safely covers social videos).
2. **PostgreSQL Connection Limits**:
   - High concurrent users trigger Next.js hot-rebuilds and worker concurrency, exceeding standard PostgreSQL client pools.
   - *Current Workaround*: We implemented a singleton database client that reuses active socket pools.

---

## 4. High-Priority Future Improvements

To take the platform from production-grade to **world-class**:
1. **Audio Splitting & Chunking**:
   - Implement an automated node audio splitter (using a library like `fluent-ffmpeg` or simple byte-range slicers) that cuts audio files larger than 25MB into 10-minute chunks, transcribes them in parallel, and merges the resulting segments. This will unlock the ability to compare **unlimited-length videos and podcasts**.
2. **Visual Frame Analysis (Multimodal RAG)**:
   - True video comparison should analyze not just what was *said* (transcript), but what was *shown* (visual hooks, text overlays, color grading).
   - *Roadmap*: Write a worker step that uses `ffmpeg` to capture frames every 2 seconds, runs them through GPT-4o-Vision to extract visual metadata (e.g. "red text overlay: DO NOT IGNORE", "dramatic camera zoom"), indexes these visual descriptions into the same pgvector database, and joins them in our conversational RAG prompt!
3. **Rotating Proxy Integration**:
   - Fully integrate proxy options inside `lib/videoService.ts` so `yt-dlp` and `youtube-transcript` automatically cycle their outbound IP requests through a residential proxy network (e.g. Bright Data or Oxylabs), guaranteeing 100% metadata extraction uptime.
