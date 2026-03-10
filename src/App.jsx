import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * No Rules Nutrition — Client App (clean, build-safe)
 * --------------------------------------------------
 * Goals:
 * - No demo accounts / no dummy data
 * - Real auth against your Railway API
 * - Athlete sees coach-set weekly macro plan + date targets
 * - Athlete logs: weight + mood
 * - Athlete logs: daily macros consumed ("SAVE DAY") to backend
 * - Athlete sees upcoming coach check-ins (links)
 *
 * Backend endpoints used (must exist in API):
 * - POST /auth/login           -> { token, user }
 * - GET  /auth/me              -> user
 * - POST /auth/logout          -> { ok }
 * - GET  /macro-plans/:id      -> [{ day_of_week, calories, protein_g, carbs_g, fat_g }]
 * - GET  /macro-targets/:id?start=YYYY-MM-DD&end=YYYY-MM-DD -> [{ date, calories, protein_g, carbs_g, fat_g, source }]
 * - POST /daily-totals/:id     -> { date, calories, protein_g, carbs_g, fat_g, note }
 * - GET  /daily-totals/:id?start&end
 * - POST /weights/:id          -> { date, kg }
 * - GET  /weights/:id
 * - POST /moods/:id            -> { date, id, emoji, label, color, note }
 * - GET  /moods/:id
 * - GET  /checkins/:id?start&end
 */

const API_BASE = import.meta.env.VITE_API_URL || "https://no-rules-api-production.up.railway.app";
const TOKEN_KEY = "nrn_token";

const T = {
  bg: "#0a0a0a",
  surface: "#111111",
  card: "#161616",
  border: "#1f1f1f",
  accent: "#FF9A52",
  text: "#f0f0f0",
  muted: "#777",
  warn: "#f59e0b",
  danger: "#ef4444",
  ok: "#22c55e",
  protein: "#f97316",
  carbs: "#3b82f6",
  fat: "#a855f7",
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
const setToken = (t) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function weekStartISO(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay(); // 0 Sun
  const diffToMon = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function dateForWeekDay(weekOffset, dayKey) {
  const idx = DAYS.indexOf(dayKey);
  const start = weekStartISO(weekOffset);
  const d = new Date(start);
  d.setDate(start.getDate() + (idx < 0 ? 0 : idx));
  return isoDate(d);
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function Card({ children, style }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Button({ children, onClick, disabled, style, tone = "default", type = "button" }) {
  const colors = {
    default: { bg: T.card, br: T.border, fg: T.text },
    accent: { bg: T.accent, br: T.accent, fg: T.bg },
    danger: { bg: T.danger, br: T.danger, fg: T.bg },
    ghost: { bg: "transparent", br: T.border, fg: T.text },
  };
  const c = colors[tone] || colors.default;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? `${c.bg}88` : c.bg,
        border: `1px solid ${c.br}`,
        color: disabled ? `${c.fg}88` : c.fg,
        borderRadius: 12,
        padding: "10px 14px",
        cursor: disabled ? "default" : "pointer",
        fontFamily: "DM Sans, system-ui",
        fontSize: 13,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, type = "text", style }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      style={{
        width: "100%",
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: "12px 12px",
        color: T.text,
        fontFamily: "DM Sans, system-ui",
        outline: "none",
        ...style,
      }}
    />
  );
}

function Label({ children }) {
  return <div style={{ fontFamily: "DM Sans", fontSize: 12, color: T.muted, marginBottom: 6 }}>{children}</div>;
}

function Banner({ tone = "warn", children }) {
  const bg = tone === "ok" ? `${T.ok}18` : tone === "danger" ? `${T.danger}18` : `${T.warn}18`;
  const br = tone === "ok" ? `${T.ok}44` : tone === "danger" ? `${T.danger}44` : `${T.warn}44`;
  const fg = tone === "ok" ? T.ok : tone === "danger" ? T.danger : T.warn;
  return (
    <div style={{ background: bg, border: `1px solid ${br}`, borderRadius: 12, padding: 12, color: fg, fontFamily: "DM Sans", fontSize: 12 }}>
      {children}
    </div>
  );
}

function TopBar({ profile, tab, setTab, onLogout }) {
  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "nutrition", label: "Nutrition" },
    { id: "weight", label: "Weight" },
    { id: "mood", label: "Mood" },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "Bebas Neue, system-ui", fontSize: 26, letterSpacing: 2, color: T.text }}>NO RULES NUTRITION</div>
        <div style={{ fontFamily: "DM Sans", fontSize: 12, color: T.muted }}>{profile?.name || profile?.email || ""}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <Button
            key={t.id}
            tone={tab === t.id ? "accent" : "ghost"}
            onClick={() => setTab(t.id)}
            style={{ padding: "10px 12px" }}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Button tone="danger" onClick={onLogout} style={{ marginLeft: 6 }}>
        Logout
      </Button>
    </div>
  );
}

