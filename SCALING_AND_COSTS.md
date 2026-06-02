# Scaling & Cost Optimization Analysis

This document details the financial model, cloud bills, bottlenecks, and scaling strategies for **ContentDNA** operating at **1,000 creators/day** (assuming each creator compares 2 videos, totaling 2,000 video analyses per day).

---

## 1. Baseline Scaling Assumptions

- **Target Capacity**: 1,000 creators/day (2,000 videos processed/day).
- **Average Video Duration**: 10 minutes (600 seconds) for YouTube; 1 minute (60 seconds) for Instagram Reels.
- **YouTube vs. Instagram split**: 80% YouTube (1,600 videos), 20% Instagram Reels (400 videos).
- **YouTube Subtitle Scrape Success Rate**: 90% (subtitles retrieved instantly for $0).
- **Whisper Speech-to-Text Fallback Rate**: 10% of YouTube (160 videos) + 100% of Instagram Reels (400 videos) = 560 Whisper transcriptions/day.
- **Average Word Count per Video**: 1,500 words (approx. 2,000 tokens).
- **Number of Chunks per Video**: 15 chunks (based on ~600 character chunks with overlap).
- **Database queries per comparison**: ~5 relational queries, 1 vector search query per chat message.

---

## 2. Granular Unit Cost Model (Per Creator Comparison)

Each creator comparison processes **2 videos**. We calculate the cost under two scenarios:
1. **Scenario A (Golden Path)**: Both videos have subtitles available instantly (100% YouTube scrapers).
2. **Scenario B (Fallback Path)**: Both videos require audio downloading and Whisper transcription.

### API Cost Breakdown (OpenAI Pricing Model):
- **text-embedding-3-small**: $0.00002 / 1,000$ tokens.
- **Whisper Speech-to-Text**: $0.006 / $ minute.
- **GPT-4o (Deep Analysis Report)**: Input: $2.50 / 1M$ tokens, Output: $10.00 / 1M$ tokens.
- **GPT-4o-mini (SSE Conversational Chat - 3 turns average)**: Input: $0.150 / 1M$ tokens, Output: $0.600 / 1M$ tokens.

### scenario A: Direct Subtitle Scrapes (80% of transactions)
| Step | Calculation | Cost ($) |
| :--- | :--- | :--- |
| **Metadata Extraction** | `yt-dlp` info scraper (Self-hosted compute) | $0.00000 |
| **Transcript Scrape** | YouTube timedtext endpoint (Free scraper) | $0.00000 |
| **OpenAI Embeddings** | 30 chunks * 150 words = 4,500 tokens = 4.5 * $0.00002 | $0.00009 |
| **GPT-4o Comparative Report** | Input: ~10k tokens ($0.025) + Output: ~1k tokens ($0.010) | $0.03500 |
| **RAG Chat (3 turns)** | Input: ~3k tokens * 3 ($0.00135) + Output: ~300 * 3 ($0.00054) | $0.00189 |
| **Total Scenario A** | **Direct Scrape Cost per Creator** | **$0.03698** |

### Scenario B: Audio Downloading & Whisper Fallback (20% of transactions)
Assuming 10-minute average length:
| Step | Calculation | Cost ($) |
| :--- | :--- | :--- |
| **Whisper Transcription** | 2 videos * 10 mins = 20 mins * $0.006 / min | $0.12000 |
| **OpenAI Embeddings** | 30 chunks * 150 words = 4.5k tokens = 4.5 * $0.00002 | $0.00009 |
| **GPT-4o Comparative Report** | Input: 10k tokens ($0.025) + Output: 1k tokens ($0.010) | $0.03500 |
| **RAG Chat (3 turns)** | Input: ~9k tokens ($0.00135) + Output: ~900 tokens ($0.00054) | $0.00189 |
| **Total Scenario B** | **Whisper Fallback Cost per Creator** | **$0.15698** |

---

## 3. Projected Run Costs

### Per Creator (Weighted Average):
- `(80% * Scenario A) + (20% * Scenario B)`
- `(0.80 * $0.03698) + (0.20 * $0.15698) = $0.02958 + $0.03140 = $0.06098`
- **Estimated API Cost per Creator**: **~$0.06** (Six Cents).

### Per 1,000 Creators (Daily Operations):
- `1,000 creators * $0.06098 = $60.98 / day`
- **Monthly API Operating Cost**: **$1,829.40 / month**.

---

## 4. Infrastructure Scaling Considerations

Operating a stable event-driven queue for **2,000 video processes/day** requires specific server alignments.

### A. Bottlenecks
1. **Network Bandwidth (Audio Downloads)**:
   - 20% of 2,000 videos = 400 videos/day requiring audio download.
   - 400 * 10MB average audio file = 4GB downloaded/day.
   - Heavy network download speeds are required on the worker node.
2. **Rate Limits & IP Blocking**:
   - YouTube heavily throttles IP addresses making too many anonymous scraper requests.
   - *Mitigation*: Run background workers behind a **residential proxy pool** (rotating proxies for `yt-dlp` and subtitle scrapers).
3. **Database Connection Pooling**:
   - Decoupled worker concurrency and serverless edge functions can quickly exhaust PostgreSQL's `max_connections` (usually capped at 100 on small DB sizes).
   - *Mitigation*: We integrated a connection-pooling setup and recommend using **PgBouncer** or **Prisma Accelerate** in cloud environments.

### B. Node Worker & Redis Size
- **Redis Node**: Standard `cache.t4g.micro` on AWS ElastiCache ($12/month) can easily handle the memory throughput for 2,000 active jobs.
- **Worker Concurrency Limit**: Set `concurrency: 2` (or 4 on a 2-core CPU instance) to prevent CPU starvation during Whisper payload parsing and embedding cycles.
- **Docker Worker Host**: A single general-purpose container (e.g. 2 vCPU, 4GB RAM) can easily orchestrate the pipeline asynchronously.

---

## 5. Cost Optimization Opportunities

To reduce the operating bill as we scale:
1. **Embeddings Dimension Tuning**:
   - `text-embedding-3-small` supports native dimension reduction. We can reduce dimensions from `1536` to `512` in our query parameter. This reduces pgvector storage size and memory cache requirements by **66%** with less than 1% loss in accuracy.
2. **Semantic Caching**:
   - Creators often compare the *exact same* viral video multiple times.
   - *Mitigation*: Before enqueuing a job, check if the `externalId` already exists in our `Video` table. If it exists and was analyzed in the last 7 days, **clone its transcript, chunks, and embeddings** to the new `Comparison` record. This cuts Whisper and embedding costs for repeating videos to **$0**.
3. **Open-Source Local Models for Whisper**:
   - As volume grows beyond 5,000 videos/day, migrate Whisper transcription from OpenAI's cloud API to a self-hosted **Whisper.cpp** or **Faster-Whisper** container running on an on-premise GPU instance (e.g. NVIDIA T4 or L4). This drops the per-minute speech-to-text cost to **near-zero** (only hardware utility).
