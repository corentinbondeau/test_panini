import { prisma } from "../src/lib/prisma";
import { COLLECTIONS } from "../src/data/cards";

async function seedCollections() {
  console.log("Seeding collections...");

  for (const col of COLLECTIONS) {
    const existing = await prisma.collection.findUnique({
      where: { slug: col.id },
    });

    if (!existing) {
      await prisma.collection.create({
        data: {
          name: col.name,
          slug: col.id,
        },
      });
      console.log(`  Created collection: ${col.name} (${col.id})`);
    } else {
      console.log(`  Already exists: ${col.name} (${col.id})`);
    }
  }

  console.log("Done.");
}

seedCollections()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
