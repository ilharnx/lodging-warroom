/**
 * One-time migration: backfill reactionType from legacy value field.
 *
 * Run after `prisma db push` adds the reactionType column:
 *   npx tsx prisma/migrate-reactions.ts
 *
 * Mapping:
 *   value  1 (upvote)   -> reactionType 'love'
 *   value -1 (downvote) -> reactionType 'pass'
 *
 * Safe to run multiple times (idempotent).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.vote.count();
  console.log(`Found ${total} total votes.`);

  // Migrate upvotes -> love
  const upvoted = await prisma.vote.updateMany({
    where: { value: 1 },
    data: { reactionType: "love" },
  });
  console.log(`  ${upvoted.count} upvotes -> 'love'`);

  // Migrate downvotes -> pass
  const downvoted = await prisma.vote.updateMany({
    where: { value: -1 },
    data: { reactionType: "pass" },
  });
  console.log(`  ${downvoted.count} downvotes -> 'pass'`);

  console.log("Migration complete. No votes were lost.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
