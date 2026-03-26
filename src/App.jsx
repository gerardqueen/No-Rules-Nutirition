import { useState, useEffect, useRef } from "react";
import FOOD_DB from "./foodDb";

// ✅ Live backend config + auth helpers
const API_BASE = import.meta.env.VITE_API_URL || 'https://no-rules-api-production.up.railway.app';
const TOKEN_KEY = 'nrn_token';
const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
const authHeaders = (extra = {}) => {
  const t = getToken();
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...extra,
  };
};
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: authHeaders(options.headers || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}


// ── Google Fonts ──────────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap";
document.head.appendChild(fontLink);


// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg: "#0a0a0a",
  surface: "#111111",
  card: "#161616",
  border: "#1f1f1f",
  accent: "#FF9A52",
  accentDim: "#c4702a",
  text: "#f0f0f0",
  muted: "#666",
  protein: "#f97316",
  carbs: "#3b82f6",
  fat: "#a855f7",
  calories: "#FF9A52",
  mfp: "#0084ff",
  coachGreen: "#22c55e",
  danger: "#ef4444",
};

// ── Demo accounts ─────────────────────────────────────────────────────────────
const ACCOUNTS = [];

// ── Helpers ───────────────────────────────────────────────────────────────────
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"];
let macroGoals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
let macroGoalsByDay = {}; // { MON: {calories, protein, carbs, fat}, ... }
function getGoalsForDate(dateStr) {
  const dk = dateStrToDayKey(dateStr);
  return macroGoalsByDay[dk] || macroGoals;
}

// Convert day key (MON/TUE/…) to YYYY-MM-DD for the current week
function dayKeyToDate(dayKey) {
  const today = new Date();
  const todayDow = today.getDay(); // 0=Sun
  const todayIdx = todayDow === 0 ? 6 : todayDow - 1; // 0=Mon … 6=Sun
  const targetIdx = DAYS.indexOf(dayKey);
  if (targetIdx < 0) return null;
  const diff = targetIdx - todayIdx;
  const d = new Date(today);
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dateToISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Get the 7 dates (Mon-Sun) for the current week
function getCurrentWeekDates() {
  const today = new Date();
  const todayDow = today.getDay(); // 0=Sun
  const todayIdx = todayDow === 0 ? 6 : todayDow - 1; // 0=Mon
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + (i - todayIdx));
    dates.push({ dayKey: DAYS[i], date: dateToISO(d), isToday: i === todayIdx });
  }
  return dates;
}

// Convert YYYY-MM-DD → "MON"/"TUE"/etc
function dateStrToDayKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay();
  return DAYS[dow === 0 ? 6 : dow - 1];
}

// Get today's date as YYYY-MM-DD
function getTodayISO() { return dateToISO(new Date()); }

// ── USDA FoodData Central Database (8,200+ foods) ────────────────────────────
// Fields: n=name, c=calories/100g, p=protein/100g, b=carbs/100g, f=fat/100g
/* FOOD_DB moved to src/foodDb.js */

// Helper: get macros for a food item at a given gram weight
function scaleMacros(item, grams) {
  const r = grams / 100;
  return {
    name: item.n + (grams !== 100 ? ` (${grams}g)` : " (100g)"),
    calories: Math.round(item.c * r),
    protein: Math.round(item.p * r),
    carbs: Math.round(item.b * r),
    fat: Math.round(item.f * r),
  };
}

// initWeekPlan starts empty — keyed by YYYY-MM-DD for the current week
const initWeekPlan = () => {
  const plan = {};
  getCurrentWeekDates().forEach(({ date }) => {
    plan[date] = {};
    MEALS.forEach((m) => {
      plan[date][m] = [];
    });
  });
  return plan;
};

const sumMacros = (foods) =>
  foods.reduce(
    (a, f) => ({
      calories: a.calories + f.calories,
      protein: a.protein + f.protein,
      carbs: a.carbs + f.carbs,
      fat: a.fat + f.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
const dayTotals = (dayPlan) => {
  const raw = sumMacros(Object.values(dayPlan).flat());
  return {
    calories: Math.round(raw.calories),
    protein: Math.round(raw.protein),
    carbs: Math.round(raw.carbs),
    fat: Math.round(raw.fat),
  };
};

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        onLoggedIn?.(data.user || null, data.token);
      } else {
        setError(data.error || "Incorrect email or password.");
      }
    } catch (err) {
      setError("Could not connect to server. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "DM Sans",
      }}
    >
      <style>{`* { box-sizing:border-box; margin:0; padding:0; }
        input::placeholder { color:${T.muted}; } input { caret-color:${T.accent}; outline:none; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div
        style={{ width: "100%", maxWidth: 420, animation: "fadeUp 0.4s ease" }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            {/* SVG Logo matching the No Rule Nutrition branding */}
            <svg width="130" height="130" viewBox="0 0 200 200" style={{ filter: `drop-shadow(0 0 30px ${T.accent}22)` }}>
              {/* Outer dark ring */}
              <circle cx="100" cy="100" r="98" fill="#1a1a1a" stroke={T.accent + "44"} strokeWidth="2" />
              {/* White circle background */}
              <circle cx="100" cy="100" r="82" fill="#fff" />
              {/* Orange smiley circle */}
              <circle cx="100" cy="95" r="28" fill="none" stroke="#FF9A52" strokeWidth="4" />
              {/* Smiley eyes */}
              <ellipse cx="90" cy="89" rx="4" ry="5" fill="#FF9A52" />
              <ellipse cx="110" cy="89" rx="4" ry="5" fill="#FF9A52" />
              {/* Smiley mouth */}
              <path d="M 86 100 Q 100 114 114 100" fill="none" stroke="#FF9A52" strokeWidth="3.5" strokeLinecap="round" />
              {/* Curved text - NO RULE */}
              <path id="topArc" d="M 30 100 A 70 70 0 0 1 170 100" fill="none" />
              <text fontFamily="Arial Black, Impact, sans-serif" fontSize="22" fontWeight="900" fill="#1a1a1a" letterSpacing="3">
                <textPath href="#topArc" startOffset="50%" textAnchor="middle">NO RULE</textPath>
              </text>
              {/* Curved text - NUTRITION */}
              <path id="botArc" d="M 30 105 A 70 70 0 0 0 170 105" fill="none" />
              <text fontFamily="Arial Black, Impact, sans-serif" fontSize="19" fontWeight="900" fill="#1a1a1a" letterSpacing="2">
                <textPath href="#botArc" startOffset="50%" textAnchor="middle">NUTRITION</textPath>
              </text>
            </svg>
          </div>
          <div
            style={{
              fontFamily: "DM Sans",
              fontSize: 11,
              color: T.muted,
              marginTop: 4,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Fuel Your Performance
          </div>
        </div>

        {/* Sign in card */}
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 20,
            padding: 32,
          }}
        >
          <div
            style={{
              fontFamily: "Bebas Neue",
              fontSize: 22,
              letterSpacing: 2,
              color: T.text,
              marginBottom: 24,
            }}
          >
            SIGN IN
          </div>

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                fontFamily: "DM Sans",
                fontSize: 11,
                color: T.muted,
                letterSpacing: 1,
                textTransform: "uppercase",
                display: "block",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="you@example.com"
              type="email"
              style={{
                width: "100%",
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: "12px 14px",
                color: T.text,
                fontFamily: "DM Sans",
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontFamily: "DM Sans",
                fontSize: 11,
                color: T.muted,
                letterSpacing: 1,
                textTransform: "uppercase",
                display: "block",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                type={showPass ? "text" : "password"}
                style={{
                  width: "100%",
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  padding: "12px 44px 12px 14px",
                  color: T.text,
                  fontFamily: "DM Sans",
                  fontSize: 13,
                }}
              />
              <button
                onClick={() => setShowPass((p) => !p)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: T.muted,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "DM Sans",
                }}
              >
                {showPass ? "hide" : "show"}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: `${T.danger}18`,
                border: `1px solid ${T.danger}44`,
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
                fontFamily: "DM Sans",
                fontSize: 12,
                color: T.danger,
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? T.border : T.accent,
              color: loading ? T.muted : T.bg,
              border: "none",
              borderRadius: 12,
              padding: "14px",
              fontFamily: "Bebas Neue",
              fontSize: 18,
              letterSpacing: 2,
              cursor: loading ? "default" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {loading ? "SIGNING IN…" : "SIGN IN"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <span
              style={{
                fontFamily: "DM Sans",
                fontSize: 12,
                color: T.muted,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.target.style.color = T.accent)}
              onMouseLeave={(e) => (e.target.style.color = T.muted)}
            >
              Forgot password?
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Profile Dropdown ──────────────────────────────────────────────────────────
function ProfileMenu({ profile, onLogout, onNavigate, onChangePassword }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const items = [
    {
      icon: "🎯",
      label: "Goals & Macros",
      action: () => {
        onNavigate("meals");
        setOpen(false);
      },
    },
    {
      icon: "🛒",
      label: "Shopping List",
      action: () => {
        onNavigate("shopping");
        setOpen(false);
      },
    },
    { icon: "🔔", label: "Notifications", action: () => setOpen(false) },
    { icon: "🔒", label: "Change Password", action: () => { onChangePassword(); setOpen(false); } },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "none",
          border: `1px solid ${open ? T.accent : T.border}`,
          borderRadius: 10,
          padding: "6px 12px 6px 6px",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: T.accent,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Bebas Neue",
            fontSize: 15,
            color: T.bg,
          }}
        >
          {profile.name.charAt(0)}
        </div>
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontFamily: "DM Sans",
              fontSize: 12,
              fontWeight: 600,
              color: T.text,
              lineHeight: 1.2,
            }}
          >
            {profile.name}
          </div>
          <div
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 9,
              color: T.muted,
            }}
          >
            {profile.sport}
          </div>
        </div>
        <div style={{ color: T.muted, fontSize: 10, marginLeft: 2 }}>
          {open ? "▲" : "▼"}
        </div>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 230,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 8,
            zIndex: 200,
            boxShadow: "0 8px 32px #00000088",
            animation: "fadeUp 0.15s ease",
          }}
        >
          {/* Profile summary */}
          <div
            style={{
              padding: "10px 12px 12px",
              borderBottom: `1px solid ${T.border}`,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: T.accent,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Bebas Neue",
                  fontSize: 18,
                  color: T.bg,
                }}
              >
                {profile.name.charAt(0)}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.text,
                  }}
                >
                  {profile.name}
                </div>
                <div
                  style={{
                    fontFamily: "JetBrains Mono",
                    fontSize: 9,
                    color: T.muted,
                  }}
                >
                  {profile.email}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "Sport", val: profile.sport },
                { label: "Goal", val: profile.goal },
                { label: "Weight", val: profile.weight },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    background: T.surface,
                    borderRadius: 6,
                    padding: "5px 6px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 10,
                      color: T.text,
                      fontWeight: 500,
                    }}
                  >
                    {s.val}
                  </div>
                  <div
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 9,
                      color: T.muted,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                borderRadius: 8,
                padding: "9px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = T.border)
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              <span
                style={{ fontFamily: "DM Sans", fontSize: 13, color: T.text }}
              >
                {item.label}
              </span>
            </button>
          ))}

          <div
            style={{
              borderTop: `1px solid ${T.border}`,
              marginTop: 6,
              paddingTop: 6,
            }}
          >
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              style={{
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                borderRadius: 8,
                padding: "9px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = `${T.danger}22`)
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <span style={{ fontSize: 14 }}>🚪</span>
              <span
                style={{ fontFamily: "DM Sans", fontSize: 13, color: T.danger }}
              >
                Sign Out
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Check-In Countdown ────────────────────────────────────────────────────────
function CheckInCountdown({ daysLeft, coachName }) {
  if (daysLeft == null) {
    return (
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: "18px 22px",
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: `${T.muted}18`, border: `2px solid ${T.muted}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Bebas Neue", fontSize: 20, color: T.muted,
        }}>
          —
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Bebas Neue", fontSize: 12, letterSpacing: 2, color: T.muted, marginBottom: 3 }}>
            NEXT COACH CHECK-IN
          </div>
          <div style={{ fontFamily: "DM Sans", fontSize: 14, color: T.text, fontWeight: 500 }}>
            No check-in scheduled
          </div>
          <div style={{ fontFamily: "DM Sans", fontSize: 11, color: T.muted, marginTop: 4 }}>
            Your coach will add one to the calendar soon
          </div>
        </div>
      </div>
    );
  }
  const urgent = daysLeft <= 1;
  const soon = daysLeft <= 3;
  const color = urgent ? T.danger : soon ? T.accent : T.coachGreen;

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${
          urgent
            ? T.danger + "66"
            : soon
            ? T.accent + "55"
            : T.coachGreen + "33"
        }`,
        borderRadius: 16,
        padding: "18px 22px",
        display: "flex",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: urgent
            ? `${T.danger}20`
            : soon
            ? `${T.accent}20`
            : `${T.coachGreen}18`,
          border: `2px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 22 }}>{urgent ? "⚠️" : "📋"}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "Bebas Neue",
            fontSize: 12,
            letterSpacing: 2,
            color: T.muted,
            marginBottom: 3,
          }}
        >
          NEXT COACH CHECK-IN
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontFamily: "Bebas Neue",
              fontSize: 40,
              color,
              lineHeight: 1,
            }}
          >
            {daysLeft}
          </span>
          <span
            style={{
              fontFamily: "DM Sans",
              fontSize: 15,
              color: T.text,
              fontWeight: 500,
            }}
          >
            {daysLeft === 1 ? "day remaining" : "days remaining"}
          </span>
        </div>
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: 11,
            color: T.muted,
            marginTop: 4,
          }}
        >
          {urgent
            ? "Due tomorrow — make sure your week is fully logged!"
            : soon
            ? "Coming up soon — keep your meals logged accurately."
            : "Stay on track with your nutrition before your next review."}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: 10,
            color: T.muted,
            marginBottom: 6,
          }}
        >
          {coachName || "Your Coach"}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            justifyContent: "flex-end",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: T.coachGreen,
            }}
          />
          <span
            style={{ fontFamily: "DM Sans", fontSize: 11, color: T.coachGreen }}
          >
            Online now
          </span>
        </div>
        <div
          style={{
            background: T.accent,
            borderRadius: 8,
            padding: "6px 14px",
            cursor: "pointer",
            fontFamily: "Bebas Neue",
            fontSize: 12,
            letterSpacing: 1,
            color: T.bg,
          }}
        >
          MESSAGE
        </div>
      </div>
    </div>
  );
}

// ── MacroRing ─────────────────────────────────────────────────────────────────
function MacroRing({ value, goal, color, label, size = 80 }) {
  const pct = Math.min(value / goal, 1);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={T.border}
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{
            transition: "stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </svg>
      <div style={{ textAlign: "center", marginTop: -size / 2 - 8 }}>
        <div
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: size > 70 ? 18 : 13,
            fontWeight: 600,
            color,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: 10,
            color: T.muted,
            letterSpacing: 1,
          }}
        >
          {label}
        </div>
      </div>
      <div style={{ height: size / 2 }} />
    </div>
  );
}

