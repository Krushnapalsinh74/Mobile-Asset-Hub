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
});

router.post("/user/profile", async (req, res) => {
  const { email, name, boardId, boardName, standardId, standardName } = req.body ?? {};
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }
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
});

export default router;
