import { Router, type IRouter } from "express";
import { db, plansTable } from "@workspace/db";

const router: IRouter = Router();

/** GET /api/plans — returns all available subscription plans */
router.get("/plans", async (_req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database connection failed" });
    }
    const allPlans = await db.select().from(plansTable);
    res.json(allPlans);
  } catch (err) {
    console.error("Error fetching plans:", err);
    res.status(500).json({ error: "Could not fetch plans" });
  }
});

export default router;
