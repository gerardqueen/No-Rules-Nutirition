import { useState, useEffect, useRef, useCallback } from "react";

// ── Config ───────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "https://no-rules-api-production.up.railway.app";
const TK = "nrn_token";
const gt = () => localStorage.getItem(TK) || "";
const ah = (x = {}) => ({ "Content-Type": "application/json", ...(gt() ? { Authorization: `Bearer ${gt()}` } : {}), ...x });
async function api(path, opts = {}) {
  const r = await fetch(`${API}${path}`, { ...opts, headers: ah(opts.headers || {}) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d?.error || `Error ${r.status}`); e.status = r.status; throw e; }
  return d;
}

// ── Fonts ────────────────────────────────────────────────────────────────────
const fl = document.createElement("link");
fl.rel = "stylesheet";
fl.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap";
document.head.appendChild(fl);

// ── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a0a", surface: "#131313", card: "#1a1a1a", border: "#222",
  accent: "#FF9A52", accentDim: "#cc7a3a", green: "#22c55e", red: "#ef4444",
  blue: "#3b82f6", purple: "#a855f7", text: "#f2f2f2", muted: "#777",
  protein: "#f97316", carbs: "#3b82f6", fat: "#a855f7",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"];
const pad2 = n => String(n).padStart(2, "0");
const isoDate = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const today = () => isoDate(new Date());
const dayKey = ds => { const d = new Date(ds+"T00:00:00"); const w = d.getDay(); return DAYS[w===0?6:w-1]; };
const weekDates = () => {
  const t = new Date(), dow = t.getDay(), idx = dow===0?6:dow-1, out = [];
  for (let i=0;i<7;i++) { const d = new Date(t); d.setDate(d.getDate()+(i-idx)); out.push({ dk: DAYS[i], date: isoDate(d), isToday: i===idx }); }
  return out;
};
const sumFoods = foods => foods.reduce((a,f) => ({ cal: a.cal+(f.calories||0), pro: a.pro+(f.protein||0), carb: a.carb+(f.carbs||0), fat: a.fat+(f.fat||0) }), { cal:0, pro:0, carb:0, fat:0 });
const mealTotals = dayPlan => { if (!dayPlan) return { cal:0, pro:0, carb:0, fat:0 }; return sumFoods(Object.values(dayPlan).flat()); };

