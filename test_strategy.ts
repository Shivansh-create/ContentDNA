import { fetchVideoMetadata } from './lib/videoService';

async function run() {
  const meta = await fetchVideoMetadata('https://www.instagram.com/reel/DXWif5DRZNe/');
  console.log(JSON.stringify(meta.extractionLogs, null, 2));
}

run().catch(console.error);
