import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const recentVideos = await prisma.video.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2,
    select: {
      id: true,
      platform: true,
      url: true,
      title: true,
      views: true,
      followerCount: true,
      extractionLogs: true,
    }
  });

  console.log(JSON.stringify(recentVideos, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