let goals = { calories:2000, protein:150, carbs:250, fat:70 };
let goalsByDay = {};
const goalsFor = ds => goalsByDay[dayKey(ds)] || goals;

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  font: "'Outfit', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const go = async () => {
    setErr("");
    if (!email || !pw) { setErr("Enter email and password"); return; }
    setLoading(true);
    try {
      const d = await fetch(`${API}/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ email: email.trim().toLowerCase(), password: pw }) });
      const j = await d.json().catch(()=>({}));
      if (d.ok && j.token) { localStorage.setItem(TK, j.token); onLogin(j.user, j.token); }
      else setErr(j.error || "Login failed");
    } catch { setErr("Cannot connect to server"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:S.font }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0} input::placeholder{color:${C.muted}} input{caret-color:${C.accent};outline:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>

      <div style={{ width:"100%", maxWidth:380, animation:"fadeUp .4s ease" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <svg width="100" height="100" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="98" fill="#1a1a1a" stroke={C.accent+"55"} strokeWidth="2"/>
            <circle cx="100" cy="100" r="82" fill="#fff"/>
            <circle cx="100" cy="95" r="28" fill="none" stroke="#FF9A52" strokeWidth="4"/>
            <ellipse cx="90" cy="89" rx="4" ry="5" fill="#FF9A52"/>
            <ellipse cx="110" cy="89" rx="4" ry="5" fill="#FF9A52"/>
            <path d="M 86 100 Q 100 114 114 100" fill="none" stroke="#FF9A52" strokeWidth="3.5" strokeLinecap="round"/>
            <path id="tA" d="M 30 100 A 70 70 0 0 1 170 100" fill="none"/>
            <text fontFamily="Arial Black,Impact,sans-serif" fontSize="22" fontWeight="900" fill="#1a1a1a" letterSpacing="3"><textPath href="#tA" startOffset="50%" textAnchor="middle">NO RULE</textPath></text>
            <path id="bA" d="M 30 105 A 70 70 0 0 0 170 105" fill="none"/>
            <text fontFamily="Arial Black,Impact,sans-serif" fontSize="19" fontWeight="900" fill="#1a1a1a" letterSpacing="2"><textPath href="#bA" startOffset="50%" textAnchor="middle">NUTRITION</textPath></text>
          </svg>
          <div style={{ fontFamily:S.font, fontSize:12, color:C.muted, marginTop:12, letterSpacing:3, textTransform:"uppercase" }}>Fuel Your Performance</div>
        </div>

        {/* Form */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Email" type="email"
            style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px", color:C.text, fontFamily:S.font, fontSize:16 }} />
          <input value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Password" type="password"
            style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px", color:C.text, fontFamily:S.font, fontSize:16 }} />
          {err && <div style={{ background:`${C.red}15`, border:`1px solid ${C.red}33`, borderRadius:10, padding:"10px 14px", color:C.red, fontSize:13 }}>{err}</div>}
          <button onClick={go} disabled={loading} style={{
            width:"100%", padding:"16px", background:loading?C.border:C.accent, color:loading?C.muted:C.bg,
            border:"none", borderRadius:14, fontFamily:S.font, fontSize:17, fontWeight:700, letterSpacing:1, cursor:"pointer"
          }}>{loading ? "Signing in…" : "Sign In"}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORCE PASSWORD CHANGE
// ══════════════════════════════════════════════════════════════════════════════
function ForcePwChange({ profile, onDone }) {
  const [np, setNp] = useState("");
  const [cp, setCp] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const go = async () => {
    if (np.length < 6) { setErr("Min 6 characters"); return; }
    if (np !== cp) { setErr("Passwords don't match"); return; }
    setSaving(true);
    try { await api("/auth/change-password", { method:"PUT", body:JSON.stringify({ newPassword:np }) }); onDone({ ...profile, mustChangePassword:false }); }
    catch(e) { setErr(e.message); }
    setSaving(false);
  };
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:S.font }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🔒</div>
          <div style={{ fontSize:20, fontWeight:700, color:C.text, marginBottom:6 }}>Set Your Password</div>
          <div style={{ fontSize:13, color:C.muted }}>Welcome, {profile.name}! Set your own password to continue.</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <input value={np} onChange={e=>setNp(e.target.value)} placeholder="New password" type="password"
            style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", color:C.text, fontFamily:S.font, fontSize:15 }} />
          <input value={cp} onChange={e=>setCp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Confirm password" type="password"
            style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", color:C.text, fontFamily:S.font, fontSize:15 }} />
          {np && cp && np===cp && <div style={{ color:C.green, fontSize:12 }}>✓ Passwords match</div>}
          {err && <div style={{ color:C.red, fontSize:12 }}>{err}</div>}
          <button onClick={go} disabled={saving||np.length<6||np!==cp} style={{
            width:"100%", padding:"15px", background:np.length>=6&&np===cp?C.accent:C.border, color:np.length>=6&&np===cp?C.bg:C.muted,
            border:"none", borderRadius:14, fontFamily:S.font, fontSize:16, fontWeight:700, cursor:"pointer"
          }}>{saving?"Saving…":"Set Password & Continue"}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CIRCULAR PROGRESS RING
// ══════════════════════════════════════════════════════════════════════════════
function Ring({ value, max, size=120, strokeWidth=10, color=C.accent, label, sub }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div style={{ position:"relative", width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${pct*circ} ${circ}`} strokeLinecap="round" style={{ transition:"stroke-dasharray .6s ease" }} />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontFamily:S.mono, fontSize:size*0.18, fontWeight:600, color:C.text }}>{value}</span>
        {label && <span style={{ fontFamily:S.font, fontSize:size*0.09, color:C.muted, marginTop:2 }}>{label}</span>}
        {sub && <span style={{ fontFamily:S.mono, fontSize:size*0.08, color }}>{sub}</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOME TAB
// ══════════════════════════════════════════════════════════════════════════════
function HomeTab({ profile, plan, events }) {
  const td = today();
  const tot = mealTotals(plan[td]);
  const dg = goalsFor(td);
  const firstName = profile.name?.split(" ")[0] || "Athlete";
  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";

  // Next check-in
  const nextCI = [...(events||[])].filter(e => e.date >= td && (e.type==="checkin"||(e.title||"").toLowerCase().includes("check")))
    .sort((a,b)=>a.date.localeCompare(b.date))[0];
  const ciDays = nextCI ? Math.ceil((new Date(nextCI.date+"T00:00:00") - new Date(td+"T00:00:00")) / 86400000) : null;

  // Week data
  const wd = weekDates();
  const macros = [
    { key:"cal", label:"KCAL", val:tot.cal, goal:dg.calories, color:C.accent },
    { key:"pro", label:"PROTEIN", val:tot.pro, goal:dg.protein, color:C.protein, unit:"g" },
    { key:"carb", label:"CARBS", val:tot.carb, goal:dg.carbs, color:C.carbs, unit:"g" },
    { key:"fat", label:"FAT", val:tot.fat, goal:dg.fat, color:C.fat, unit:"g" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, paddingBottom:20 }}>
      {/* Greeting */}
      <div>
        <div style={{ fontSize:14, color:C.muted, marginBottom:4 }}>{greet}</div>
        <div style={{ fontSize:26, fontWeight:700, color:C.text }}>{firstName} <span style={{ color:C.accent }}>💪</span></div>
      </div>

      {/* Main calorie ring */}
      <div style={{ background:C.card, borderRadius:20, padding:24, display:"flex", alignItems:"center", gap:24 }}>
        <Ring value={tot.cal} max={dg.calories} size={130} label="kcal" sub={`/ ${dg.calories}`} />
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
          {macros.slice(1).map(m => {
            const pct = m.goal > 0 ? Math.min(m.val/m.goal, 1) : 0;
            return (
              <div key={m.key}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:1 }}>{m.label}</span>
                  <span style={{ fontFamily:S.mono, fontSize:11, color:m.color }}>{m.val}<span style={{color:C.muted}}>/{m.goal}{m.unit}</span></span>
                </div>
                <div style={{ height:6, background:C.border, borderRadius:3 }}>
                  <div style={{ height:"100%", width:`${pct*100}%`, background:m.color, borderRadius:3, transition:"width .5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly mini bars */}
      <div style={{ background:C.card, borderRadius:20, padding:18 }}>
        <div style={{ fontSize:12, fontWeight:600, color:C.muted, letterSpacing:1, marginBottom:12 }}>THIS WEEK</div>
        <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:60 }}>
          {wd.map(({ dk, date, isToday }) => {
            const c = mealTotals(plan[date]).cal;
            const g = goalsFor(date).calories || 2000;
            const pct = g > 0 ? c/g : 0;
            const h = Math.max(Math.min(pct*100, 100), c>0?8:4);
            const col = c===0?C.border : Math.abs(pct-1)<=.1?C.green : Math.abs(pct-1)<=.2?C.accent : C.red;
            return (
              <div key={date} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ width:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-end", height:40 }}>
                  <div style={{ width:"70%", margin:"0 auto", height:`${h}%`, background:isToday?col:col+"99", borderRadius:"3px 3px 0 0", minHeight:3, border:isToday?`1.5px solid ${col}`:"none" }} />
                </div>
                <span style={{ fontSize:9, fontWeight:isToday?700:400, color:isToday?C.text:C.muted, fontFamily:S.font }}>{dk}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Check-in countdown */}
      {ciDays !== null && (
        <div style={{ background:`${C.green}12`, border:`1px solid ${C.green}33`, borderRadius:16, padding:16, display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:`${C.green}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>✅</div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:C.text }}>Next check-in in {ciDays} day{ciDays!==1?"s":""}</div>
            <div style={{ fontSize:11, color:C.muted }}>{profile.coachName || "Your Coach"} · {nextCI.date}</div>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[
          { icon:"🔥", label:"Today", val:`${tot.cal} kcal`, color:C.accent },
          { icon:"🎯", label:"Remaining", val:`${Math.max(0, dg.calories-tot.cal)} kcal`, color:C.green },
          { icon:"🥩", label:"Protein", val:`${tot.pro}g / ${dg.protein}g`, color:C.protein },
          { icon:"📅", label:"Days logged", val:`${wd.filter(({date})=>mealTotals(plan[date]).cal>0).length}/7`, color:C.blue },
        ].map(s => (
          <div key={s.label} style={{ background:C.card, borderRadius:14, padding:14, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>{s.icon}</span>
            <div>
              <div style={{ fontFamily:S.mono, fontSize:14, fontWeight:600, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:10, color:C.muted }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MEALS TAB
// ══════════════════════════════════════════════════════════════════════════════
function MealsTab({ plan, setPlan, selectedDay, setSelectedDay, profile }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [addingTo, setAddingTo] = useState(null); // meal name
  const [searching, setSearching] = useState(false);
  const timerRef = useRef(null);

  const tot = mealTotals(plan[selectedDay]);
  const dg = goalsFor(selectedDay);

  // Search OFF
  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await api(`/off/search?q=${encodeURIComponent(search.trim())}`);
        setResults(Array.isArray(r) ? r.slice(0,15) : []);
      } catch { setResults([]); }
      setSearching(false);
    }, 500);
  }, [search]);

  const addFood = (food, meal) => {
    setPlan(prev => {
      const next = { ...prev };
      if (!next[selectedDay]) { next[selectedDay] = {}; MEALS.forEach(m => next[selectedDay][m] = []); }
      next[selectedDay] = { ...next[selectedDay], [meal]: [...(next[selectedDay][meal]||[]), food] };
      return next;
    });
    setAddingTo(null);
    setSearch("");
    setResults([]);
  };

  const removeFood = (meal, idx) => {
    setPlan(prev => {
      const next = { ...prev };
      const arr = [...(next[selectedDay]?.[meal]||[])];
      arr.splice(idx, 1);
      next[selectedDay] = { ...next[selectedDay], [meal]: arr };
      return next;
    });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, paddingBottom:20 }}>
      {/* Day selector */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
        {weekDates().map(({ dk, date, isToday }) => {
          const active = date === selectedDay;
          return (
            <button key={date} onClick={() => setSelectedDay(date)} style={{
              padding:"8px 14px", borderRadius:10, border:`1px solid ${active?C.accent:C.border}`,
              background:active?`${C.accent}18`:C.surface, color:active?C.accent:C.muted,
              fontFamily:S.font, fontSize:12, fontWeight:active?700:500, cursor:"pointer", whiteSpace:"nowrap",
              position:"relative",
            }}>
              {dk}
              {isToday && <div style={{ position:"absolute", bottom:-2, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:2, background:C.accent }} />}
            </button>
          );
        })}
      </div>

      {/* Day summary */}
      <div style={{ display:"flex", gap:8 }}>
        {[
          { label:"Cal", val:tot.cal, goal:dg.calories, color:C.accent },
          { label:"Pro", val:tot.pro, goal:dg.protein, color:C.protein },
          { label:"Carb", val:tot.carb, goal:dg.carbs, color:C.carbs },
          { label:"Fat", val:tot.fat, goal:dg.fat, color:C.fat },
        ].map(m => (
          <div key={m.label} style={{ flex:1, background:C.card, borderRadius:12, padding:10, textAlign:"center" }}>
            <div style={{ fontFamily:S.mono, fontSize:14, fontWeight:600, color:m.color }}>{m.val}</div>
            <div style={{ fontSize:9, color:C.muted }}>{m.label} / {m.goal}</div>
          </div>
        ))}
      </div>

      {/* Meals */}
      {MEALS.map(meal => {
        const foods = plan[selectedDay]?.[meal] || [];
        const mTot = sumFoods(foods);
        return (
          <div key={meal} style={{ background:C.card, borderRadius:16, overflow:"hidden" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:16 }}>{meal==="Breakfast"?"🌅":meal==="Lunch"?"☀️":meal==="Dinner"?"🌙":"🍎"}</span>
                <span style={{ fontSize:14, fontWeight:600, color:C.text }}>{meal}</span>
                <span style={{ fontFamily:S.mono, fontSize:10, color:C.muted }}>{mTot.cal} kcal</span>
              </div>
              <button onClick={() => setAddingTo(addingTo===meal?null:meal)} style={{
                width:30, height:30, borderRadius:8, border:`1px solid ${addingTo===meal?C.accent:C.border}`,
                background:addingTo===meal?`${C.accent}22`:"transparent", color:addingTo===meal?C.accent:C.muted,
                fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"
              }}>{addingTo===meal?"×":"+"}</button>
            </div>

            {/* Food items */}
            {foods.length > 0 && (
              <div>
                {foods.map((f, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderBottom:`1px solid ${C.border}15` }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{f.name}</div>
                      <div style={{ fontFamily:S.mono, fontSize:9, color:C.muted }}>{f.calories}cal · {f.protein}p · {f.carbs}c · {f.fat}f</div>
                    </div>
                    <button onClick={() => removeFood(meal, i)} style={{ background:"none", border:"none", color:C.red, fontSize:14, cursor:"pointer", padding:"4px 8px" }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Search panel */}
            {addingTo === meal && (
              <div style={{ padding:12, borderTop:`1px solid ${C.border}` }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search foods..." autoFocus
                  style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", color:C.text, fontFamily:S.font, fontSize:13 }} />
                {searching && <div style={{ padding:8, fontSize:11, color:C.muted }}>Searching…</div>}
                {results.map((r, i) => (
                  <div key={i} onClick={() => addFood({ name:r.name, calories:Math.round(r.calories||0), protein:Math.round(r.protein||0), carbs:Math.round(r.carbs||0), fat:Math.round(r.fat||0), source:"off" }, meal)}
                    style={{ display:"flex", justifyContent:"space-between", padding:"10px 4px", borderBottom:`1px solid ${C.border}10`, cursor:"pointer" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.name}</div>
                      <div style={{ fontFamily:S.mono, fontSize:9, color:C.muted }}>{Math.round(r.calories||0)} kcal · {Math.round(r.protein||0)}p</div>
                    </div>
                    <span style={{ color:C.green, fontSize:18, padding:"0 4px" }}>+</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCANNER TAB
// ══════════════════════════════════════════════════════════════════════════════
function ScanTab({ plan, setPlan, selectedDay }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const scannerRef = useRef(null);
  const libLoaded = useRef(false);

  const startScan = () => { setScanning(true); setResult(null); setErr(""); };
  const stopScan = () => {
    if (scannerRef.current) { try { scannerRef.current.stop().then(()=>scannerRef.current.clear()); } catch{} scannerRef.current = null; }
    setScanning(false);
  };

  useEffect(() => {
    if (!scanning) return;
    const loadAndStart = async () => {
      if (!libLoaded.current) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js";
          s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
        });
        libLoaded.current = true;
      }
      const scanner = new window.Html5Qrcode("nrn-mobile-scanner");
      scannerRef.current = scanner;
      try {
        await scanner.start({ facingMode:"environment" }, { fps:10, qrbox:{width:250,height:120} }, async (code) => {
          stopScan();
          try {
            const r = await api(`/off/barcode/${code}`);
            if (r && r.name) setResult(r);
            else setErr("Product not found");
          } catch { setErr("Lookup failed"); }
        }, () => {});
      } catch { setErr("Camera access denied"); setScanning(false); }
    };
    loadAndStart();
    return () => stopScan();
  }, [scanning]);

  const addScanned = (meal) => {
    if (!result) return;
    const food = { name:result.name, calories:Math.round(result.calories||0), protein:Math.round(result.protein||0), carbs:Math.round(result.carbs||0), fat:Math.round(result.fat||0), source:"barcode" };
    setPlan(prev => {
      const next = { ...prev };
      if (!next[selectedDay]) { next[selectedDay] = {}; MEALS.forEach(m => next[selectedDay][m] = []); }
      next[selectedDay] = { ...next[selectedDay], [meal]: [...(next[selectedDay][meal]||[]), food] };
      return next;
    });
    setResult(null);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, alignItems:"center", paddingBottom:20 }}>
      <div style={{ fontSize:20, fontWeight:700, color:C.text }}>Barcode Scanner</div>
      <div style={{ fontSize:12, color:C.muted, textAlign:"center" }}>Scan a food barcode to instantly log nutrition info</div>

      {!scanning && !result && (
        <button onClick={startScan} style={{
          width:200, height:200, borderRadius:24, background:C.card, border:`2px dashed ${C.accent}55`,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, cursor:"pointer", marginTop:20,
        }}>
          <span style={{ fontSize:48 }}>📷</span>
          <span style={{ fontFamily:S.font, fontSize:14, fontWeight:600, color:C.accent }}>Tap to Scan</span>
        </button>
      )}

      {scanning && (
        <div style={{ width:"100%", maxWidth:350 }}>
          <div id="nrn-mobile-scanner" style={{ width:"100%", borderRadius:16, overflow:"hidden" }} />
          <button onClick={stopScan} style={{ width:"100%", marginTop:12, padding:12, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, color:C.muted, fontFamily:S.font, fontSize:13, cursor:"pointer" }}>Cancel</button>
        </div>
      )}

      {err && <div style={{ color:C.red, fontSize:13, padding:12 }}>{err}</div>}

      {result && (
        <div style={{ width:"100%", background:C.card, borderRadius:16, padding:20 }}>
          <div style={{ fontSize:16, fontWeight:600, color:C.text, marginBottom:8 }}>{result.name}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
            {[
              { label:"Cal", val:Math.round(result.calories||0), color:C.accent },
              { label:"Pro", val:Math.round(result.protein||0), color:C.protein },
              { label:"Carb", val:Math.round(result.carbs||0), color:C.carbs },
              { label:"Fat", val:Math.round(result.fat||0), color:C.fat },
            ].map(m => (
              <div key={m.label} style={{ textAlign:"center" }}>
                <div style={{ fontFamily:S.mono, fontSize:16, fontWeight:600, color:m.color }}>{m.val}</div>
                <div style={{ fontSize:9, color:C.muted }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>Add to:</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
            {MEALS.map(m => (
              <button key={m} onClick={() => addScanned(m)} style={{
                padding:12, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10,
                color:C.text, fontFamily:S.font, fontSize:13, fontWeight:500, cursor:"pointer"
              }}>{m}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INBOX TAB
// ══════════════════════════════════════════════════════════════════════════════
function InboxTab({ profile }) {
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const coachId = profile?.coachId;

  const loadThreads = async () => {
    if (!coachId) return;
    try { const r = await api(`/messages/threads/${coachId}`); if (Array.isArray(r)) setThreads(r); } catch {}
  };

  useEffect(() => { loadThreads(); const i = setInterval(loadThreads, 15000); return () => clearInterval(i); }, [coachId]);

  const openThread = async (t) => {
    setActive(t); setComposing(false);
    try { const r = await api(`/messages/thread/${coachId}/${t.threadId}`); if (Array.isArray(r)) setMsgs(r); } catch { setMsgs([]); }
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const sendReply = async () => {
    if (!input.trim() || !active || !coachId || loading) return;
    setLoading(true);
    try {
      const m = await api(`/messages/${coachId}`, { method:"POST", body:JSON.stringify({ content:input.trim(), threadId:active.threadId, subject:active.subject }) });
      setMsgs(prev => [...prev, m]); setInput("");
    } catch {}
    setLoading(false);
  };

  const sendNew = async () => {
    if (!input.trim() || !subject.trim() || !coachId || loading) return;
    setLoading(true);
    try {
      const m = await api(`/messages/${coachId}`, { method:"POST", body:JSON.stringify({ content:input.trim(), subject:subject.trim() }) });
      setInput(""); setSubject(""); setComposing(false);
      await loadThreads();
      openThread({ threadId:m.threadId, subject:m.subject || subject.trim() });
    } catch {}
    setLoading(false);
  };

  // Thread list view
  if (!active && !composing) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12, paddingBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:20, fontWeight:700, color:C.text }}>Messages</div>
          <button onClick={() => { setComposing(true); setSubject(""); setInput(""); }} style={{
            padding:"8px 16px", background:C.accent, color:C.bg, border:"none", borderRadius:10,
            fontFamily:S.font, fontSize:12, fontWeight:600, cursor:"pointer"
          }}>✉ New</button>
        </div>
        {!coachId && <div style={{ textAlign:"center", padding:40, color:C.muted, fontSize:13 }}>No coach assigned yet</div>}
        {coachId && threads.length === 0 && <div style={{ textAlign:"center", padding:40, color:C.muted, fontSize:13 }}>No messages yet — start a conversation!</div>}
        {threads.map(t => (
          <div key={t.threadId} onClick={() => openThread(t)} style={{ background:C.card, borderRadius:14, padding:14, cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <span style={{ fontSize:14, fontWeight:t.unreadCount>0?700:500, color:C.text }}>{t.subject}</span>
              {t.unreadCount > 0 && <div style={{ width:18, height:18, borderRadius:9, background:C.accent, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontFamily:S.mono, fontSize:9, color:C.bg, fontWeight:700 }}>{t.unreadCount}</span>
              </div>}
            </div>
            <div style={{ fontSize:11, color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.lastMessage}</div>
          </div>
        ))}
      </div>
    );
  }

  // Compose view
  if (composing) {
    return (
      <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 140px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <button onClick={() => setComposing(false)} style={{ background:"none", border:"none", color:C.muted, fontSize:20, cursor:"pointer" }}>←</button>
          <span style={{ fontSize:16, fontWeight:700, color:C.text }}>New Message</span>
        </div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, color:C.muted, letterSpacing:1, marginBottom:4 }}>TO</div>
          <div style={{ fontSize:14, color:C.green, fontWeight:600 }}>{profile.coachName || "Your Coach"}</div>
        </div>
        <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject" style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontFamily:S.font, fontSize:14, marginBottom:10 }} />
        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Write your message…" rows={5} style={{ width:"100%", flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontFamily:S.font, fontSize:13, resize:"none" }} />
        <button onClick={sendNew} disabled={loading||!input.trim()||!subject.trim()} style={{
          marginTop:12, padding:14, background:input.trim()&&subject.trim()?C.accent:C.border, color:input.trim()&&subject.trim()?C.bg:C.muted,
          border:"none", borderRadius:12, fontFamily:S.font, fontSize:15, fontWeight:700, cursor:"pointer"
        }}>{loading?"Sending…":"Send"}</button>
      </div>
    );
  }

  // Thread view
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 140px)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <button onClick={() => { setActive(null); loadThreads(); }} style={{ background:"none", border:"none", color:C.muted, fontSize:20, cursor:"pointer" }}>←</button>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{active?.subject}</div>
          <div style={{ fontSize:10, color:C.muted }}>with {profile.coachName || "Coach"}</div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:8, paddingBottom:10 }}>
        {msgs.map((m, i) => {
          const isMe = m.fromId === profile?.id;
          return (
            <div key={m.id||i} style={{ display:"flex", justifyContent:isMe?"flex-end":"flex-start" }}>
              <div style={{ maxWidth:"78%", padding:"10px 14px", borderRadius:16, background:isMe?C.accent:C.surface,
                color:isMe?C.bg:C.text, borderBottomRightRadius:isMe?4:16, borderBottomLeftRadius:isMe?16:4 }}>
                <div style={{ fontSize:13, lineHeight:1.5, whiteSpace:"pre-wrap" }}>{m.content}</div>
                {m.created_at && <div style={{ fontFamily:S.mono, fontSize:8, color:isMe?C.bg+"88":C.muted, marginTop:4, textAlign:"right" }}>{new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ display:"flex", gap:8, paddingTop:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendReply()} placeholder="Reply…"
          style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", color:C.text, fontFamily:S.font, fontSize:13 }} />
        <button onClick={sendReply} disabled={loading||!input.trim()} style={{
          padding:"12px 18px", background:input.trim()?C.accent:C.border, color:input.trim()?C.bg:C.muted,
          border:"none", borderRadius:12, fontFamily:S.font, fontSize:13, fontWeight:700, cursor:"pointer"
        }}>{loading?"…":"↑"}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE TAB
// ══════════════════════════════════════════════════════════════════════════════
function ProfileTab({ profile, onLogout }) {
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState("kg");
  const [saved, setSaved] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwCur, setPwCur] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwCon, setPwCon] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwOk, setPwOk] = useState(false);

  const logWeight = async () => {
    const v = parseFloat(weight);
    if (!v || v <= 0) return;
    const kg = unit === "lbs" ? v / 2.20462 : v;
    try { await api(`/weights/${profile.id}`, { method:"POST", body:JSON.stringify({ date:today(), kg:parseFloat(kg.toFixed(2)) }) }); setSaved(true); setWeight(""); setTimeout(()=>setSaved(false),2000); } catch {}
  };

  const changePw = async () => {
    setPwErr("");
    if (!pwCur) { setPwErr("Enter current password"); return; }
    if (pwNew.length < 6) { setPwErr("Min 6 characters"); return; }
    if (pwNew !== pwCon) { setPwErr("Passwords don't match"); return; }
    try { await api("/auth/change-password", { method:"PUT", body:JSON.stringify({ currentPassword:pwCur, newPassword:pwNew }) }); setPwOk(true); setTimeout(()=>{setShowPw(false);setPwOk(false);setPwCur("");setPwNew("");setPwCon("");},1500); } catch(e) { setPwErr(e.message); }
  };

  const initials = (profile.name||"").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, paddingBottom:20 }}>
      {/* Profile card */}
      <div style={{ background:C.card, borderRadius:20, padding:24, textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:"50%", background:`${C.accent}22`, border:`2px solid ${C.accent}44`, display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
          <span style={{ fontFamily:S.font, fontSize:24, fontWeight:700, color:C.accent }}>{initials}</span>
        </div>
        <div style={{ fontSize:20, fontWeight:700, color:C.text }}>{profile.name}</div>
        <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{profile.email}</div>
        {profile.sport && <div style={{ display:"inline-block", marginTop:8, padding:"4px 12px", background:`${C.accent}15`, borderRadius:8, fontSize:11, color:C.accent, fontWeight:600 }}>{profile.sport}</div>}
        {profile.coachName && <div style={{ fontSize:12, color:C.green, marginTop:8 }}>Coach: {profile.coachName}</div>}
      </div>

      {/* Log weight */}
      <div style={{ background:C.card, borderRadius:16, padding:16 }}>
        <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:12 }}>Log Weight</div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={weight} onChange={e=>setWeight(e.target.value)} placeholder={`Today's weight (${unit})`} type="number" step="0.1"
            style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontFamily:S.mono, fontSize:14 }} />
          <select value={unit} onChange={e=>setUnit(e.target.value)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 12px", color:C.text, fontFamily:S.font, fontSize:12 }}>
            <option value="kg">kg</option><option value="lbs">lbs</option>
          </select>
          <button onClick={logWeight} style={{ padding:"0 16px", background:weight?C.accent:C.border, color:weight?C.bg:C.muted, border:"none", borderRadius:10, fontFamily:S.font, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            {saved?"✓":"Log"}
          </button>
        </div>
      </div>

      {/* Change password */}
      <div style={{ background:C.card, borderRadius:16, padding:16 }}>
        <button onClick={() => setShowPw(!showPw)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:"none", border:"none", cursor:"pointer" }}>
          <span style={{ fontSize:14, fontWeight:600, color:C.text }}>🔒 Change Password</span>
          <span style={{ color:C.muted }}>{showPw?"▲":"▼"}</span>
        </button>
        {showPw && (
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:14 }}>
            {pwOk ? <div style={{ textAlign:"center", color:C.green, fontSize:14, padding:16 }}>✅ Password updated!</div> : <>
              <input value={pwCur} onChange={e=>setPwCur(e.target.value)} placeholder="Current password" type="password" style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontFamily:S.font, fontSize:13 }} />
              <input value={pwNew} onChange={e=>setPwNew(e.target.value)} placeholder="New password" type="password" style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontFamily:S.font, fontSize:13 }} />
              <input value={pwCon} onChange={e=>setPwCon(e.target.value)} placeholder="Confirm new password" type="password" style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontFamily:S.font, fontSize:13 }} />
              {pwErr && <div style={{ color:C.red, fontSize:12 }}>{pwErr}</div>}
              <button onClick={changePw} disabled={!pwCur||pwNew.length<6||pwNew!==pwCon} style={{ padding:12, background:pwCur&&pwNew.length>=6&&pwNew===pwCon?C.accent:C.border, color:pwCur&&pwNew.length>=6&&pwNew===pwCon?C.bg:C.muted, border:"none", borderRadius:10, fontFamily:S.font, fontSize:14, fontWeight:700, cursor:"pointer" }}>Update Password</button>
            </>}
          </div>
        )}
      </div>

      {/* Sign out */}
      <button onClick={onLogout} style={{ width:"100%", padding:14, background:"none", border:`1px solid ${C.red}44`, borderRadius:14, color:C.red, fontFamily:S.font, fontSize:14, fontWeight:600, cursor:"pointer" }}>
        Sign Out
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP SHELL
// ══════════════════════════════════════════════════════════════════════════════
export default function MobileApp() {
  const [token, setToken] = useState(() => gt());
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("home");
  const [plan, setPlan] = useState({});
  const [selectedDay, setSelectedDay] = useState(today());
  const [events, setEvents] = useState([]);
  const saveTimer = useRef(null);

  // Auth check
  useEffect(() => {
    if (!token) return;
    (async () => {
      try { const me = await api("/auth/me"); setProfile(me); } catch { setToken(""); setProfile(null); localStorage.removeItem(TK); }
    })();
  }, [token]);

  // Load macro goals
  useEffect(() => {
    if (!profile?.id) return;
    const load = async () => {
      try {
        const rows = await api(`/macro-plans/${profile.id}`);
        const vals = (rows||[]).filter(Boolean);
        if (!vals.length) return;
        const byDay = {};
        vals.forEach(r => { if (r.day_of_week) byDay[r.day_of_week] = { calories:Number(r.calories||0), protein:Number(r.protein_g||0), carbs:Number(r.carbs_g||0), fat:Number(r.fat_g||0) }; });
        goalsByDay = byDay;
        const sum = vals.reduce((a,r) => ({ calories:a.calories+Number(r.calories||0), protein:a.protein+Number(r.protein_g||0), carbs:a.carbs+Number(r.carbs_g||0), fat:a.fat+Number(r.fat_g||0) }), { calories:0, protein:0, carbs:0, fat:0 });
        const n = Math.max(1, vals.length);
        goals = { calories:Math.round(sum.calories/n), protein:Math.round(sum.protein/n), carbs:Math.round(sum.carbs/n), fat:Math.round(sum.fat/n) };
      } catch {}
    };
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, [profile?.id]);

  // Load food logs
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const wd = weekDates();
        const start = wd[0].date, end = wd[6].date;
        const rows = await api(`/food-logs/${profile.id}?start=${start}&end=${end}`);
        if (!Array.isArray(rows)) return;
        const p = {};
        wd.forEach(({ date }) => { p[date] = {}; MEALS.forEach(m => p[date][m] = []); });
        rows.forEach(r => {
          if (!p[r.date]) { p[r.date] = {}; MEALS.forEach(m => p[r.date][m] = []); }
          (r.foods||[]).forEach(f => {
            const meal = MEALS.includes(f.meal) ? f.meal : "Snack";
            p[r.date][meal].push({ name:f.name, calories:Number(f.calories||0), protein:Number(f.protein_g??f.protein??0), carbs:Number(f.carbs_g??f.carbs??0), fat:Number(f.fat_g??f.fat??0), source:f.source||"manual" });
          });
        });
        setPlan(p);
      } catch {}
    })();
  }, [profile?.id]);

  // Load events
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const rows = await api(`/calendar-events/${profile.id}`);
        if (Array.isArray(rows)) setEvents(rows.map(ev => {
          const n = ev.notes||""; const m = n.match(/^\[type:(\w+)\]/);
          return { ...ev, type:m?m[1]:"reminder", notes:m?n.replace(/^\[type:\w+\]/,""):n };
        }));
      } catch {}
    })();
  }, [profile?.id]);

  // Auto-save food logs
  useEffect(() => {
    if (!profile?.id) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      let has = false;
      Object.keys(plan).forEach(ds => { const dp = plan[ds]; if (dp) MEALS.forEach(m => { if ((dp[m]||[]).length > 0) has = true; }); });
      if (!has) return;
      Object.keys(plan).forEach(ds => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) return;
        const dp = plan[ds]; if (!dp) return;
        const foods = [];
        MEALS.forEach(meal => (dp[meal]||[]).forEach(f => foods.push({ name:f.name||"", calories:Math.round(f.calories||0), protein_g:Math.round(f.protein||0), carbs_g:Math.round(f.carbs||0), fat_g:Math.round(f.fat||0), meal, source:f.source||"manual" })));
        if (foods.length === 0) return;
        api(`/food-logs/${profile.id}`, { method:"PUT", body:JSON.stringify({ date:ds, foods }) }).catch(() => {});
      });
    }, 2000);
    return () => clearTimeout(saveTimer.current);
  }, [plan, profile?.id]);

  // Logout
  const logout = () => { localStorage.removeItem(TK); setToken(""); setProfile(null); setPlan({}); setTab("home"); };

  // Not logged in
  if (!token || !profile) return <Login onLogin={(u,t) => { setToken(t); setProfile(u); }} />;

  // Force password change
  if (profile.mustChangePassword) return <ForcePwChange profile={profile} onDone={p => setProfile(p)} />;

  const tabs = [
    { id:"home", icon:"🏠", label:"Home" },
    { id:"meals", icon:"🍽️", label:"Meals" },
    { id:"scan", icon:"📷", label:"Scan" },
    { id:"inbox", icon:"💬", label:"Inbox" },
    { id:"profile", icon:"👤", label:"Profile" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:S.font, color:C.text, display:"flex", flexDirection:"column" }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{display:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>

      {/* Content */}
      <div style={{ flex:1, padding:"16px 16px 90px", overflowY:"auto", animation:"fadeUp .25s ease" }}>
        {tab === "home" && <HomeTab profile={profile} plan={plan} events={events} />}
        {tab === "meals" && <MealsTab plan={plan} setPlan={setPlan} selectedDay={selectedDay} setSelectedDay={setSelectedDay} profile={profile} />}
        {tab === "scan" && <ScanTab plan={plan} setPlan={setPlan} selectedDay={selectedDay} />}
        {tab === "inbox" && <InboxTab profile={profile} />}
        {tab === "profile" && <ProfileTab profile={profile} onLogout={logout} />}
      </div>

      {/* Bottom tab bar */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0,
        background:C.bg + "f5", backdropFilter:"blur(16px)",
        borderTop:`1px solid ${C.border}`,
        display:"flex", padding:"8px 0 env(safe-area-inset-bottom, 8px)",
        zIndex:100,
      }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2,
              background:"none", border:"none", cursor:"pointer", padding:"6px 0",
            }}>
              <span style={{ fontSize:22, filter:active?"none":"grayscale(1)", opacity:active?1:.5 }}>{t.icon}</span>
              <span style={{ fontSize:9, fontWeight:active?700:400, color:active?C.accent:C.muted, letterSpacing:.5 }}>{t.label}</span>
              {active && <div style={{ width:4, height:4, borderRadius:2, background:C.accent, marginTop:1 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