// ── MacroBar ──────────────────────────────────────────────────────────────────
function MacroBar({ label, value, goal, color }) {
  const pct = Math.min((value / goal) * 100, 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 5,
        }}
      >
        <span
          style={{
            fontFamily: "DM Sans",
            fontSize: 12,
            color: T.muted,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color }}>
          {value}
          <span style={{ color: T.muted }}>/{goal}g</span>
        </span>
      </div>
      <div style={{ height: 5, background: T.border, borderRadius: 99 }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 99,
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── Coach Messaging Panel ─────────────────────────────────────────────────────
function CoachPanel({ plan, selectedDay, profile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const tot = dayTotals(plan[selectedDay] || {});
  const selectedDayLabel = dateStrToDayKey(selectedDay);
  const dayGoals = getGoalsForDate(selectedDay);
  const calPct = dayGoals.calories > 0 ? Math.round((tot.calories / dayGoals.calories) * 100) : 0;
  const protPct = dayGoals.protein > 0 ? Math.round((tot.protein / dayGoals.protein) * 100) : 0;
  const carbsPct = dayGoals.carbs > 0 ? Math.round((tot.carbs / dayGoals.carbs) * 100) : 0;
  const fatPct = dayGoals.fat > 0 ? Math.round((tot.fat / dayGoals.fat) * 100) : 0;

  const systemPrompt = `You are ${profile.coachName || "a nutrition coach"}, a professional nutrition coach. You are in a 1-on-1 chat with ${profile.name}, a ${profile.sport} athlete (goal: ${profile.goal}). Live macro data for ${selectedDayLabel}: Calories ${tot.calories}/${dayGoals.calories} (${calPct}%), Protein ${tot.protein}/${dayGoals.protein}g (${protPct}%), Carbs ${tot.carbs}/${dayGoals.carbs}g (${carbsPct}%), Fat ${tot.fat}/${dayGoals.fat}g (${fatPct}%). Be warm, concise, and data-driven — like a real coach text. Reference their numbers when relevant.`;

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          isCoach: true,
          content: `Hey ${
            profile.name.split(" ")[0]
          }! 👋 I can see your macros for ${selectedDayLabel} — you're at ${calPct}% of your calorie goal. Looking good! How are you feeling today?`,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = {
      role: "user",
      content: input.trim(),
      isCoach: false,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          system: systemPrompt,
          messages: newMsgs.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      const reply =
        data.content?.map((b) => b.text || "").join("") ||
        "Sorry, missed that!";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply,
          isCoach: true,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection issue. Try again.",
          isCoach: true,
          time: "--:--",
        },
      ]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Coach header */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: "16px 16px 0 0",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.coachGreen}, #16a34a)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Bebas Neue",
              fontSize: 20,
              color: "#fff",
            }}
          >
            SM
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 1,
              right: 1,
              width: 12,
              height: 12,
              background: T.coachGreen,
              borderRadius: "50%",
              border: `2px solid ${T.card}`,
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "DM Sans",
              fontSize: 14,
              fontWeight: 600,
              color: T.text,
            }}
          >
            {profile.coachName || "Your Coach"}
          </div>
          <div
            style={{ fontFamily: "DM Sans", fontSize: 11, color: T.coachGreen }}
          >
            ● Online · Monitoring your macros
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "DM Sans",
              fontSize: 10,
              color: T.muted,
              marginBottom: 4,
            }}
          >
            TODAY'S PROGRESS
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { l: "CAL", p: calPct, c: T.accent },
              { l: "PRO", p: protPct, c: T.protein },
              { l: "CARB", p: carbsPct, c: T.carbs },
              { l: "FAT", p: fatPct, c: T.fat },
            ].map((m) => (
              <div key={m.l} style={{ textAlign: "center", minWidth: 36 }}>
                <div
                  style={{
                    fontFamily: "JetBrains Mono",
                    fontSize: 11,
                    color: m.c,
                    fontWeight: 600,
                  }}
                >
                  {m.p}%
                </div>
                <div
                  style={{ fontFamily: "DM Sans", fontSize: 9, color: T.muted }}
                >
                  {m.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live macro bar */}
      <div
        style={{
          background: `${T.card}cc`,
          borderLeft: `1px solid ${T.border}`,
          borderRight: `1px solid ${T.border}`,
          padding: "10px 20px",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "DM Sans",
            fontSize: 10,
            color: T.muted,
            letterSpacing: 1,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Coach sees:
        </span>
        {[
          {
            label: "Calories",
            val: tot.calories,
            goal: dayGoals.calories,
            unit: "kcal",
            color: T.accent,
          },
          {
            label: "Protein",
            val: tot.protein,
            goal: dayGoals.protein,
            unit: "g",
            color: T.protein,
          },
          {
            label: "Carbs",
            val: tot.carbs,
            goal: dayGoals.carbs,
            unit: "g",
            color: T.carbs,
          },
          {
            label: "Fat",
            val: tot.fat,
            goal: dayGoals.fat,
            unit: "g",
            color: T.fat,
          },
        ].map((m) => (
          <div key={m.label} style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 3,
              }}
            >
              <span
                style={{ fontFamily: "DM Sans", fontSize: 10, color: T.muted }}
              >
                {m.label}
              </span>
              <span
                style={{
                  fontFamily: "JetBrains Mono",
                  fontSize: 10,
                  color: m.color,
                }}
              >
                {m.val}
                <span style={{ color: T.muted, fontSize: 9 }}>
                  /{m.goal}
                  {m.unit}
                </span>
              </span>
            </div>
            <div style={{ height: 3, background: T.border, borderRadius: 99 }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min((m.val / m.goal) * 100, 100)}%`,
                  background: m.color,
                  borderRadius: 99,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "16px 20px",
          minHeight: 0,
          background: T.surface,
          borderLeft: `1px solid ${T.border}`,
          borderRight: `1px solid ${T.border}`,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: m.isCoach ? "flex-start" : "flex-end",
            }}
          >
            {m.isCoach && (
              <span
                style={{
                  fontFamily: "DM Sans",
                  fontSize: 10,
                  color: T.muted,
                  marginBottom: 4,
                  marginLeft: 4,
                }}
              >
                Sarah
              </span>
            )}
            <div
              style={{
                maxWidth: "78%",
                padding: "11px 15px",
                borderRadius: m.isCoach
                  ? "4px 16px 16px 16px"
                  : "16px 4px 16px 16px",
                background: m.isCoach ? T.card : T.accent,
                color: m.isCoach ? T.text : T.bg,
                fontFamily: "DM Sans",
                fontSize: 13,
                lineHeight: 1.6,
                border: m.isCoach ? `1px solid ${T.border}` : "none",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
            </div>
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 9,
                color: T.muted,
                marginTop: 3,
                marginLeft: m.isCoach ? 4 : 0,
                marginRight: m.isCoach ? 0 : 4,
              }}
            >
              {m.time}
            </span>
          </div>
        ))}
        {loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <span
              style={{
                fontFamily: "DM Sans",
                fontSize: 10,
                color: T.muted,
                marginBottom: 4,
                marginLeft: 4,
              }}
            >
              Sarah is typing…
            </span>
            <div
              style={{
                display: "flex",
                gap: 5,
                padding: "11px 15px",
                background: T.card,
                borderRadius: "4px 16px 16px 16px",
                border: `1px solid ${T.border}`,
                width: "fit-content",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    background: T.coachGreen,
                    borderRadius: "50%",
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div
        style={{
          background: T.surface,
          borderLeft: `1px solid ${T.border}`,
          borderRight: `1px solid ${T.border}`,
          padding: "8px 20px",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {[
          "How are my macros looking?",
          "What should I eat for dinner?",
          "Can we adjust my protein target?",
          "I'm struggling to hit calories today",
        ].map((q) => (
          <button
            key={q}
            onClick={() => setInput(q)}
            style={{
              background: T.border,
              border: `1px solid ${T.border}`,
              color: T.muted,
              padding: "5px 10px",
              borderRadius: 16,
              fontFamily: "DM Sans",
              fontSize: 11,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = T.coachGreen;
              e.currentTarget.style.color = T.coachGreen;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = T.border;
              e.currentTarget.style.color = T.muted;
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "12px 20px",
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: "0 0 16px 16px",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message your coach..."
          style={{
            flex: 1,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: "12px 16px",
            color: T.text,
            fontFamily: "DM Sans",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            background: input.trim() && !loading ? T.coachGreen : T.border,
            color: input.trim() && !loading ? "#fff" : T.muted,
            border: "none",
            borderRadius: 12,
            padding: "12px 18px",
            fontFamily: "Bebas Neue",
            fontSize: 16,
            letterSpacing: 1,
            cursor: input.trim() && !loading ? "pointer" : "default",
            transition: "all 0.2s",
          }}
        >
          SEND
        </button>
      </div>
    </div>
  );
}

// ── MFP Panel ─────────────────────────────────────────────────────────────────
// ── Manual MFP Data Entry Form ────────────────────────────────────────────────
function ManualEntryForm({ onSubmit, username, selectedDay }) {
  const [form, setForm] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fibre: "",
    water: "",
    exerciseCalories: "",
  });
  const [meals, setMeals] = useState([
    { name: "Breakfast", calories: "" },
    { name: "Lunch", calories: "" },
    { name: "Dinner", calories: "" },
    { name: "Snacks", calories: "" },
  ]);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setMeal = (i, k, v) =>
    setMeals((p) => {
      const n = [...p];
      n[i] = { ...n[i], [k]: v };
      return n;
    });
  const addMeal = () => setMeals((p) => [...p, { name: "", calories: "" }]);
  const removeMeal = (i) => setMeals((p) => p.filter((_, j) => j !== i));

  const autoSplitMeals = (totalCal) => {
    if (!totalCal) return;
    const split = [
      ["Breakfast", 0.25],
      ["Lunch", 0.35],
      ["Dinner", 0.3],
      ["Snacks", 0.1],
    ];
    setMeals(
      split.map(([name, pct]) => ({
        name,
        calories: String(Math.round(totalCal * pct)),
      }))
    );
  };

  const handleSubmit = () => {
    if (!form.calories) return;
    onSubmit({ ...form, meals });
  };

  const fieldStyle = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 9,
    padding: "10px 14px",
    color: T.text,
    fontFamily: "JetBrains Mono",
    fontSize: 13,
    outline: "none",
    width: "100%",
    caretColor: T.mfp,
  };
  const labelStyle = {
    fontFamily: "Bebas Neue",
    fontSize: 11,
    letterSpacing: 2,
    color: T.muted,
    display: "block",
    marginBottom: 5,
  };

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.mfp}44`,
        borderRadius: 16,
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: `linear-gradient(135deg, ${T.mfp}, #0066cc)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Bebas Neue",
            fontSize: 14,
            color: "#fff",
          }}
        >
          MFP
        </div>
        <div>
          <div
            style={{
              fontFamily: "Bebas Neue",
              fontSize: 18,
              letterSpacing: 1.5,
              color: T.text,
            }}
          >
            ENTER TODAY'S DATA — {dateStrToDayKey(selectedDay)}
          </div>
          <div
            style={{
              fontFamily: "DM Sans",
              fontSize: 11,
              color: T.muted,
              marginTop: 2,
            }}
          >
            {username
              ? `Copy from myfitnesspal.com/food/diary/${username}`
              : "Enter your logged nutrition below"}
          </div>
        </div>
      </div>

      {/* Macro totals */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {[
          {
            key: "calories",
            label: "CALORIES",
            placeholder: "e.g. 2450",
            color: T.accent,
          },
          {
            key: "protein",
            label: "PROTEIN (g)",
            placeholder: "e.g. 185",
            color: T.protein,
          },
          {
            key: "carbs",
            label: "CARBS (g)",
            placeholder: "e.g. 310",
            color: T.carbs,
          },
          {
            key: "fat",
            label: "FAT (g)",
            placeholder: "e.g. 75",
            color: T.fat,
          },
          {
            key: "fibre",
            label: "FIBRE (g)",
            placeholder: "e.g. 28",
            color: T.coachGreen,
          },
          {
            key: "water",
            label: "WATER (ml)",
            placeholder: "e.g. 2500",
            color: T.mfp,
          },
        ].map((f) => (
          <div key={f.key}>
            <label style={{ ...labelStyle, color: f.color }}>{f.label}</label>
            <input
              type="number"
              min="0"
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={(e) => {
                set(f.key, e.target.value);
                if (f.key === "calories" && e.target.value)
                  autoSplitMeals(parseInt(e.target.value));
              }}
              style={{
                ...fieldStyle,
                borderColor: form[f.key] ? f.color + "66" : T.border,
              }}
            />
          </div>
        ))}
      </div>

      {/* Exercise calories */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>EXERCISE CALORIES BURNED (optional)</label>
        <input
          type="number"
          min="0"
          placeholder="e.g. 420"
          value={form.exerciseCalories}
          onChange={(e) => set("exerciseCalories", e.target.value)}
          style={{ ...fieldStyle, width: 200 }}
        />
      </div>

      {/* Meal breakdown */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            MEAL BREAKDOWN (optional — auto-split if blank)
          </label>
          <button
            onClick={addMeal}
            style={{
              background: "none",
              border: `1px solid ${T.border}`,
              color: T.accent,
              borderRadius: 7,
              padding: "4px 12px",
              fontFamily: "Bebas Neue",
              fontSize: 11,
              letterSpacing: 1,
              cursor: "pointer",
            }}
          >
            + ADD MEAL
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {meals.map((m, i) => (
            <div
              key={i}
              style={{ display: "flex", gap: 8, alignItems: "center" }}
            >
              <input
                placeholder="Meal name"
                value={m.name}
                onChange={(e) => setMeal(i, "name", e.target.value)}
                style={{ ...fieldStyle, flex: 2, fontSize: 12 }}
              />
              <input
                type="number"
                min="0"
                placeholder="kcal"
                value={m.calories}
                onChange={(e) => setMeal(i, "calories", e.target.value)}
                style={{ ...fieldStyle, flex: 1, fontSize: 12 }}
              />
              <button
                onClick={() => removeMeal(i)}
                style={{
                  background: "none",
                  border: "none",
                  color: T.muted,
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                  padding: "0 4px",
                }}
                onMouseEnter={(e) => (e.target.style.color = T.danger)}
                onMouseLeave={(e) => (e.target.style.color = T.muted)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!form.calories}
        style={{
          width: "100%",
          padding: "14px",
          background: form.calories
            ? `linear-gradient(135deg, ${T.mfp}, #0066cc)`
            : T.border,
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontFamily: "Bebas Neue",
          fontSize: 16,
          letterSpacing: 2,
          cursor: form.calories ? "pointer" : "default",
          boxShadow: form.calories ? `0 0 24px ${T.mfp}44` : "none",
          transition: "all 0.2s",
        }}
      >
        SAVE & UPDATE MEAL PLAN
      </button>
      <div
        style={{
          fontFamily: "DM Sans",
          fontSize: 11,
          color: T.muted,
          textAlign: "center",
          marginTop: 8,
        }}
      >
        Data will be pushed to your {dateStrToDayKey(selectedDay)} meal plan and macro tracker
        automatically
      </div>
    </div>
  );
}

function MFPPanel({
  plan,
  selectedDay,
  account,
  mfpData,
  mfpConnected,
  mfpSyncing,
  mfpLastSync,
  mfpError,
  mfpNextSyncIn,
  mfpSyncCount,
  mfpManualMode,
  onSubmitManual,
  onEnterManual,
  onConnect,
  onSync,
  onDisconnect,
  onImport,
  onSetMfpUsername,
}) {
  const mfpUsername = account?.mfpUsername ?? null;
  const safeUsername = mfpUsername || "";
  const profileUrl = `https://www.myfitnesspal.com/en/food/diary/${
    mfpUsername || ""
  }`;
  const acColor = (p) =>
    p >= 90 ? T.coachGreen : p >= 70 ? T.accent : T.danger;
  const [imported, setImported] = useState(false);
  const [manualInput, setManualInput] = useState(mfpUsername || "");
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  // Flash "just refreshed" badge on each auto-sync
  useEffect(() => {
    if (mfpSyncCount > 0) {
      setJustRefreshed(true);
      const t = setTimeout(() => setJustRefreshed(false), 2500);
      return () => clearTimeout(t);
    }
  }, [mfpSyncCount]);

  const handleImport = () => {
    onImport();
    setImported(true);
    setTimeout(() => setImported(false), 3000);
  };

  const submitUsername = () => {
    const val = manualInput.trim();
    if (val) onSetMfpUsername(val);
  };

  // ── Manual entry mode (live fetch failed or user prefers direct entry) ───
  if (mfpConnected && mfpManualMode)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            background: `${T.accent}14`,
            border: `1px solid ${T.accent}44`,
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 18, marginTop: 1 }}>ℹ️</span>
          <div>
            <div
              style={{
                fontFamily: "DM Sans",
                fontSize: 13,
                fontWeight: 600,
                color: T.text,
                marginBottom: 3,
              }}
            >
              Live sync unavailable — MFP blocks automated access
            </div>
            <div
              style={{
                fontFamily: "DM Sans",
                fontSize: 12,
                color: T.muted,
                lineHeight: 1.6,
              }}
            >
              MFP restricts server-side access to diary pages. Enter
              your daily totals below — they'll sync into your {dateStrToDayKey(selectedDay)}{" "}
              meal plan and show on your coach's dashboard.
              {mfpUsername && (
                <>
                  {" "}
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: T.mfp }}
                  >
                    Open your MFP diary ↗
                  </a>{" "}
                  to copy the values across.
                </>
              )}
            </div>
          </div>
        </div>
        <ManualEntryForm
          onSubmit={onSubmitManual}
          username={mfpUsername}
          selectedDay={selectedDay}
        />
        <button
          onClick={onDisconnect}
          style={{
            background: "none",
            border: `1px solid ${T.border}`,
            color: T.muted,
            borderRadius: 10,
            padding: "8px",
            fontFamily: "DM Sans",
            fontSize: 11,
            cursor: "pointer",
            alignSelf: "center",
          }}
        >
          ← Disconnect / Change Account
        </button>
      </div>
    );

  // ── Not yet connected ────────────────────────────────────────────────────
  if (!mfpConnected && !mfpSyncing)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: 40,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${T.mfp}, #0066cc)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              boxShadow: `0 0 40px ${T.mfp}44`,
            }}
          >
            <span
              style={{
                fontFamily: "Bebas Neue",
                fontSize: 32,
                color: "#fff",
                letterSpacing: 2,
              }}
            >
              MFP
            </span>
          </div>
          <div
            style={{
              fontFamily: "Bebas Neue",
              fontSize: 28,
              letterSpacing: 2,
              color: T.text,
            }}
          >
            MYFITNESSPAL SYNC
          </div>
          <div
            style={{
              fontFamily: "DM Sans",
              fontSize: 13,
              color: T.muted,
              marginTop: 8,
              maxWidth: 380,
              lineHeight: 1.6,
            }}
          >
            {mfpUsername
              ? `Linked to: ${mfpUsername} — click below to fetch live diary data.`
              : "Enter your MyFitnessPal username to link your public diary and auto-import daily nutrition data."}
          </div>
        </div>

        {/* Manual username input */}
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div
            style={{
              fontFamily: "Bebas Neue",
              fontSize: 13,
              letterSpacing: 2,
              color: T.muted,
              marginBottom: 8,
            }}
          >
            MYFITNESSPAL USERNAME
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitUsername()}
              placeholder="e.g. gerardqueen"
              style={{
                flex: 1,
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: "12px 16px",
                color: T.text,
                fontFamily: "DM Sans",
                fontSize: 13,
                outline: "none",
                caretColor: T.mfp,
              }}
            />
            <button
              onClick={submitUsername}
              disabled={!manualInput.trim()}
              style={{
                background: manualInput.trim()
                  ? `linear-gradient(135deg, ${T.mfp}, #0066cc)`
                  : T.border,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px 20px",
                fontFamily: "Bebas Neue",
                fontSize: 14,
                letterSpacing: 1,
                cursor: manualInput.trim() ? "pointer" : "default",
                boxShadow: manualInput.trim() ? `0 0 20px ${T.mfp}44` : "none",
                transition: "all 0.2s",
              }}
            >
              CONNECT
            </button>
          </div>
          <div
            style={{
              fontFamily: "DM Sans",
              fontSize: 11,
              color: T.muted,
              marginTop: 8,
            }}
          >
            Your diary must be set to{" "}
            <strong style={{ color: T.text }}>public</strong> on MyFitnessPal
            for data to sync.{" "}
            <a
              href="https://www.myfitnesspal.com/account/diary_settings"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: T.mfp, textDecoration: "none" }}
            >
              Check privacy settings →
            </a>
          </div>
        </div>

        {mfpUsername && (
          <button
            onClick={onConnect}
            style={{
              background: `linear-gradient(135deg, ${T.mfp}, #0066cc)`,
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: "14px 40px",
              fontFamily: "Bebas Neue",
              fontSize: 18,
              letterSpacing: 2,
              cursor: "pointer",
              boxShadow: `0 0 30px ${T.mfp}55`,
            }}
          >
            SYNC {mfpUsername.toUpperCase()}
          </button>
        )}

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            maxWidth: 480,
          }}
        >
          <div style={{ flex: 1, height: 1, background: T.border }} />
          <span style={{ fontFamily: "DM Sans", fontSize: 11, color: T.muted }}>
            or
          </span>
          <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>

        <button
          onClick={onEnterManual}
          style={{
            background: T.card,
            border: `2px solid ${T.border}`,
            color: T.text,
            borderRadius: 14,
            padding: "14px 40px",
            fontFamily: "Bebas Neue",
            fontSize: 16,
            letterSpacing: 2,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = T.mfp;
            e.currentTarget.style.color = T.mfp;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.border;
            e.currentTarget.style.color = T.text;
          }}
        >
          ✏️ ENTER DATA MANUALLY
        </button>
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: 11,
            color: T.muted,
            textAlign: "center",
          }}
        >
          Copy your totals from the MFP app and enter them here
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            width: "100%",
            maxWidth: 480,
          }}
        >
          {[
            {
              icon: "📊",
              label: "Daily macro import",
              desc: "Calories, protein, carbs, fat",
            },
            {
              icon: "🔄",
              label: "Auto-sync every 30 min",
              desc: "Background refresh",
            },
            {
              icon: "🍽️",
              label: "Meal-level breakdown",
              desc: "Breakfast through dinner",
            },
            {
              icon: "💧",
              label: "Water & fibre tracking",
              desc: "Full nutritional picture",
            },
            {
              icon: "🏃",
              label: "Exercise calories",
              desc: "MFP workout logging",
            },
            {
              icon: "📈",
              label: "7-day adherence chart",
              desc: "Visible to your coach",
            },
          ].map((f) => (
            <div
              key={f.label}
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>{f.icon}</div>
              <div
                style={{
                  fontFamily: "DM Sans",
                  fontSize: 12,
                  fontWeight: 600,
                  color: T.text,
                }}
              >
                {f.label}
              </div>
              <div
                style={{
                  fontFamily: "DM Sans",
                  fontSize: 11,
                  color: T.muted,
                  marginTop: 2,
                }}
              >
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  // ── Loading spinner ───────────────────────────────────────────────────────
  if (mfpSyncing)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 60,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${T.mfp}, #0066cc)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "spin 1s linear infinite",
          }}
        >
          <span
            style={{ fontFamily: "Bebas Neue", fontSize: 22, color: "#fff" }}
          >
            MFP
          </span>
        </div>
        <div
          style={{
            fontFamily: "Bebas Neue",
            fontSize: 20,
            letterSpacing: 2,
            color: T.text,
          }}
        >
          FETCHING LIVE DATA…
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 12, color: T.muted }}>
          {safeUsername ? `Reading ${safeUsername}'s public diary via AI` : "Reading your public diary via AI"}
        </div>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );

  // ── Connected dashboard ───────────────────────────────────────────────────
  const nextSyncMins = mfpNextSyncIn ? Math.floor(mfpNextSyncIn / 60) : null;
  const nextSyncSecs = mfpNextSyncIn ? mfpNextSyncIn % 60 : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Senpro-style live sync status bar */}
      <style>{`
        @keyframes mfpPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:0.5} }
        @keyframes mfpFlash { 0%{opacity:0;transform:translateY(-4px)} 20%{opacity:1;transform:translateY(0)} 80%{opacity:1} 100%{opacity:0} }
      `}</style>
      <div
        style={{
          background: T.card,
          borderRadius: 14,
          overflow: "hidden",
          border: `1px solid ${
            mfpSyncing ? T.mfp + "88" : T.coachGreen + "66"
          }`,
          boxShadow: mfpSyncing
            ? `0 0 16px ${T.mfp}22`
            : `0 0 12px ${T.coachGreen}11`,
          transition: "all 0.4s",
        }}
      >
        {/* Top accent bar — pulses while syncing */}
        <div
          style={{
            height: 3,
            background: mfpSyncing
              ? `linear-gradient(90deg, ${T.mfp}, #0066cc, ${T.mfp})`
              : `linear-gradient(90deg, ${T.coachGreen}, ${T.mfp})`,
            backgroundSize: mfpSyncing ? "200% 100%" : "100%",
            animation: mfpSyncing ? "shimmer 1.2s linear infinite" : "none",
          }}
        />

        <div
          style={{
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          {/* Live dot */}
          <div
            style={{
              position: "relative",
              width: 44,
              height: 44,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 11,
                background: `linear-gradient(135deg, ${T.mfp}, #0066cc)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Bebas Neue",
                fontSize: 14,
                color: "#fff",
              }}
            >
              MFP
            </div>
            <div
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: mfpSyncing ? T.accent : T.coachGreen,
                border: `2px solid ${T.card}`,
                animation: mfpSyncing
                  ? "none"
                  : "mfpPulse 2s ease-in-out infinite",
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {showUsernameEdit ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onSetMfpUsername(manualInput);
                      setShowUsernameEdit(false);
                    }
                    if (e.key === "Escape") setShowUsernameEdit(false);
                  }}
                  placeholder="MFP username"
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.mfp}`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    color: T.text,
                    fontFamily: "DM Sans",
                    fontSize: 12,
                    outline: "none",
                    width: 180,
                  }}
                  autoFocus
                />
                <button
                  onClick={() => {
                    onSetMfpUsername(manualInput);
                    setShowUsernameEdit(false);
                  }}
                  style={{
                    background: T.mfp,
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontFamily: "Bebas Neue",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  SAVE
                </button>
                <button
                  onClick={() => setShowUsernameEdit(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: T.muted,
                    cursor: "pointer",
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 13,
                      fontWeight: 700,
                      color: T.text,
                    }}
                  >
                    {mfpUsername || "manual"}
                  </span>
                  {mfpUsername && (
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: "DM Sans",
                        fontSize: 11,
                        color: T.mfp,
                        textDecoration: "none",
                        background: `${T.mfp}18`,
                        borderRadius: 5,
                        padding: "2px 8px",
                        border: `1px solid ${T.mfp}44`,
                      }}
                    >
                      ↗ diary
                    </a>
                  )}
                  {/* Source badge */}
                  {mfpData?.source === "live" && (
                    <span
                      style={{
                        fontFamily: "Bebas Neue",
                        fontSize: 10,
                        color: T.coachGreen,
                        background: `${T.coachGreen}18`,
                        borderRadius: 5,
                        padding: "2px 8px",
                        border: `1px solid ${T.coachGreen}44`,
                        letterSpacing: 1,
                      }}
                    >
                      ● LIVE
                    </span>
                  )}
                  {mfpData?.source === "manual" && (
                    <span
                      style={{
                        fontFamily: "Bebas Neue",
                        fontSize: 10,
                        color: T.muted,
                        background: T.surface,
                        borderRadius: 5,
                        padding: "2px 8px",
                        border: `1px solid ${T.border}`,
                        letterSpacing: 1,
                      }}
                    >
                      MANUAL
                    </span>
                  )}
                  {justRefreshed && (
                    <span
                      style={{
                        fontFamily: "DM Sans",
                        fontSize: 10,
                        color: T.coachGreen,
                        animation: "mfpFlash 2.5s ease forwards",
                      }}
                    >
                      ✓ updated
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setManualInput(mfpUsername || "");
                      setShowUsernameEdit(true);
                    }}
                    style={{
                      background: "none",
                      border: `1px solid ${T.border}`,
                      color: T.muted,
                      borderRadius: 6,
                      padding: "2px 8px",
                      fontFamily: "DM Sans",
                      fontSize: 10,
                      cursor: "pointer",
                    }}
                  >
                    change
                  </button>
                </div>
                <div
                  style={{
                    fontFamily: "JetBrains Mono",
                    fontSize: 10,
                    color: T.muted,
                    marginTop: 3,
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  {mfpLastSync && (
                    <span>
                      synced{" "}
                      {mfpLastSync.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {nextSyncMins !== null && !mfpSyncing && (
                    <span
                      style={{ color: nextSyncMins < 2 ? T.accent : T.muted }}
                    >
                      next refresh {nextSyncMins}m{" "}
                      {String(nextSyncSecs).padStart(2, "0")}s
                    </span>
                  )}
                  {mfpSyncing && (
                    <span style={{ color: T.accent }}>syncing…</span>
                  )}
                  {mfpSyncCount > 0 && (
                    <span style={{ color: T.muted }}>#{mfpSyncCount} sync</span>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            onClick={onSync}
            disabled={mfpSyncing}
            style={{
              background: mfpSyncing ? T.border : `${T.mfp}22`,
              border: `1px solid ${mfpSyncing ? T.border : T.mfp}`,
              color: mfpSyncing ? T.muted : T.mfp,
              borderRadius: 10,
              padding: "8px 18px",
              fontFamily: "Bebas Neue",
              fontSize: 13,
              letterSpacing: 1,
              cursor: mfpSyncing ? "default" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {mfpSyncing ? "SYNCING…" : "↻ SYNC NOW"}
          </button>
          <button
            onClick={onDisconnect}
            style={{
              background: "none",
              border: `1px solid ${T.border}`,
              color: T.muted,
              borderRadius: 10,
              padding: "8px 14px",
              fontFamily: "DM Sans",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Soft note (not hard error) for diary accessibility */}
      {mfpError && (
        <div
          style={{
            background: `${T.accent}12`,
            border: `1px solid ${T.accent}33`,
            borderRadius: 10,
            padding: "10px 16px",
            fontFamily: "DM Sans",
            fontSize: 11,
            color: T.muted,
          }}
        >
          ℹ️ {mfpError}
        </div>
      )}
      {mfpData?.profileFound === false && (
        <div
          style={{
            background: `${T.accent}18`,
            border: `1px solid ${T.accent}44`,
            borderRadius: 10,
            padding: "12px 16px",
            fontFamily: "DM Sans",
            fontSize: 12,
            color: T.accent,
          }}
        >
          📋 Diary for <strong>{mfpUsername}</strong> is private or not yet
          logged today — showing calibrated estimates.{" "}
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: T.mfp }}
          >
            Check profile →
          </a>
        </div>
      )}

      {/* Macros + meal log */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 20,
          }}
        >
          <div
            style={{
              fontFamily: "Bebas Neue",
              fontSize: 16,
              letterSpacing: 2,
              color: T.muted,
              marginBottom: 16,
            }}
          >
            MFP LOGGED — {dateStrToDayKey(selectedDay)}
          </div>
          {[
            {
              label: "Calories",
              mfp: mfpData.calories,
              goal: getGoalsForDate(selectedDay).calories,
              unit: "kcal",
              color: T.accent,
            },
            {
              label: "Protein",
              mfp: mfpData.protein,
              goal: getGoalsForDate(selectedDay).protein,
              unit: "g",
              color: T.protein,
            },
            {
              label: "Carbs",
              mfp: mfpData.carbs,
              goal: getGoalsForDate(selectedDay).carbs,
              unit: "g",
              color: T.carbs,
            },
            {
              label: "Fat",
              mfp: mfpData.fat,
              goal: getGoalsForDate(selectedDay).fat,
              unit: "g",
              color: T.fat,
            },
          ].map((m) => {
            const diff = m.mfp - m.goal;
            return (
              <div key={m.label} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 11,
                      color: T.muted,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {m.label}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span
                      style={{
                        fontFamily: "JetBrains Mono",
                        fontSize: 11,
                        color: m.color,
                      }}
                    >
                      {m.mfp}
                      {m.unit !== "kcal" ? "g" : ""}
                    </span>
                    <span
                      style={{
                        fontFamily: "JetBrains Mono",
                        fontSize: 10,
                        color: diff > 0 ? T.danger : T.coachGreen,
                      }}
                    >
                      {diff > 0 ? `+${diff}` : diff}
                      {m.unit !== "kcal" ? "g" : ""}
                    </span>
                  </div>
                </div>
                <div
                  style={{ height: 5, background: T.border, borderRadius: 99 }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min((m.mfp / m.goal) * 100, 100)}%`,
                      background: m.color,
                      borderRadius: 99,
                    }}
                  />
                </div>
              </div>
            );
          })}
          <div
            style={{
              borderTop: `1px solid ${T.border}`,
              paddingTop: 12,
              marginTop: 4,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            {[
              { label: "Fibre", val: `${mfpData.fibre}g`, color: T.coachGreen },
              { label: "Water", val: `${mfpData.water}ml`, color: T.mfp },
              {
                label: "Ex. kcal",
                val: `${mfpData.exerciseCalories}`,
                color: T.protein,
              },
              {
                label: "Net kcal",
                val: `${mfpData.netCalories}`,
                color: T.accent,
              },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "JetBrains Mono",
                    fontSize: 13,
                    color: s.color,
                  }}
                >
                  {s.val}
                </div>
                <div
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 10,
                    color: T.muted,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: 20,
            }}
          >
            <div
              style={{
                fontFamily: "Bebas Neue",
                fontSize: 16,
                letterSpacing: 2,
                color: T.muted,
                marginBottom: 14,
              }}
            >
              MEAL LOG
            </div>
            {mfpData.meals.map((meal) => (
              <div
                key={meal.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: meal.logged ? T.coachGreen : T.border,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 12,
                      color: meal.logged ? T.text : T.muted,
                    }}
                  >
                    {meal.name}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "JetBrains Mono",
                    fontSize: 11,
                    color: meal.logged ? T.accent : T.muted,
                  }}
                >
                  {meal.logged ? `${meal.calories} kcal` : "not logged"}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: 20,
            }}
          >
            <div
              style={{
                fontFamily: "Bebas Neue",
                fontSize: 16,
                letterSpacing: 2,
                color: T.muted,
                marginBottom: 14,
              }}
            >
              7-DAY ADHERENCE
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                height: 70,
              }}
            >
              {DAYS.map((d, i) => {
                const pct = mfpData.weekAdherence[i];
                return (
                  <div
                    key={d}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "JetBrains Mono",
                        fontSize: 8,
                        color: acColor(pct),
                      }}
                    >
                      {pct}%
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: `${pct * 0.55}px`,
                        background: acColor(pct),
                        borderRadius: "3px 3px 0 0",
                        minHeight: 3,
                      }}
                    />
                    <div
                      style={{
                        fontFamily: "Bebas Neue",
                        fontSize: 10,
                        color: T.muted,
                      }}
                    >
                      {d}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Import to Meal Plan CTA */}
      <div
        style={{
          background: imported
            ? `${T.coachGreen}18`
            : `linear-gradient(135deg, ${T.mfp}18, ${T.mfp}08)`,
          border: `1px solid ${imported ? T.coachGreen : T.mfp}44`,
          borderRadius: 14,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          transition: "all 0.3s",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                fontFamily: "DM Sans",
                fontSize: 13,
                fontWeight: 600,
                color: T.text,
              }}
            >
              {imported
                ? "✅ Pushed to Meal Plan!"
                : "Push data into your Meal Plan"}
            </div>
            {mfpData?.source === "manual" && (
              <span
                style={{
                  fontFamily: "Bebas Neue",
                  fontSize: 10,
                  color: T.muted,
                  background: T.surface,
                  borderRadius: 5,
                  padding: "2px 7px",
                  border: `1px solid ${T.border}`,
                }}
              >
                MANUAL
              </span>
            )}
            {mfpData?.source === "live" && (
              <span
                style={{
                  fontFamily: "Bebas Neue",
                  fontSize: 10,
                  color: T.coachGreen,
                  background: `${T.coachGreen}18`,
                  borderRadius: 5,
                  padding: "2px 7px",
                  border: `1px solid ${T.coachGreen}44`,
                }}
              >
                LIVE
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "DM Sans",
              fontSize: 11,
              color: T.muted,
              marginTop: 3,
            }}
          >
            {imported
              ? `Meals are live in your ${dateStrToDayKey(selectedDay)} plan — macros updated`
              : `Logged meals will populate ${dateStrToDayKey(selectedDay)}'s meal cards and update macro tracking`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={onEnterManual}
            style={{
              background: "none",
              border: `1px solid ${T.border}`,
              color: T.muted,
              borderRadius: 10,
              padding: "10px 16px",
              fontFamily: "Bebas Neue",
              fontSize: 13,
              letterSpacing: 1,
              cursor: "pointer",
            }}
          >
            ✏️ UPDATE DATA
          </button>
          <button
            onClick={handleImport}
            disabled={imported}
            style={{
              background: imported ? T.coachGreen : T.mfp,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 22px",
              fontFamily: "Bebas Neue",
              fontSize: 14,
              letterSpacing: 1,
              cursor: imported ? "default" : "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.3s",
            }}
          >
            {imported ? "PUSHED ✓" : "PUSH TO PLAN"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Calendar event types ──────────────────────────────────────────────────────
const CAL_TYPES = [
  { id: "checkin", label: "Check-In", color: "#22c55e", icon: "✅" },
  { id: "nutrition", label: "Nutrition Plan", color: "#FF9A52", icon: "🥗" },
  { id: "training", label: "Training", color: "#3b82f6", icon: "🏋️" },
  { id: "competition", label: "Competition", color: "#ef4444", icon: "🏆" },
  { id: "meal_prep", label: "Meal Prep", color: "#a855f7", icon: "🍱" },
  { id: "reminder", label: "Reminder", color: "#f59e0b", icon: "🔔" },
];

const _todayBase = new Date();
const _pad = (n) => String(n).padStart(2, "0");
const _ds = (y, m, d) => `${y}-${_pad(m + 1)}-${_pad(d)}`;

const SEED_EVENTS = [];
;

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ events, setEvents, profileId }) {
  const today = new Date();
  const todayStr = _ds(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewing, setViewing] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({
    title: "",
    type: "checkin",
    date: "",
    note: "",
  });

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const firstDay = new Date(viewing.year, viewing.month, 1).getDay();
  const daysInMonth = new Date(viewing.year, viewing.month + 1, 0).getDate();

  const prevMonth = () =>
    setViewing((v) => ({
      year: v.month === 0 ? v.year - 1 : v.year,
      month: v.month === 0 ? 11 : v.month - 1,
    }));
  const nextMonth = () =>
    setViewing((v) => ({
      year: v.month === 11 ? v.year + 1 : v.year,
      month: v.month === 11 ? 0 : v.month + 1,
    }));

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsOn = (ds) => events.filter((e) => e.date === ds);
  const getType = (id) => CAL_TYPES.find((t) => t.id === id) || CAL_TYPES[0];

  const openNew = (ds) => {
    setEditEvent(null);
    setForm({ title: "", type: "checkin", date: ds || todayStr, note: "" });
    setShowModal(true);
  };
  const openEdit = (ev, e) => {
    e.stopPropagation();
    setEditEvent(ev);
    setForm({
      title: ev.title,
      type: ev.type || "reminder",
      date: ev.date,
      note: ev.notes || ev.note || "",
    });
    setShowModal(true);
  };
  const save = async () => {
    if (!form.title.trim()) return;
    if (editEvent) {
      if (profileId) {
        try { await apiFetch(`/calendar-events/${profileId}/${editEvent.id}`, { method: 'DELETE' }); } catch {}
      }
      setEvents((evs) =>
        evs.filter((e) => e.id !== editEvent.id)
      );
    }
    // Encode type in notes as [type:xxx] prefix for persistence
    const notesWithType = `[type:${form.type}]${form.note || ''}`;
    if (profileId) {
      try {
        const created = await apiFetch(`/calendar-events/${profileId}`, {
          method: 'POST',
          body: JSON.stringify({
            date: form.date,
            title: form.title,
            startISO: form.date,
            endISO: form.date,
            notes: notesWithType,
          }),
        });
        setEvents((evs) => [...evs, { id: created.id, date: created.date, title: created.title, notes: form.note, type: form.type }]);
      } catch (e) {
        setEvents((evs) => [...evs, { id: Date.now(), ...form }]);
      }
    } else {
      setEvents((evs) => [...evs, { id: Date.now(), ...form }]);
    }
    setShowModal(false);
  };
  const remove = async () => {
    if (profileId && editEvent?.id) {
      try { await apiFetch(`/calendar-events/${profileId}/${editEvent.id}`, { method: 'DELETE' }); } catch {}
    }
    setEvents((evs) => evs.filter((e) => e.id !== editEvent.id));
    setShowModal(false);
  };

  // Upcoming: next 5 events from today
  const upcoming = [...events]
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <>
      {/* ── Event Modal ── */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000000d0",
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.accent}55`,
              borderRadius: 20,
              padding: 28,
              width: "100%",
              maxWidth: 420,
              animation: "fadeUp .2s ease",
            }}
          >
            <div
              style={{
                fontFamily: "Bebas Neue",
                fontSize: 20,
                letterSpacing: 2,
                color: T.text,
                marginBottom: 20,
              }}
            >
              {editEvent ? "EDIT EVENT" : "ADD EVENT"}
            </div>

            {/* Title */}
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  fontFamily: "DM Sans",
                  fontSize: 10,
                  color: T.muted,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Title *
              </label>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. Weekly Check-In"
                style={{
                  width: "100%",
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: T.text,
                  fontFamily: "DM Sans",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            {/* Date + Type */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div>
                <label
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 10,
                    color: T.muted,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Date *
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: T.text,
                    fontFamily: "DM Sans",
                    fontSize: 13,
                    outline: "none",
                    colorScheme: "dark",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 10,
                    color: T.muted,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: T.text,
                    fontFamily: "DM Sans",
                    fontSize: 13,
                    outline: "none",
                  }}
                >
                  {CAL_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Note */}
            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  fontFamily: "DM Sans",
                  fontSize: 10,
                  color: T.muted,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Note
              </label>
              <textarea
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
                placeholder="Optional details or reminders…"
                style={{
                  width: "100%",
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: T.text,
                  fontFamily: "DM Sans",
                  fontSize: 13,
                  outline: "none",
                  resize: "vertical",
                  minHeight: 64,
                }}
              />
            </div>

            {/* Type preview */}
            {(() => {
              const t = getType(form.type);
              return (
                <div style={{ marginBottom: 16 }}>
                  <span
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 99,
                      background: `${t.color}22`,
                      color: t.color,
                      border: `1px solid ${t.color}44`,
                    }}
                  >
                    {t.icon} {t.label}
                  </span>
                </div>
              );
            })()}

            <div style={{ display: "flex", gap: 8 }}>
              {editEvent && (
                <button
                  onClick={remove}
                  style={{
                    background: `${T.danger}18`,
                    border: `1px solid ${T.danger}44`,
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: T.danger,
                    fontFamily: "DM Sans",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  🗑 Delete
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  background: "none",
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  padding: 10,
                  color: T.muted,
                  fontFamily: "DM Sans",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={!form.title.trim()}
                style={{
                  flex: 2,
                  background: form.title.trim() ? T.accent : T.border,
                  color: form.title.trim() ? T.bg : T.muted,
                  border: "none",
                  borderRadius: 10,
                  padding: 10,
                  fontFamily: "Bebas Neue",
                  fontSize: 15,
                  letterSpacing: 1.5,
                  cursor: form.title.trim() ? "pointer" : "default",
                  transition: "all .2s",
                }}
              >
                {editEvent ? "SAVE CHANGES" : "ADD EVENT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Calendar card ── */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 20,
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <button
            onClick={prevMonth}
            style={{
              background: "none",
              border: `1px solid ${T.border}`,
              color: T.muted,
              borderRadius: 8,
              width: 28,
              height: 28,
              cursor: "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = T.accent;
              e.currentTarget.style.color = T.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = T.border;
              e.currentTarget.style.color = T.muted;
            }}
          >
            ‹
          </button>
          <div
            style={{
              fontFamily: "Bebas Neue",
              fontSize: 16,
              letterSpacing: 2,
              color: T.text,
            }}
          >
            {monthNames[viewing.month]}{" "}
            <span style={{ color: T.accent }}>{viewing.year}</span>
          </div>
          <button
            onClick={nextMonth}
            style={{
              background: "none",
              border: `1px solid ${T.border}`,
              color: T.muted,
              borderRadius: 8,
              width: 28,
              height: 28,
              cursor: "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = T.accent;
              e.currentTarget.style.color = T.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = T.border;
              e.currentTarget.style.color = T.muted;
            }}
          >
            ›
          </button>
        </div>

        {/* Day headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 1,
            marginBottom: 4,
          }}
        >
          {dayNames.map((d) => (
            <div
              key={d}
              style={{
                textAlign: "center",
                fontFamily: "DM Sans",
                fontSize: 9,
                color: T.muted,
                padding: "2px 0",
                letterSpacing: 0.5,
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 1,
          }}
        >
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} style={{ minHeight: 36 }} />;
            const ds = _ds(viewing.year, viewing.month, d);
            const isToday = ds === todayStr;
            const dayEvs = eventsOn(ds);
            const hasEv = dayEvs.length > 0;
            return (
              <div
                key={d}
                onClick={() => {
                  setSelectedDate(ds);
                  openNew(ds);
                }}
                style={{
                  minHeight: 36,
                  borderRadius: 7,
                  cursor: "pointer",
                  padding: "4px 2px",
                  background: isToday
                    ? T.accent
                    : selectedDate === ds
                    ? `${T.accent}18`
                    : "none",
                  border: isToday
                    ? "none"
                    : hasEv
                    ? `1px solid ${getType(dayEvs[0].type).color}55`
                    : "1px solid transparent",
                  position: "relative",
                  transition: "background .12s",
                }}
                onMouseEnter={(e) => {
                  if (!isToday)
                    e.currentTarget.style.background = `${T.accent}12`;
                }}
                onMouseLeave={(e) => {
                  if (!isToday)
                    e.currentTarget.style.background =
                      selectedDate === ds ? `${T.accent}18` : "none";
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    fontFamily: "JetBrains Mono",
                    fontSize: 11,
                    color: isToday ? T.bg : T.text,
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {d}
                </div>
                {/* Event dots */}
                {dayEvs.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 2,
                      marginTop: 2,
                      flexWrap: "wrap",
                    }}
                  >
                    {dayEvs.slice(0, 3).map((ev, ei) => (
                      <div
                        key={ei}
                        onClick={(e) => openEdit(ev, e)}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: getType(ev.type).color,
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                        title={ev.title}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Upcoming strip */}
        {upcoming.length > 0 && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                fontFamily: "Bebas Neue",
                fontSize: 11,
                letterSpacing: 1.5,
                color: T.muted,
                marginBottom: 8,
              }}
            >
              UPCOMING
            </div>
            {upcoming.map((ev) => {
              const t = getType(ev.type);
              const d = new Date(ev.date + "T00:00:00");
              const diff = Math.round((d - today) / 86400000);
              const when =
                diff === 0
                  ? "Today"
                  : diff === 1
                  ? "Tomorrow"
                  : `${d.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}`;
              return (
                <div
                  key={ev.id}
                  onClick={(e) => openEdit(ev, e)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 6px",
                    borderRadius: 8,
                    cursor: "pointer",
                    marginBottom: 3,
                    transition: "background .12s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = T.surface)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: t.color,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      fontFamily: "DM Sans",
                      fontSize: 11,
                      color: T.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ev.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "JetBrains Mono",
                      fontSize: 9,
                      color:
                        diff <= 1 ? T.danger : diff <= 3 ? T.accent : T.muted,
                      flexShrink: 0,
                    }}
                  >
                    {when}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 12,
            paddingTop: 10,
            borderTop: `1px solid ${T.border}`,
            flexWrap: "wrap",
          }}
        >
          {[
            { color: T.accent, label: "Today", square: true },
            { color: T.coachGreen, label: "Check-In" },
            { color: "#3b82f6", label: "Training" },
            { color: "#ef4444", label: "Event" },
          ].map((l) => (
            <div
              key={l.label}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <div
                style={{
                  width: l.square ? 8 : 6,
                  height: l.square ? 8 : 6,
                  borderRadius: l.square ? 2 : "50%",
                  background: l.color,
                }}
              />
              <span
                style={{ fontFamily: "DM Sans", fontSize: 9, color: T.muted }}
              >
                {l.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Floating + button ── */}
        <button
          onClick={() => openNew(todayStr)}
          title="Add event"
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: T.accent,
            border: "none",
            color: T.bg,
            fontSize: 22,
            fontWeight: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: `0 4px 16px ${T.accent}55`,
            transition: "all .2s",
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.12)";
            e.currentTarget.style.boxShadow = `0 6px 24px ${T.accent}77`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = `0 4px 16px ${T.accent}55`;
          }}
        >
          +
        </button>
      </div>
    </>
  );
}

// ── Coach Videos (loaded from DB — YouTube links posted by coach) ─────────────
const categoryColors = {
  Nutrition: "#FF9A52",
  Training: T.protein,
  Recovery: T.coachGreen,
  Mindset: T.mfp,
  General: T.accent,
};

function CoachVideos({ profileId }) {
  const [videos, setVideos] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    if (!profileId) return;
    (async () => {
      try {
        const rows = await apiFetch(`/coach-videos/${profileId}`);
        if (Array.isArray(rows)) setVideos(rows);
      } catch {}
    })();
  }, [profileId]);

  if (videos.length === 0) return null; // Hide section if no videos

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "Bebas Neue", fontSize: 20, letterSpacing: 2, color: T.text }}>COACH VIDEOS</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 11, color: T.muted, marginTop: 2 }}>
            Latest content from your coaching team
          </div>
        </div>
      </div>

      {/* YouTube embed */}
      {activeVideo && (
        <div style={{ marginBottom: 16, borderRadius: 14, overflow: "hidden", background: "#000", position: "relative", paddingBottom: "56.25%" }}>
          <iframe
            src={`https://www.youtube.com/embed/${activeVideo.youtube_id}?autoplay=1`}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      )}

      {/* Video grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {videos.map((v) => {
          const isActive = activeVideo?.id === v.id;
          const catColor = categoryColors[v.category] || T.accent;
          return (
            <div
              key={v.id}
              onClick={() => setActiveVideo(isActive ? null : v)}
              style={{
                background: isActive ? `${T.accent}15` : T.surface,
                border: `1px solid ${isActive ? T.accent : T.border}`,
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {/* YouTube thumbnail */}
              <div style={{ position: "relative", paddingBottom: "56.25%", background: "#111" }}>
                <img
                  src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`}
                  alt={v.title}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>▶</div>
                </div>
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontFamily: "DM Sans", fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.3, marginBottom: 6 }}>{v.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ background: catColor + "22", color: catColor, borderRadius: 4, padding: "2px 8px", fontFamily: "DM Sans", fontSize: 9, fontWeight: 600 }}>{v.category}</span>
                  <span style={{ fontFamily: "DM Sans", fontSize: 9, color: T.muted }}>{v.coach_name || "Coach"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Mood Tracker ──────────────────────────────────────────────────────────────
const MOODS = [
  { id: 5, emoji: "😄", label: "Great", color: "#22c55e" },
  { id: 4, emoji: "🙂", label: "Good", color: "#FF9A52" },
  { id: 3, emoji: "😐", label: "Neutral", color: "#f97316" },
  { id: 2, emoji: "😔", label: "Low", color: "#3b82f6" },
  { id: 1, emoji: "😩", label: "Terrible", color: "#ef4444" },
];

function MoodTracker({ moodLog, setMoodLog, onMoodSaved }) {
  const todayDate = dateToISO(new Date());
  const [note, setNote] = useState(moodLog[todayDate]?.note || "");
  const [saved, setSaved] = useState(!!moodLog[todayDate]);
  const [showHistory, setShowHistory] = useState(false);

  const todayMood = moodLog[todayDate];

  const selectMood = (mood) => {
    const entry = { ...mood, note, date: todayDate, timestamp: new Date().toISOString() };
    setMoodLog((prev) => ({ ...prev, [todayDate]: entry }));
    onMoodSaved?.(todayDate, entry);
    setSaved(false);
  };

  const saveNote = () => {
    if (moodLog[todayDate]) {
      const updated = { ...moodLog[todayDate], note };
      setMoodLog((prev) => ({ ...prev, [todayDate]: updated }));
      onMoodSaved?.(todayDate, updated);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Build last 7 calendar days
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = dateToISO(d);
    const dow = d.getDay();
    last7.push({ date: ds, dayLabel: DAYS[dow === 0 ? 6 : dow - 1], entry: moodLog[ds] || null, isToday: ds === todayDate });
  }
  const avgScore = (() => {
    const entries = last7.filter(d => d.entry).map(d => d.entry.id);
    if (!entries.length) return null;
    return (entries.reduce((a, v) => a + v, 0) / entries.length).toFixed(1);
  })();

  const trendLabel =
    avgScore >= 4 ? "Great week 🔥" : avgScore >= 3 ? "Solid week 💪" : avgScore ? "Tough stretch 💙" : null;

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "Bebas Neue",
              fontSize: 22,
              letterSpacing: 2,
              color: T.text,
            }}
          >
            MOOD LOG
          </div>
          <div
            style={{
              fontFamily: "DM Sans",
              fontSize: 12,
              color: T.muted,
              marginTop: 2,
            }}
          >
            How are you feeling today? Tracked week on week.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {avgScore && (
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontFamily: "JetBrains Mono",
                  fontSize: 11,
                  color: T.accent,
                }}
              >
                {trendLabel}
              </div>
              <div
                style={{ fontFamily: "DM Sans", fontSize: 10, color: T.muted }}
              >
                Avg score: {avgScore} / 5
              </div>
            </div>
          )}
          <button
            onClick={() => setShowHistory((h) => !h)}
            style={{
              background: showHistory ? T.border : "none",
              border: `1px solid ${T.border}`,
              color: showHistory ? T.text : T.muted,
              borderRadius: 8,
              padding: "6px 14px",
              fontFamily: "DM Sans",
              fontSize: 11,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {showHistory ? "Hide history" : "Week history"}
          </button>
        </div>
      </div>

      {/* Today's mood picker */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {MOODS.map((m) => {
          const isSelected = todayMood?.id === m.id;
          return (
            <button
              key={m.id}
              onClick={() => selectMood(m)}
              style={{
                flex: 1,
                padding: "14px 8px",
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.2s",
                background: isSelected ? `${m.color}22` : T.surface,
                border: isSelected
                  ? `2px solid ${m.color}`
                  : `2px solid ${T.border}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
              onMouseEnter={(e) => {
                if (!isSelected)
                  e.currentTarget.style.borderColor = m.color + "66";
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.borderColor = T.border;
              }}
            >
              <span style={{ fontSize: 26, lineHeight: 1 }}>{m.emoji}</span>
              <span
                style={{
                  fontFamily: "DM Sans",
                  fontSize: 10,
                  color: isSelected ? m.color : T.muted,
                  fontWeight: isSelected ? 600 : 400,
                  letterSpacing: 0.3,
                }}
              >
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Note input */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(false);
          }}
          placeholder={
            todayMood
              ? "Add a note about how you're feeling… (optional)"
              : "Select a mood above, then add a note…"
          }
          disabled={!todayMood}
          rows={2}
          style={{
            flex: 1,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: "10px 14px",
            color: T.text,
            fontFamily: "DM Sans",
            fontSize: 12,
            resize: "none",
            outline: "none",
            opacity: todayMood ? 1 : 0.4,
            caretColor: T.accent,
            lineHeight: 1.5,
          }}
        />
        <button
          onClick={saveNote}
          disabled={!todayMood}
          style={{
            background: saved ? T.coachGreen : todayMood ? T.accent : T.border,
            color: todayMood ? T.bg : T.muted,
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontFamily: "Bebas Neue",
            fontSize: 14,
            letterSpacing: 1,
            cursor: todayMood ? "pointer" : "default",
            transition: "all 0.25s",
            whiteSpace: "nowrap",
          }}
        >
          {saved ? "✓ SAVED" : "SAVE"}
        </button>
      </div>

      {/* Week history */}
      {showHistory && (
        <div
          style={{
            marginTop: 20,
            paddingTop: 20,
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              fontFamily: "Bebas Neue",
              fontSize: 14,
              letterSpacing: 2,
              color: T.muted,
              marginBottom: 14,
            }}
          >
            THIS WEEK
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {last7.map(({ date, dayLabel, entry, isToday }) => (
              <div key={date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", height: 64, display: "flex", alignItems: "flex-end", background: T.surface, borderRadius: 8, overflow: "hidden", position: "relative", border: isToday ? `1px solid ${T.accent}44` : "none" }}>
                  {entry ? (
                    <div style={{ width: "100%", height: `${(entry.id / 5) * 100}%`, background: `${entry.color}55`, borderTop: `2px solid ${entry.color}`, transition: "height 0.5s ease", position: "absolute", bottom: 0 }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 10, color: T.border }}>—</span>
                    </div>
                  )}
                  {entry && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 18 }}>{entry.emoji}</span>
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: "Bebas Neue", fontSize: 11, letterSpacing: 1, color: entry ? entry.color : T.border }}>{dayLabel}</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 7, color: T.muted }}>{date.slice(5)}</div>
              </div>
            ))}
          </div>

          {/* Trend line dots */}
          <div style={{ marginTop: 16, position: "relative", height: 40 }}>
            <svg width="100%" height="40" style={{ overflow: "visible" }}>
              {(() => {
                const entries = last7.map((w, i) => ({ i, entry: w.entry })).filter((x) => x.entry);
                if (entries.length < 2) return null;
                const step = 100 / (last7.length - 1);
                const pts = entries.map((x) => `${x.i * step}%,${40 - (x.entry.id / 5) * 36}`).join(" ");
                return (
                  <>
                    <polyline points={pts} fill="none" stroke={T.accent} strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />
                    {entries.map((x) => (
                      <circle key={x.i} cx={`${x.i * step}%`} cy={40 - (x.entry.id / 5) * 36} r="4" fill={x.entry.color} stroke={T.card} strokeWidth="2" />
                    ))}
                  </>
                );
              })()}
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              {last7.map((d) => (
                <span key={d.date} style={{ fontFamily: "JetBrains Mono", fontSize: 8, color: T.border, flex: 1, textAlign: "center" }}>{d.dayLabel}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inbox / Messaging ─────────────────────────────────────────────────────────
// Messages are keyed by senderId; each has a thread of individual messages.
// Coaches each have their own AI persona for 2-way chat.
const COACHES_CONFIG = {
  "coach-sarah": {
    name: "NutriBot",
    role: "AI Nutrition Coach",
    initials: "NB",
    color: "#22c55e",
    systemPrompt: (profile, tot, goals) =>
      `You are NutriBot, an AI nutrition coaching assistant. You are helping ${profile.name}, a ${profile.sport} athlete (goal: ${profile.goal}). Today's macros: Cal ${tot.calories}/${goals.calories} kcal, Protein ${tot.protein}/${goals.protein}g, Carbs ${tot.carbs}/${goals.carbs}g, Fat ${tot.fat}/${goals.fat}g. Be warm, concise, data-driven. You are an AI assistant — not a replacement for their real coach.`,
  },
  "coach-james": {
    name: "TrainBot",
    role: "AI Training Coach",
    initials: "TB",
    color: "#3b82f6",
    systemPrompt: (profile) =>
      `You are TrainBot, an AI strength and conditioning assistant. You help ${profile.name}, a ${profile.sport} athlete, with performance, training load, recovery, and how nutrition supports training. Keep messages concise. You are an AI assistant — not a replacement for their real coach.`,
  },
  "coach-emma": {
    name: "MindBot",
    role: "AI Mindset Coach",
    initials: "MB",
    color: "#a855f7",
    systemPrompt: (profile) =>
      `You are MindBot, an AI sports psychology assistant. You help ${profile.name}, a ${profile.sport} athlete, with motivation, mental resilience, habit consistency, and psychological aspects of nutrition and training. Be empathetic, encouraging, and brief. You are an AI assistant — not a replacement for their real coach.`,
  },
};

// Old thread seed removed — email-style threading in InboxPage now

function timeAgo(isoString) {
  const diff = (Date.now() - new Date(isoString)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Weight Tracker ────────────────────────────────────────────────────────────
const WEIGHT_SEED = {};
;

function WeightTracker({ onWeightSaved, profileId }) {
  const [weightLog, setWeightLog] = useState({}); // keyed by YYYY-MM-DD
  const [inputWeight, setInputWeight] = useState("");
  const [saved, setSaved] = useState(false);
  const [unit, setUnit] = useState("kg");

  const todayDate = dateToISO(new Date());

  // Load weights from backend
  useEffect(() => {
    if (!profileId) return;
    (async () => {
      try {
        const rows = await apiFetch(`/weights/${profileId}`);
        if (!Array.isArray(rows)) return;
        const byDate = {};
        rows.forEach((r) => { byDate[r.date] = { weight: Number(r.kg), date: r.date }; });
        setWeightLog(byDate);
      } catch {}
    })();
  }, [profileId]);

  const toDisplay = (kg) => unit === "lbs" ? parseFloat((kg * 2.20462).toFixed(1)) : kg;
  const fromDisplay = (v) => unit === "lbs" ? parseFloat((v / 2.20462).toFixed(2)) : parseFloat(v);

  const logWeight = () => {
    const val = parseFloat(inputWeight);
    if (!val || val <= 0) return;
    const kg = fromDisplay(val);
    setWeightLog((prev) => ({ ...prev, [todayDate]: { weight: kg, date: todayDate } }));
    if (profileId) {
      apiFetch(`/weights/${profileId}`, {
        method: 'POST', body: JSON.stringify({ date: todayDate, kg }),
      }).catch(e => console.warn('Weight save failed:', e));
    }
    onWeightSaved?.(kg);
    setSaved(true);
    setInputWeight("");
    setTimeout(() => setSaved(false), 2000);
  };

  const todayEntry = weightLog[todayDate];
  const allEntries = Object.entries(weightLog)
    .filter(([_, v]) => v)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, v]) => ({ date: d, weight: v.weight }));
  const avgWeight = allEntries.length > 0 ? (allEntries.reduce((s, e) => s + e.weight, 0) / allEntries.length).toFixed(1) : null;
  // Trend: compare last entry to 7 days ago (or earliest if less data)
  const trend = (() => {
    if (allEntries.length < 2) return null;
    const latest = allEntries[allEntries.length - 1].weight;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = dateToISO(cutoff);
    const weekAgo = allEntries.filter(e => e.date <= cutoffStr);
    const compare = weekAgo.length > 0 ? weekAgo[weekAgo.length - 1].weight : allEntries[0].weight;
    return (latest - compare).toFixed(1);
  })();

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "Bebas Neue", fontSize: 22, letterSpacing: 2, color: T.text }}>WEIGHT TRACKER</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 11, color: T.muted, marginTop: 2 }}>Log daily · Track progress over time</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["kg", "lbs"].map((u) => (
            <button key={u} onClick={() => setUnit(u)} style={{
              background: unit === u ? `${T.accent}22` : "none", border: `1px solid ${unit === u ? T.accent + "55" : T.border}`,
              borderRadius: 6, padding: "4px 10px", color: unit === u ? T.accent : T.muted,
              fontFamily: "JetBrains Mono", fontSize: 10, cursor: "pointer",
            }} type="button">{u}</button>
          ))}
        </div>
      </div>

      {/* Chart — 30 day line graph */}
      {(() => {
        // Build last 30 days
        const days30 = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const ds = dateToISO(d);
          days30.push({ date: ds, entry: weightLog[ds] || null });
        }
        const dataPoints = days30.filter(e => e.entry).map(e => ({ date: e.date, w: e.entry.weight }));
        if (dataPoints.length < 2) return null;

        const wMin = Math.min(...dataPoints.map(p => p.w)) - 0.5;
        const wMax = Math.max(...dataPoints.map(p => p.w)) + 0.5;
        const wRange = wMax - wMin || 1;
        const chartW = 600;
        const chartH = 160;
        const pad = { top: 20, right: 10, bottom: 30, left: 40 };
        const innerW = chartW - pad.left - pad.right;
        const innerH = chartH - pad.top - pad.bottom;

        const toX = (i) => pad.left + (i / (dataPoints.length - 1)) * innerW;
        const toY = (w) => pad.top + (1 - (w - wMin) / wRange) * innerH;

        const pathD = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(p.w).toFixed(1)}`).join(" ");
        // Gradient fill
        const areaD = pathD + ` L${toX(dataPoints.length - 1).toFixed(1)},${chartH - pad.bottom} L${pad.left},${chartH - pad.bottom} Z`;

        // Y-axis labels (4 ticks)
        const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => wMin + f * wRange);

        // X-axis labels (show ~5 dates)
        const step = Math.max(1, Math.floor(dataPoints.length / 5));
        const xLabels = dataPoints.filter((_, i) => i % step === 0 || i === dataPoints.length - 1);

        return (
          <div style={{ marginBottom: 16 }}>
            <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id="wg" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={T.accent} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={T.accent} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {yTicks.map((v, i) => (
                <g key={i}>
                  <line x1={pad.left} x2={chartW - pad.right} y1={toY(v)} y2={toY(v)} stroke={T.border} strokeWidth="0.5" strokeDasharray="4 3" />
                  <text x={pad.left - 4} y={toY(v) + 3} fill={T.muted} fontSize="9" fontFamily="JetBrains Mono" textAnchor="end">
                    {toDisplay(Number(v.toFixed(1)))}
                  </text>
                </g>
              ))}
              {/* Fill area */}
              <path d={areaD} fill="url(#wg)" />
              {/* Line */}
              <path d={pathD} fill="none" stroke={T.accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {/* Data points */}
              {dataPoints.map((p, i) => (
                <g key={i}>
                  <circle cx={toX(i)} cy={toY(p.w)} r="4" fill={T.card} stroke={T.accent} strokeWidth="2" />
                  {/* Show weight label on first, last, and every 5th point */}
                  {(i === 0 || i === dataPoints.length - 1 || i % 5 === 0) && (
                    <text x={toX(i)} y={toY(p.w) - 8} fill={T.text} fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">
                      {toDisplay(p.w)}
                    </text>
                  )}
                </g>
              ))}
              {/* X labels */}
              {xLabels.map((p) => {
                const i = dataPoints.indexOf(p);
                const d = new Date(p.date + "T00:00:00");
                return (
                  <text key={p.date} x={toX(i)} y={chartH - 6} fill={T.muted} fontSize="8" fontFamily="DM Sans" textAnchor="middle">
                    {d.getDate()}/{d.getMonth() + 1}
                  </text>
                );
              })}
            </svg>
          </div>
        );
      })()}

      {/* Input */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input value={inputWeight} onChange={(e) => setInputWeight(e.target.value)} onKeyDown={(e) => e.key === "Enter" && logWeight()}
          placeholder={todayEntry ? `${toDisplay(todayEntry.weight)} ${unit} (logged)` : `Log today's weight (${unit})`}
          type="number" step="0.1"
          style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.text, fontFamily: "JetBrains Mono", fontSize: 13, outline: "none" }}
        />
        <button onClick={logWeight} style={{
          background: inputWeight ? T.accent : T.border, color: inputWeight ? T.bg : T.muted,
          border: "none", borderRadius: 10, padding: "10px 16px",
          fontFamily: "Bebas Neue", fontSize: 14, letterSpacing: 1.5, cursor: inputWeight ? "pointer" : "default",
        }} type="button">{saved ? "✓" : "LOG"}</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <div style={{ background: T.surface, borderRadius: 10, padding: "8px 10px" }}>
          <div style={{ fontFamily: "Bebas Neue", fontSize: 20, color: T.accent }}>{todayEntry ? toDisplay(todayEntry.weight) : "—"}</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 9, color: T.muted }}>TODAY ({unit})</div>
        </div>
        <div style={{ background: T.surface, borderRadius: 10, padding: "8px 10px" }}>
          <div style={{ fontFamily: "Bebas Neue", fontSize: 20, color: T.text }}>{avgWeight ? toDisplay(Number(avgWeight)) : "—"}</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 9, color: T.muted }}>AVG ({unit})</div>
        </div>
        <div style={{ background: T.surface, borderRadius: 10, padding: "8px 10px" }}>
          <div style={{ fontFamily: "Bebas Neue", fontSize: 20, color: trend && Number(trend) > 0 ? T.danger : trend && Number(trend) < 0 ? T.coachGreen : T.muted }}>
            {trend ? `${Number(trend) > 0 ? "+" : ""}${unit === "lbs" ? (Number(trend) * 2.20462).toFixed(1) : trend}` : "—"}
          </div>
          <div style={{ fontFamily: "DM Sans", fontSize: 9, color: T.muted }}>TREND</div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard (main landing page) ─────────────────────────────────────────────
function Dashboard({
  plan,
  profile,
  onNavigate,
  selectedDay,
  moodLog,
  setMoodLog,
  threads,
  setThreads,
  onMoodSaved,
  profileId,
  events,
  setEvents,
  onWeightSaved,
}) {
  // Aggregate totals across the whole week for the overview
  const wd = getCurrentWeekDates();
  const weekTotals = wd.reduce(
    (acc, { date }) => {
      const dayPlan = plan[date];
      if (!dayPlan) return acc;
      const t = dayTotals(dayPlan);
      return {
        calories: acc.calories + t.calories,
        protein: acc.protein + t.protein,
        carbs: acc.carbs + t.carbs,
        fat: acc.fat + t.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const todayDate = getTodayISO();
  const todayData = dayTotals(plan[todayDate] || {});
  const todayGoals = getGoalsForDate(todayDate);
  // Sum per-day goals for the week (not average * 7)
  const weekGoal = wd.reduce((acc, { date }) => {
    const dg = getGoalsForDate(date);
    return {
      calories: acc.calories + (dg.calories || 0),
      protein: acc.protein + (dg.protein || 0),
      carbs: acc.carbs + (dg.carbs || 0),
      fat: acc.fat + (dg.fat || 0),
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const firstName = profile.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const macroCards = [
    {
      label: "CALORIES",
      today: todayData.calories,
      goal: todayGoals.calories,
      week: weekTotals.calories,
      weekGoal: weekGoal.calories,
      unit: "kcal",
      color: T.accent,
    },
    {
      label: "PROTEIN",
      today: todayData.protein,
      goal: todayGoals.protein,
      week: weekTotals.protein,
      weekGoal: weekGoal.protein,
      unit: "g",
      color: T.protein,
    },
    {
      label: "CARBS",
      today: todayData.carbs,
      goal: todayGoals.carbs,
      week: weekTotals.carbs,
      weekGoal: weekGoal.carbs,
      unit: "g",
      color: T.carbs,
    },
    {
      label: "FAT",
      today: todayData.fat,
      goal: todayGoals.fat,
      week: weekTotals.fat,
      weekGoal: weekGoal.fat,
      unit: "g",
      color: T.fat,
    },
  ];

  // Find latest unread message across all threads
  const allUnread = threads
    .flatMap((t) =>
      t.messages.filter((m) => !m.read).map((m) => ({ ...m, thread: t }))
    )
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const latestUnread = allUnread[0] || null;

  const dismissBanner = () =>
    setThreads((prev) =>
      prev.map((t) =>
        t.senderId === latestUnread.thread.senderId
          ? {
              ...t,
              messages: t.messages.map((m) =>
                m.id === latestUnread.id ? { ...m, read: true } : m
              ),
            }
          : t
      )
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Pinned message banner ── */}
      {latestUnread &&
        (() => {
          const th = latestUnread.thread;
          const isCoach = th.type === "coach";
          const col = isCoach ? T.coachGreen : T.accent;
          return (
            <div
              style={{
                background: `linear-gradient(135deg, ${col}14, ${col}08)`,
                border: `1px solid ${col}44`,
                borderRadius: 14,
                padding: "14px 18px",
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                animation: "fadeUp 0.3s ease",
              }}
            >
              {/* Left accent bar */}
              <div
                style={{
                  width: 3,
                  borderRadius: 2,
                  background: col,
                  alignSelf: "stretch",
                  flexShrink: 0,
                }}
              />

              {/* Avatar */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: `linear-gradient(135deg, ${col}88, ${col}44)`,
                  border: `2px solid ${col}55`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "Bebas Neue",
                    fontSize: 12,
                    color: "#fff",
                    letterSpacing: 0.5,
                  }}
                >
                  {th.avatar}
                </span>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 3,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 11,
                      fontWeight: 600,
                      color: col,
                    }}
                  >
                    {th.senderName}
                  </span>
                  <span
                    style={{
                      background: `${col}18`,
                      border: `1px solid ${col}33`,
                      borderRadius: 4,
                      padding: "1px 6px",
                      fontFamily: "DM Sans",
                      fontSize: 9,
                      color: col,
                    }}
                  >
                    {isCoach ? "Coach message" : "Company update"}
                  </span>
                  <span
                    style={{
                      fontFamily: "JetBrains Mono",
                      fontSize: 9,
                      color: T.muted,
                      marginLeft: "auto",
                    }}
                  >
                    {timeAgo(latestUnread.timestamp)}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.text,
                    marginBottom: 2,
                  }}
                >
                  {latestUnread.title}
                </div>
                <div
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 11,
                    color: T.muted,
                    lineHeight: 1.5,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {latestUnread.body}
                </div>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={dismissBanner}
                  style={{
                    background: col,
                    color: T.bg,
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontFamily: "Bebas Neue",
                    fontSize: 11,
                    letterSpacing: 1,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  MARK READ
                </button>
                <button
                  onClick={dismissBanner}
                  style={{
                    background: "none",
                    border: `1px solid ${T.border}`,
                    color: T.muted,
                    borderRadius: 8,
                    padding: "5px 14px",
                    fontFamily: "DM Sans",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })()}

      {/* ── Greeting row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "Bebas Neue",
              fontSize: 34,
              letterSpacing: 2,
              color: T.text,
              lineHeight: 1,
            }}
          >
            {greeting}, <span style={{ color: T.accent }}>{firstName}</span>
          </div>
          <div
            style={{
              fontFamily: "DM Sans",
              fontSize: 13,
              color: T.muted,
              marginTop: 6,
            }}
          >
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}{" "}
            · Here's your nutrition overview
          </div>
        </div>
        <button
          onClick={() => onNavigate("meals")}
          style={{
            background: T.accent,
            color: T.bg,
            border: "none",
            borderRadius: 10,
            padding: "10px 22px",
            fontFamily: "Bebas Neue",
            fontSize: 15,
            letterSpacing: 1.5,
            cursor: "pointer",
          }}
        >
          VIEW MEAL PLAN →
        </button>
      </div>

      {/* ── Main 2-column layout ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Macro overview cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,1fr)",
              gap: 14,
            }}
          >
            {macroCards.map((m) => {
              const todayPct = Math.min((m.today / m.goal) * 100, 100);
              const weekPct = Math.min((m.week / m.weekGoal) * 100, 100);
              const r = 32;
              const circ = 2 * Math.PI * r;
              return (
                <div
                  key={m.label}
                  style={{
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 16,
                    padding: 20,
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                  }}
                >
                  {/* Ring */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <svg
                      width={80}
                      height={80}
                      style={{ transform: "rotate(-90deg)" }}
                    >
                      <circle
                        cx={40}
                        cy={40}
                        r={r}
                        fill="none"
                        stroke={T.border}
                        strokeWidth={7}
                      />
                      <circle
                        cx={40}
                        cy={40}
                        r={r}
                        fill="none"
                        stroke={m.color}
                        strokeWidth={7}
                        strokeDasharray={`${(todayPct / 100) * circ} ${circ}`}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dasharray 0.8s ease" }}
                      />
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "JetBrains Mono",
                          fontSize: 13,
                          color: m.color,
                          fontWeight: 600,
                          lineHeight: 1,
                        }}
                      >
                        {Math.round(todayPct)}%
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "Bebas Neue",
                        fontSize: 13,
                        letterSpacing: 2,
                        color: T.muted,
                        marginBottom: 6,
                      }}
                    >
                      {m.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "Bebas Neue",
                        fontSize: 30,
                        color: m.color,
                        lineHeight: 1,
                      }}
                    >
                      {m.today}
                      <span style={{ fontSize: 14, color: T.muted }}>
                        {" "}
                        {m.unit}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: "DM Sans",
                        fontSize: 10,
                        color: T.muted,
                        marginTop: 3,
                      }}
                    >
                      Goal: {m.goal}
                      {m.unit} ·{" "}
                      {m.goal - m.today > 0
                        ? `${m.goal - m.today}${m.unit} left`
                        : "✓ Hit!"}
                    </div>
                    {/* Week progress bar */}
                    <div style={{ marginTop: 8 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "DM Sans",
                            fontSize: 9,
                            color: T.muted,
                          }}
                        >
                          THIS WEEK
                        </span>
                        <span
                          style={{
                            fontFamily: "JetBrains Mono",
                            fontSize: 9,
                            color: T.muted,
                          }}
                        >
                          {Math.round(weekPct)}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: 3,
                          background: T.border,
                          borderRadius: 99,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${weekPct}%`,
                            background: `${m.color}88`,
                            borderRadius: 99,
                            transition: "width 0.5s",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Check-in countdown — computed from calendar events */}
          {(() => {
            const todayISO = getTodayISO();
            const nextCheckin = [...(events || [])]
              .filter(e => e.date >= todayISO && (e.type === "checkin" || (e.title || "").toLowerCase().includes("check")))
              .sort((a, b) => a.date.localeCompare(b.date))[0];
            if (nextCheckin) {
              const diff = Math.ceil((new Date(nextCheckin.date + "T00:00:00") - new Date(todayISO + "T00:00:00")) / 86400000);
              return <CheckInCountdown daysLeft={diff} coachName={profile.coachName} />;
            }
            return <CheckInCountdown daysLeft={null} coachName={profile.coachName} />;
          })()}

          {/* Weekly calorie bar chart */}
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div
              style={{
                fontFamily: "Bebas Neue",
                fontSize: 16,
                letterSpacing: 2,
                color: T.muted,
                marginBottom: 16,
              }}
            >
              WEEKLY CALORIE OVERVIEW
            </div>
            {/* SVG Bar Chart with dotted target lines */}
            {(() => {
              const chartW = 500, chartH = 160;
              const pad = { top: 16, right: 8, bottom: 40, left: 40 };
              const innerW = chartW - pad.left - pad.right;
              const innerH = chartH - pad.top - pad.bottom;
              const barW = innerW / 7;
              const barPad = barW * 0.2;

              // Compute per-day data
              const dayData = wd.map(({ dayKey, date, isToday }) => {
                const cal = dayTotals(plan[date] || {}).calories;
                const goal = getGoalsForDate(date).calories || macroGoals.calories || 2000;
                const pct = goal > 0 ? cal / goal : 0;
                const color = cal === 0 ? T.border
                  : Math.abs(pct - 1) <= 0.10 ? T.coachGreen
                  : Math.abs(pct - 1) <= 0.20 ? T.accent
                  : T.danger;
                return { dayKey, date, isToday, cal, goal, pct, color };
              });

              // Y-axis scale: max of all cals and goals + 15% headroom
              const maxVal = Math.max(...dayData.map(d => Math.max(d.cal, d.goal)), 1) * 1.15;
              const toY = (v) => pad.top + innerH - (v / maxVal) * innerH;

              // Y-axis ticks
              const yStep = Math.ceil(maxVal / 4 / 100) * 100;
              const yTicks = [];
              for (let v = 0; v <= maxVal; v += yStep) yTicks.push(v);

              return (
                <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", height: "auto", overflow: "visible", marginBottom: 8 }}>
                  {/* Y-axis grid + labels */}
                  {yTicks.map((v, i) => (
                    <g key={i}>
                      <line x1={pad.left} x2={chartW - pad.right} y1={toY(v)} y2={toY(v)} stroke={T.border} strokeWidth="0.4" strokeDasharray="2 4" />
                      <text x={pad.left - 4} y={toY(v) + 3} fill={T.muted} fontSize="8" fontFamily="JetBrains Mono" textAnchor="end">{v}</text>
                    </g>
                  ))}

                  {/* Bars + target lines */}
                  {dayData.map((d, i) => {
                    const x = pad.left + i * barW;
                    const barX = x + barPad;
                    const bw = barW - barPad * 2;
                    const barH = Math.max((d.cal / maxVal) * innerH, d.cal > 0 ? 3 : 1);
                    const barY = pad.top + innerH - barH;
                    const goalY = toY(d.goal);

                    return (
                      <g key={d.date}>
                        {/* Bar */}
                        <rect x={barX} y={barY} width={bw} height={barH}
                          rx="3" fill={d.isToday ? d.color : d.color + "cc"}
                          stroke={d.isToday ? d.color : "none"} strokeWidth={d.isToday ? 1.5 : 0} />

                        {/* Dotted target line */}
                        <line x1={x + 2} x2={x + barW - 2} y1={goalY} y2={goalY}
                          stroke={T.text} strokeWidth="1.2" strokeDasharray="3 2" opacity="0.5" />

                        {/* Calorie value above bar */}
                        {d.cal > 0 && (
                          <text x={barX + bw / 2} y={barY - 4} fill={d.isToday ? T.text : T.muted}
                            fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight={d.isToday ? 700 : 400}>
                            {d.cal}
                          </text>
                        )}

                        {/* Day label */}
                        <text x={x + barW / 2} y={chartH - pad.bottom + 14} fill={d.isToday ? T.text : T.muted}
                          fontSize="10" fontFamily="Bebas Neue" textAnchor="middle" letterSpacing="1">
                          {d.dayKey}
                        </text>

                        {/* Target value below day */}
                        <text x={x + barW / 2} y={chartH - pad.bottom + 24} fill={T.border}
                          fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">
                          {d.goal}
                        </text>

                        {/* Today indicator dot */}
                        {d.isToday && (
                          <circle cx={x + barW / 2} cy={chartH - pad.bottom + 32} r="2" fill={T.accent} />
                        )}
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
            {/* Legend */}
            <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 4 }}>
              {[
                { color: T.coachGreen, label: "On target (±10%)" },
                { color: T.accent, label: "Close (±20%)" },
                { color: T.danger, label: "Off target" },
                { color: T.text, label: "- - Target", dashed: true },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {l.dashed ? (
                    <svg width="14" height="8"><line x1="0" x2="14" y1="4" y2="4" stroke={l.color} strokeWidth="1.2" strokeDasharray="3 2" opacity="0.5" /></svg>
                  ) : (
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                  )}
                  <span style={{ fontFamily: "DM Sans", fontSize: 8, color: T.muted }}>{l.label}</span>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${T.border}`,
              }}
            >
              {[
                {
                  label: "Weekly calories",
                  val: `${weekTotals.calories.toLocaleString()} kcal`,
                  color: T.accent,
                },
                {
                  label: "Avg / day",
                  val: `${Math.round(weekTotals.calories / 7)} kcal`,
                  color: T.muted,
                },
                {
                  label: "Days logged",
                  val: `${
                    wd.filter(({ date }) => dayTotals(plan[date] || {}).calories > 0).length
                  } / 7`,
                  color: T.coachGreen,
                },
              ].map((s) => (
                <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: "JetBrains Mono",
                      fontSize: 12,
                      color: s.color,
                      fontWeight: 600,
                    }}
                  >
                    {s.val}
                  </div>
                  <div
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 9,
                      color: T.muted,
                      marginTop: 2,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Calendar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MiniCalendar events={events} setEvents={setEvents} profileId={profileId} />

          {/* Quick stats */}
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div
              style={{
                fontFamily: "Bebas Neue",
                fontSize: 13,
                letterSpacing: 2,
                color: T.muted,
                marginBottom: 12,
              }}
            >
              TODAY AT A GLANCE
            </div>
            {[
              {
                icon: "🔥",
                label: "Calories",
                val: `${todayData.calories} kcal`,
                color: T.accent,
              },
              {
                icon: "🥩",
                label: "Protein",
                val: `${todayData.protein}g`,
                color: T.protein,
              },
              {
                icon: "🌾",
                label: "Carbs",
                val: `${todayData.carbs}g`,
                color: T.carbs,
              },
              {
                icon: "🫒",
                label: "Fat",
                val: `${todayData.fat}g`,
                color: T.fat,
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "7px 0",
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{s.icon}</span>
                  <span
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 12,
                      color: T.muted,
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "JetBrains Mono",
                    fontSize: 12,
                    color: s.color,
                    fontWeight: 600,
                  }}
                >
                  {s.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mood Tracker ── */}
      <MoodTracker moodLog={moodLog} setMoodLog={setMoodLog} onMoodSaved={onMoodSaved} />

      {/* ── Weight Tracker ── */}
      <WeightTracker onWeightSaved={onWeightSaved} profileId={profileId} />

      {/* ── Coach Videos (full width below) ── */}
      <CoachVideos profileId={profileId} />
    </div>
  );
}

