import { Router } from "express";
import { db } from "@workspace/db";
import {
  tokenMetadataTable,
  tokenCommentsTable,
  insertTokenMetadataSchema,
  insertTokenCommentSchema,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

router.get("/tokens/:address/metadata", async (req, res) => {
  const { address } = req.params;
  if (!isValidAddress(address)) {
    res.status(400).json({ error: "Invalid address" });
    return;
  }
  const rows = await db
    .select()
    .from(tokenMetadataTable)
    .where(eq(tokenMetadataTable.tokenAddress, address.toLowerCase()))
    .limit(1);
  if (rows.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(rows[0]);
});

router.post("/tokens/:address/metadata", async (req, res) => {
  const { address } = req.params;
  if (!isValidAddress(address)) {
    res.status(400).json({ error: "Invalid address" });
    return;
  }
  const parsed = insertTokenMetadataSchema.safeParse({
    ...req.body,
    tokenAddress: address.toLowerCase(),
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  await db
    .insert(tokenMetadataTable)
    .values(parsed.data)
    .onConflictDoUpdate({
      target: tokenMetadataTable.tokenAddress,
      set: {
        description: parsed.data.description,
        imageUrl: parsed.data.imageUrl,
        twitter: parsed.data.twitter,
        telegram: parsed.data.telegram,
        website: parsed.data.website,
      },
    });
  res.json({ ok: true });
});

router.get("/tokens/:address/comments", async (req, res) => {
  const { address } = req.params;
  if (!isValidAddress(address)) {
    res.status(400).json({ error: "Invalid address" });
    return;
  }
  const rows = await db
    .select()
    .from(tokenCommentsTable)
    .where(eq(tokenCommentsTable.tokenAddress, address.toLowerCase()))
    .orderBy(desc(tokenCommentsTable.createdAt))
    .limit(100);
  res.json(rows);
});

router.post("/tokens/:address/comments", async (req, res) => {
  const { address } = req.params;
  if (!isValidAddress(address)) {
    res.status(400).json({ error: "Invalid address" });
    return;
  }
  const content = (req.body.content ?? "").trim();
  const commenterAddress = (req.body.commenterAddress ?? "").toLowerCase();
  if (!content || content.length > 500) {
    res.status(400).json({ error: "Content must be 1-500 chars" });
    return;
  }
  if (!isValidAddress(commenterAddress)) {
    res.status(400).json({ error: "Invalid commenter address" });
    return;
  }
  const parsed = insertTokenCommentSchema.safeParse({
    tokenAddress: address.toLowerCase(),
    commenterAddress,
    content,
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [row] = await db.insert(tokenCommentsTable).values(parsed.data).returning();
  res.json(row);
});

// Get all tokens with metadata (paginated)
router.get("/tokens", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const search = (req.query.search as string || "").toLowerCase();

    let query = db.select().from(tokenMetadataTable);
    
    if (search) {
      query = query.where((table) =>
        table.description?.like?.(`%${search}%`) || 
        table.imageUrl?.like?.(`%${search}%`)
      );
    }

    const rows = await query
      .orderBy(desc(tokenMetadataTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data: rows, limit, offset, total: rows.length });
  } catch (error) {
    console.error("Error fetching tokens:", error);
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
});

// Get trending tokens
router.get("/trending", async (req, res) => {
  try {
    const timeWindow = req.query.window as string || "24h";
    // For now return recent tokens as trending
    const rows = await db
      .select()
      .from(tokenMetadataTable)
      .orderBy(desc(tokenMetadataTable.createdAt))
      .limit(10);

    res.json({ data: rows, window: timeWindow });
  } catch (error) {
    console.error("Error fetching trending:", error);
    res.status(500).json({ error: "Failed to fetch trending tokens" });
  }
});

// Search tokens
router.get("/search", async (req, res) => {
  try {
    const query = (req.query.q as string || "").trim();
    if (!query || query.length < 2) {
      res.status(400).json({ error: "Query must be at least 2 characters" });
      return;
    }

    const results = await db
      .select()
      .from(tokenMetadataTable)
      .limit(20);

    const filtered = results.filter((t) =>
      (t.description?.toLowerCase() || "").includes(query.toLowerCase())
    );

    res.json({ data: filtered, query });
  } catch (error) {
    console.error("Error searching:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// Get token statistics
router.get("/tokens/:address/stats", async (req, res) => {
  const { address } = req.params;
  if (!isValidAddress(address)) {
    res.status(400).json({ error: "Invalid address" });
    return;
  }

  try {
    const metadata = await db
      .select()
      .from(tokenMetadataTable)
      .where(eq(tokenMetadataTable.tokenAddress, address.toLowerCase()))
      .limit(1);

    if (!metadata.length) {
      res.status(404).json({ error: "Token not found" });
      return;
    }

    const comments = await db
      .select()
      .from(tokenCommentsTable)
      .where(eq(tokenCommentsTable.tokenAddress, address.toLowerCase()));

    res.json({
      address,
      metadata: metadata[0],
      stats: {
        commentCount: comments.length,
        uniqueCommenters: new Set(comments.map((c) => c.commenterAddress)).size,
        lastActivity: comments[0]?.createdAt || metadata[0]?.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
