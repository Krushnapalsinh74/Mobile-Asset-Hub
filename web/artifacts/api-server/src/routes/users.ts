import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/user/profile", async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email) {
    res.status(400).json({ error: "email query param required" });
    return;
  }

  // No database configured — treat as "not found" so the app falls back to AsyncStorage
  if (!db) {
    res.status(404).json({ error: "not found" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);
    if (rows.length === 0) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(rows[0]);
  } catch {
    // DB not reachable or schema not yet pushed — not found is the safe fallback
    res.status(404).json({ error: "not found" });
  }
});

router.post("/user/profile", async (req, res) => {
  const { email, name, boardId, boardName, standardId, standardName } = req.body ?? {};
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  // No database configured — silently succeed so the app isn't blocked
  if (!db) {
    res.json({ success: true });
    return;
  }

  try {
    const record = {
      email: String(email).toLowerCase().trim(),
      ...(name         != null && { name:         String(name) }),
      ...(boardId      != null && { boardId:      String(boardId) }),
      ...(boardName    != null && { boardName:    String(boardName) }),
      ...(standardId   != null && { standardId:   String(standardId) }),
      ...(standardName != null && { standardName: String(standardName) }),
      updatedAt: new Date(),
    };
    await db
      .insert(usersTable)
      .values(record)
      .onConflictDoUpdate({
        target: usersTable.email,
        set: { ...record },
      });
    res.json({ success: true });
  } catch {
    // DB not reachable or schema not yet pushed — silently succeed
    res.json({ success: true });
  }
});

export default router;