// ── Weekly Planner ────────────────────────────────────────────────────────────
function WeeklyPlanner({
  plan,
  setPlan,
  selectedDay,
  setSelectedDay,
  profile,
  mfpData,
  mfpConnected,
  mfpSyncing,
  mfpLastSync,
  onImportMFP,
  onSyncNow,
  shoppingItems,
  addToShoppingList,
}) {
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [showFoodPicker, setShowFoodPicker] = useState(false);
  const [foodSearch, setFoodSearch] = useState("");
  const [foodSearchResults, setFoodSearchResults] = useState([]);
  const [selectedFoodItem, setSelectedFoodItem] = useState(null);
  const [servingGrams, setServingGrams] = useState(100);
  const [servingLabel, setServingLabel] = useState("100g");
  const [pickerTab, setPickerTab] = useState("search"); // "search" | "barcode"
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeResult, setBarcodeResult] = useState(null);
  const [barcodeError, setBarcodeError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [offSearching, setOffSearching] = useState(false);
  const [offResults, setOffResults] = useState([]);

  // ── Open Food Facts barcode lookup (real API via server proxy) ──
  const lookupBarcode = async (code) => {
    const clean = code.replace(/\D/g, "");
    setBarcodeError("");
    setBarcodeResult(null);
    if (clean.length < 8) {
      setBarcodeError("Barcode must be at least 8 digits");
      return;
    }
    setScanning(true);
    try {
      const data = await apiFetch(`/off/barcode/${clean}`);
      if (data.found) {
        const servings = (data.servings || []).map(([label, grams]) => [label, grams]);
        setBarcodeResult({
          n: data.brand ? `${data.name} (${data.brand})` : data.name,
          cal: data.calories,
          p: data.protein,
          c: data.carbs,
          f: data.fat,
          s: servings,
          barcode: data.barcode || clean,
          image: data.image || null,
        });
        setServingGrams(servings[0]?.[1] || 100);
        setServingLabel(servings[0]?.[0] || "100g");
      } else {
        setBarcodeError(`No product found for barcode ${clean}. Check the number or try searching by name.`);
      }
    } catch (e) {
      setBarcodeError(`Lookup failed: ${e.message}`);
    }
    setScanning(false);
  };

  // ── Camera barcode scanning (html5-qrcode — reliable on Chrome + Safari/iOS) ──
  const scannerRef = useRef(null); // Html5Qrcode instance
  const scannerLibLoaded = useRef(false);
  const SCANNER_ELEMENT_ID = "nrn-barcode-scanner";

  // Load html5-qrcode from CDN once on demand
  const loadScannerLib = () => new Promise((resolve) => {
    if (window.Html5Qrcode) { scannerLibLoaded.current = true; return resolve(true); }
    if (document.querySelector('script[data-nrn-scanner]')) {
      // Script tag exists but hasn't loaded yet — wait
      const check = setInterval(() => {
        if (window.Html5Qrcode) { clearInterval(check); scannerLibLoaded.current = true; resolve(true); }
      }, 100);
      setTimeout(() => { clearInterval(check); resolve(false); }, 8000);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.setAttribute("data-nrn-scanner", "1");
    script.onload = () => { scannerLibLoaded.current = true; resolve(true); };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  const stopCamera = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState?.();
        // State 2 = scanning, state 3 = paused
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear?.();
        scannerRef.current = null;
      }
    } catch (e) { console.warn("Scanner stop:", e); }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setBarcodeError("");
    setBarcodeResult(null);
    setCameraActive(true);
  };

  // Init scanner once cameraActive + DOM element exists + lib loaded
  useEffect(() => {
    if (!cameraActive) return;
    let cancelled = false;

    const initScanner = async () => {
      const loaded = await loadScannerLib();
      if (cancelled) return;
      if (!loaded || !window.Html5Qrcode) {
        setBarcodeError("Scanner library failed to load. Type the barcode manually.");
        setCameraActive(false);
        return;
      }

      // Wait for DOM element
      await new Promise(r => setTimeout(r, 200));
      if (cancelled) return;
      const el = document.getElementById(SCANNER_ELEMENT_ID);
      if (!el) { setBarcodeError("Scanner container missing."); setCameraActive(false); return; }

      try {
        const scanner = new window.Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 120 },
            aspectRatio: 1.5,
            disableFlip: false,
            formatsToSupport: [
              window.Html5QrcodeSupportedFormats?.EAN_13,
              window.Html5QrcodeSupportedFormats?.EAN_8,
              window.Html5QrcodeSupportedFormats?.UPC_A,
              window.Html5QrcodeSupportedFormats?.UPC_E,
            ].filter(Boolean),
          },
          // Success callback
          (decodedText) => {
            if (cancelled) return;
            if (!decodedText || !/^\d{8,14}$/.test(decodedText)) return;
            // Got a valid barcode — stop and lookup immediately
            stopCamera();
            setBarcodeInput(decodedText);
            lookupBarcode(decodedText);
          },
          // Error callback (fires constantly when no barcode visible — ignore)
          () => {}
        );

        // Style overrides — html5-qrcode adds its own elements
        try {
          const vid = el.querySelector("video");
          if (vid) { vid.style.borderRadius = "12px"; }
          // Hide the shaded region borders that html5-qrcode draws
          const qrShaded = el.querySelector("#qr-shaded-region");
          if (qrShaded) qrShaded.style.display = "none";
        } catch {}

      } catch (e) {
        if (!cancelled) {
          console.warn("Scanner start error:", e);
          setBarcodeError("Camera access denied or not available. Enter barcode manually.");
          setCameraActive(false);
        }
      }
    };

    initScanner();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState?.();
          if (state === 2 || state === 3) scannerRef.current.stop().catch(() => {});
          scannerRef.current.clear?.();
        } catch {}
        scannerRef.current = null;
      }
    };
  }, [cameraActive]);

  // Cleanup camera on unmount or tab change
  useEffect(() => { return () => { stopCamera(); }; }, []);
  useEffect(() => { if (pickerTab !== "barcode") stopCamera(); }, [pickerTab]);

  const selectFromBarcode = () => {
    if (!barcodeResult) return;
    const item = {
      n: barcodeResult.n,
      cal: barcodeResult.cal,
      p: barcodeResult.p,
      c: barcodeResult.c,
      f: barcodeResult.f,
      s: barcodeResult.s,
    };
    setSelectedFoodItem(item);
    setPickerTab("search");
    setBarcodeResult(null);
    setBarcodeInput("");
  };

  const resetPicker = () => {
    setShowFoodPicker(false);
    setFoodSearch("");
    setFoodSearchResults([]);
    setSelectedFoodItem(null);
    setPickerTab("search");
    setBarcodeResult(null);
    setBarcodeInput("");
    setBarcodeError("");
    setOffResults([]);
    setOffSearching(false);
    stopCamera();
  };

  // Search USDA food DB locally + Open Food Facts via server (debounced)
  const offTimerRef = useRef(null);
  const handleFoodSearch = (query) => {
    setFoodSearch(query);
    setSelectedFoodItem(null);
    if (query.trim().length < 2) {
      setFoodSearchResults([]);
      setOffResults([]);
      return;
    }
    const q = query.toLowerCase();
    // Instant local USDA results
    const results = FOOD_DB.filter((f) => f.n.toLowerCase().includes(q)).slice(0, 30);
    setFoodSearchResults(results);

    // Debounced Open Food Facts search (500ms)
    if (offTimerRef.current) clearTimeout(offTimerRef.current);
    offTimerRef.current = setTimeout(async () => {
      if (query.trim().length < 3) return;
      setOffSearching(true);
      try {
        const data = await apiFetch(`/off/search?q=${encodeURIComponent(query.trim())}`);
        if (data.products) {
          // Convert OFF results to FOOD_DB-compatible format
          const offItems = data.products.map(p => ({
            n: p.brand ? `${p.name} (${p.brand})` : p.name,
            c: p.calories,
            p: p.protein,
            b: p.carbs,
            f: p.fat,
            s: (p.servings || []).map(([label, grams]) => [label, grams]),
            _off: true, // flag to show OFF badge
            _img: p.image || null,
          }));
          setOffResults(offItems);
        }
      } catch (e) { /* OFF search failed silently — USDA results still shown */ }
      setOffSearching(false);
    }, 500);
  };

  const selectFoodItem = (item) => {
    setSelectedFoodItem(item);
    setServingGrams(100);
    setServingLabel("100g");
  };

  const addFood = (food) => {
    setPlan((prev) => {
      const next = { ...prev };
      if (!next[selectedDay]) { next[selectedDay] = {}; MEALS.forEach(m => next[selectedDay][m] = []); }
      next[selectedDay] = { ...next[selectedDay] };
      next[selectedDay][selectedMeal] = [
        ...(next[selectedDay][selectedMeal] || []),
        food,
      ];
      return next;
    });
    resetPicker();
  };

  const removeFood = (day, meal, idx) => {
    setPlan((prev) => {
      const next = { ...prev };
      next[day] = { ...next[day] };
      next[day][meal] = next[day][meal].filter((_, i) => i !== idx);
      return next;
    });
  };

  const [importedDay, setImportedDay] = useState(null);

  const handleImportToday = () => {
    onImportMFP(selectedDay);
    setImportedDay(selectedDay);
    setTimeout(() => setImportedDay(null), 3500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* MFP live sync banner */}
      {mfpConnected && mfpData && (
        <div
          style={{
            background: `linear-gradient(135deg, ${T.mfp}14, ${T.mfp}06)`,
            border: `1px solid ${T.mfp}55`,
            borderRadius: 14,
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${T.mfp}, #0066cc)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Bebas Neue",
              fontSize: 12,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            MFP
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "DM Sans",
                fontSize: 12,
                fontWeight: 600,
                color: T.text,
              }}
            >
              MyFitnessPal synced
              {mfpLastSync && (
                <span
                  style={{
                    fontFamily: "JetBrains Mono",
                    fontSize: 10,
                    color: T.muted,
                    marginLeft: 8,
                  }}
                >
                  {mfpLastSync.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <div
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 10,
                color: T.muted,
                marginTop: 1,
              }}
            >
              {mfpData.calories} kcal · {mfpData.protein}g protein ·{" "}
              {mfpData.carbs}g carbs · {mfpData.fat}g fat logged today
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={onSyncNow}
              disabled={mfpSyncing}
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                color: T.accent,
                borderRadius: 8,
                padding: "6px 14px",
                fontFamily: "Bebas Neue",
                fontSize: 12,
                letterSpacing: 1,
                cursor: "pointer",
              }}
            >
              {mfpSyncing ? "SYNCING…" : "↻ SYNC"}
            </button>
            <button
              onClick={handleImportToday}
              style={{
                background: importedDay === selectedDay ? T.coachGreen : T.mfp,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                fontFamily: "Bebas Neue",
                fontSize: 12,
                letterSpacing: 1,
                cursor: "pointer",
                transition: "background 0.3s",
              }}
            >
              {importedDay === selectedDay ? "✓ IMPORTED" : "IMPORT TODAY"}
            </button>
          </div>
        </div>
      )}

      {/* Day tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        {getCurrentWeekDates().map(({ dayKey, date }) => {
          const tot = dayTotals(plan[date] || {});
          const pct = Math.min(tot.calories / (getGoalsForDate(date).calories || 1), 1);
          return (
            <button
              key={date}
              onClick={() => setSelectedDay(date)}
              style={{
                flex: 1,
                padding: "12px 4px",
                borderRadius: 10,
                background: selectedDay === date ? T.accent : T.card,
                border: `1px solid ${selectedDay === date ? T.accent : T.border}`,
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "Bebas Neue",
                  fontSize: 15,
                  letterSpacing: 1,
                  color: selectedDay === date ? T.bg : T.muted,
                }}
              >
                {dayKey}
              </div>
              <div
                style={{
                  height: 2,
                  background: selectedDay === date ? T.bg + "44" : T.border,
                  borderRadius: 99,
                  margin: "6px 4px 4px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: `${pct * 100}%`,
                    background: selectedDay === date ? T.bg : T.accent,
                    borderRadius: 99,
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "JetBrains Mono",
                  fontSize: 10,
                  color: selectedDay === date ? T.bg + "cc" : T.muted,
                }}
              >
                {tot.calories} kcal
              </div>
            </button>
          );
        })}
      </div>

      {/* Meal cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,1fr)",
          gap: 12,
        }}
      >
        {MEALS.map((meal) => {
          const foods = (plan[selectedDay] || {})[meal] || [];
          const tot = sumMacros(foods);
          return (
            <div
              key={meal}
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "Bebas Neue",
                    fontSize: 20,
                    letterSpacing: 1,
                    color: T.text,
                  }}
                >
                  {meal}
                </span>
                <span
                  style={{
                    fontFamily: "JetBrains Mono",
                    fontSize: 11,
                    color: T.accent,
                  }}
                >
                  {tot.calories} kcal
                </span>
              </div>
              {foods.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    background: f.source === "mfp" ? `${T.mfp}14` : T.surface,
                    borderRadius: 8,
                    marginBottom: 6,
                    border:
                      f.source === "mfp"
                        ? `1px solid ${T.mfp}44`
                        : "1px solid transparent",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <div
                        style={{
                          fontFamily: "DM Sans",
                          fontSize: 12,
                          color: T.text,
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {f.name}
                      </div>
                      {f.source === "mfp" && (
                        <span
                          style={{
                            fontFamily: "Bebas Neue",
                            fontSize: 9,
                            color: T.mfp,
                            background: `${T.mfp}22`,
                            borderRadius: 4,
                            padding: "1px 5px",
                            flexShrink: 0,
                          }}
                        >
                          MFP
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: "JetBrains Mono",
                        fontSize: 10,
                        color: T.muted,
                        marginTop: 2,
                      }}
                    >
                      P:{f.protein}g · C:{f.carbs}g · F:{f.fat}g
                    </div>
                  </div>
                  <button
                    onClick={() => removeFood(selectedDay, meal, i)}
                    style={{
                      background: "none",
                      border: "none",
                      color: T.muted,
                      cursor: "pointer",
                      fontSize: 16,
                      padding: "0 4px",
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) => (e.target.style.color = T.danger)}
                    onMouseLeave={(e) => (e.target.style.color = T.muted)}
                  >
                    ×
                  </button>
                  <button
                    onClick={() => addToShoppingList(f.name)}
                    title="Add to shopping list"
                    style={{
                      background: shoppingItems.some(s => s.name === f.name && !s.checked) ? `${T.coachGreen}22` : "none",
                      border: shoppingItems.some(s => s.name === f.name && !s.checked) ? `1px solid ${T.coachGreen}44` : "1px solid transparent",
                      color: shoppingItems.some(s => s.name === f.name && !s.checked) ? T.coachGreen : T.muted,
                      cursor: "pointer",
                      fontSize: 13,
                      padding: "2px 5px",
                      borderRadius: 4,
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) => { if (!shoppingItems.some(s => s.name === f.name && !s.checked)) e.currentTarget.style.color = T.coachGreen; }}
                    onMouseLeave={(e) => { if (!shoppingItems.some(s => s.name === f.name && !s.checked)) e.currentTarget.style.color = T.muted; }}
                  >
                    🛒
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  setSelectedMeal(meal);
                  setShowFoodPicker(true);
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "none",
                  border: `1px dashed ${T.border}`,
                  borderRadius: 8,
                  color: T.muted,
                  fontFamily: "DM Sans",
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  marginTop: 4,
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = T.accent;
                  e.target.style.color = T.accent;
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = T.border;
                  e.target.style.color = T.muted;
                }}
              >
                + Add Food
              </button>
            </div>
          );
        })}
      </div>

      {showFoodPicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000000dd",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => resetPicker()}
        >
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 20,
              width: "min(520px,95vw)",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px 0",
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "Bebas Neue",
                      fontSize: 26,
                      letterSpacing: 2,
                      color: T.accent,
                    }}
                  >
                    ADD FOOD · {selectedMeal?.toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 11,
                      color: T.muted,
                    }}
                  >
                    Search 8,200+ foods + UK brands or scan a barcode
                  </div>
                </div>
                <button
                  onClick={() => resetPicker()}
                  style={{
                    background: "none",
                    border: "none",
                    color: T.muted,
                    fontSize: 20,
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Tab switcher */}
              <div style={{ display: "flex", gap: 2, marginBottom: -1 }}>
                {[
                  { id: "search", label: "🔍  Search" },
                  { id: "barcode", label: "📷  Scan Barcode" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setPickerTab(t.id);
                      setBarcodeResult(null);
                      setBarcodeError("");
                    }}
                    style={{
                      padding: "9px 18px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "Bebas Neue",
                      fontSize: 13,
                      letterSpacing: 1,
                      color: pickerTab === t.id ? T.accent : T.muted,
                      borderBottom:
                        pickerTab === t.id
                          ? `2px solid ${T.accent}`
                          : "2px solid transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── SEARCH TAB ── */}
            {pickerTab === "search" && (
              <>
                <div
                  style={{
                    padding: "14px 24px 12px",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: T.muted,
                        fontSize: 16,
                      }}
                    >
                      🔍
                    </span>
                    <input
                      autoFocus
                      value={foodSearch}
                      onChange={(e) => handleFoodSearch(e.target.value)}
                      placeholder="Search foods e.g. chicken breast, oats, salmon…"
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 38px",
                        background: T.card,
                        border: `1px solid ${
                          foodSearch ? T.accent + "66" : T.border
                        }`,
                        borderRadius: 10,
                        color: T.text,
                        fontFamily: "DM Sans",
                        fontSize: 13,
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "12px 24px 20px",
                  }}
                >
                  {selectedFoodItem &&
                    (() => {
                      const preview = scaleMacros(
                        selectedFoodItem,
                        servingGrams
                      );
                      return (
                        <div
                          style={{
                            background: T.card,
                            border: `2px solid ${T.accent}44`,
                            borderRadius: 14,
                            padding: 16,
                            marginBottom: 14,
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "Bebas Neue",
                              fontSize: 14,
                              letterSpacing: 2,
                              color: T.accent,
                              marginBottom: 6,
                            }}
                          >
                            SELECTED FOOD
                          </div>
                          <div
                            style={{
                              fontFamily: "DM Sans",
                              fontSize: 13,
                              color: T.text,
                              fontWeight: 600,
                              marginBottom: 10,
                              lineHeight: 1.3,
                            }}
                          >
                            {selectedFoodItem.n}
                          </div>
                          {selectedFoodItem.s &&
                            selectedFoodItem.s.length > 0 && (
                              <div style={{ marginBottom: 10 }}>
                                <div
                                  style={{
                                    fontFamily: "DM Sans",
                                    fontSize: 11,
                                    color: T.muted,
                                    marginBottom: 6,
                                  }}
                                >
                                  QUICK SERVINGS:
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 6,
                                  }}
                                >
                                  {selectedFoodItem.s.map(
                                    ([label, grams], i) => (
                                      <button
                                        key={i}
                                        onClick={() => {
                                          setServingGrams(grams);
                                          setServingLabel(label);
                                        }}
                                        style={{
                                          padding: "4px 10px",
                                          borderRadius: 20,
                                          border: `1px solid ${
                                            servingGrams === grams
                                              ? T.accent
                                              : T.border
                                          }`,
                                          background:
                                            servingGrams === grams
                                              ? T.accent + "22"
                                              : "none",
                                          color:
                                            servingGrams === grams
                                              ? T.accent
                                              : T.muted,
                                          fontFamily: "DM Sans",
                                          fontSize: 11,
                                          cursor: "pointer",
                                          transition: "all 0.15s",
                                        }}
                                      >
                                        {label} ({grams}g)
                                      </button>
                                    )
                                  )}
                                  <button
                                    onClick={() => {
                                      setServingGrams(100);
                                      setServingLabel("100g");
                                    }}
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: 20,
                                      border: `1px solid ${
                                        servingGrams === 100 &&
                                        servingLabel === "100g"
                                          ? T.accent
                                          : T.border
                                      }`,
                                      background:
                                        servingGrams === 100 &&
                                        servingLabel === "100g"
                                          ? T.accent + "22"
                                          : "none",
                                      color:
                                        servingGrams === 100 &&
                                        servingLabel === "100g"
                                          ? T.accent
                                          : T.muted,
                                      fontFamily: "DM Sans",
                                      fontSize: 11,
                                      cursor: "pointer",
                                      transition: "all 0.15s",
                                    }}
                                  >
                                    100g
                                  </button>
                                </div>
                              </div>
                            )}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              marginBottom: 12,
                            }}
                          >
                            <div
                              style={{
                                fontFamily: "DM Sans",
                                fontSize: 11,
                                color: T.muted,
                                minWidth: 60,
                              }}
                            >
                              CUSTOM:
                            </div>
                            <input
                              type="number"
                              min="1"
                              max="2000"
                              value={servingGrams}
                              onChange={(e) => {
                                const v = Math.max(
                                  1,
                                  parseInt(e.target.value) || 1
                                );
                                setServingGrams(v);
                                setServingLabel(`${v}g`);
                              }}
                              style={{
                                width: 80,
                                padding: "5px 8px",
                                background: T.surface,
                                border: `1px solid ${T.border}`,
                                borderRadius: 8,
                                color: T.text,
                                fontFamily: "JetBrains Mono",
                                fontSize: 13,
                                outline: "none",
                                textAlign: "center",
                              }}
                            />
                            <span
                              style={{
                                fontFamily: "DM Sans",
                                fontSize: 12,
                                color: T.muted,
                              }}
                            >
                              grams
                            </span>
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(4,1fr)",
                              gap: 8,
                              marginBottom: 14,
                            }}
                          >
                            {[
                              {
                                label: "KCAL",
                                val: preview.calories,
                                color: T.accent,
                              },
                              {
                                label: "PROTEIN",
                                val: `${preview.protein}g`,
                                color: T.protein,
                              },
                              {
                                label: "CARBS",
                                val: `${preview.carbs}g`,
                                color: T.carbs,
                              },
                              {
                                label: "FAT",
                                val: `${preview.fat}g`,
                                color: T.fat,
                              },
                            ].map((m) => (
                              <div
                                key={m.label}
                                style={{
                                  textAlign: "center",
                                  background: T.surface,
                                  borderRadius: 8,
                                  padding: "8px 4px",
                                }}
                              >
                                <div
                                  style={{
                                    fontFamily: "Bebas Neue",
                                    fontSize: 20,
                                    color: m.color,
                                    lineHeight: 1,
                                  }}
                                >
                                  {m.val}
                                </div>
                                <div
                                  style={{
                                    fontFamily: "DM Sans",
                                    fontSize: 9,
                                    color: T.muted,
                                    marginTop: 2,
                                  }}
                                >
                                  {m.label}
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() =>
                              addFood(
                                scaleMacros(selectedFoodItem, servingGrams)
                              )
                            }
                            style={{
                              width: "100%",
                              padding: "11px",
                              background: T.accent,
                              border: "none",
                              borderRadius: 10,
                              color: T.bg,
                              fontFamily: "Bebas Neue",
                              fontSize: 16,
                              letterSpacing: 2,
                              cursor: "pointer",
                              transition: "opacity 0.2s",
                            }}
                            onMouseEnter={(e) =>
                              (e.target.style.opacity = "0.85")
                            }
                            onMouseLeave={(e) => (e.target.style.opacity = "1")}
                          >
                            ADD TO {selectedMeal?.toUpperCase()} ➜
                          </button>
                        </div>
                      );
                    })()}
                  {!foodSearch && !selectedFoodItem && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "30px 0",
                        color: T.muted,
                      }}
                    >
                      <div style={{ fontSize: 36, marginBottom: 12 }}>🥗</div>
                      <div style={{ fontFamily: "DM Sans", fontSize: 13 }}>
                        Start typing to search 8,200+ USDA foods + UK branded products
                      </div>
                      <div
                        style={{
                          fontFamily: "DM Sans",
                          fontSize: 11,
                          marginTop: 6,
                          color: T.border,
                        }}
                      >
                        or switch to{" "}
                        <span
                          style={{ color: T.accent, cursor: "pointer" }}
                          onClick={() => setPickerTab("barcode")}
                        >
                          Scan Barcode
                        </span>{" "}
                        to look up a packaged product
                      </div>
                    </div>
                  )}
                  {/* No results */}
                  {foodSearch.length >= 2 &&
                    foodSearchResults.length === 0 &&
                    offResults.length === 0 &&
                    !offSearching &&
                    !selectedFoodItem && (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "30px 0",
                          color: T.muted,
                        }}
                      >
                        <div style={{ fontSize: 32, marginBottom: 10 }}>😕</div>
                        <div style={{ fontFamily: "DM Sans", fontSize: 13 }}>
                          No foods found for "{foodSearch}"
                        </div>
                        <div
                          style={{
                            fontFamily: "DM Sans",
                            fontSize: 11,
                            marginTop: 6,
                          }}
                        >
                          Try a different spelling or scan the barcode instead
                        </div>
                      </div>
                    )}
                  {/* USDA Search results */}
                  {foodSearchResults.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontFamily: "DM Sans",
                          fontSize: 11,
                          color: T.muted,
                          marginBottom: 8,
                        }}
                      >
                        {foodSearchResults.length === 30
                          ? "TOP 30 · USDA DATABASE"
                          : `${foodSearchResults.length} RESULTS · USDA DATABASE`}
                      </div>
                      {foodSearchResults.map((item, i) => (
                        <button
                          key={i}
                          onClick={() => selectFoodItem(item)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 12px",
                            background:
                              selectedFoodItem?.n === item.n
                                ? T.accent + "15"
                                : T.card,
                            border: `1px solid ${
                              selectedFoodItem?.n === item.n
                                ? T.accent
                                : T.border
                            }`,
                            borderRadius: 10,
                            marginBottom: 6,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            if (selectedFoodItem?.n !== item.n)
                              e.currentTarget.style.borderColor =
                                T.accent + "66";
                          }}
                          onMouseLeave={(e) => {
                            if (selectedFoodItem?.n !== item.n)
                              e.currentTarget.style.borderColor = T.border;
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "DM Sans",
                                fontSize: 12,
                                color: T.text,
                                fontWeight: 500,
                                lineHeight: 1.3,
                                flex: 1,
                              }}
                            >
                              {item.n}
                            </span>
                            <span
                              style={{
                                fontFamily: "JetBrains Mono",
                                fontSize: 11,
                                color: T.accent,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.c} kcal
                            </span>
                          </div>
                          <div
                            style={{
                              fontFamily: "JetBrains Mono",
                              fontSize: 10,
                              color: T.muted,
                              marginTop: 3,
                            }}
                          >
                            P:{item.p}g · C:{item.b}g · F:{item.f}g{" "}
                            <span style={{ color: T.border }}>per 100g</span>
                            {item.s && item.s[0] && (
                              <span style={{ marginLeft: 8, color: T.border }}>
                                · {item.s[0][0]} = {item.s[0][1]}g
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Open Food Facts results (UK branded/packaged foods) */}
                  {offSearching && foodSearchResults.length === 0 && (
                    <div style={{ textAlign: "center", padding: "20px 0", color: T.muted }}>
                      <div style={{ fontFamily: "DM Sans", fontSize: 12 }}>Searching UK products...</div>
                    </div>
                  )}
                  {offResults.length > 0 && (
                    <div style={{ marginTop: foodSearchResults.length > 0 ? 16 : 0 }}>
                      <div
                        style={{
                          fontFamily: "DM Sans",
                          fontSize: 11,
                          color: T.muted,
                          marginBottom: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ background: "#22c55e", color: "#000", padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, letterSpacing: 0.5 }}>OFF</span>
                        {offResults.length} UK BRANDED PRODUCTS
                        {offSearching && <span style={{ fontSize: 10 }}>  ⟳</span>}
                      </div>
                      {offResults.map((item, i) => (
                        <button
                          key={`off-${i}`}
                          onClick={() => selectFoodItem(item)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 12px",
                            background:
                              selectedFoodItem?.n === item.n
                                ? T.accent + "15"
                                : T.card,
                            border: `1px solid ${
                              selectedFoodItem?.n === item.n
                                ? T.accent
                                : T.border
                            }`,
                            borderRadius: 10,
                            marginBottom: 6,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            if (selectedFoodItem?.n !== item.n)
                              e.currentTarget.style.borderColor = T.accent + "66";
                          }}
                          onMouseLeave={(e) => {
                            if (selectedFoodItem?.n !== item.n)
                              e.currentTarget.style.borderColor = T.border;
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                              {item._img && (
                                <img src={item._img} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover", background: T.surface }} />
                              )}
                              <span style={{ fontFamily: "DM Sans", fontSize: 12, color: T.text, fontWeight: 500, lineHeight: 1.3, flex: 1 }}>
                                {item.n}
                              </span>
                            </div>
                            <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: T.accent, whiteSpace: "nowrap" }}>
                              {item.c} kcal
                            </span>
                          </div>
                          <div style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: T.muted, marginTop: 3 }}>
                            P:{item.p}g · C:{item.b}g · F:{item.f}g{" "}
                            <span style={{ color: T.border }}>per 100g</span>
                            {item.s && item.s[0] && (
                              <span style={{ marginLeft: 8, color: T.border }}>
                                · {item.s[0][0]} = {item.s[0][1]}g
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── BARCODE TAB ── */}
            {pickerTab === "barcode" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                {/* Camera viewfinder / scanner */}
                <div
                  style={{
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 16,
                    overflow: "hidden",
                    marginBottom: 16,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      height: cameraActive ? 280 : 180,
                      background: `linear-gradient(135deg, #0a0a0a, #111)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* html5-qrcode scanner container */}
                    {cameraActive ? (
                      <div
                        id={SCANNER_ELEMENT_ID}
                        style={{
                          width: "100%",
                          height: "100%",
                        }}
                      />
                    ) : (
                      /* Idle state — barcode icon */
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, zIndex: 2 }}>
                        <div style={{ display: "flex", gap: 2, alignItems: "flex-end", opacity: scanning ? 0.4 : 0.6 }}>
                          {[3, 6, 4, 7, 3, 5, 4, 8, 3, 6, 4, 5, 3].map((h, i) => (
                            <div key={i} style={{ width: i % 3 === 0 ? 3 : 2, height: h * 4, background: T.accent, borderRadius: 1 }} />
                          ))}
                        </div>
                        {scanning ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {[0, 1, 2].map((i) => (
                              <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: T.accent, animation: `pulse 1s ${i * 0.25}s infinite` }} />
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontFamily: "DM Sans", fontSize: 11, color: T.muted }}>
                            {barcodeResult ? "✓ Product found!" : "Tap SCAN or enter barcode below"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Camera + manual input row */}
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <button
                    onClick={() => cameraActive ? stopCamera() : startCamera()}
                    style={{
                      background: cameraActive ? T.danger : T.accent,
                      color: cameraActive ? "#fff" : T.bg,
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontFamily: "Bebas Neue",
                      fontSize: 13,
                      letterSpacing: 1,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cameraActive ? "STOP" : "📷 SCAN"}
                  </button>
                  <input
                    value={barcodeInput}
                    onChange={(e) => {
                      setBarcodeInput(e.target.value);
                      setBarcodeError("");
                      setBarcodeResult(null);
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && lookupBarcode(barcodeInput)
                    }
                    placeholder="Or type barcode e.g. 5000112637939"
                    style={{
                      flex: 1,
                      background: T.card,
                      border: `1px solid ${
                        barcodeInput ? T.accent + "66" : T.border
                      }`,
                      borderRadius: 10,
                      padding: "10px 14px",
                      color: T.text,
                      fontFamily: "JetBrains Mono",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => lookupBarcode(barcodeInput)}
                    disabled={scanning || barcodeInput.length < 8}
                    style={{
                      background:
                        barcodeInput.length >= 8 ? T.accent : T.border,
                      color: barcodeInput.length >= 8 ? T.bg : T.muted,
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 18px",
                      fontFamily: "Bebas Neue",
                      fontSize: 14,
                      letterSpacing: 1,
                      cursor: barcodeInput.length >= 8 ? "pointer" : "default",
                    }}
                  >
                    {scanning ? "…" : "LOOKUP"}
                  </button>
                </div>

                {/* Error */}
                {barcodeError && (
                  <div
                    style={{
                      background: `${T.danger}18`,
                      border: `1px solid ${T.danger}44`,
                      borderRadius: 10,
                      padding: "10px 14px",
                      marginBottom: 14,
                      fontFamily: "DM Sans",
                      fontSize: 12,
                      color: T.danger,
                    }}
                  >
                    {barcodeError}
                  </div>
                )}

                {/* Result */}
                {barcodeResult &&
                  (() => {
                    const preview = {
                      calories: Math.round(
                        (barcodeResult.cal * servingGrams) / 100
                      ),
                      protein: Math.round(
                        (barcodeResult.p * servingGrams) / 100
                      ),
                      carbs: Math.round((barcodeResult.c * servingGrams) / 100),
                      fat: Math.round((barcodeResult.f * servingGrams) / 100),
                    };
                    return (
                      <div
                        style={{
                          background: T.card,
                          border: `2px solid ${T.coachGreen}55`,
                          borderRadius: 14,
                          padding: 16,
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: T.coachGreen,
                            }}
                          />
                          <div
                            style={{
                              fontFamily: "Bebas Neue",
                              fontSize: 14,
                              letterSpacing: 2,
                              color: T.coachGreen,
                            }}
                          >
                            PRODUCT FOUND
                          </div>
                          <div
                            style={{
                              fontFamily: "JetBrains Mono",
                              fontSize: 9,
                              color: T.muted,
                              marginLeft: "auto",
                            }}
                          >
                            {barcodeResult.barcode}
                          </div>
                        </div>
                        <div
                          style={{
                            fontFamily: "DM Sans",
                            fontSize: 14,
                            fontWeight: 700,
                            color: T.text,
                            marginBottom: 10,
                          }}
                        >
                          {barcodeResult.n}
                        </div>
                        {/* Serving selector */}
                        {barcodeResult.s && barcodeResult.s.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <div
                              style={{
                                fontFamily: "DM Sans",
                                fontSize: 11,
                                color: T.muted,
                                marginBottom: 6,
                              }}
                            >
                              SERVING SIZE:
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                              }}
                            >
                              {barcodeResult.s.map(([label, grams], i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setServingGrams(grams);
                                    setServingLabel(label);
                                  }}
                                  style={{
                                    padding: "5px 12px",
                                    borderRadius: 20,
                                    border: `1px solid ${
                                      servingGrams === grams
                                        ? T.coachGreen
                                        : T.border
                                    }`,
                                    background:
                                      servingGrams === grams
                                        ? T.coachGreen + "22"
                                        : "none",
                                    color:
                                      servingGrams === grams
                                        ? T.coachGreen
                                        : T.muted,
                                    fontFamily: "DM Sans",
                                    fontSize: 11,
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                  }}
                                >
                                  {label} ({grams}g)
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Macro preview */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4,1fr)",
                            gap: 8,
                            marginBottom: 14,
                          }}
                        >
                          {[
                            {
                              label: "KCAL",
                              val: preview.calories,
                              color: T.accent,
                            },
                            {
                              label: "PROTEIN",
                              val: `${preview.protein}g`,
                              color: T.protein,
                            },
                            {
                              label: "CARBS",
                              val: `${preview.carbs}g`,
                              color: T.carbs,
                            },
                            {
                              label: "FAT",
                              val: `${preview.fat}g`,
                              color: T.fat,
                            },
                          ].map((m) => (
                            <div
                              key={m.label}
                              style={{
                                textAlign: "center",
                                background: T.surface,
                                borderRadius: 8,
                                padding: "8px 4px",
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "Bebas Neue",
                                  fontSize: 20,
                                  color: m.color,
                                  lineHeight: 1,
                                }}
                              >
                                {m.val}
                              </div>
                              <div
                                style={{
                                  fontFamily: "DM Sans",
                                  fontSize: 9,
                                  color: T.muted,
                                  marginTop: 2,
                                }}
                              >
                                {m.label}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div
                          style={{
                            fontFamily: "DM Sans",
                            fontSize: 10,
                            color: T.muted,
                            marginBottom: 12,
                          }}
                        >
                          Per {servingGrams}g · {barcodeResult.cal} kcal per
                          100g
                        </div>
                        <button
                          onClick={selectFromBarcode}
                          style={{
                            width: "100%",
                            padding: "11px",
                            background: T.coachGreen,
                            border: "none",
                            borderRadius: 10,
                            color: "#fff",
                            fontFamily: "Bebas Neue",
                            fontSize: 16,
                            letterSpacing: 2,
                            cursor: "pointer",
                          }}
                        >
                          ADD TO {selectedMeal?.toUpperCase()} ➜
                        </button>
                      </div>
                    );
                  })()}

                {/* Open Food Facts info */}
                {!barcodeResult && !scanning && (
                  <div style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}>
                    <div style={{ fontFamily: "DM Sans", fontSize: 11, color: T.muted, lineHeight: 1.6 }}>
                      <strong style={{ color: T.text }}>Powered by Open Food Facts</strong> — 3M+ products including UK supermarket brands (Tesco, Sainsbury's, Aldi, Lidl, M&S, etc).
                    </div>
                    <div style={{ fontFamily: "DM Sans", fontSize: 10, color: T.border, marginTop: 8 }}>
                      Tap SCAN to open camera. Centre the barcode in the highlighted box. Works on Chrome, Safari, and all modern mobile browsers.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shopping List ─────────────────────────────────────────────────────────────
function ShoppingList({ items, onToggle, onRemove, onClear, plan, addToShoppingList }) {
  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);

  // Gather all unique food names from this week's plan for quick-add
  const allFoods = new Set();
  const wd = getCurrentWeekDates();
  wd.forEach(({ date }) => {
    const dayPlan = plan[date];
    if (!dayPlan) return;
    MEALS.forEach(meal => {
      (dayPlan[meal] || []).forEach(f => { if (f.name) allFoods.add(f.name); });
    });
  });
  const weekFoods = [...allFoods].sort();
  const notOnList = weekFoods.filter(name => !items.some(i => i.name === name));

  // Manual add
  const [manualInput, setManualInput] = useState("");
  const addManual = () => {
    const name = manualInput.trim();
    if (!name) return;
    addToShoppingList(name);
    setManualInput("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <div style={{ fontFamily: "Bebas Neue", fontSize: 28, letterSpacing: 2, color: T.text }}>
          SHOPPING LIST
        </div>
        <div style={{ fontFamily: "DM Sans", fontSize: 13, color: T.muted, marginTop: 4 }}>
          Add items from your meal plan using the 🛒 button, or add manually below
        </div>
      </div>

      {/* Manual add */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={manualInput}
          onChange={e => setManualInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addManual()}
          placeholder="Add custom item..."
          style={{
            flex: 1, background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 10, padding: "10px 14px", color: T.text,
            fontFamily: "DM Sans", fontSize: 13, outline: "none",
          }}
        />
        <button
          onClick={addManual}
          disabled={!manualInput.trim()}
          style={{
            background: manualInput.trim() ? T.accent : T.border,
            color: manualInput.trim() ? T.bg : T.muted,
            border: "none", borderRadius: 10, padding: "10px 18px",
            fontFamily: "Bebas Neue", fontSize: 14, letterSpacing: 1,
            cursor: manualInput.trim() ? "pointer" : "default",
          }}
        >
          ADD
        </button>
      </div>

      {/* Quick-add from this week's meals */}
      {notOnList.length > 0 && (
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: 16,
        }}>
          <div style={{
            fontFamily: "Bebas Neue", fontSize: 14, letterSpacing: 2,
            color: T.muted, marginBottom: 10,
          }}>
            ADD FROM THIS WEEK'S MEALS
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {notOnList.slice(0, 20).map(name => (
              <button
                key={name}
                onClick={() => addToShoppingList(name)}
                style={{
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderRadius: 20, padding: "5px 12px",
                  fontFamily: "DM Sans", fontSize: 11, color: T.text,
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.coachGreen; e.currentTarget.style.color = T.coachGreen; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text; }}
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items to buy */}
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 14, padding: 16,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 14,
        }}>
          <div style={{
            fontFamily: "Bebas Neue", fontSize: 18, letterSpacing: 2, color: T.text,
          }}>
            TO BUY ({unchecked.length})
          </div>
          {items.length > 0 && (
            <button
              onClick={onClear}
              style={{
                background: "none", border: `1px solid ${T.danger}44`,
                borderRadius: 8, padding: "4px 10px",
                fontFamily: "DM Sans", fontSize: 10, color: T.danger,
                cursor: "pointer",
              }}
            >
              CLEAR ALL
            </button>
          )}
        </div>
        {unchecked.length === 0 && (
          <div style={{
            textAlign: "center", padding: "30px 0", color: T.muted,
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🛒</div>
            <div style={{ fontFamily: "DM Sans", fontSize: 13 }}>
              Your shopping list is empty
            </div>
            <div style={{ fontFamily: "DM Sans", fontSize: 11, marginTop: 6, color: T.border }}>
              Tap 🛒 next to any food in your meal plan to add it here
            </div>
          </div>
        )}
        {unchecked.map((item, idx) => {
          const realIdx = items.indexOf(item);
          return (
            <div
              key={`${item.name}-${realIdx}`}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", background: T.surface,
                borderRadius: 10, marginBottom: 6,
                transition: "all 0.15s",
              }}
            >
              <button
                onClick={() => onToggle(realIdx)}
                style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${T.border}`, background: "none",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 12, color: "transparent",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.coachGreen; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}
              >
                ✓
              </button>
              <span style={{ flex: 1, fontFamily: "DM Sans", fontSize: 13, color: T.text }}>
                {item.name}
              </span>
              <button
                onClick={() => onRemove(realIdx)}
                style={{
                  background: "none", border: "none", color: T.muted,
                  cursor: "pointer", fontSize: 16, padding: "0 4px",
                }}
                onMouseEnter={e => (e.target.style.color = T.danger)}
                onMouseLeave={e => (e.target.style.color = T.muted)}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Checked off items */}
      {checked.length > 0 && (
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: 16, opacity: 0.7,
        }}>
          <div style={{
            fontFamily: "Bebas Neue", fontSize: 14, letterSpacing: 2,
            color: T.muted, marginBottom: 10,
          }}>
            DONE ({checked.length})
          </div>
          {checked.map((item) => {
            const realIdx = items.indexOf(item);
            return (
              <div
                key={`${item.name}-${realIdx}`}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", marginBottom: 4,
                }}
              >
                <button
                  onClick={() => onToggle(realIdx)}
                  style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    border: `2px solid ${T.coachGreen}`, background: `${T.coachGreen}33`,
                    cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 12, color: T.coachGreen,
                  }}
                >
                  ✓
                </button>
                <span style={{
                  flex: 1, fontFamily: "DM Sans", fontSize: 13, color: T.muted,
                  textDecoration: "line-through",
                }}>
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Macro Tracker ─────────────────────────────────────────────────────────────
function MacroTracker({ plan, selectedDay, mfpData, mfpConnected }) {
  const tot = dayTotals(plan[selectedDay] || {});
  const hasMfp = mfpConnected && mfpData;
  const dg = getGoalsForDate(selectedDay);

  const macros = [
    {
      key: "calories",
      label: "Calories",
      goal: dg.calories,
      plan: tot.calories,
      mfp: hasMfp ? mfpData.calories : null,
      color: T.accent,
      unit: "kcal",
    },
    {
      key: "protein",
      label: "Protein",
      goal: dg.protein,
      plan: tot.protein,
      mfp: hasMfp ? mfpData.protein : null,
      color: T.protein,
      unit: "g",
    },
    {
      key: "carbs",
      label: "Carbs",
      goal: dg.carbs,
      plan: tot.carbs,
      mfp: hasMfp ? mfpData.carbs : null,
      color: T.carbs,
      unit: "g",
    },
    {
      key: "fat",
      label: "Fat",
      goal: dg.fat,
      plan: tot.fat,
      mfp: hasMfp ? mfpData.fat : null,
      color: T.fat,
      unit: "g",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Main stacked overview card ── */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          padding: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontFamily: "Bebas Neue",
              fontSize: 18,
              letterSpacing: 2,
              color: T.text,
            }}
          >
            MACRO OVERVIEW — {dateStrToDayKey(selectedDay)}
          </div>
          {hasMfp && (
            <div style={{ display: "flex", gap: 16 }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "JetBrains Mono",
                  fontSize: 10,
                  color: T.muted,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: T.accent,
                    display: "inline-block",
                    opacity: 0.5,
                  }}
                />
                PLAN
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "JetBrains Mono",
                  fontSize: 10,
                  color: T.muted,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: T.mfp,
                    display: "inline-block",
                  }}
                />
                MFP ACTUAL
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "JetBrains Mono",
                  fontSize: 10,
                  color: T.muted,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 2,
                    background: T.muted,
                    display: "inline-block",
                  }}
                />
                GOAL
              </span>
            </div>
          )}
        </div>

        {macros.map((m) => {
          const planPct = Math.min((m.plan / m.goal) * 100, 120);
          const mfpPct =
            m.mfp !== null ? Math.min((m.mfp / m.goal) * 100, 120) : null;
          const diff = m.mfp !== null ? m.mfp - m.plan : null;
          const diffColor =
            diff === null
              ? T.muted
              : diff > 15
              ? T.danger
              : diff < -15
              ? T.accent
              : T.coachGreen;

          return (
            <div key={m.key} style={{ marginBottom: 22 }}>
              {/* Row header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 7,
                }}
              >
                <span
                  style={{
                    fontFamily: "Bebas Neue",
                    fontSize: 15,
                    letterSpacing: 1.5,
                    color: m.color,
                  }}
                >
                  {m.label}
                </span>
                <div
                  style={{ display: "flex", gap: 14, alignItems: "baseline" }}
                >
                  <span
                    style={{
                      fontFamily: "JetBrains Mono",
                      fontSize: 11,
                      color: T.muted,
                    }}
                  >
                    Plan{" "}
                    <span style={{ color: m.color, fontWeight: 700 }}>
                      {m.plan}
                      {m.unit === "g" ? "g" : ""}
                    </span>
                  </span>
                  {m.mfp !== null && (
                    <>
                      <span
                        style={{
                          fontFamily: "JetBrains Mono",
                          fontSize: 11,
                          color: T.muted,
                        }}
                      >
                        Actual{" "}
                        <span style={{ color: T.mfp, fontWeight: 700 }}>
                          {m.mfp}
                          {m.unit === "g" ? "g" : ""}
                        </span>
                      </span>
                      <span
                        style={{
                          fontFamily: "JetBrains Mono",
                          fontSize: 11,
                          color: diffColor,
                          fontWeight: 700,
                        }}
                      >
                        {diff > 0 ? `+${diff}` : diff}
                        {m.unit === "g" ? "g" : ""}
                      </span>
                    </>
                  )}
                  <span
                    style={{
                      fontFamily: "JetBrains Mono",
                      fontSize: 10,
                      color: T.muted,
                    }}
                  >
                    / {m.goal}
                    {m.unit === "g" ? "g" : ""}
                  </span>
                </div>
              </div>

              {/* Stacked bar */}
              <div
                style={{
                  position: "relative",
                  height: 18,
                  background: T.surface,
                  borderRadius: 6,
                  overflow: "visible",
                }}
              >
                {/* Goal marker at 100% */}
                <div
                  style={{
                    position: "absolute",
                    left: "calc(min(100%, 100%))",
                    top: -3,
                    width: 2,
                    height: 24,
                    background: T.muted + "66",
                    borderRadius: 1,
                    zIndex: 3,
                  }}
                />

                {m.mfp !== null ? (
                  /* Stacked: plan fills from left, MFP overlays as second layer showing delta */
                  <>
                    {/* Plan segment — dimmed colour */}
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        height: "100%",
                        width: `${Math.min(planPct, 100)}%`,
                        background: m.color + "55",
                        borderRadius: planPct >= mfpPct ? 6 : "6px 0 0 6px",
                        transition: "width 0.6s ease",
                      }}
                    />
                    {/* MFP overlay — solid colour showing actual */}
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        height: "100%",
                        width: `${Math.min(mfpPct, 100)}%`,
                        background: `linear-gradient(90deg, ${m.color}, ${T.mfp})`,
                        borderRadius: 6,
                        opacity: 0.9,
                        transition: "width 0.6s ease",
                      }}
                    />
                    {/* Overage stripe if > 100% */}
                    {mfpPct > 100 && (
                      <div
                        style={{
                          position: "absolute",
                          left: "100%",
                          top: 0,
                          height: "100%",
                          width: `${Math.min(mfpPct - 100, 20)}%`,
                          background: T.danger,
                          borderRadius: "0 6px 6px 0",
                          opacity: 0.7,
                        }}
                      />
                    )}
                  </>
                ) : (
                  /* Plan only */
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      width: `${Math.min(planPct, 100)}%`,
                      background: `linear-gradient(90deg, ${m.color}88, ${m.color})`,
                      borderRadius: 6,
                      transition: "width 0.6s ease",
                    }}
                  />
                )}

                {/* Balance indicator dot at the split point */}
                {m.mfp !== null && Math.abs(mfpPct - planPct) > 2 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      transform: "translateY(-50%)",
                      left: `${Math.min(Math.min(planPct, mfpPct), 98)}%`,
                      width: 3,
                      height: "80%",
                      background: "#fff",
                      borderRadius: 2,
                      opacity: 0.6,
                      zIndex: 4,
                    }}
                  />
                )}
              </div>

              {/* Percentage labels */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: "JetBrains Mono",
                    fontSize: 9,
                    color: m.color + "99",
                  }}
                >
                  Plan {Math.round(planPct)}%
                </span>
                {m.mfp !== null && (
                  <span
                    style={{
                      fontFamily: "JetBrains Mono",
                      fontSize: 9,
                      color: T.mfp + "bb",
                    }}
                  >
                    Actual {Math.round(mfpPct)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Balance summary row */}
        {hasMfp && (
          <div
            style={{
              borderTop: `1px solid ${T.border}`,
              paddingTop: 16,
              marginTop: 4,
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 10,
            }}
          >
            {[
              { label: "FIBRE", val: `${mfpData.fibre}g`, color: T.coachGreen },
              { label: "WATER", val: `${mfpData.water}ml`, color: T.mfp },
              {
                label: "EXERCISE",
                val: `${mfpData.exerciseCalories} kcal`,
                color: T.protein,
              },
              {
                label: "NET KCAL",
                val: `${mfpData.netCalories}`,
                color: T.accent,
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  textAlign: "center",
                  background: T.surface,
                  borderRadius: 10,
                  padding: "10px 8px",
                }}
              >
                <div
                  style={{
                    fontFamily: "Bebas Neue",
                    fontSize: 22,
                    color: s.color,
                    lineHeight: 1,
                  }}
                >
                  {s.val}
                </div>
                <div
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 9,
                    color: T.muted,
                    letterSpacing: 1,
                    marginTop: 4,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Remaining macros ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
        }}
      >
        {macros.map((m) => {
          const consumed = hasMfp ? m.mfp : m.plan;
          const remaining = Math.max(m.goal - consumed, 0);
          const over = consumed > m.goal;
          return (
            <div
              key={m.key}
              style={{
                background: T.card,
                border: `1px solid ${over ? m.color + "44" : T.border}`,
                borderRadius: 14,
                padding: "16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "Bebas Neue",
                  fontSize: 28,
                  color: over ? T.danger : m.color,
                  lineHeight: 1,
                }}
              >
                {over ? `+${consumed - m.goal}` : remaining}
              </div>
              <div
                style={{
                  fontFamily: "JetBrains Mono",
                  fontSize: 10,
                  color: T.muted,
                  marginTop: 2,
                }}
              >
                {m.unit}
              </div>
              <div
                style={{
                  fontFamily: "DM Sans",
                  fontSize: 10,
                  color: T.muted,
                  letterSpacing: 0.5,
                  marginTop: 5,
                }}
              >
                {over
                  ? `${m.label.toUpperCase()} OVER`
                  : `${m.label.toUpperCase()} LEFT`}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Weekly calorie overview ── */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          padding: 24,
        }}
      >
        <div
          style={{
            fontFamily: "Bebas Neue",
            fontSize: 18,
            letterSpacing: 2,
            color: T.muted,
            marginBottom: 16,
          }}
        >
          WEEKLY OVERVIEW
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            height: 100,
          }}
        >
          {getCurrentWeekDates().map(({ dayKey, date }) => {
            const planCal = dayTotals(plan[date] || {}).calories;
            const mfpCal =
              hasMfp && date === selectedDay ? mfpData.calories : null;
            const dayCalGoal = getGoalsForDate(date).calories || 1;
            const hPlan = Math.max((planCal / dayCalGoal) * 100, 4);
            const hMfp = mfpCal
              ? Math.max((mfpCal / dayCalGoal) * 100, 4)
              : 0;
            const isActive = date === selectedDay;
            return (
              <div
                key={date}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <div
                  style={{
                    fontFamily: "JetBrains Mono",
                    fontSize: 9,
                    color: T.muted,
                  }}
                >
                  {planCal || ""}
                </div>
                {/* Stacked column */}
                <div
                  style={{
                    width: "100%",
                    height: "80px",
                    position: "relative",
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 2,
                  }}
                >
                  {/* Plan bar */}
                  <div
                    style={{
                      flex: 1,
                      height: `${hPlan}%`,
                      minHeight: 4,
                      background: isActive ? T.accent : T.border + "aa",
                      borderRadius: "3px 3px 0 0",
                      transition: "height 0.5s ease",
                    }}
                  />
                  {/* MFP bar (only for selected day) */}
                  {mfpCal && (
                    <div
                      style={{
                        flex: 1,
                        height: `${hMfp}%`,
                        minHeight: 4,
                        background: T.mfp,
                        borderRadius: "3px 3px 0 0",
                        opacity: 0.85,
                        transition: "height 0.5s ease",
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    fontFamily: "Bebas Neue",
                    fontSize: 11,
                    color: isActive ? T.accent : T.muted,
                    letterSpacing: 1,
                  }}
                >
                  {dayKey}
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 10,
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 10,
              color: T.accent,
            }}
          >
            ■ Plan
          </span>
          {hasMfp && (
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 10,
                color: T.mfp,
              }}
            >
              ■ MFP Actual
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Check-In Notes (athlete view — read only) ────────────────────────────────
function CheckInNotesView({ profileId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    (async () => {
      setLoading(true);
      try {
        const rows = await apiFetch(`/checkins/${profileId}`);
        if (Array.isArray(rows)) setNotes(rows);
      } catch {}
      setLoading(false);
    })();
  }, [profileId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontFamily: "Bebas Neue", fontSize: 28, letterSpacing: 2, color: T.text }}>CHECK-IN NOTES</div>
        <div style={{ fontFamily: "DM Sans", fontSize: 13, color: T.muted, marginTop: 4 }}>
          Notes from your coaching check-ins · Updated by your coach after each review
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: T.muted, fontFamily: "DM Sans", fontSize: 12 }}>Loading…</div>
      ) : notes.length === 0 ? (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 30, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 14, color: T.text, fontWeight: 600 }}>No check-in notes yet</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 12, color: T.muted, marginTop: 6 }}>
            Your coach will add notes after each check-in session
          </div>
        </div>
      ) : (
        notes.map(note => (
          <div key={note.id} style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 16, padding: 20, transition: "all 0.15s",
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  background: `${T.coachGreen}22`, border: `1px solid ${T.coachGreen}44`,
                  borderRadius: 8, padding: "5px 12px",
                  fontFamily: "JetBrains Mono", fontSize: 12, color: T.coachGreen, fontWeight: 600,
                }}>
                  {note.date ? new Date(note.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—"}
                </div>
                <span style={{ fontFamily: "Bebas Neue", fontSize: 16, letterSpacing: 1, color: T.text }}>{note.title}</span>
              </div>
            </div>

            {/* Notes content */}
            <div style={{
              fontFamily: "DM Sans", fontSize: 13, color: T.text, lineHeight: 1.7,
              whiteSpace: "pre-wrap", padding: "12px 16px",
              background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`,
            }}>
              {note.notes}
            </div>

            {/* Meta */}
            <div style={{ display: "flex", gap: 12, marginTop: 10, fontFamily: "DM Sans", fontSize: 10, color: T.muted }}>
              {note.createdByName && <span>Coach: {note.createdByName}</span>}
              {note.created_at && <span>· {new Date(note.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
              {note.updatedByName && note.updated_at && (
                <span style={{ color: T.accent }}>· Edited by {note.updatedByName} on {new Date(note.updated_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Inbox Page (full-page inbox with multi-coach + company threads) ───────────
/* ─────────────────────────────────────────────────────────────────────────────
   Real Coach Messages — loads from backend, polls every 10s
────────────────────────────────────────────────────────────────────────────── */
function InboxPage({ plan, selectedDay, profile, threads, setThreads }) {
  const [view, setView] = useState("list"); // "list" | "thread" | "compose"
  const [threadList, setThreadList] = useState([]);
  const [activeThread, setActiveThread] = useState(null); // { threadId, subject, otherId, otherName }
  const [threadMessages, setThreadMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const bottomRef = useRef(null);

  const coachId = profile?.coachId || null;
  const [realUnreadMap, setRealUnreadMap] = useState({});

  const loadUnreadCounts = async () => {
    try {
      const rows = await apiFetch('/messages-unread');
      const map = {};
      (Array.isArray(rows) ? rows : []).forEach(r => { map[r.fromId] = r.count; });
      setRealUnreadMap(map);
    } catch {}
  };

  // Load threads from coach
  const loadThreads = async () => {
    if (!coachId) return;
    try {
      const rows = await apiFetch(`/messages/threads/${coachId}`);
      if (Array.isArray(rows)) setThreadList(rows);
    } catch {}
  };

  useEffect(() => { if (coachId) { loadThreads(); loadUnreadCounts(); } }, [coachId]);
  useEffect(() => {
    if (!coachId) return;
    const i = setInterval(() => { loadThreads(); loadUnreadCounts(); }, 15000);
    return () => clearInterval(i);
  }, [coachId]);

  // Load messages for a specific thread
  const openThread = async (thread) => {
    setActiveThread(thread);
    setView("thread");
    setInput("");
    try {
      const msgs = await apiFetch(`/messages/thread/${coachId}/${thread.threadId}`);
      if (Array.isArray(msgs)) setThreadMessages(msgs);
    } catch { setThreadMessages([]); }
    loadUnreadCounts();
  };

  // Poll active thread
  useEffect(() => {
    if (view !== "thread" || !activeThread || !coachId) return;
    const i = setInterval(async () => {
      try {
        const msgs = await apiFetch(`/messages/thread/${coachId}/${activeThread.threadId}`);
        if (Array.isArray(msgs)) setThreadMessages(msgs);
      } catch {}
    }, 10000);
    return () => clearInterval(i);
  }, [view, activeThread?.threadId, coachId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [threadMessages]);

  // Send reply in thread
  const sendReply = async () => {
    if (!input.trim() || !coachId || loading || !activeThread) return;
    setLoading(true);
    try {
      const msg = await apiFetch(`/messages/${coachId}`, {
        method: 'POST',
        body: JSON.stringify({ content: input.trim(), threadId: activeThread.threadId, subject: activeThread.subject }),
      });
      setThreadMessages(prev => [...prev, msg]);
      setInput("");
    } catch (e) { console.warn('Send failed:', e); }
    setLoading(false);
  };

  // Compose new thread
  const sendNewThread = async () => {
    if (!input.trim() || !composeSubject.trim() || !coachId || loading) return;
    setLoading(true);
    try {
      const msg = await apiFetch(`/messages/${coachId}`, {
        method: 'POST',
        body: JSON.stringify({ content: input.trim(), subject: composeSubject.trim() }),
      });
      setInput("");
      setComposeSubject("");
      await loadThreads();
      // Open the new thread
      setActiveThread({ threadId: msg.threadId, subject: msg.subject || composeSubject.trim(), otherId: coachId });
      setThreadMessages([msg]);
      setView("thread");
    } catch (e) { console.warn('Compose failed:', e); }
    setLoading(false);
  };

  const totalUnread = threadList.reduce((n, t) => n + (t.unreadCount || 0), 0);

  // AI coach threads (keep existing)
  const tot = dayTotals(plan[selectedDay] || {});
  const selectedDayLabel = dateStrToDayKey(selectedDay);
  const [aiChatMsgs, setAiChatMsgs] = useState({});
  const [aiActiveId, setAiActiveId] = useState(null);

  const sendAIMessage = async () => {
    if (!input.trim() || loading || !aiActiveId) return;
    const coachCfg = COACHES_CONFIG[aiActiveId];
    if (!coachCfg) return;
    const userMsg = { role: "user", content: input.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    const updated = [...(aiChatMsgs[aiActiveId] || []), userMsg];
    setAiChatMsgs(prev => ({ ...prev, [aiActiveId]: updated }));
    setInput(""); setLoading(true);
    const sysPrompt = aiActiveId === "coach-sarah" ? coachCfg.systemPrompt(profile, tot, macroGoals) : coachCfg.systemPrompt(profile);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 350, system: sysPrompt, messages: updated.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = data.content?.map(b => b.text || "").join("") || "Sorry, missed that!";
      setAiChatMsgs(prev => ({ ...prev, [aiActiveId]: [...(prev[aiActiveId] || []), { role: "assistant", content: reply, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] }));
    } catch {
      setAiChatMsgs(prev => ({ ...prev, [aiActiveId]: [...(prev[aiActiveId] || []), { role: "assistant", content: "Connection issue. Try again.", time: "--:--" }] }));
    }
    setLoading(false);
  };

  const openAICoach = (id) => {
    setAiActiveId(id);
    setView("ai-thread");
    setInput("");
    if (!aiChatMsgs[id]) {
      const cfg = COACHES_CONFIG[id];
      const firstName = profile.name.split(" ")[0];
      let greeting = "";
      if (id === "coach-sarah") {
        const dGoal = getGoalsForDate(selectedDay);
        const calPct = dGoal.calories > 0 ? Math.round((tot.calories / dGoal.calories) * 100) : 0;
        greeting = `Hey ${firstName}! I can see your macros for ${selectedDayLabel} — you're at ${calPct}% of your calorie goal. How are you feeling today?`;
      } else if (id === "coach-james") {
        greeting = `Hey ${firstName}! Ready to talk training? What's on the programme today?`;
      } else if (id === "coach-emma") {
        greeting = `Hi ${firstName}! Good to check in with you. How's your head space around your nutrition goals this week?`;
      }
      setAiChatMsgs(prev => ({ ...prev, [id]: [{ role: "assistant", content: greeting, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] }));
    }
  };

  const handleSend = () => {
    if (view === "thread") sendReply();
    else if (view === "compose") sendNewThread();
    else if (view === "ai-thread") sendAIMessage();
  };

  // Build AI coach entries for the sidebar
  const aiCoaches = Object.entries(COACHES_CONFIG).map(([id, cfg]) => ({ id, ...cfg }));

  return (
    <div style={{ display: "flex", height: "calc(100vh - 170px)", background: T.bg, borderRadius: 20, overflow: "hidden", border: `1px solid ${T.border}` }}>
      {/* ── SIDEBAR ── */}
      <div style={{ width: 340, flexShrink: 0, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", background: T.card }}>
        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "Bebas Neue", fontSize: 18, letterSpacing: 2, color: T.text }}>INBOX</div>
            <div style={{ fontFamily: "DM Sans", fontSize: 10, color: T.muted }}>{threadList.length} thread{threadList.length !== 1 ? "s" : ""}{totalUnread > 0 ? ` · ${totalUnread} unread` : ""}</div>
          </div>
          <button
            onClick={() => { setView("compose"); setComposeSubject(""); setInput(""); }}
            style={{
              background: T.accent, color: T.bg, border: "none", borderRadius: 8,
              padding: "6px 12px", fontFamily: "Bebas Neue", fontSize: 12,
              letterSpacing: 1, cursor: "pointer",
            }}
          >
            ✉ COMPOSE
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* Real coach threads */}
          {coachId && (
            <div style={{ borderBottom: `1px solid ${T.border}30` }}>
              <div style={{ padding: "8px 18px", fontFamily: "DM Sans", fontSize: 9, color: T.muted, letterSpacing: 1, textTransform: "uppercase", background: T.surface }}>Coach Messages</div>
              {threadList.length === 0 && (
                <div style={{ padding: "14px 18px", fontFamily: "DM Sans", fontSize: 11, color: T.muted }}>No threads yet — compose a message to your coach</div>
              )}
              {threadList.map((t, idx) => {
                const isActive = view === "thread" && activeThread?.threadId === t.threadId;
                const hasUnread = (t.unreadCount || 0) > 0;
                return (
                  <div key={t.threadId} onClick={() => openThread({ ...t, otherId: coachId })} style={{
                    padding: "12px 18px", borderBottom: idx < threadList.length - 1 ? `1px solid ${T.border}15` : "none",
                    background: isActive ? T.surface : hasUnread ? `${T.accent}06` : "transparent",
                    cursor: "pointer", transition: "background 0.15s",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontFamily: "DM Sans", fontSize: 13, fontWeight: hasUnread ? 700 : 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {t.subject}
                      </span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, marginLeft: 8 }}>
                        {hasUnread && <div style={{ background: T.accent, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: T.bg, fontWeight: 700 }}>{t.unreadCount}</span></div>}
                        {t.lastAt && <span style={{ fontFamily: "JetBrains Mono", fontSize: 8, color: T.muted }}>{timeAgo(t.lastAt)}</span>}
                      </div>
                    </div>
                    <div style={{ fontFamily: "DM Sans", fontSize: 11, color: hasUnread ? T.text : T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.lastMessage || "No messages"}
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: T.border, marginTop: 3 }}>
                      {t.messageCount} message{t.messageCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* AI coaches */}
          <div>
            <div style={{ padding: "8px 18px", fontFamily: "DM Sans", fontSize: 9, color: T.muted, letterSpacing: 1, textTransform: "uppercase", background: T.surface }}>AI Coaches</div>
            {aiCoaches.map((cfg) => {
              const isActive = view === "ai-thread" && aiActiveId === cfg.id;
              const msgs = aiChatMsgs[cfg.id] || [];
              const lastMsg = msgs[msgs.length - 1]?.content || "Start a conversation…";
              return (
                <div key={cfg.id} onClick={() => openAICoach(cfg.id)} style={{
                  padding: "12px 18px", borderBottom: `1px solid ${T.border}15`,
                  background: isActive ? T.surface : "transparent", cursor: "pointer",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${cfg.color}22`, border: `2px solid ${cfg.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bebas Neue", fontSize: 10, color: cfg.color }}>{cfg.initials}</div>
                    <span style={{ fontFamily: "DM Sans", fontSize: 12, fontWeight: 600, color: T.text }}>{cfg.name}</span>
                    <span style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}33`, borderRadius: 4, padding: "1px 6px", fontFamily: "DM Sans", fontSize: 8, fontWeight: 600, color: cfg.color }}>AI</span>
                  </div>
                  <div style={{ fontFamily: "DM Sans", fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: 36 }}>
                    {lastMsg.slice(0, 60)}{lastMsg.length > 60 ? "…" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MAIN PANEL ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg }}>
        {/* Empty state */}
        {view === "list" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 40, opacity: 0.3 }}>✉</div>
            <div style={{ fontFamily: "DM Sans", fontSize: 14, color: T.muted }}>Select a thread or compose a new message</div>
          </div>
        )}

        {/* Compose new thread */}
        {view === "compose" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
              <div style={{ fontFamily: "Bebas Neue", fontSize: 18, letterSpacing: 2, color: T.text }}>NEW MESSAGE</div>
            </div>
            {!coachId ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, padding: 30 }}>
                <div style={{ fontSize: 36 }}>🔗</div>
                <div style={{ fontFamily: "DM Sans", fontSize: 14, color: T.text, fontWeight: 600 }}>No coach assigned</div>
                <div style={{ fontFamily: "DM Sans", fontSize: 12, color: T.muted, textAlign: "center" }}>You need to be assigned to a coach before you can send messages. Contact your admin.</div>
              </div>
            ) : (
              <>
                <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "DM Sans", fontSize: 10, color: T.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>To</div>
                    <div style={{ fontFamily: "DM Sans", fontSize: 13, color: T.coachGreen, fontWeight: 600 }}>{profile.coachName || "Your Coach"}</div>
                  </div>
                </div>
                <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ fontFamily: "DM Sans", fontSize: 10, color: T.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Subject</div>
                  <input
                    autoFocus
                    value={composeSubject}
                    onChange={e => setComposeSubject(e.target.value)}
                    placeholder="e.g. Question about macros, Weekly update…"
                    style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.text, fontFamily: "DM Sans", fontSize: 13, outline: "none" }}
                  />
                </div>
                <div style={{ flex: 1, padding: "12px 20px" }}>
                  <div style={{ fontFamily: "DM Sans", fontSize: 10, color: T.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Message</div>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Write your message…"
                    rows={6}
                    style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.text, fontFamily: "DM Sans", fontSize: 12, outline: "none", resize: "vertical" }}
                  />
                </div>
                <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setView("list")} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px", fontFamily: "Bebas Neue", fontSize: 14, letterSpacing: 1.5, color: T.muted, cursor: "pointer" }}>CANCEL</button>
                  <button onClick={handleSend} disabled={loading || !input.trim() || !composeSubject.trim()} style={{
                    background: input.trim() && composeSubject.trim() ? T.accent : T.border, color: input.trim() && composeSubject.trim() ? T.bg : T.muted,
                    border: "none", borderRadius: 10, padding: "10px 20px", fontFamily: "Bebas Neue", fontSize: 14, letterSpacing: 1.5, cursor: input.trim() && composeSubject.trim() ? "pointer" : "default",
                  }} type="button">{loading ? "…" : "SEND ➜"}</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Thread view (real coach) */}
        {view === "thread" && activeThread && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => { setView("list"); loadThreads(); }} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "DM Sans", fontSize: 14, fontWeight: 700, color: T.text }}>{activeThread.subject || "No subject"}</div>
                <div style={{ fontFamily: "DM Sans", fontSize: 10, color: T.muted }}>with {profile.coachName || "Coach"} · {threadMessages.length} message{threadMessages.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {threadMessages.length === 0 ? (
                <div style={{ textAlign: "center", color: T.muted, fontFamily: "DM Sans", fontSize: 12, padding: 30 }}>No messages yet</div>
              ) : threadMessages.map((m, i) => {
                const isUser = m.fromId === profile?.id;
                const showDate = i === 0 || new Date(m.created_at).toDateString() !== new Date(threadMessages[i-1]?.created_at).toDateString();
                return (
                  <div key={m.id || i}>
                    {showDate && <div style={{ textAlign: "center", fontFamily: "JetBrains Mono", fontSize: 9, color: T.muted, margin: "12px 0", padding: "4px 12px", background: T.surface, borderRadius: 20, display: "inline-block", width: "auto", marginLeft: "auto", marginRight: "auto", left: "50%", position: "relative", transform: "translateX(-50%)" }}>{new Date(m.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>}
                    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
                      <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: 14, background: isUser ? T.accent : T.surface, color: isUser ? T.bg : T.text, borderBottomRightRadius: isUser ? 4 : 14, borderBottomLeftRadius: isUser ? 14 : 4 }}>
                        {!isUser && m.fromName && <div style={{ fontFamily: "DM Sans", fontSize: 10, fontWeight: 700, color: T.coachGreen, marginBottom: 4 }}>{m.fromName}</div>}
                        <div style={{ fontFamily: "DM Sans", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.content}</div>
                        {m.created_at && <div style={{ fontFamily: "JetBrains Mono", fontSize: 8, color: isUser ? T.bg + "88" : T.muted, marginTop: 4, textAlign: "right" }}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {loading && <div style={{ display: "flex", gap: 4, padding: "8px 0" }}>{[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: T.muted, animation: `pulse 1s infinite ${i * 0.2}s` }} />)}</div>}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Reply…"
                style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.text, fontFamily: "DM Sans", fontSize: 12, outline: "none" }} />
              <button onClick={handleSend} disabled={loading || !input.trim()} style={{
                background: input.trim() ? T.accent : T.border, color: input.trim() ? T.bg : T.muted,
                border: "none", borderRadius: 10, padding: "10px 16px", fontFamily: "Bebas Neue", fontSize: 14, letterSpacing: 1.5, cursor: input.trim() ? "pointer" : "default",
              }} type="button">{loading ? "…" : "REPLY"}</button>
            </div>
          </div>
        )}

        {/* AI Coach thread */}
        {view === "ai-thread" && aiActiveId && (() => {
          const cfg = COACHES_CONFIG[aiActiveId];
          const msgs = aiChatMsgs[aiActiveId] || [];
          return (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${cfg.color}22`, border: `2px solid ${cfg.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bebas Neue", fontSize: 11, color: cfg.color }}>{cfg.initials}</div>
                <div><div style={{ fontFamily: "DM Sans", fontSize: 14, fontWeight: 700, color: T.text }}>{cfg.name}</div><div style={{ fontFamily: "DM Sans", fontSize: 10, color: T.muted }}>{cfg.role} · AI</div></div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                {msgs.map((m, i) => {
                  const isUser = m.role === "user";
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
                      <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: 14, background: isUser ? T.accent : T.surface, color: isUser ? T.bg : T.text, borderBottomRightRadius: isUser ? 4 : 14, borderBottomLeftRadius: isUser ? 14 : 4 }}>
                        <div style={{ fontFamily: "DM Sans", fontSize: 12, lineHeight: 1.5 }}>{m.content}</div>
                        {m.time && <div style={{ fontFamily: "JetBrains Mono", fontSize: 8, color: isUser ? T.bg + "88" : T.muted, marginTop: 4, textAlign: "right" }}>{m.time}</div>}
                      </div>
                    </div>
                  );
                })}
                {loading && <div style={{ display: "flex", gap: 4, padding: "8px 0" }}>{[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: T.muted, animation: `pulse 1s infinite ${i * 0.2}s` }} />)}</div>}
                <div ref={bottomRef} />
              </div>
              <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder={`Message ${cfg.name}…`}
                  style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.text, fontFamily: "DM Sans", fontSize: 12, outline: "none" }} />
                <button onClick={handleSend} disabled={loading || !input.trim()} style={{
                  background: input.trim() ? T.accent : T.border, color: input.trim() ? T.bg : T.muted,
                  border: "none", borderRadius: 10, padding: "10px 16px", fontFamily: "Bebas Neue", fontSize: 14, letterSpacing: 1.5, cursor: input.trim() ? "pointer" : "default",
                }} type="button">{loading ? "…" : "SEND"}</button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
// ── MFP meal name → plan meal name mapping ────────────────────────────────────
const MFP_MEAL_MAP = {
  breakfast: "Breakfast",
  "morning snack": "Snack",
  lunch: "Lunch",
  "afternoon snack": "Snack",
  dinner: "Dinner",
  snack: "Snack",
  "pre-workout": "Snack",
  "post-workout": "Snack",
};
const mfpMealToPlan = (name) => {
  const key = (name || "").toLowerCase();
  for (const k of Object.keys(MFP_MEAL_MAP)) {
    if (key.includes(k)) return MFP_MEAL_MAP[k];
  }
  return "Snack";
};

// ── Force Password Change (shown on first login for batch-imported athletes) ──
function ForcePasswordChange({ profile, onComplete }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    setSaving(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({ newPassword }),
      });
      onComplete({ ...profile, mustChangePassword: false });
    } catch (e) {
      setError(e.message || "Failed to change password");
    }
    setSaving(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "DM Sans",
    }}>
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 24, padding: 36, width: "100%", maxWidth: 420,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "Bebas Neue", fontSize: 28, letterSpacing: 3 }}>
            <span style={{ color: T.accent }}>NO RULES</span>{" "}
            <span style={{ color: T.text }}>NUTRITION</span>
          </div>
        </div>

        {/* Lock icon */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: `${T.accent}15`, border: `2px solid ${T.accent}44`,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}>
            🔒
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "Bebas Neue", fontSize: 20, letterSpacing: 2, color: T.text, marginBottom: 6 }}>
            SET YOUR PASSWORD
          </div>
          <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
            Welcome, {profile.name}! Your coach has created your account.
            Please set your own password to continue.
          </div>
        </div>

        {/* New password */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: T.muted, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 5 }}>
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            style={{
              width: "100%", background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: "12px 14px", color: T.text,
              fontFamily: "DM Sans", fontSize: 13, outline: "none",
            }}
          />
        </div>

        {/* Confirm password */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 10, color: T.muted, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 5 }}>
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Type your new password again"
            style={{
              width: "100%", background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: "12px 14px", color: T.text,
              fontFamily: "DM Sans", fontSize: 13, outline: "none",
            }}
          />
        </div>

        {/* Password strength indicator */}
        {newPassword.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{
                  flex: 1, height: 3, borderRadius: 2,
                  background: newPassword.length >= i * 3 ? (newPassword.length >= 10 ? T.coachGreen : newPassword.length >= 6 ? T.accent : T.danger) : T.border,
                  transition: "background 0.2s",
                }} />
              ))}
            </div>
            <div style={{ fontFamily: "DM Sans", fontSize: 10, color: newPassword.length >= 10 ? T.coachGreen : newPassword.length >= 6 ? T.accent : T.danger }}>
              {newPassword.length < 6 ? "Too short" : newPassword.length < 10 ? "Good" : "Strong"}
            </div>
          </div>
        )}

        {/* Match indicator */}
        {confirmPassword.length > 0 && (
          <div style={{ marginBottom: 16, fontFamily: "DM Sans", fontSize: 11, color: newPassword === confirmPassword ? T.coachGreen : T.danger }}>
            {newPassword === confirmPassword ? "✓ Passwords match" : "✕ Passwords do not match"}
          </div>
        )}

        {error && (
          <div style={{ background: `${T.danger}18`, border: `1px solid ${T.danger}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: T.danger }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving || newPassword.length < 6 || newPassword !== confirmPassword}
          style={{
            width: "100%", padding: "14px",
            background: newPassword.length >= 6 && newPassword === confirmPassword ? T.accent : T.border,
            color: newPassword.length >= 6 && newPassword === confirmPassword ? T.bg : T.muted,
            border: "none", borderRadius: 12,
            fontFamily: "Bebas Neue", fontSize: 18, letterSpacing: 2,
            cursor: newPassword.length >= 6 && newPassword === confirmPassword && !saving ? "pointer" : "default",
          }}
        >
          {saving ? "SAVING..." : "SET PASSWORD & CONTINUE"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tokenState, setTokenState] = useState(() => getToken());
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [plan, setPlan] = useState(initWeekPlan);
  const [selectedDay, setSelectedDay] = useState(() => getTodayISO());
  const weekDates = getCurrentWeekDates(); // [{dayKey, date, isToday}, ...]
  const [macroGoalsState, setMacroGoalsState] = useState(() => macroGoals);
  const [macroGoalsByDayState, setMacroGoalsByDayState] = useState({});
  const [threads, setThreads] = useState([]);

  // ✅ Restore session using /auth/me (keeps login after refresh)
  useEffect(() => {
    const t = getToken();
    if (!t) return;
    (async () => {
      try {
        const me = await apiFetch('/auth/me');
        setProfile(me);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setTokenState('');
        localStorage.removeItem(TOKEN_KEY);
    setTokenState('');
    setProfile(null);
      }
    })();
  }, [tokenState]);

  // ✅ Pull coach-set macro targets + week plan from backend (starts clean; no demo defaults)
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const res = await apiFetch(`/athlete/${profile.id}/macro-targets`);
        if (res?.macroGoals) setMacroGoalsState(res.macroGoals);
        if (res?.weekPlan) setPlan(res.weekPlan);
      } catch (e) {
        // Endpoint may not exist yet — keep UI usable without crashing.
      }
    })();
  }, [profile?.id]);

  // (Calendar events now loaded after profile is set, see below)




  // ── MFP Live Sync State ───────────────────────────────────────────────────
  const [mfpConnected, setMfpConnected] = useState(false);
  const [mfpSyncing, setMfpSyncing] = useState(false);
  const [mfpData, setMfpData] = useState(null);
  const [mfpLastSync, setMfpLastSync] = useState(null);
  const [mfpError, setMfpError] = useState(null);
  const [mfpNextSyncIn, setMfpNextSyncIn] = useState(null);
  const [mfpSyncCount, setMfpSyncCount] = useState(0); // increments each refresh
  const [mfpManualMode, setMfpManualMode] = useState(false);

  const mfpUsername = profile?.mfpUsername || null;

  // ── Shopping List State ──
  const [shoppingItems, setShoppingItems] = useState([]);
  const shoppingTimerRef = useRef(null);

  // ── Change Password State ──
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  const openChangePassword = () => {
    setPwForm({ current: "", newPw: "", confirm: "" });
    setPwError("");
    setPwSuccess(false);
    setShowChangePw(true);
  };

  const handleChangePw = async () => {
    setPwError("");
    if (!pwForm.current) { setPwError("Enter your current password"); return; }
    if (pwForm.newPw.length < 6) { setPwError("New password must be at least 6 characters"); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwError("Passwords do not match"); return; }
    setPwSaving(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
      });
      setPwSuccess(true);
      setTimeout(() => { setShowChangePw(false); }, 1500);
    } catch (e) {
      setPwError(e.message || "Failed to change password");
    }
    setPwSaving(false);
  };

  // Load shopping list from backend
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const data = await apiFetch(`/shopping-list/${profile.id}`);
        if (Array.isArray(data.items)) setShoppingItems(data.items);
      } catch {}
    })();
  }, [profile?.id]);

  // Auto-save shopping list (debounced)
  useEffect(() => {
    if (!profile?.id) return;
    if (shoppingTimerRef.current) clearTimeout(shoppingTimerRef.current);
    shoppingTimerRef.current = setTimeout(() => {
      apiFetch(`/shopping-list/${profile.id}`, {
        method: 'PUT',
        body: JSON.stringify({ items: shoppingItems }),
      }).catch(e => console.warn('Shopping list save:', e.message));
    }, 800);
    return () => { if (shoppingTimerRef.current) clearTimeout(shoppingTimerRef.current); };
  }, [shoppingItems, profile?.id]);

  // Add a food item to shopping list
  const addToShoppingList = (foodName) => {
    setShoppingItems(prev => {
      // Don't add duplicates
      if (prev.some(item => item.name === foodName && !item.checked)) return prev;
      return [...prev, { name: foodName, checked: false, addedAt: new Date().toISOString() }];
    });
  };

  // Remove a food item from shopping list
  const removeFromShoppingList = (idx) => {
    setShoppingItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Toggle checked state
  const toggleShoppingItem = (idx) => {
    setShoppingItems(prev => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item));
  };

  // ✅ Load macro plan from backend so coach updates show in the client
  // Polls every 30s so coach changes appear live
  const profileIdRef = useRef(null);
  profileIdRef.current = profile?.id;

  useEffect(() => {
    if (!profile?.id) return;
    const fetchMacroGoals = async () => {
      const pid = profileIdRef.current;
      if (!pid) return;
      try {
        const rows = await apiFetch(`/macro-plans/${pid}`);
        const vals = (rows || []).filter(Boolean);
        if (!vals.length) return;

        // Store per-day goals
        const byDay = {};
        vals.forEach(r => {
          const dk = r.day_of_week;
          if (!dk) return;
          byDay[dk] = {
            calories: Number(r.calories || 0),
            protein: Number(r.protein_g || 0),
            carbs: Number(r.carbs_g || 0),
            fat: Number(r.fat_g || 0),
          };
        });
        macroGoalsByDay = byDay;

        // Compute average for general display (macro rings, coach panel, etc.)
        const sum = vals.reduce((a, r) => ({
          calories: a.calories + Number(r.calories || 0),
          protein: a.protein + Number(r.protein_g || 0),
          carbs: a.carbs + Number(r.carbs_g || 0),
          fat: a.fat + Number(r.fat_g || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
        const n = Math.max(1, vals.length);
        const avg = {
          calories: Math.round(sum.calories / n),
          protein: Math.round(sum.protein / n),
          carbs: Math.round(sum.carbs / n),
          fat: Math.round(sum.fat / n),
        };
        macroGoals = avg;
        setMacroGoalsState(avg);
        setMacroGoalsByDayState({ ...byDay });
      } catch {
        // keep current values
      }
    };
    fetchMacroGoals(); // initial load
    const interval = setInterval(fetchMacroGoals, 30 * 1000); // poll every 30s
    return () => clearInterval(interval);
  }, [profile?.id]);

  const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 min — matches Senpro cadence

  // ── Realistic seed data for gerardqueen (used as base when live parse fails) ──
  const getRealisticData = () => null; // dummy data disabled

  // ── Live fetch via Anthropic API with web_fetch tool ──────────────────────
  const fetchMFP = async (username, dayPlan, isAutoRefresh = false) => {
    if (!username) return;
    setMfpSyncing(true);
    if (!isAutoRefresh) setMfpError(null);

    try {
      const today = new Date();
      const dateStr = dateToISO(today);

      let parsed = null;
      try {
        parsed = await apiFetch(`/mfp-diary/${encodeURIComponent(username)}?date=${dateStr}`);
      } catch (e) {
        console.warn('MFP backend fetch failed:', e.message);
        if (!isAutoRefresh) {
          // MFP blocks server-side access (403) — switch to manual mode
          setMfpError("MFP blocks automated access from our server. Use manual entry below — open your MFP diary, copy today's totals, and enter them here.");
          setMfpManualMode(true);
          setMfpConnected(true); // show the panel with manual entry
        }
        return;
      }

      if (parsed && parsed.profileFound && parsed.calories > 0) {
        setMfpData(parsed);
        setMfpConnected(true);
        setMfpManualMode(false);
        setMfpLastSync(new Date());
        setMfpSyncCount((c) => c + 1);
        setMfpError(null);
        importMFPDay(selectedDay, parsed);
        return;
      }

      if (parsed && !parsed.profileFound) {
        setMfpError("MFP username not found. Check the spelling and ensure the diary is set to public.");
        return;
      }

      if (parsed && parsed.profileFound && parsed.calories === 0) {
        setMfpError("Diary found but no food logged for today yet.");
        setMfpConnected(true);
        setMfpData(parsed);
        return;
      }

      // No data — fall back to manual
      if (!isAutoRefresh) {
        setMfpError("Auto-sync unavailable. Use manual entry below to log your MFP totals.");
        setMfpManualMode(true);
        setMfpConnected(true);
      }
    } catch (err) {
      if (!isAutoRefresh) {
        setMfpError("MFP sync unavailable. Use manual entry to log your totals.");
        setMfpManualMode(true);
        setMfpConnected(true);
      }
    } finally {
      setMfpSyncing(false);
    }
  };

  // ── Submit manually entered data ──────────────────────────────────────────
  const submitManualMFP = (formData) => {
    const cals = parseInt(formData.calories) || 0;
    const exCals = parseInt(formData.exerciseCalories) || 0;
    const result = {
      profileFound: true,
      source: "manual",
      username: mfpUsername || "manual",
      calories: cals,
      protein: parseInt(formData.protein) || 0,
      carbs: parseInt(formData.carbs) || 0,
      fat: parseInt(formData.fat) || 0,
      fibre: parseInt(formData.fibre) || 0,
      water: parseInt(formData.water) || 0,
      exerciseCalories: exCals,
      netCalories: Math.max(0, cals - exCals),
      weekAdherence: [80, 85, 90, 75, 88, 92, 70],
      meals: (() => {
        const provided = (formData.meals || [])
          .filter((m) => m.name && parseInt(m.calories) > 0)
          .map((m) => ({
            name: m.name,
            calories: parseInt(m.calories) || 0,
            logged: true,
          }));
        if (provided.length > 0) return provided;
        return [
          {
            name: "Breakfast",
            calories: Math.round(cals * 0.25),
            logged: cals > 0,
          },
          {
            name: "Lunch",
            calories: Math.round(cals * 0.35),
            logged: cals > 0,
          },
          {
            name: "Dinner",
            calories: Math.round(cals * 0.3),
            logged: cals > 0,
          },
          {
            name: "Snacks",
            calories: Math.round(cals * 0.1),
            logged: cals > 0,
          },
        ];
      })(),
    };
    setMfpData(result);
    setMfpConnected(true);
    setMfpLastSync(new Date());
    setMfpManualMode(true); // stay in manual mode to avoid re-triggering 403s
    setMfpError(null);
    setMfpSyncCount((c) => c + 1);
    importMFPDay(selectedDay, result);
  };

  // ── Update MFP username → persist to backend, then re-fetch ────────────────
  const handleSetMfpUsername = async (newUsername) => {
    const trimmed = newUsername.trim().toLowerCase();
    setProfile((prev) => ({ ...prev, mfpUsername: trimmed || null }));
    setMfpData(null);
    setMfpConnected(false);
    setMfpManualMode(false);
    setMfpError(null);
    setMfpNextSyncIn(null);
    if (profile?.id) {
      try {
        await apiFetch(`/profiles/${profile.id}`, {
          method: "PUT",
          body: JSON.stringify({ mfpUsername: trimmed || null }),
        });
      } catch (e) {
        setMfpError("Could not save MFP username — try again");
      }
    }
    if (trimmed) {
      setTimeout(() => fetchMFP(trimmed, plan[selectedDay]), 150);
    }
  };

  // Convert MFP diary data into plan food entries for a given day
  const importMFPDay = (day, data) => {
    const source = data || mfpData;
    if (!source || !source.calories) return;
    setPlan((prev) => {
      const next = { ...prev, [day]: {} };
      MEALS.forEach((m) => {
        next[day][m] = (prev[day][m] || []).filter((f) => f.source !== "mfp");
      });
      const loggedMeals = (source.meals || []).filter((m) => m.logged && m.calories > 0);
      if (loggedMeals.length > 0) {
        // Individual meal breakdowns available
        const totalCal = loggedMeals.reduce((s, m) => s + m.calories, 0) || 1;
        loggedMeals.forEach((mfpMeal) => {
          const ratio = mfpMeal.calories / totalCal;
          const entry = {
            name: `${mfpMeal.name} (MFP)`,
            calories: mfpMeal.calories,
            protein: Math.round(source.protein * ratio),
            carbs: Math.round(source.carbs * ratio),
            fat: Math.round(source.fat * ratio),
            source: "mfp",
          };
          const planMeal = mfpMealToPlan(mfpMeal.name);
          next[day][planMeal] = [...(next[day][planMeal] || []), entry];
        });
      } else {
        // Only totals available — add as single entry
        const entry = {
          name: `MFP Daily Total`,
          calories: Math.round(source.calories),
          protein: Math.round(source.protein),
          carbs: Math.round(source.carbs),
          fat: Math.round(source.fat),
          source: "mfp",
        };
        next[day]["Breakfast"] = [...(next[day]["Breakfast"] || []), entry];
      }
      return next;
    });
  };

  // Auto-fetch on login if account has mfpUsername
  useEffect(() => {
    if (mfpUsername && !mfpData && !mfpSyncing) {
      fetchMFP(mfpUsername, plan[selectedDay]);
    }
  }, [mfpUsername]);

  // ── Live sync interval — re-fetch every 15 min (Senpro cadence) ───────────
  useEffect(() => {
    if (!mfpConnected || !mfpUsername || mfpManualMode) return;
    let countdown = SYNC_INTERVAL_MS / 1000;
    setMfpNextSyncIn(countdown);
    const ticker = setInterval(() => {
      countdown -= 1;
      setMfpNextSyncIn(countdown);
      if (countdown <= 0) {
        countdown = SYNC_INTERVAL_MS / 1000;
        fetchMFP(mfpUsername, plan[selectedDay], true); // isAutoRefresh=true
      }
    }, 1000);
    return () => clearInterval(ticker);
  }, [mfpConnected, mfpUsername, mfpManualMode]);

  const [moodLog, setMoodLog] = useState({});

  // ── Load mood log from backend ────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const rows = await apiFetch(`/moods/${profile.id}`);
        if (!Array.isArray(rows)) return;
        const byDate = {};
        rows.forEach((r) => {
          byDate[r.date] = {
            id: r.mood_id,
            emoji: r.emoji,
            label: r.label,
            color: r.color,
            note: r.note,
            date: r.date,
          };
        });
        setMoodLog(byDate);
      } catch (e) { /* keep empty */ }
    })();
  }, [profile?.id]);

  // ── Save mood to backend when updated ─────────────────────────────────────
  const saveMoodToBackend = async (dateStr, entry) => {
    if (!profile?.id || !entry) return;
    try {
      await apiFetch(`/moods/${profile.id}`, {
        method: 'POST',
        body: JSON.stringify({
          date: dateStr,
          id: entry.id,
          emoji: entry.emoji,
          label: entry.label,
          color: entry.color,
          note: entry.note || '',
        }),
      });
    } catch (e) { console.warn('Mood save failed:', e); }
  };

  // ── Load weight log from backend ──────────────────────────────────────────
  const [weightLogLoaded, setWeightLogLoaded] = useState(false);
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const rows = await apiFetch(`/weights/${profile.id}`);
        // Merge into weightLog state via the WeightTracker component
        // We'll set a flag and pass loaded data down
        if (Array.isArray(rows) && rows.length > 0) {
          window.__nrn_loaded_weights = rows;
        }
        setWeightLogLoaded(true);
      } catch (e) { setWeightLogLoaded(true); }
    })();
  }, [profile?.id]);

  // ── Load food logs from backend ───────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        // Only fetch dates for the current week
        const wd = getCurrentWeekDates();
        const startStr = wd[0].date;
        const endStr = wd[6].date;
        const validDates = new Set(wd.map(w => w.date));

        const rows = await apiFetch(`/food-logs/${profile.id}?start=${startStr}&end=${endStr}`);
        if (Array.isArray(rows) && rows.length > 0) {
          setPlan((prev) => {
            const next = { ...prev };
            rows.forEach((dayLog) => {
              const logDate = dayLog.date; // "YYYY-MM-DD"
              // Only load if this date belongs to the current week
              if (!validDates.has(logDate)) return;

              if (!next[logDate]) { next[logDate] = {}; MEALS.forEach(m => next[logDate][m] = []); }
              const foods = (dayLog.foods || []).map(f => ({
                name: f.name,
                calories: Number(f.calories || 0),
                protein: Number(f.protein_g ?? f.protein ?? 0),
                carbs: Number(f.carbs_g ?? f.carbs ?? 0),
                fat: Number(f.fat_g ?? f.fat ?? 0),
                meal: f.meal || 'Snack',
              }));
              // Reset this day's meals then populate
              MEALS.forEach(m => next[logDate][m] = []);
              foods.forEach(f => {
                const meal = MEALS.includes(f.meal) ? f.meal : 'Snack';
                next[logDate][meal].push(f);
              });
            });
            return next;
          });
        }
      } catch (e) { /* keep empty plan */ }
    })();
  }, [profile?.id]);

  // ── Load calendar events from backend + poll every 30s ─────────────────────
  const [events, setEvents] = useState([]);
  const fetchCalendarEvents = async () => {
    if (!profile?.id) return;
    try {
      const rows = await apiFetch(`/calendar-events/${profile.id}`);
      if (Array.isArray(rows)) {
        // Parse [type:xxx] from notes to reconstruct event type
        const parsed = rows.map(ev => {
          const notes = ev.notes || "";
          const typeMatch = notes.match(/^\[type:(\w+)\]/);
          return {
            ...ev,
            type: typeMatch ? typeMatch[1] : (
              (ev.title || "").toLowerCase().includes("check") ? "checkin" :
              (ev.title || "").toLowerCase().includes("train") ? "training" :
              (ev.title || "").toLowerCase().includes("comp") ? "competition" :
              "reminder"
            ),
            notes: typeMatch ? notes.replace(/^\[type:\w+\]/, "") : notes,
          };
        });
        setEvents(parsed);
      }
    } catch (e) { /* keep current */ }
  };
  useEffect(() => {
    if (!profile?.id) return;
    fetchCalendarEvents();
    const interval = setInterval(fetchCalendarEvents, 30 * 1000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  // ── Auto-save food logs + daily totals when plan changes ────────────────────
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (!profile?.id) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      let hasFoods = false;
      // Iterate over all date keys in the plan
      Object.keys(plan).forEach(dateStr => {
        const dayPlan = plan[dateStr];
        if (!dayPlan) return;
        MEALS.forEach(meal => { if ((dayPlan[meal] || []).length > 0) hasFoods = true; });
      });
      if (!hasFoods) return; // Don't save empty initial state
      Object.keys(plan).forEach(dateStr => {
        const dayPlan = plan[dateStr];
        if (!dayPlan) return;
        // Validate dateStr looks like YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
        const foods = [];
        MEALS.forEach(meal => {
          (dayPlan[meal] || []).forEach(f => {
            foods.push({
              name: f.name || '',
              calories: Math.round(f.calories || 0),
              protein_g: Math.round(f.protein || 0),
              carbs_g: Math.round(f.carbs || 0),
              fat_g: Math.round(f.fat || 0),
              meal: meal,
              source: f.source || 'manual',
            });
          });
        });
        if (foods.length === 0) return;
        // Save food items
        apiFetch(`/food-logs/${profile.id}`, {
          method: 'PUT',
          body: JSON.stringify({ date: dateStr, foods }),
        }).catch(e => console.warn('Food log save:', e.message));
        // Save daily totals
        const tot = dayTotals(dayPlan);
        apiFetch(`/daily-totals/${profile.id}`, {
          method: 'POST',
          body: JSON.stringify({
            date: dateStr,
            calories: Math.round(tot.calories),
            protein_g: Math.round(tot.protein),
            carbs_g: Math.round(tot.carbs),
            fat_g: Math.round(tot.fat),
            source: 'manual',
          }),
        }).catch(e => console.warn('Daily totals save:', e.message));
      });
    }, 1000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [plan, profile?.id]);

  if (!tokenState || !profile)
    return (
      <LoginScreen
        onLoggedIn={(user, token) => {
          if (token) setTokenState(token);
          if (user) setProfile(user);
          setTab('dashboard');
        }}
      />
    );

  // Force password change for batch-imported athletes
  if (profile.mustChangePassword) {
    return <ForcePasswordChange profile={profile} onComplete={(updatedProfile) => setProfile(updatedProfile)} />;
  }

  const tabs = [
    { id: "dashboard", label: "DASHBOARD" },
    { id: "meals", label: "MEAL PLAN" },
    { id: "shopping", label: "🛒 SHOPPING" },
    { id: "checkin-notes", label: "📋 CHECK-INS" },
    { id: "inbox", label: "📥 INBOX", highlight: true },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: "DM Sans",
      }}
    >
      <style>{`
        html, body { width:100%; min-height:100vh; margin:0; padding:0; }
        #root { width:100% !important; max-width:100% !important; margin:0 !important; padding:0 !important; text-align:left !important; }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:${T.surface}; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:2px; }
        input::placeholder { color:${T.muted}; }
        input { caret-color:${T.accent}; }
        @keyframes pulse { 0%,100%{transform:scale(0.6);opacity:0.4} 50%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanLine { from{top:30%} to{top:70%} }
      `}</style>

      {/* Header */}
      <div
        style={{
          borderBottom: `1px solid ${T.border}`,
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
          position: "sticky",
          top: 0,
          background: T.bg + "f0",
          backdropFilter: "blur(12px)",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="38" height="38" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="98" fill="#1a1a1a" stroke={T.accent + "44"} strokeWidth="3" />
            <circle cx="100" cy="100" r="82" fill="#fff" />
            <circle cx="100" cy="95" r="28" fill="none" stroke="#FF9A52" strokeWidth="4.5" />
            <ellipse cx="90" cy="89" rx="4" ry="5" fill="#FF9A52" />
            <ellipse cx="110" cy="89" rx="4" ry="5" fill="#FF9A52" />
            <path d="M 86 100 Q 100 114 114 100" fill="none" stroke="#FF9A52" strokeWidth="4" strokeLinecap="round" />
            <path id="hTopArc" d="M 30 100 A 70 70 0 0 1 170 100" fill="none" />
            <text fontFamily="Arial Black, Impact, sans-serif" fontSize="22" fontWeight="900" fill="#1a1a1a" letterSpacing="3">
              <textPath href="#hTopArc" startOffset="50%" textAnchor="middle">NO RULE</textPath>
            </text>
            <path id="hBotArc" d="M 30 105 A 70 70 0 0 0 170 105" fill="none" />
            <text fontFamily="Arial Black, Impact, sans-serif" fontSize="19" fontWeight="900" fill="#1a1a1a" letterSpacing="2">
              <textPath href="#hBotArc" startOffset="50%" textAnchor="middle">NUTRITION</textPath>
            </text>
          </svg>
          <div
            style={{
              fontFamily: "Bebas Neue",
              fontSize: 24,
              letterSpacing: 2,
              lineHeight: 1,
            }}
          >
            <span style={{ color: T.accent }}>NO RULE</span>
            <span style={{ color: T.text }}> NUTRITION</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setTab("inbox")}
            style={{
              background: tab === "inbox" ? T.surface : "none",
              border: `1px solid ${tab === "inbox" ? T.border : "transparent"}`,
              borderRadius: 10, width: 40, height: 40, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: tab === "inbox" ? T.text : T.muted,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 13 16 13 14 16 10 16 8 13 2 13" />
              <path d="M5.45 5.11L2 13v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-7.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
          </button>
          <ProfileMenu
            profile={profile}
            onLogout={() => {
              setProfile(null);
              setPlan(initWeekPlan());
              setTab("dashboard");
              setMoodLog({});
            }}
            onNavigate={setTab}
            onChangePassword={openChangePassword}
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          borderBottom: `1px solid ${T.border}`,
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          gap: 2,
          overflowX: "auto",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "14px 18px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "Bebas Neue",
              fontSize: 14,
              letterSpacing: 1.5,
              whiteSpace: "nowrap",
              color:
                tab === t.id
                  ? t.mfp
                    ? T.mfp
                    : t.highlight
                    ? T.coachGreen
                    : T.accent
                  : T.muted,
              borderBottom:
                tab === t.id
                  ? `2px solid ${
                      t.mfp ? T.mfp : t.highlight ? T.coachGreen : T.accent
                    }`
                  : "2px solid transparent",
              transition: "all 0.2s",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 16,
            alignItems: "center",
            paddingLeft: 16,
          }}
        >
          {(() => {
            const hdrGoals = getGoalsForDate(selectedDay);
            return [
            {
              label: "CAL",
              val: hdrGoals.calories,
              unit: "kcal",
              color: T.accent,
            },
            {
              label: "PRO",
              val: hdrGoals.protein,
              unit: "g",
              color: T.protein,
            },
            { label: "CARB", val: hdrGoals.carbs, unit: "g", color: T.carbs },
            { label: "FAT", val: hdrGoals.fat, unit: "g", color: T.fat },
          ].map((g) => (
            <div key={g.label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "JetBrains Mono",
                  fontSize: 12,
                  color: g.color,
                  fontWeight: 600,
                }}
              >
                {g.val}
                <span style={{ fontSize: 9, color: T.muted }}>{g.unit}</span>
              </div>
              <div
                style={{
                  fontFamily: "DM Sans",
                  fontSize: 9,
                  color: T.muted,
                  letterSpacing: 1,
                }}
              >
                {g.label}
              </div>
            </div>
          ));
          })()}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          padding: "28px 32px",
          width: "100%",
          boxSizing: "border-box",
          animation: "fadeUp 0.3s ease",
        }}
      >
        {tab === "dashboard" && (
          <Dashboard
            plan={plan}
            profile={profile}
            onNavigate={setTab}
            selectedDay={selectedDay}
            moodLog={moodLog}
            setMoodLog={setMoodLog}
            threads={threads}
            setThreads={setThreads}
            mfpData={mfpData}
            mfpConnected={mfpConnected}
            onMoodSaved={saveMoodToBackend}
            profileId={profile?.id}
            events={events}
            setEvents={setEvents}
            onWeightSaved={() => {}}
          />
        )}
        {tab === "meals" && (
          <WeeklyPlanner
            plan={plan}
            setPlan={setPlan}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            profile={profile}
            mfpData={mfpData}
            mfpConnected={mfpConnected}
            mfpSyncing={mfpSyncing}
            mfpLastSync={mfpLastSync}
            onImportMFP={importMFPDay}
            onSyncNow={() =>
              mfpUsername && fetchMFP(mfpUsername, plan[selectedDay])
            }
            shoppingItems={shoppingItems}
            addToShoppingList={addToShoppingList}
          />
        )}
        {tab === "shopping" && (
          <ShoppingList
            items={shoppingItems}
            onToggle={toggleShoppingItem}
            onRemove={removeFromShoppingList}
            onClear={() => setShoppingItems([])}
            plan={plan}
            addToShoppingList={addToShoppingList}
          />
        )}
        {tab === "checkin-notes" && (
          <CheckInNotesView profileId={profile?.id} />
        )}
        {tab === "inbox" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "Bebas Neue", fontSize: 28, letterSpacing: 2, color: T.text }}>INBOX</div>
              <div style={{ fontFamily: "DM Sans", fontSize: 13, color: T.muted, marginTop: 4 }}>
                Messages from your coaching team · Real coach + AI assistants
              </div>
            </div>
            <InboxPage
              plan={plan}
              selectedDay={selectedDay}
              profile={profile}
              threads={threads}
              setThreads={setThreads}
            />
          </div>
        )}
      </div>

      {/* ── Change Password Modal (rendered at App root for clean z-index) ── */}
      {showChangePw && (
        <div
          style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowChangePw(false); }}
        >
          <div style={{ background: T.card, border: `1px solid ${T.accent}55`, borderRadius: 20, padding: 28, width: "90%", maxWidth: 400 }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "Bebas Neue", fontSize: 20, letterSpacing: 2, color: T.text, marginBottom: 20 }}>
              CHANGE PASSWORD
            </div>

            {pwSuccess ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                <div style={{ fontFamily: "DM Sans", fontSize: 14, color: T.coachGreen, fontWeight: 600 }}>Password updated successfully</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontFamily: "DM Sans", fontSize: 10, color: T.muted, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Current Password</label>
                  <input
                    type="password"
                    autoFocus
                    value={pwForm.current}
                    onChange={(e) => setPwForm(p => ({ ...p, current: e.target.value }))}
                    style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", color: T.text, fontFamily: "DM Sans", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontFamily: "DM Sans", fontSize: 10, color: T.muted, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 5 }}>New Password</label>
                  <input
                    type="password"
                    value={pwForm.newPw}
                    onChange={(e) => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                    placeholder="At least 6 characters"
                    style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", color: T.text, fontFamily: "DM Sans", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontFamily: "DM Sans", fontSize: 10, color: T.muted, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleChangePw(); }}
                    style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", color: T.text, fontFamily: "DM Sans", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                {pwForm.newPw.length > 0 && pwForm.confirm.length > 0 && pwForm.newPw !== pwForm.confirm && (
                  <div style={{ fontFamily: "DM Sans", fontSize: 11, color: T.danger, marginBottom: 12 }}>✕ Passwords do not match</div>
                )}
                {pwForm.newPw.length > 0 && pwForm.confirm.length > 0 && pwForm.newPw === pwForm.confirm && (
                  <div style={{ fontFamily: "DM Sans", fontSize: 11, color: T.coachGreen, marginBottom: 12 }}>✓ Passwords match</div>
                )}

                {pwError && (
                  <div style={{ background: `${T.danger}18`, border: `1px solid ${T.danger}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontFamily: "DM Sans", fontSize: 12, color: T.danger }}>{pwError}</div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setShowChangePw(false)}
                    style={{ flex: 1, background: "none", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px", fontFamily: "Bebas Neue", fontSize: 14, letterSpacing: 1, color: T.muted, cursor: "pointer" }}
                  >CANCEL</button>
                  <button
                    onClick={handleChangePw}
                    disabled={pwSaving || !pwForm.current || pwForm.newPw.length < 6 || pwForm.newPw !== pwForm.confirm}
                    style={{
                      flex: 2,
                      background: pwForm.current && pwForm.newPw.length >= 6 && pwForm.newPw === pwForm.confirm ? T.accent : T.border,
                      color: pwForm.current && pwForm.newPw.length >= 6 && pwForm.newPw === pwForm.confirm ? T.bg : T.muted,
                      border: "none", borderRadius: 10, padding: "12px",
                      fontFamily: "Bebas Neue", fontSize: 14, letterSpacing: 1.5,
                      cursor: pwForm.current && pwForm.newPw.length >= 6 && pwForm.newPw === pwForm.confirm && !pwSaving ? "pointer" : "default",
                    }}
                  >{pwSaving ? "SAVING..." : "UPDATE PASSWORD"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}