import { Router, type IRouter } from "express";

const router: IRouter = Router();

// ── Static subscription plans ──────────────────────────────────────────────
// Extend this array (or replace with a DB query) when plans change.
const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "INR",
    questionLimit: 20,
    durationDays: null, // unlimited (no expiry)
    features: [
      "20 questions per day",
      "Basic subjects",
      "Standard explanations",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    price: 199,
    currency: "INR",
    questionLimit: 200,
    durationDays: 30,
    features: [
      "200 questions per month",
      "All boards & subjects",
      "AI explanations",
      "Flashcards",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 499,
    currency: "INR",
    questionLimit: -1, // unlimited
    durationDays: 30,
    features: [
      "Unlimited questions",
      "All boards & subjects",
      "AI Tutor chat",
      "NTA mock tests",
      "Priority support",
    ],
  },
];

/** GET /api/plans — returns all available subscription plans */
router.get("/plans", (_req, res) => {
  res.json(PLANS);
});

export default router;