function LoginScreen({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (!data?.token) throw new Error("No token returned");
      setToken(data.token);
      onLoggedIn(data.user || null);
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, display: "grid", placeItems: "center", padding: 18 }}>
      <Card style={{ width: "100%", maxWidth: 560 }}>
        <div style={{ fontFamily: "Bebas Neue, system-ui", fontSize: 32, letterSpacing: 2 }}>ATHLETE LOGIN</div>
        <div style={{ fontFamily: "DM Sans", fontSize: 12, color: T.muted, marginTop: 4 }}>Use the account created by your coach.</div>

        <div style={{ marginTop: 14 }}>
          <Label>Email</Label>
          <Input value={email} onChange={setEmail} placeholder="email" />
        </div>
        <div style={{ marginTop: 12 }}>
          <Label>Password</Label>
          <Input value={password} onChange={setPassword} placeholder="password" type="password" />
        </div>

        {err ? <div style={{ marginTop: 12 }}><Banner tone="danger">{err}</Banner></div> : null}

        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
          <Button tone="accent" onClick={submit} disabled={loading} style={{ flex: 1 }}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </div>

        <div style={{ marginTop: 12, fontFamily: "JetBrains Mono", fontSize: 11, color: T.muted }}>API: {API_BASE}</div>
      </Card>
    </div>
  );
}

function MacroSummary({ targetsForDate }) {
  const tg = targetsForDate || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, source: "" };
  const items = [
    { label: "CAL", v: tg.calories, unit: "kcal", color: T.accent },
    { label: "P", v: tg.protein_g, unit: "g", color: T.protein },
    { label: "C", v: tg.carbs_g, unit: "g", color: T.carbs },
    { label: "F", v: tg.fat_g, unit: "g", color: T.fat },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
      {items.map((it) => (
        <div key={it.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 12 }}>
          <div style={{ fontFamily: "DM Sans", fontSize: 11, color: T.muted }}>{it.label}</div>
          <div style={{ fontFamily: "Bebas Neue, system-ui", fontSize: 22, letterSpacing: 1.5, color: it.color }}>
            {Number(it.v || 0)}<span style={{ fontFamily: "DM Sans", fontSize: 11, color: T.muted, marginLeft: 6 }}>{it.unit}</span>
          </div>
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: T.muted }}>{tg.source || ""}</div>
        </div>
      ))}
    </div>
  );
}

// A small, editable Food DB (not demo accounts) — you can expand this list
const FOOD_DB = [
  { id: "chicken_breast", name: "Chicken breast (100g)", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: "rice_cooked", name: "Rice cooked (150g)", calories: 195, protein: 4, carbs: 42, fat: 0.4 },
  { id: "oats", name: "Oats (40g)", calories: 150, protein: 5, carbs: 27, fat: 3 },
  { id: "whey", name: "Whey (1 scoop)", calories: 120, protein: 24, carbs: 3, fat: 2 },
  { id: "banana", name: "Banana", calories: 105, protein: 1.3, carbs: 27, fat: 0.3 },
  { id: "olive_oil", name: "Olive oil (1 tbsp)", calories: 119, protein: 0, carbs: 0, fat: 13.5 },
];

