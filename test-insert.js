import { PrismaClient } from './generated/prisma/index.js';

const prisma = new PrismaClient();

const run = async () => {
  const msg = "Hello GitHub at " + new Date().toLocaleString();

  await prisma.testInsert.create({
    data: {
      message: msg,
    },
  });

  console.log("✅ Inserted:", msg);
  await prisma.$disconnect();
};

run().catch(async (err) => {
  console.error("❌ Error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
