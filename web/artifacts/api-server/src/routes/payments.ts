import { Router, type IRouter } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db, usersTable, plansTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Initialize Razorpay with test keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_TaHeWHFt5q4qQZ",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "1zdUp7jKBMXjPGAkqORYjvFa",
});

/** POST /api/payments/create-order — Creates a new Razorpay order */
router.post("/payments/create-order", async (req, res) => {
  try {
    const { planId, promoCode } = req.body;
    
    let basePrice = 0;
    let planDiscount = 0;
    let expectedPromo = '';

    try {
      const authHeader = req.headers.authorization;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authHeader) headers["Authorization"] = authHeader;

      console.log("Fetching prod plans with auth header:", authHeader ? "Present" : "Missing");
      const prodPlansRes = await fetch("https://kpark-edu.web.app/api/plans", { headers });
      if (!prodPlansRes.ok) {
        const errText = await prodPlansRes.text().catch(() => "");
        console.error("Prod fetch failed:", prodPlansRes.status, errText);
        throw new Error(`Failed to fetch from prod: ${prodPlansRes.status} ${errText}`);
      }
      const prodPlansRaw = await prodPlansRes.json();
      const plansArray = Array.isArray(prodPlansRaw) ? prodPlansRaw : prodPlansRaw?.data ?? [];
      const plan = plansArray.find((p: any) => String(p.id) === String(planId));
      if (plan) {
         basePrice = plan.price;
         expectedPromo = plan.promoCode || '';
         planDiscount = plan.discountPercent || 0;
      } else {
         return res.status(400).json({ error: "Invalid plan selected. Plan not found in production." });
      }
    } catch(err) {
      console.error("Error fetching plans from prod:", err);
      return res.status(500).json({ error: "Failed to verify plan securely from production." });
    }

    // Apply Promo Code discount
    let finalAmount = basePrice;
    if (promoCode && expectedPromo && promoCode.trim().toUpperCase() === expectedPromo.trim().toUpperCase()) {
      const discountAmount = Math.floor(basePrice * (planDiscount / 100));
      finalAmount = basePrice - discountAmount;
    }

    // Convert INR to paisa
    const options = {
      amount: Math.round(Number(finalAmount) * 100), 
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

/** POST /api/payments/verify — Verifies the Razorpay payment signature */
router.post("/payments/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, activePlanId, activePlanName } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET || "1zdUp7jKBMXjPGAkqORYjvFa";

    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      // If signature matches and we have email/plan, save it to DB
      if (email && activePlanId && db) {
        try {
          await db
            .insert(usersTable)
            .values({ email: email.toLowerCase().trim(), activePlanId, activePlanName })
            .onConflictDoUpdate({
              target: usersTable.email,
              set: { activePlanId, activePlanName, updatedAt: new Date() },
            });
        } catch (dbError) {
          console.error("Failed to update user plan in DB:", dbError);
          // Don't fail the payment if DB insert fails
        }
      }
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ success: false, error: "Verification failed" });
  }
});

export default router;
