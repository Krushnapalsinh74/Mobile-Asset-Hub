import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, Zap, Star, Rocket } from "lucide-react";
import { subscriptionApi, type SubscriptionPlan } from "../services/api";
import { useApp } from "../context/AppContext";

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Star size={28} style={{ color: "#94a3b8" }} />,
  basic: <Zap size={28} style={{ color: "#6366f1" }} />,
  premium: <Rocket size={28} style={{ color: "#f59e0b" }} />,
};

const PLAN_COLORS: Record<string, { border: string; badge?: string }> = {
  free:    { border: "var(--border-color)" },
  basic:   { border: "#6366f1", badge: "Popular" },
  premium: { border: "#f59e0b", badge: "Best Value" },
};

export default function PricingPage() {
  const [_, setLocation] = useLocation();
  const { plans, setActivePlan, isAuthenticated, activePlanId } = useApp();
  const [loading, setLoading] = useState(plans.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [localPlans, setLocalPlans] = useState<SubscriptionPlan[]>(plans);

  useEffect(() => {
    if (plans.length > 0) {
      setLocalPlans(plans);
      setLoading(false);
      return;
    }
    subscriptionApi.getPlans()
      .then(data => {
        setLocalPlans(data);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message || "Failed to load plans");
        setLoading(false);
      });
  }, [plans]);

  const handleSelect = (plan: SubscriptionPlan) => {
    const planId = String(plan.id);
    setActivePlan(planId);

    if (plan.price === 0) {
      // Free plan — go straight to onboarding / dashboard
      setLocation(isAuthenticated ? "/onboarding" : "/login");
    } else {
      // Paid plan — redirect to register/payment (pass planId)
      setLocation(`/register?planId=${planId}`);
    }
  };

  return (
    <div
      className="page-container"
      style={{ maxWidth: "900px", margin: "0 auto", paddingTop: "48px", paddingBottom: "64px" }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: "999px",
            padding: "6px 16px",
            fontSize: "13px",
            color: "#818cf8",
            marginBottom: "20px",
            fontWeight: 600,
          }}
        >
          <Zap size={14} /> Choose Your Plan
        </div>
        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-1px",
            marginBottom: "14px",
          }}
        >
          Unlock Your Learning Potential
        </h1>
        <p style={{ fontSize: "16px", color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto" }}>
          Choose the plan that fits your goals. Upgrade or downgrade any time.
        </p>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px" }}>
          <Loader2 className="lucide-spin" size={36} color="var(--text-tertiary)" />
        </div>
      ) : error ? (
        <p style={{ textAlign: "center", color: "#f87171", fontSize: "15px" }}>{error}</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "24px",
          }}
        >
          {localPlans.map(plan => {
            const planId = String(plan.id);
            const colors = PLAN_COLORS[planId] ?? { border: "var(--border-color)" };
            const icon = PLAN_ICONS[planId] ?? <Star size={28} />;
            const isActive = activePlanId === planId;
            const isFree = plan.price === 0;

            return (
              <div
                key={plan.id}
                className="card"
                style={{
                  borderColor: isActive ? colors.border : undefined,
                  borderWidth: isActive ? "2px" : "1px",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0",
                  padding: "28px 24px",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 20px 40px rgba(0,0,0,0.25)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "";
                }}
              >
                {/* Badge */}
                {colors.badge && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-13px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: colors.border,
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "4px 14px",
                      borderRadius: "999px",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {colors.badge}
                  </div>
                )}

                {/* Icon + Name */}
                <div style={{ marginBottom: "16px" }}>{icon}</div>
                <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "4px", color: "var(--text-primary)" }}>
                  {plan.name}
                </h3>

                {/* Price */}
                <div style={{ marginBottom: "24px" }}>
                  <span style={{ fontSize: "36px", fontWeight: 800, color: isFree ? "var(--text-primary)" : colors.border }}>
                    {isFree ? "Free" : `₹${plan.price}`}
                  </span>
                  {!isFree && (
                    <span style={{ fontSize: "13px", color: "var(--text-tertiary)", marginLeft: "4px" }}>/month</span>
                  )}
                </div>

                {/* Question limit */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "20px",
                    padding: "10px 14px",
                    background: "var(--bg-primary)",
                    borderRadius: "10px",
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                  }}
                >
                  <CheckCircle2 size={16} color="#10b981" />
                  {plan.questionLimit === -1
                    ? "Unlimited questions"
                    : `${plan.questionLimit} questions`}
                </div>

                {/* CTA */}
                <button
                  className={`btn ${!isFree ? "btn-primary" : ""}`}
                  onClick={() => handleSelect(plan)}
                  style={{
                    marginTop: "auto",
                    width: "100%",
                    justifyContent: "center",
                    padding: "12px",
                    fontSize: "15px",
                    fontWeight: 600,
                    borderRadius: "12px",
                    background: isActive
                      ? "#10b981"
                      : isFree
                      ? "var(--bg-primary)"
                      : undefined,
                    border: isFree ? "1px solid var(--border-color)" : undefined,
                    color: isActive ? "#fff" : undefined,
                    cursor: "pointer",
                    boxShadow: !isFree ? "var(--shadow-glow)" : undefined,
                  }}
                >
                  {isActive ? "✓ Current Plan" : isFree ? "Get Started Free" : "Select Plan"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <p
        style={{
          textAlign: "center",
          marginTop: "40px",
          fontSize: "13px",
          color: "var(--text-tertiary)",
        }}
      >
        All plans include access to boards, standards, and subjects. Paid plans unlock AI features &amp; unlimited questions.
      </p>
    </div>
  );
}
