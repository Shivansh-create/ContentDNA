import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.video.findMany({orderBy:{createdAt:'desc'},take:2,select:{id:true, createdAt:true}})
  .then(x => console.log(JSON.stringify(x, null, 2)))
  .finally(() => prisma.$disconnect());
