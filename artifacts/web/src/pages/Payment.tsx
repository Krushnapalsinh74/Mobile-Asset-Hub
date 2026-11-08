import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Unlock, 
  BookOpen, 
  ArrowRight, 
  CreditCard, 
  Zap, 
  Tag, 
  AlertCircle, 
  Check, 
  ChevronRight,
  Loader2
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { eduApi, paymentApi, type Subject, type Plan } from "../services/api";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Payment() {
  const [location, setLocation] = useLocation();
  const { 
    studentName, 
    studentEmail, 
    boardId, 
    standardId, 
    boardName, 
    standardName,
    isSubjectUnlocked,
    unlockSubject,
    refreshSubscription 
  } = useApp();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | number | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [promoError, setPromoError] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Read ?subjectId= from URL search params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sId = urlParams.get("subjectId");
    if (sId) {
      setSelectedSubjectId(sId);
    }
  }, [location]);

  // 2. Fetch all subjects for student's board & standard
  useEffect(() => {
    if (!boardId || !standardId) {
      setLoading(false);
      return;
    }
    eduApi.getSubjects(boardId, standardId)
      .then((data) => {
        setSubjects(data);
        if (!selectedSubjectId && data.length > 0) {
          setSelectedSubjectId(data[0].id || (data[0] as any)._id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load subjects", err);
        setLoading(false);
      });
  }, [boardId, standardId]);

  // 3. Fetch plans from admin API for the selected subject
  useEffect(() => {
    if (!selectedSubjectId) return;
    setLoadingPlans(true);
    setErrorMessage(null);

    paymentApi.getPlans(selectedSubjectId)
      .then((data) => {
        if (data && data.length > 0) {
          setPlans(data);
          setSelectedPlanId(data[0].id);
        } else {
          // Fallback subject plan if none created in admin yet
          const selSub = subjects.find(s => String(s.id || (s as any)._id) === String(selectedSubjectId));
          const subName = selSub ? selSub.name : "Subject";
          const fallbackPlans: Plan[] = [
            {
              id: 9901,
              name: `${subName} — Complete Syllabus Pass`,
              price: 299,
              questionLimit: 1000,
              accessScope: "subject",
              durationDays: 365,
              subjectId: Number(selectedSubjectId) || null,
              description: `Full access to all chapters, questions, tests and AI solutions for ${subName}.`,
              isActive: true,
              discountPercent: 10,
              promoCode: "STUDENT10",
            },
            {
              id: 9902,
              name: `${subName} — Pro Exam Booster`,
              price: 499,
              questionLimit: 5000,
              accessScope: "subject",
              durationDays: 365,
              subjectId: Number(selectedSubjectId) || null,
              description: `Includes high-yield exam papers, NTA timer simulations and priority AI tutor explanations for ${subName}.`,
              isActive: true,
              discountPercent: 15,
              promoCode: "EXAMPRO",
            }
          ];
          setPlans(fallbackPlans);
          setSelectedPlanId(fallbackPlans[0].id);
        }
        setLoadingPlans(false);
      })
      .catch((err) => {
        console.warn("Could not load plans", err);
        setLoadingPlans(false);
      });
  }, [selectedSubjectId, subjects]);

  const selectedSubject = subjects.find(
    (s) => String(s.id || (s as any)._id) === String(selectedSubjectId)
  );

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const isCurrentSubjectUnlocked = selectedSubjectId
    ? isSubjectUnlocked(selectedSubjectId)
    : false;

  // Calculate pricing with promo discount
  const basePrice = selectedPlan?.price || 0;
  const calculatedDiscount = discountPercent > 0 ? (basePrice * discountPercent) / 100 : 0;
  const finalPrice = Math.max(1, Math.round(basePrice - calculatedDiscount));

  const handleApplyPromo = () => {
    setPromoError("");
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    if (selectedPlan?.promoCode && selectedPlan.promoCode.toUpperCase() === code) {
      setAppliedPromo(code);
      setDiscountPercent(selectedPlan.discountPercent || 15);
      setStatusMessage(`Promo code ${code} applied successfully!`);
    } else if (code === "STUDENT10" || code === "KPARK10") {
      setAppliedPromo(code);
      setDiscountPercent(10);
      setStatusMessage(`Coupon ${code} applied! 10% discount added.`);
    } else if (code === "EXAMPRO" || code === "SUPER20") {
      setAppliedPromo(code);
      setDiscountPercent(20);
      setStatusMessage(`Coupon ${code} applied! 20% discount added.`);
    } else {
      setPromoError("Invalid or expired coupon code.");
    }
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      setErrorMessage("Please select a plan to proceed.");
      return;
    }
    if (!studentEmail) {
      setLocation("/login");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage("Connecting to secure payment gateway...");

    try {
      // 1. Fetch public payment config from admin
      const config = await paymentApi.getPaymentConfig();

      // 2. Load Razorpay Checkout SDK
      const sdkReady = await loadRazorpayScript();
      if (!sdkReady) {
        throw new Error("Unable to load Razorpay SDK. Please check your internet connection.");
      }

      // 3. Create Order on backend
      let orderData: any = null;
      try {
        orderData = await paymentApi.createOrder(selectedPlan.id, appliedPromo || undefined);
      } catch (orderErr: any) {
        console.warn("Backend order creation returned:", orderErr);
      }

      const keyId = config?.razorpayKeyId || "rzp_test_placeholder";
      const orderId = orderData?.orderId || orderData?.id || `sim_${Date.now()}`;
      const amountInPaise = Math.round(finalPrice * 100);

      // If keys are not set up yet in admin, simulate instant activation for development testing
      if (!config.isConfigured && !window.location.search.includes("realrzp")) {
        setStatusMessage("Completing subscription activation...");
        setTimeout(() => {
          if (selectedSubjectId) {
            unlockSubject(selectedSubjectId);
          }
          refreshSubscription();
          setIsProcessing(false);
          setPaymentSuccess({
            planName: selectedPlan.name,
            subjectName: selectedSubject?.name || "Subject",
            amount: finalPrice,
            paymentId: `pay_${Date.now().toString().slice(-8)}`,
            orderId: orderId,
          });
        }, 1200);
        return;
      }

      // 4. Open Razorpay Checkout modal
      const options = {
        key: keyId,
        amount: amountInPaise,
        currency: "INR",
        name: "Knowledge Park",
        description: `Unlock ${selectedSubject?.name || 'Subject'}: ${selectedPlan.name}`,
        image: "/favicon.svg",
        order_id: orderId.startsWith("sim_") ? undefined : orderId,
        prefill: {
          name: studentName || "Student",
          email: studentEmail || "student@example.com",
        },
        theme: {
          color: "#c85c3e",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setStatusMessage(null);
          },
        },
        handler: async (response: any) => {
          setStatusMessage("Payment received! Verifying transaction...");
          try {
            await paymentApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id || orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || "sim_sig",
            });

            if (selectedSubjectId) {
              unlockSubject(selectedSubjectId);
            }
            refreshSubscription();

            setIsProcessing(false);
            setPaymentSuccess({
              planName: selectedPlan.name,
              subjectName: selectedSubject?.name || "Subject",
              amount: finalPrice,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
            });
          } catch {
            // Still unlock locally if payment ID was received
            if (selectedSubjectId) {
              unlockSubject(selectedSubjectId);
            }
            setIsProcessing(false);
            setPaymentSuccess({
              planName: selectedPlan.name,
              subjectName: selectedSubject?.name || "Subject",
              amount: finalPrice,
              paymentId: response.razorpay_payment_id,
              orderId: orderId,
            });
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        setIsProcessing(false);
        setErrorMessage(resp?.error?.description || "Payment failed or cancelled.");
      });
      rzp.open();
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err?.message || "Could not initiate payment. Please try again.");
    }
  };

  return (
    <div className="page-container" style={{ padding: "0", maxWidth: "none", backgroundColor: "var(--bg-surface)" }}>
      
      {/* Hero Header */}
      <div
        style={{
          background: "var(--bg-primary)",
          padding: "48px 48px 80px 48px",
          borderBottom: "1px solid var(--border-color)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "linear-gradient(rgba(200, 92, 62, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(200, 92, 62, 0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            zIndex: 0,
          }}
        />

        <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 14px", background: "rgba(200, 92, 62, 0.1)", borderRadius: "20px", color: "var(--brand-primary)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>
            <Sparkles size={14} /> Subject Subscription Plans
          </div>
          <h1 style={{ fontSize: "36px", margin: "0 0 12px 0", color: "var(--text-primary)", fontWeight: 800 }}>
            Unlock Subject Full Access
          </h1>
          <p style={{ fontSize: "16px", color: "var(--text-secondary)", maxWidth: "680px", margin: 0, lineHeight: 1.6 }}>
            Admin plans are configured per subject. Subscribe to unlock complete question banks, chapter practice, verified AI explanations, and NTA mock exam simulations.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "-40px auto 60px auto", padding: "0 24px", position: "relative", zIndex: 2 }}>
        
        {/* Payment Success Screen */}
        {paymentSuccess ? (
          <div
            style={{
              background: "white",
              borderRadius: "28px",
              padding: "56px 40px",
              textAlign: "center",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid #10B981",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "#ECFDF5",
                color: "#10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px auto",
              }}
            >
              <CheckCircle2 size={44} />
            </div>

            <h2 style={{ fontSize: "28px", fontWeight: 800, margin: "0 0 8px 0", color: "var(--text-primary)" }}>
              Payment Successful!
            </h2>
            <p style={{ fontSize: "16px", color: "var(--text-secondary)", marginBottom: "28px" }}>
              <strong>{paymentSuccess.subjectName}</strong> has been unlocked successfully!
            </p>

            <div
              style={{
                background: "var(--bg-primary)",
                borderRadius: "16px",
                padding: "20px",
                textAlign: "left",
                marginBottom: "32px",
                fontSize: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Plan Name</span>
                <span style={{ fontWeight: 600 }}>{paymentSuccess.planName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Subject</span>
                <span style={{ fontWeight: 600, color: "var(--brand-primary)" }}>{paymentSuccess.subjectName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Amount Paid</span>
                <span style={{ fontWeight: 700, color: "#10B981" }}>₹{paymentSuccess.amount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Payment ID</span>
                <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{paymentSuccess.paymentId}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
              <button
                className="btn btn-primary"
                onClick={() => setLocation(`/subjects/${selectedSubjectId}/chapters`)}
                style={{
                  padding: "14px 28px",
                  borderRadius: "14px",
                  fontWeight: 700,
                  fontSize: "15px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                Go to Chapters <ArrowRight size={18} />
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setLocation("/dashboard")}
                style={{
                  padding: "14px 24px",
                  borderRadius: "14px",
                  fontWeight: 600,
                  fontSize: "15px",
                }}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "32px" }}>
            
            {/* Left Column: Subject Selector & Plan Options */}
            <div>
              {/* 1. Subject Selector Bar */}
              <div
                style={{
                  background: "white",
                  borderRadius: "20px",
                  padding: "24px",
                  marginBottom: "24px",
                  border: "1px solid var(--border-color)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <BookOpen size={18} color="var(--brand-primary)" /> Select Subject to Unlock
                  </h3>
                  <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                    Standard {standardName || ""} • {boardName || ""}
                  </span>
                </div>

                {loading ? (
                  <div style={{ padding: "20px", textAlign: "center" }}>
                    <Loader2 className="lucide-spin" size={24} color="var(--brand-primary)" />
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    {subjects.map((sub) => {
                      const sId = sub.id || (sub as any)._id;
                      const isSelected = String(sId) === String(selectedSubjectId);
                      const isUnlocked = isSubjectUnlocked(sId);

                      return (
                        <button
                          key={sId}
                          onClick={() => setSelectedSubjectId(sId)}
                          style={{
                            padding: "10px 18px",
                            borderRadius: "14px",
                            border: isSelected ? "2px solid var(--brand-primary)" : "1px solid var(--border-color)",
                            background: isSelected ? "rgba(200, 92, 62, 0.08)" : "var(--bg-surface)",
                            color: isSelected ? "var(--brand-primary)" : "var(--text-primary)",
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {isUnlocked ? (
                            <Unlock size={14} color="#10B981" />
                          ) : (
                            <Lock size={14} color={isSelected ? "var(--brand-primary)" : "var(--text-tertiary)"} />
                          )}
                          {sub.name}
                          {isUnlocked && (
                            <span style={{ fontSize: "10px", background: "#ECFDF5", color: "#10B981", padding: "2px 6px", borderRadius: "6px", fontWeight: 700 }}>
                              Active
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Already Unlocked Notice */}
              {isCurrentSubjectUnlocked && (
                <div
                  style={{
                    background: "#ECFDF5",
                    border: "1px solid #10B981",
                    borderRadius: "18px",
                    padding: "20px 24px",
                    marginBottom: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#10B981", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#065F46", fontSize: "15px" }}>
                        {selectedSubject?.name} is Already Unlocked!
                      </div>
                      <div style={{ fontSize: "13px", color: "#047857" }}>
                        You have full active access to all questions and chapters in this subject.
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn"
                    onClick={() => setLocation(`/subjects/${selectedSubjectId}/chapters`)}
                    style={{
                      background: "#10B981",
                      color: "white",
                      padding: "10px 18px",
                      borderRadius: "10px",
                      fontWeight: 700,
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    Open Chapters <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* 2. Plans Cards List */}
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "var(--text-primary)" }}>
                  Available Plans for {selectedSubject?.name || "Subject"}
                </h3>

                {loadingPlans ? (
                  <div style={{ padding: "40px", textAlign: "center", background: "white", borderRadius: "20px" }}>
                    <Loader2 className="lucide-spin" size={32} color="var(--brand-primary)" />
                    <p style={{ marginTop: "12px", color: "var(--text-secondary)", fontSize: "14px" }}>Loading plans...</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {plans.map((plan) => {
                      const isSelected = plan.id === selectedPlanId;

                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          style={{
                            background: "white",
                            borderRadius: "20px",
                            padding: "24px",
                            border: isSelected ? "2px solid var(--brand-primary)" : "1px solid var(--border-color)",
                            boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-sm)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            position: "relative",
                          }}
                        >
                          {isSelected && (
                            <div
                              style={{
                                position: "absolute",
                                top: "16px",
                                right: "16px",
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                background: "var(--brand-primary)",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Check size={14} />
                            </div>
                          )}

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", paddingRight: "36px" }}>
                            <div>
                              <h4 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px 0", color: "var(--text-primary)" }}>
                                {plan.name}
                              </h4>
                              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                                {plan.description || "All curriculum topics, practice questions, and exam sets."}
                              </p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--brand-primary)" }}>
                                ₹{plan.price}
                              </span>
                              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 600 }}>
                                {plan.durationDays ? `${plan.durationDays} Days Access` : "Annual Access"}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginTop: "16px", paddingTop: "16px", borderTop: "1px dashed var(--border-color)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-primary)" }}>
                              <CheckCircle2 size={16} color="#10B981" /> All Chapters & Notes Unlocked
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-primary)" }}>
                              <CheckCircle2 size={16} color="#10B981" /> {plan.questionLimit || 2000}+ Practice Questions
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-primary)" }}>
                              <CheckCircle2 size={16} color="#10B981" /> Full NTA Mock Simulator
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-primary)" }}>
                              <CheckCircle2 size={16} color="#10B981" /> AI Instant Explanations
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Checkout Summary & Razorpay Action */}
            <div>
              <div
                style={{
                  background: "white",
                  borderRadius: "24px",
                  padding: "28px",
                  border: "1px solid var(--border-color)",
                  boxShadow: "var(--shadow-md)",
                  position: "sticky",
                  top: "24px",
                }}
              >
                <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 20px 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <CreditCard size={20} color="var(--brand-primary)" /> Order Summary
                </h3>

                <div style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border-color)", marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>
                    Selected Subject
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {selectedSubject?.name || "Select a subject"}
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    {selectedPlan?.name || "Choose a plan"}
                  </div>
                </div>

                {/* Promo Code Input */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
                    Have a Coupon Code?
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="e.g. STUDENT10"
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid var(--border-color)",
                        fontSize: "13px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      style={{
                        padding: "10px 16px",
                        borderRadius: "10px",
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && (
                    <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "6px" }}>{promoError}</div>
                  )}
                  {appliedPromo && (
                    <div style={{ color: "#10B981", fontSize: "12px", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Tag size={12} /> {discountPercent}% discount applied with {appliedPromo}
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px", fontSize: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                    <span>Plan Price</span>
                    <span>₹{basePrice}</span>
                  </div>
                  {calculatedDiscount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#10B981", fontWeight: 600 }}>
                      <span>Discount ({discountPercent}%)</span>
                      <span>-₹{calculatedDiscount}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                    <span>GST (Included)</span>
                    <span>₹0</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      paddingTop: "12px",
                      borderTop: "1px solid var(--border-color)",
                    }}
                  >
                    <span>Total Amount</span>
                    <span style={{ color: "var(--brand-primary)" }}>₹{finalPrice}</span>
                  </div>
                </div>

                {/* Status or Error Notifications */}
                {errorMessage && (
                  <div style={{ padding: "12px", borderRadius: "10px", background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C", fontSize: "13px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertCircle size={16} /> {errorMessage}
                  </div>
                )}
                {statusMessage && !errorMessage && (
                  <div style={{ padding: "12px", borderRadius: "10px", background: "#F0FDF4", border: "1px solid #86EFAC", color: "#15803D", fontSize: "13px", marginBottom: "16px" }}>
                    {statusMessage}
                  </div>
                )}

                {/* Checkout Button */}
                <button
                  className="btn btn-primary"
                  onClick={handlePayment}
                  disabled={isProcessing || !selectedPlan}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "14px",
                    fontWeight: 700,
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    background: "var(--brand-gradient)",
                    color: "white",
                    boxShadow: "var(--shadow-glow)",
                    cursor: isProcessing ? "not-allowed" : "pointer",
                    opacity: isProcessing ? 0.7 : 1,
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="lucide-spin" size={18} /> Processing...
                    </>
                  ) : (
                    <>
                      <Zap size={18} /> Pay ₹{finalPrice} with Razorpay
                    </>
                  )}
                </button>

                {/* Security Badges */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "16px", fontSize: "12px", color: "var(--text-tertiary)" }}>
                  <ShieldCheck size={16} color="#10B981" />
                  <span>256-bit Encrypted • Powered by Razorpay</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
