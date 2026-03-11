import { Router } from "express";
import { eq } from "drizzle-orm";
import { profiles } from "@hiveclip/db";
import { requireAuth } from "../middleware/auth.js";
import type { Db } from "../app.js";

export function createAuthRouter(db: Db) {
  const router = Router();

  router.get("/me", requireAuth, async (req, res) => {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, req.user!.id)).limit(1);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json({
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      createdAt: profile.createdAt?.toISOString(),
    });
  });

  return router;
}