function Nutrition({ profile, selectedDateISO, targetsForDate, onSaved }) {
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [dayItems, setDayItems] = useState([]); // {food, qty}
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FOOD_DB;
    return FOOD_DB.filter((f) => f.name.toLowerCase().includes(q));
  }, [query]);

  const totals = useMemo(() => {
    return dayItems.reduce(
      (a, it) => {
        const m = Number(it.qty || 1);
        a.calories += it.food.calories * m;
        a.protein += it.food.protein * m;
        a.carbs += it.food.carbs * m;
        a.fat += it.food.fat * m;
        return a;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [dayItems]);

  const addFood = (food) => {
    setDayItems((prev) => {
      const exists = prev.find((x) => x.food.id === food.id);
      if (exists) return prev.map((x) => (x.food.id === food.id ? { ...x, qty: x.qty + 1 } : x));
      return [...prev, { food, qty: 1 }];
    });
  };

  const updateQty = (id, qty) => {
    const q = clamp(Number(qty) || 0, 0, 50);
    setDayItems((prev) => prev.map((x) => (x.food.id === id ? { ...x, qty: q } : x)).filter((x) => x.qty > 0));
  };

  const saveDay = async () => {
    if (!profile?.id) return;
    setSaving(true);
    setMsg(null);
    try {
      await apiFetch(`/daily-totals/${profile.id}`, {
        method: "POST",
        body: JSON.stringify({
          date: selectedDateISO,
          calories: Math.round(totals.calories),
          protein_g: Math.round(totals.protein),
          carbs_g: Math.round(totals.carbs),
          fat_g: Math.round(totals.fat),
          note: note || null,
          source: "manual",
        }),
      });
      setMsg({ tone: "ok", text: "✓ Saved day totals" });
      setNote("");
      onSaved?.();
    } catch (e) {
      setMsg({ tone: "danger", text: e.message || "Could not save" });
    } finally {
      setSaving(false);
    }
  };

  const diff = (a, b) => {
    if (!b) return "—";
    const d = a - b;
    const pct = b > 0 ? (d / b) * 100 : 0;
    const sign = d >= 0 ? "+" : "";
    return `${sign}${Math.round(d)} (${sign}${pct.toFixed(0)}%)`;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "Bebas Neue, system-ui", fontSize: 22, letterSpacing: 2 }}>NUTRITION</div>
            <div style={{ fontFamily: "DM Sans", fontSize: 12, color: T.muted }}>Build your day and click SAVE DAY ({selectedDateISO}).</div>
          </div>
          <Button tone="accent" onClick={saveDay} disabled={saving}>
            {saving ? "SAVING…" : "SAVE DAY"}
          </Button>
        </div>

        {msg ? <div style={{ marginTop: 12 }}><Banner tone={msg.tone}>{msg.text}</Banner></div> : null}

        <div style={{ marginTop: 12 }}>
          <Label>Search food database</Label>
          <Input value={query} onChange={setQuery} placeholder="search…" />
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {matches.slice(0, 10).map((f) => (
            <div key={f.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "DM Sans", fontSize: 13, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: T.muted }}>
                  {f.calories}kcal · P{f.protein} C{f.carbs} F{f.fat}
                </div>
              </div>
              <Button onClick={() => addFood(f)} tone="ghost" style={{ padding: "8px 10px" }}>Add</Button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14 }}>
          <Label>Today’s items</Label>
          {!dayItems.length ? (
            <div style={{ fontFamily: "DM Sans", fontSize: 12, color: T.muted }}>Add foods above to build your day.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {dayItems.map((it) => (
                <div key={it.food.id} style={{ display: "flex", gap: 10, alignItems: "center", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "DM Sans", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.food.name}</div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: T.muted }}>{it.food.calories}kcal per unit</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ fontFamily: "DM Sans", fontSize: 12, color: T.muted }}>Qty</div>
                    <input
                      value={it.qty}
                      onChange={(e) => updateQty(it.food.id, e.target.value)}
                      style={{ width: 70, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 10px", color: T.text, fontFamily: "JetBrains Mono", fontSize: 12 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <Label>Optional note</Label>
          <Input value={note} onChange={setNote} placeholder="e.g. training day, travel, etc…" />
        </div>
      </Card>

      <div style={{ display: "grid", gap: 14 }}>
        <Card>
          <div style={{ fontFamily: "Bebas Neue, system-ui", fontSize: 18, letterSpacing: 2 }}>TARGETS</div>
          <div style={{ marginTop: 10 }}>
            <MacroSummary targetsForDate={targetsForDate} />
          </div>
        </Card>

        <Card>
          <div style={{ fontFamily: "Bebas Neue, system-ui", fontSize: 18, letterSpacing: 2 }}>TOTALS</div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "DM Sans", fontSize: 13 }}><span>Calories</span><span>{Math.round(totals.calories)} {diff(Math.round(totals.calories), targetsForDate?.calories || 0)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "DM Sans", fontSize: 13 }}><span>Protein</span><span>{Math.round(totals.protein)}g {diff(Math.round(totals.protein), targetsForDate?.protein_g || 0)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "DM Sans", fontSize: 13 }}><span>Carbs</span><span>{Math.round(totals.carbs)}g {diff(Math.round(totals.carbs), targetsForDate?.carbs_g || 0)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "DM Sans", fontSize: 13 }}><span>Fat</span><span>{Math.round(totals.fat)}g {diff(Math.round(totals.fat), targetsForDate?.fat_g || 0)}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Weight({ profile }) {
  const [rows, setRows] = useState([]);
  const [kg, setKg] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState(null);

  const load = async () => {
    if (!profile?.id) return;
    setErr("");
    try {
      const data = await apiFetch(`/weights/${profile.id}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "Could not load weights");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const save = async () => {
    setMsg(null);
    setErr("");
    const val = Number(kg);
    if (!val || val <= 0) {
      setErr("Enter a valid weight");
      return;
    }
    try {
      await apiFetch(`/weights/${profile.id}`, {
        method: "POST",
        body: JSON.stringify({ date: isoDate(new Date()), kg: val }),
      });
      setKg("");
      setMsg({ tone: "ok", text: "✓ Saved" });
      await load();
    } catch (e) {
      setErr(e.message || "Could not save weight");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Card>
        <div style={{ fontFamily: "Bebas Neue, system-ui", fontSize: 22, letterSpacing: 2 }}>WEIGHT</div>
        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "end" }}>
          <div style={{ flex: 1 }}>
            <Label>Kg</Label>
            <Input value={kg} onChange={setKg} placeholder="e.g. 82.4" />
          </div>
          <Button tone="accent" onClick={save}>Log</Button>
        </div>
        {err ? <div style={{ marginTop: 12 }}><Banner tone="danger">{err}</Banner></div> : null}
        {msg ? <div style={{ marginTop: 12 }}><Banner tone={msg.tone}>{msg.text}</Banner></div> : null}
      </Card>

      <Card>
        <div style={{ fontFamily: "Bebas Neue, system-ui", fontSize: 18, letterSpacing: 2 }}>HISTORY</div>
        <div style={{ marginTop: 10, maxHeight: 420, overflow: "auto" }}>
          {rows.length ? (
            rows.map((r) => (
              <div key={r.date} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}22` }}>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: T.muted }}>{r.date}</div>
                <div style={{ fontFamily: "DM Sans", fontSize: 13, color: T.text }}>{Number(r.kg).toFixed(1)} kg</div>
              </div>
            ))
          ) : (
            <div style={{ fontFamily: "DM Sans", fontSize: 12, color: T.muted }}>No weights yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Mood({ profile }) {
  const MOODS = [
    { id: 5, emoji: "😄", label: "Great", color: "#22c55e" },
    { id: 4, emoji: "🙂", label: "Good", color: "#FF9A52" },
    { id: 3, emoji: "😐", label: "Neutral", color: "#f97316" },
    { id: 2, emoji: "😔", label: "Low", color: "#3b82f6" },
    { id: 1, emoji: "😩", label: "Terrible", color: "#ef4444" },
  ];

  const [rows, setRows] = useState([]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState(null);

  const load = async () => {
    if (!profile?.id) return;
    setErr("");
    try {
      const data = await apiFetch(`/moods/${profile.id}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "Could not load moods");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const save = async (m) => {
    setErr("");
    setMsg(null);
    try {
      await apiFetch(`/moods/${profile.id}`, {
        method: "POST",
        body: JSON.stringify({ date: isoDate(new Date()), id: m.id, emoji: m.emoji, label: m.label, color: m.color, note }),
      });
      setNote("");
      setMsg({ tone: "ok", text: "✓ Saved" });
      await load();
    } catch (e) {
      setErr(e.message || "Could not save mood");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Card>
        <div style={{ fontFamily: "Bebas Neue, system-ui", fontSize: 22, letterSpacing: 2 }}>MOOD</div>
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {MOODS.map((m) => (
            <Button key={m.id} onClick={() => save(m)} style={{ borderColor: `${m.color}66`, color: m.color }}>
              <span style={{ marginRight: 8 }}>{m.emoji}</span>{m.label}
            </Button>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <Label>Optional note</Label>
          <Input value={note} onChange={setNote} placeholder="How are you feeling today?" />
        </div>
        {err ? <div style={{ marginTop: 12 }}><Banner tone="danger">{err}</Banner></div> : null}
        {msg ? <div style={{ marginTop: 12 }}><Banner tone={msg.tone}>{msg.text}</Banner></div> : null}
      </Card>

      <Card>
        <div style={{ fontFamily: "Bebas Neue, system-ui", fontSize: 18, letterSpacing: 2 }}>HISTORY</div>
        <div style={{ marginTop: 10, maxHeight: 420, overflow: "auto" }}>
          {rows.length ? (
            rows.map((r) => (
              <div key={`${r.date}-${r.mood_id}`} style={{ padding: "10px 0", borderBottom: `1px solid ${T.border}22` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: T.muted }}>{r.date}</div>
                  <div style={{ fontFamily: "DM Sans", fontSize: 13, color: r.color || T.text }}>{r.emoji} {r.label || r.mood_id}</div>
                </div>
                {r.note ? <div style={{ marginTop: 6, fontFamily: "DM Sans", fontSize: 12, color: T.muted }}>{r.note}</div> : null}
              </div>
            ))
          ) : (
            <div style={{ fontFamily: "DM Sans", fontSize: 12, color: T.muted }}>No moods yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Dashboard({ profile, weekOffset, setWeekOffset, selectedDay, setSelectedDay, targetsForWeek, targetsForDate, checkins }) {
  const start = isoDate(weekStartISO(weekOffset));
  const endD = new Date(weekStartISO(weekOffset));
  endD.setDate(endD.getDate() + 6);
  const end = isoDate(endD);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "Bebas Neue, system-ui", fontSize: 22, letterSpacing: 2 }}>THIS WEEK</div>
            <div style={{ fontFamily: "DM Sans", fontSize: 12, color: T.muted }}>{start} → {end}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => setWeekOffset((w) => w - 1)} style={{ padding: "10px 12px" }}>◀</Button>
            <Button onClick={() => setWeekOffset((w) => Math.min(0, w + 1))} style={{ padding: "10px 12px" }}>▶</Button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {DAYS.map((d) => (
            <Button key={d} tone={selectedDay === d ? "accent" : "ghost"} onClick={() => setSelectedDay(d)} style={{ padding: "10px 12px" }}>
              {d}
            </Button>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <MacroSummary targetsForDate={targetsForDate} />
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: "Bebas Neue, system-ui", fontSize: 16, letterSpacing: 2 }}>WEEK TABLE</div>
          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", fontFamily: "DM Sans", fontSize: 12, color: T.muted, padding: "8px 10px", borderBottom: `1px solid ${T.border}` }}>DAY</th>
                  <th style={{ textAlign: "left", fontFamily: "DM Sans", fontSize: 12, color: T.muted, padding: "8px 10px", borderBottom: `1px solid ${T.border}` }}>DATE</th>
                  <th style={{ textAlign: "right", fontFamily: "DM Sans", fontSize: 12, color: T.muted, padding: "8px 10px", borderBottom: `1px solid ${T.border}` }}>CAL</th>
                  <th style={{ textAlign: "right", fontFamily: "DM Sans", fontSize: 12, color: T.muted, padding: "8px 10px", borderBottom: `1px solid ${T.border}` }}>P</th>
                  <th style={{ textAlign: "right", fontFamily: "DM Sans", fontSize: 12, color: T.muted, padding: "8px 10px", borderBottom: `1px solid ${T.border}` }}>C</th>
                  <th style={{ textAlign: "right", fontFamily: "DM Sans", fontSize: 12, color: T.muted, padding: "8px 10px", borderBottom: `1px solid ${T.border}` }}>F</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map((d) => {
                  const date = dateForWeekDay(weekOffset, d);
                  const r = targetsForWeek[date] || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, source: "" };
                  return (
                    <tr key={date}>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${T.border}22`, fontFamily: "DM Sans", fontSize: 12 }}>{d}</td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${T.border}22`, fontFamily: "JetBrains Mono", fontSize: 11, color: T.muted }}>{date}</td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${T.border}22`, fontFamily: "JetBrains Mono", fontSize: 11, textAlign: "right", color: T.accent }}>{r.calories}</td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${T.border}22`, fontFamily: "JetBrains Mono", fontSize: 11, textAlign: "right", color: T.protein }}>{r.protein_g}</td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${T.border}22`, fontFamily: "JetBrains Mono", fontSize: 11, textAlign: "right", color: T.carbs }}>{r.carbs_g}</td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${T.border}22`, fontFamily: "JetBrains Mono", fontSize: 11, textAlign: "right", color: T.fat }}>{r.fat_g}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ fontFamily: "Bebas Neue, system-ui", fontSize: 22, letterSpacing: 2 }}>UPCOMING CHECK-INS</div>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {!checkins.length ? (
            <div style={{ fontFamily: "DM Sans", fontSize: 12, color: T.muted }}>No check-ins scheduled.</div>
          ) : (
            checkins.slice(0, 8).map((it) => (
              <div key={it.id} style={{ borderBottom: `1px solid ${T.border}22`, paddingBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: T.muted }}>{it.date}</div>
                    <div style={{ fontFamily: "DM Sans", fontSize: 13 }}>{it.title}</div>
                  </div>
                  {it.linkUrl ? (
                    <a href={it.linkUrl} target="_blank" rel="noreferrer" style={{ color: T.accent, fontFamily: "DM Sans", fontSize: 12, alignSelf: "center" }}>
                      Open
                    </a>
                  ) : (
                    <div style={{ color: T.muted, fontFamily: "DM Sans", fontSize: 12, alignSelf: "center" }}>—</div>
                  )}
                </div>
                {it.notes ? <div style={{ marginTop: 6, fontFamily: "DM Sans", fontSize: 12, color: T.muted }}>{it.notes}</div> : null}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("dashboard");

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);

  const [targetsForWeek, setTargetsForWeek] = useState({});
  const [targetsErr, setTargetsErr] = useState("");

  const [checkins, setCheckins] = useState([]);

  const selectedDateISO = useMemo(() => dateForWeekDay(weekOffset, selectedDay), [weekOffset, selectedDay]);

  const targetsForDate = useMemo(() => targetsForWeek[selectedDateISO], [targetsForWeek, selectedDateISO]);

  const loadMe = async () => {
    try {
      const me = await apiFetch("/auth/me");
      setProfile(me);
      return me;
    } catch {
      setToken("");
      setProfile(null);
      return null;
    }
  };

  const loadTargetsForWeek = async (athleteId) => {
    if (!athleteId) return;
    setTargetsErr("");
    try {
      const start = isoDate(weekStartISO(weekOffset));
      const endD = new Date(weekStartISO(weekOffset));
      endD.setDate(endD.getDate() + 6);
      const end = isoDate(endD);

      const rows = await apiFetch(`/macro-targets/${athleteId}?start=${start}&end=${end}`);
      const map = {};
      (Array.isArray(rows) ? rows : []).forEach((r) => {
        map[r.date] = {
          calories: Number(r.calories || 0),
          protein_g: Number(r.protein_g || 0),
          carbs_g: Number(r.carbs_g || 0),
          fat_g: Number(r.fat_g || 0),
          source: r.source || "",
        };
      });

      // Fill missing days from weekly macro plan
      const weekly = await apiFetch(`/macro-plans/${athleteId}`);
      const byDay = {};
      (Array.isArray(weekly) ? weekly : []).forEach((r) => {
        byDay[r.day_of_week] = r;
      });

      DAYS.forEach((d) => {
        const date = dateForWeekDay(weekOffset, d);
        if (!map[date]) {
          const base = byDay[d] || {};
          map[date] = {
            calories: Number(base.calories || 0),
            protein_g: Number(base.protein_g || 0),
            carbs_g: Number(base.carbs_g || 0),
            fat_g: Number(base.fat_g || 0),
            source: byDay[d] ? "plan" : "",
          };
        }
      });

      setTargetsForWeek(map);
    } catch (e) {
      setTargetsErr(e.message || "Could not load targets");
      setTargetsForWeek({});
    }
  };

  const loadCheckins = async (athleteId) => {
    if (!athleteId) return;
    try {
      const start = isoDate(new Date());
      const endD = new Date();
      endD.setDate(endD.getDate() + 30);
      const end = isoDate(endD);
      const rows = await apiFetch(`/checkins/${athleteId}?start=${start}&end=${end}`);
      setCheckins(Array.isArray(rows) ? rows : []);
    } catch {
      setCheckins([]);
    }
  };

  useEffect(() => {
    // restore session
    if (getToken()) {
      loadMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    loadTargetsForWeek(profile.id);
    loadCheckins(profile.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, weekOffset]);

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    setToken("");
    setProfile(null);
    setTab("dashboard");
  };

  if (!getToken() || !profile) {
    return <LoginScreen onLoggedIn={(u) => setProfile(u)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, padding: 18 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <TopBar profile={profile} tab={tab} setTab={setTab} onLogout={logout} />

        {targetsErr ? <Banner tone="warn">{targetsErr}</Banner> : null}

        {tab === "dashboard" ? (
          <Dashboard
            profile={profile}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            targetsForWeek={targetsForWeek}
            targetsForDate={targetsForDate}
            checkins={checkins}
          />
        ) : null}

        {tab === "nutrition" ? (
          <Nutrition
            profile={profile}
            selectedDateISO={selectedDateISO}
            targetsForDate={targetsForDate}
            onSaved={() => loadTargetsForWeek(profile.id)}
          />
        ) : null}

        {tab === "weight" ? <Weight profile={profile} /> : null}
        {tab === "mood" ? <Mood profile={profile} /> : null}
      </div>
    </div>
  );
}
