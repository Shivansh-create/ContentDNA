# ContentDNA

internal tool for RAG over youtube videos. 

built this to quickly ingest yt transcripts and chat with them using local embeddings so we dont burn through API credits. using groq for the llm part since it's fast.

### tech stack
- next.js (app router)
- prisma (postgres)
- bullmq + redis for background queues (fetching transcripts takes a while so it has to run in background)
- langchain + transformers.js for local embeddings
- groq for the chat

### setup

1. `npm i`
2. copy `.env.example` to `.env` and drop in the groq key + db connection strings.
3. run `npx prisma db push` to sync the schema. (use `npm run db:studio` if u want to see the db)
4. make sure redis is running locally first!
5. you need two terminals to run this:
   - term 1: `npm run worker` (handles the queue)
   - term 2: `npm run dev` (starts the ui)

**notes:**
- i dropped `yt-dlp.exe` in the root folder so it works on windows out of the box. if we deploy to linux we'll need to install it globally or swap the binary.
- first time you run it, transformers.js will download the embedding model to cache. it might hang for a second but just let it finish.

### todo
- [ ] add pdf support later
- [ ] better error handling on jobs (bullmq sometimes silently fails if redis drops)
- [ ] migrate off local db if we push to prod
