import { useState, useEffect, useRef } from "react";

// ── Google Fonts ──────────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap";
document.head.appendChild(fontLink);

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg: "#0a0a0a",
  surface: "#111111",
  card: "#161616",
  border: "#1f1f1f",
  accent: "#ddd840",       // lighter, less lime — warmer golden yellow
  accentDim: "#9a9820",
  text: "#f0f0f0",
  muted: "#666",
  protein: "#f97316",
  carbs: "#3b82f6",
  fat: "#a855f7",
  calories: "#ddd840",
  mfp: "#0084ff",
  coachGreen: "#22c55e",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const DAYS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
const MEALS = ["Breakfast","Lunch","Dinner","Snack"];
const macroGoals = { calories: 3200, protein: 200, carbs: 380, fat: 90 };

const sampleFoods = [
  { name: "Chicken Breast 200g", calories: 330, protein: 62, carbs: 0, fat: 7 },
  { name: "Brown Rice 150g", calories: 195, protein: 4, carbs: 41, fat: 2 },
  { name: "Whole Eggs x3", calories: 210, protein: 18, carbs: 2, fat: 15 },
  { name: "Greek Yogurt 200g", calories: 140, protein: 20, carbs: 8, fat: 2 },
  { name: "Banana", calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: "Oats 80g", calories: 300, protein: 11, carbs: 54, fat: 5 },
  { name: "Almonds 30g", calories: 170, protein: 6, carbs: 6, fat: 15 },
  { name: "Salmon 180g", calories: 374, protein: 40, carbs: 0, fat: 22 },
  { name: "Sweet Potato 200g", calories: 172, protein: 4, carbs: 40, fat: 0 },
  { name: "Whey Protein Shake", calories: 150, protein: 30, carbs: 5, fat: 2 },
];

const initWeekPlan = () => {
  const plan = {};
  DAYS.forEach(d => { plan[d] = {}; MEALS.forEach(m => { plan[d][m] = []; }); });
  plan["MON"]["Breakfast"] = [sampleFoods[5], sampleFoods[2]];
  plan["MON"]["Lunch"] = [sampleFoods[0], sampleFoods[1]];
  plan["MON"]["Dinner"] = [sampleFoods[7], sampleFoods[8]];
  plan["TUE"]["Breakfast"] = [sampleFoods[3], sampleFoods[4]];
  plan["TUE"]["Lunch"] = [sampleFoods[0], sampleFoods[1], sampleFoods[6]];
  plan["TUE"]["Snack"] = [sampleFoods[9]];
  return plan;
};

const sumMacros = (foods) => foods.reduce(
  (acc, f) => ({ calories: acc.calories+f.calories, protein: acc.protein+f.protein, carbs: acc.carbs+f.carbs, fat: acc.fat+f.fat }),
  { calories: 0, protein: 0, carbs: 0, fat: 0 }
);

const dayTotals = (dayPlan) => {
  const all = Object.values(dayPlan).flat();
  return sumMacros(all);
};

// ── MacroRing ─────────────────────────────────────────────────────────────────
function MacroRing({ value, goal, color, label, size = 80 }) {
  const pct = Math.min(value / goal, 1);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={6}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition:"stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)" }}/>
      </svg>
      <div style={{ textAlign:"center", marginTop:-size/2-8 }}>
        <div style={{ fontFamily:"JetBrains Mono", fontSize:size>70?18:13, fontWeight:600, color }}>{value}</div>
        <div style={{ fontFamily:"DM Sans", fontSize:10, color:T.muted, letterSpacing:1 }}>{label}</div>
      </div>
      <div style={{ height: size/2 }}/>
    </div>
  );
}

// ── MacroBar ──────────────────────────────────────────────────────────────────
function MacroBar({ label, value, goal, color }) {
  const pct = Math.min((value/goal)*100, 100);
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ fontFamily:"DM Sans", fontSize:12, color:T.muted, letterSpacing:1, textTransform:"uppercase" }}>{label}</span>
        <span style={{ fontFamily:"JetBrains Mono", fontSize:12, color }}>{value}<span style={{ color:T.muted }}>/{goal}g</span></span>
      </div>
      <div style={{ height:5, background:T.border, borderRadius:99 }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99, transition:"width 0.5s ease" }}/>
      </div>
    </div>
  );
}

// ── Coach Messaging Panel ─────────────────────────────────────────────────────
function CoachPanel({ plan, selectedDay, profile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [coachOnline] = useState(true);
  const bottomRef = useRef(null);

  const todayTotals = dayTotals(plan[selectedDay]);
  const proteinPct = Math.round((todayTotals.protein / macroGoals.protein) * 100);
  const carbsPct = Math.round((todayTotals.carbs / macroGoals.carbs) * 100);
  const fatPct = Math.round((todayTotals.fat / macroGoals.fat) * 100);
  const calPct = Math.round((todayTotals.calories / macroGoals.calories) * 100);

  const coachSystemPrompt = `You are Sarah Mitchell, a professional nutrition coach and personal trainer. You are having a direct 1-on-1 conversation with your client ${profile.name}, a ${profile.sport} athlete. You can see their real-time macro data for ${selectedDay}:

Current intake today (${selectedDay}):
- Calories: ${todayTotals.calories} / ${macroGoals.calories} kcal (${calPct}%)
- Protein: ${todayTotals.protein}g / ${macroGoals.protein}g (${proteinPct}%)
- Carbs: ${todayTotals.carbs}g / ${macroGoals.carbs}g (${carbsPct}%)
- Fat: ${todayTotals.fat}g / ${macroGoals.fat}g (${fatPct}%)

Client profile: ${JSON.stringify(profile)}
Weekly goals: ${JSON.stringify(macroGoals)}

You are warm, encouraging, professional, and data-driven. Reference their actual macro numbers when relevant. Keep messages concise and conversational — like a real coach text message. Give specific, actionable advice based on what you can see in their data. Sign off as "Sarah" occasionally.`;

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Hey ${profile.name.split(" ")[0]}! 👋 I can see your macros for ${selectedDay} — you're at ${calPct}% of your calorie goal so far. Looking good! How are you feeling today? Any questions about your nutrition plan?`,
        time: new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }),
        isCoach: true
      }]);
    }
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role:"user", content: input.trim(), time: new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }), isCoach: false };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:400,
          system: coachSystemPrompt,
          messages: newMsgs.map(m => ({ role:m.role, content:m.content }))
        })
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text||"").join("") || "Sorry, I missed that. Try again?";
      setMessages(prev => [...prev, {
        role:"assistant", content: reply,
        time: new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }),
        isCoach: true
      }]);
    } catch {
      setMessages(prev => [...prev, { role:"assistant", content:"Connection issue. Try again in a moment.", time:"--:--", isCoach: true }]);
    }
    setLoading(false);
  };

  const quickMessages = [
    "How are my macros looking?",
    "What should I eat for dinner?",
    "Can we adjust my protein target?",
    "I'm struggling to hit calories today",
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", gap:0 }}>

      {/* Coach header */}
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"16px 16px 0 0",
        padding:"16px 20px", display:"flex", alignItems:"center", gap:14, marginBottom:0 }}>
        <div style={{ position:"relative" }}>
          <div style={{ width:46, height:46, borderRadius:"50%", background:`linear-gradient(135deg, ${T.coachGreen}, #16a34a)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"Bebas Neue", fontSize:20, color:"#fff", letterSpacing:1 }}>SM</div>
          {coachOnline && (
            <div style={{ position:"absolute", bottom:1, right:1, width:12, height:12,
              background:T.coachGreen, borderRadius:"50%", border:`2px solid ${T.card}` }}/>
          )}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"DM Sans", fontSize:14, fontWeight:600, color:T.text }}>Sarah Mitchell</div>
          <div style={{ fontFamily:"DM Sans", fontSize:11, color: coachOnline ? T.coachGreen : T.muted }}>
            {coachOnline ? "● Online · Monitoring your macros" : "● Away"}
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"DM Sans", fontSize:10, color:T.muted, letterSpacing:0.5, marginBottom:4 }}>
            TODAY'S PROGRESS
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {[
              { label:"CAL", pct:calPct, color:T.accent },
              { label:"PRO", pct:proteinPct, color:T.protein },
              { label:"CARB", pct:carbsPct, color:T.carbs },
              { label:"FAT", pct:fatPct, color:T.fat },
            ].map(m => (
              <div key={m.label} style={{ textAlign:"center", minWidth:36 }}>
                <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:m.color, fontWeight:600 }}>{m.pct}%</div>
                <div style={{ fontFamily:"DM Sans", fontSize:9, color:T.muted }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Macro snapshot bar */}
      <div style={{ background:`${T.card}cc`, borderLeft:`1px solid ${T.border}`, borderRight:`1px solid ${T.border}`,
        padding:"10px 20px", display:"flex", gap:12, alignItems:"center" }}>
        <span style={{ fontFamily:"DM Sans", fontSize:10, color:T.muted, letterSpacing:1, textTransform:"uppercase", whiteSpace:"nowrap" }}>
          Coach can see:
        </span>
        {[
          { label:"Calories", val:todayTotals.calories, goal:macroGoals.calories, unit:"kcal", color:T.accent },
          { label:"Protein", val:todayTotals.protein, goal:macroGoals.protein, unit:"g", color:T.protein },
          { label:"Carbs", val:todayTotals.carbs, goal:macroGoals.carbs, unit:"g", color:T.carbs },
          { label:"Fat", val:todayTotals.fat, goal:macroGoals.fat, unit:"g", color:T.fat },
        ].map(m => (
          <div key={m.label} style={{ flex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ fontFamily:"DM Sans", fontSize:10, color:T.muted }}>{m.label}</span>
              <span style={{ fontFamily:"JetBrains Mono", fontSize:10, color:m.color }}>{m.val}<span style={{ color:T.muted, fontSize:9 }}>/{m.goal}{m.unit}</span></span>
            </div>
            <div style={{ height:3, background:T.border, borderRadius:99 }}>
              <div style={{ height:"100%", width:`${Math.min((m.val/m.goal)*100,100)}%`, background:m.color, borderRadius:99 }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:10,
        padding:"16px 20px", minHeight:0, background:T.surface,
        borderLeft:`1px solid ${T.border}`, borderRight:`1px solid ${T.border}` }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:"flex", flexDirection:"column",
            alignItems: m.isCoach ? "flex-start" : "flex-end" }}>
            {m.isCoach && (
              <span style={{ fontFamily:"DM Sans", fontSize:10, color:T.muted, marginBottom:4, marginLeft:4 }}>Sarah</span>
            )}
            <div style={{
              maxWidth:"78%", padding:"11px 15px",
              borderRadius: m.isCoach ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
              background: m.isCoach ? T.card : T.accent,
              color: m.isCoach ? T.text : T.bg,
              fontFamily:"DM Sans", fontSize:13, lineHeight:1.6,
              border: m.isCoach ? `1px solid ${T.border}` : "none",
              whiteSpace:"pre-wrap"
            }}>
              {m.content}
            </div>
            <span style={{ fontFamily:"JetBrains Mono", fontSize:9, color:T.muted, marginTop:3,
              marginLeft: m.isCoach ? 4 : 0, marginRight: m.isCoach ? 0 : 4 }}>
              {m.time}
            </span>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start" }}>
            <span style={{ fontFamily:"DM Sans", fontSize:10, color:T.muted, marginBottom:4, marginLeft:4 }}>Sarah is typing…</span>
            <div style={{ display:"flex", gap:5, padding:"11px 15px", background:T.card,
              borderRadius:"4px 16px 16px 16px", border:`1px solid ${T.border}`, width:"fit-content" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:6, height:6, background:T.coachGreen, borderRadius:"50%",
                  animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Quick messages */}
      <div style={{ background:T.surface, borderLeft:`1px solid ${T.border}`, borderRight:`1px solid ${T.border}`,
        padding:"8px 20px", display:"flex", gap:8, flexWrap:"wrap" }}>
        {quickMessages.map(q => (
          <button key={q} onClick={() => setInput(q)}
            style={{ background:T.border, border:`1px solid ${T.border}`, color:T.muted,
              padding:"5px 10px", borderRadius:16, fontFamily:"DM Sans", fontSize:11,
              cursor:"pointer", transition:"all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=T.coachGreen; e.currentTarget.style.color=T.coachGreen; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.muted; }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display:"flex", gap:10, alignItems:"center", padding:"12px 20px",
        background:T.card, border:`1px solid ${T.border}`, borderRadius:"0 0 16px 16px" }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Message your coach..."
          style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
            padding:"12px 16px", color:T.text, fontFamily:"DM Sans", fontSize:13, outline:"none" }}/>
        <button onClick={send} disabled={loading||!input.trim()}
          style={{ background: input.trim()&&!loading ? T.coachGreen : T.border,
            color: input.trim()&&!loading ? "#fff" : T.muted,
            border:"none", borderRadius:12, padding:"12px 18px", fontFamily:"Bebas Neue",
            fontSize:16, letterSpacing:1, cursor: input.trim()&&!loading?"pointer":"default", transition:"all 0.2s" }}>
          SEND
        </button>
      </div>
    </div>
  );
}

// ── MyFitnessPal Sync Panel ───────────────────────────────────────────────────
function MFPPanel({ plan, selectedDay }) {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [mfpData, setMfpData] = useState(null);

  const todayTotals = dayTotals(plan[selectedDay]);

  const mockMFPData = {
    date: selectedDay,
    calories: Math.round(todayTotals.calories * 0.93),
    protein: Math.round(todayTotals.protein * 0.88),
    carbs: Math.round(todayTotals.carbs * 0.97),
    fat: Math.round(todayTotals.fat * 0.91),
    fibre: 28,
    water: 2400,
    meals: [
      { name:"Breakfast", calories: 510, logged: true },
      { name:"Morning Snack", calories: 170, logged: true },
      { name:"Lunch", calories: 720, logged: true },
      { name:"Afternoon Snack", calories: 150, logged: false },
      { name:"Dinner", calories: 890, logged: false },
    ],
    exerciseCalories: 420,
    netCalories: Math.round(todayTotals.calories * 0.93) - 420,
    weekAdherence: [88, 94, 76, 100, 82, 91, 78],
  };

  const handleConnect = () => {
    setSyncing(true);
    setTimeout(() => {
      setConnected(true);
      setSyncing(false);
      setLastSync(new Date());
      setMfpData(mockMFPData);
    }, 2200);
  };

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSync(new Date());
      setMfpData({ ...mockMFPData, calories: mockMFPData.calories + 45 });
    }, 1500);
  };

  const adherenceColor = (pct) => pct >= 90 ? T.coachGreen : pct >= 70 ? T.accent : "#ef4444";

  if (!connected) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        height:"100%", gap:32, padding:40 }}>
        {/* MFP Logo area */}
        <div style={{ textAlign:"center" }}>
          <div style={{ width:80, height:80, borderRadius:20, background:`linear-gradient(135deg, ${T.mfp}, #0066cc)`,
            display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px",
            boxShadow:`0 0 40px ${T.mfp}44` }}>
            <span style={{ fontFamily:"Bebas Neue", fontSize:32, color:"#fff", letterSpacing:2 }}>MFP</span>
          </div>
          <div style={{ fontFamily:"Bebas Neue", fontSize:28, letterSpacing:2, color:T.text }}>
            MYFITNESSPAL SYNC
          </div>
          <div style={{ fontFamily:"DM Sans", fontSize:13, color:T.muted, marginTop:8, maxWidth:380, lineHeight:1.6 }}>
            Connect your MyFitnessPal account to automatically import your daily food logs, macro data, and water intake. Your coach can also monitor your adherence in real time.
          </div>
        </div>

        {/* Feature list */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, width:"100%", maxWidth:480 }}>
          {[
            { icon:"📊", label:"Daily macro import", desc:"Calories, protein, carbs, fat" },
            { icon:"🔄", label:"Auto-sync every 30 min", desc:"Background refresh" },
            { icon:"🍽️", label:"Meal-level breakdown", desc:"Breakfast through dinner" },
            { icon:"💧", label:"Water & fibre tracking", desc:"Full nutritional picture" },
            { icon:"🏃", label:"Exercise calories", desc:"MFP workout logging" },
            { icon:"📈", label:"7-day adherence chart", desc:"Visible to your coach" },
          ].map(f => (
            <div key={f.label} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:"14px 16px" }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{f.icon}</div>
              <div style={{ fontFamily:"DM Sans", fontSize:12, fontWeight:600, color:T.text }}>{f.label}</div>
              <div style={{ fontFamily:"DM Sans", fontSize:11, color:T.muted, marginTop:2 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <button onClick={handleConnect} disabled={syncing}
          style={{ background: syncing ? T.border : `linear-gradient(135deg, ${T.mfp}, #0066cc)`,
            color:"#fff", border:"none", borderRadius:14, padding:"16px 48px",
            fontFamily:"Bebas Neue", fontSize:20, letterSpacing:2, cursor: syncing?"default":"pointer",
            transition:"all 0.3s", boxShadow: syncing ? "none" : `0 0 30px ${T.mfp}55` }}>
          {syncing ? "CONNECTING…" : "CONNECT MYFITNESSPAL"}
        </button>
        <div style={{ fontFamily:"DM Sans", fontSize:11, color:T.muted, textAlign:"center" }}>
          Uses OAuth 2.0 — we never store your MFP password.<br/>Read-only access to your food diary.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Status bar */}
      <div style={{ background:T.card, border:`1px solid ${T.coachGreen}44`, borderRadius:14,
        padding:"14px 20px", display:"flex", alignItems:"center", gap:16 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:`linear-gradient(135deg, ${T.mfp}, #0066cc)`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"Bebas Neue", fontSize:16, color:"#fff" }}>MFP</div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:T.coachGreen }}/>
            <span style={{ fontFamily:"DM Sans", fontSize:13, fontWeight:600, color:T.text }}>Connected · alex.morgan@mfp</span>
          </div>
          <div style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.muted, marginTop:2 }}>
            Last synced: {lastSync?.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })} · Next auto-sync in ~28 min
          </div>
        </div>
        <button onClick={handleSync} disabled={syncing}
          style={{ background: syncing ? T.border : T.surface, border:`1px solid ${T.border}`,
            color: syncing ? T.muted : T.accent, borderRadius:10, padding:"8px 18px",
            fontFamily:"Bebas Neue", fontSize:13, letterSpacing:1, cursor: syncing?"default":"pointer", transition:"all 0.2s" }}>
          {syncing ? "SYNCING…" : "↻ SYNC NOW"}
        </button>
        <button onClick={() => { setConnected(false); setMfpData(null); }}
          style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted, borderRadius:10,
            padding:"8px 14px", fontFamily:"DM Sans", fontSize:11, cursor:"pointer" }}>
          Disconnect
        </button>
      </div>

      {/* Today's MFP data vs goals */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

        {/* MFP macros */}
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:20 }}>
          <div style={{ fontFamily:"Bebas Neue", fontSize:16, letterSpacing:2, color:T.muted, marginBottom:16 }}>
            MFP LOGGED — {selectedDay}
          </div>
          {[
            { label:"Calories", mfp:mfpData.calories, goal:macroGoals.calories, unit:"kcal", color:T.accent },
            { label:"Protein", mfp:mfpData.protein, goal:macroGoals.protein, unit:"g", color:T.protein },
            { label:"Carbs", mfp:mfpData.carbs, goal:macroGoals.carbs, unit:"g", color:T.carbs },
            { label:"Fat", mfp:mfpData.fat, goal:macroGoals.fat, unit:"g", color:T.fat },
          ].map(m => {
            const pct = Math.min((m.mfp/m.goal)*100,100);
            const diff = m.mfp - m.goal;
            return (
              <div key={m.label} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontFamily:"DM Sans", fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:1 }}>{m.label}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontFamily:"JetBrains Mono", fontSize:11, color:m.color }}>{m.mfp}{m.unit!=="kcal"?"g":""}</span>
                    <span style={{ fontFamily:"JetBrains Mono", fontSize:10,
                      color: diff > 0 ? "#ef4444" : T.coachGreen }}>
                      {diff > 0 ? `+${diff}` : diff}{m.unit!=="kcal"?"g":""}
                    </span>
                  </div>
                </div>
                <div style={{ height:5, background:T.border, borderRadius:99, position:"relative" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:m.color, borderRadius:99, transition:"width 0.5s" }}/>
                  <div style={{ position:"absolute", top:-3, left:"100%", transform:"translateX(-50%)",
                    width:2, height:11, background:T.muted+"88", borderRadius:1 }}/>
                </div>
                <div style={{ fontFamily:"DM Sans", fontSize:9, color:T.muted, marginTop:2, textAlign:"right" }}>
                  Goal: {m.goal}{m.unit!=="kcal"?"g":` ${m.unit}`}
                </div>
              </div>
            );
          })}
          <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:12, marginTop:4, display:"flex", justifyContent:"space-between" }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"JetBrains Mono", fontSize:13, color:T.coachGreen }}>{mfpData.fibre}g</div>
              <div style={{ fontFamily:"DM Sans", fontSize:10, color:T.muted }}>Fibre</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"JetBrains Mono", fontSize:13, color:T.mfp }}>{mfpData.water}ml</div>
              <div style={{ fontFamily:"DM Sans", fontSize:10, color:T.muted }}>Water</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"JetBrains Mono", fontSize:13, color:T.protein }}>{mfpData.exerciseCalories}</div>
              <div style={{ fontFamily:"DM Sans", fontSize:10, color:T.muted }}>Exercise kcal</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"JetBrains Mono", fontSize:13, color:T.accent }}>{mfpData.netCalories}</div>
              <div style={{ fontFamily:"DM Sans", fontSize:10, color:T.muted }}>Net kcal</div>
            </div>
          </div>
        </div>

        {/* Meal log + weekly adherence */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {/* Meal breakdown */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:20 }}>
            <div style={{ fontFamily:"Bebas Neue", fontSize:16, letterSpacing:2, color:T.muted, marginBottom:14 }}>
              MEAL LOG
            </div>
            {mfpData.meals.map(meal => (
              <div key={meal.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%",
                    background: meal.logged ? T.coachGreen : T.border }}/>
                  <span style={{ fontFamily:"DM Sans", fontSize:12, color: meal.logged ? T.text : T.muted }}>{meal.name}</span>
                </div>
                <span style={{ fontFamily:"JetBrains Mono", fontSize:11,
                  color: meal.logged ? T.accent : T.muted }}>
                  {meal.logged ? `${meal.calories} kcal` : "not logged"}
                </span>
              </div>
            ))}
          </div>

          {/* 7-day adherence */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:20 }}>
            <div style={{ fontFamily:"Bebas Neue", fontSize:16, letterSpacing:2, color:T.muted, marginBottom:14 }}>
              7-DAY ADHERENCE
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"flex-end", height:70 }}>
              {DAYS.map((d, i) => {
                const pct = mfpData.weekAdherence[i];
                return (
                  <div key={d} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                    <div style={{ fontFamily:"JetBrains Mono", fontSize:8, color:adherenceColor(pct) }}>{pct}%</div>
                    <div style={{ width:"100%", height:`${pct*0.55}px`,
                      background: adherenceColor(pct), borderRadius:"3px 3px 0 0", minHeight:3, transition:"height 0.5s" }}/>
                    <div style={{ fontFamily:"Bebas Neue", fontSize:10, color:T.muted }}>{d}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:16, marginTop:12, justifyContent:"center" }}>
              {[
                { color:T.coachGreen, label:"≥90% on target" },
                { color:T.accent, label:"70–89% close" },
                { color:"#ef4444", label:"<70% off track" },
              ].map(l => (
                <div key={l.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:l.color }}/>
                  <span style={{ fontFamily:"DM Sans", fontSize:10, color:T.muted }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Import to planner banner */}
      <div style={{ background:`linear-gradient(135deg, ${T.mfp}18, ${T.mfp}08)`,
        border:`1px solid ${T.mfp}44`, borderRadius:14, padding:"16px 20px",
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:20 }}>
        <div>
          <div style={{ fontFamily:"DM Sans", fontSize:13, fontWeight:600, color:T.text }}>
            Import MFP data into your Week Plan?
          </div>
          <div style={{ fontFamily:"DM Sans", fontSize:11, color:T.muted, marginTop:3 }}>
            Today's logged meals will be added to {selectedDay}'s meal plan for accurate tracking.
          </div>
        </div>
        <button style={{ background:T.mfp, color:"#fff", border:"none", borderRadius:10,
          padding:"10px 22px", fontFamily:"Bebas Neue", fontSize:14, letterSpacing:1, cursor:"pointer",
          whiteSpace:"nowrap", flexShrink:0 }}>
          IMPORT TODAY
        </button>
      </div>
    </div>
  );
}

// ── Weekly Planner ────────────────────────────────────────────────────────────
function WeeklyPlanner({ plan, setPlan, selectedDay, setSelectedDay }) {
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [showFoodPicker, setShowFoodPicker] = useState(false);

  const addFood = (food) => {
    setPlan(prev => {
      const next = { ...prev };
      next[selectedDay] = { ...next[selectedDay] };
      next[selectedDay][selectedMeal] = [...next[selectedDay][selectedMeal], food];
      return next;
    });
    setShowFoodPicker(false);
  };

  const removeFood = (day, meal, idx) => {
    setPlan(prev => {
      const next = { ...prev };
      next[day] = { ...next[day] };
      next[day][meal] = next[day][meal].filter((_,i)=>i!==idx);
      return next;
    });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", gap:8 }}>
        {DAYS.map(d => {
          const tot = dayTotals(plan[d]);
          const pct = Math.min(tot.calories / macroGoals.calories, 1);
          return (
            <button key={d} onClick={() => setSelectedDay(d)}
              style={{ flex:1, padding:"12px 4px", borderRadius:10,
                background: selectedDay===d ? T.accent : T.card,
                border:`1px solid ${selectedDay===d ? T.accent : T.border}`,
                cursor:"pointer", transition:"all 0.2s", textAlign:"center" }}>
              <div style={{ fontFamily:"Bebas Neue", fontSize:15, letterSpacing:1,
                color: selectedDay===d ? T.bg : T.muted }}>{d}</div>
              <div style={{ height:2, background: selectedDay===d ? T.bg+"44" : T.border, borderRadius:99, margin:"6px 4px 4px",
                position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${pct*100}%`,
                  background: selectedDay===d ? T.bg : T.accent, borderRadius:99 }}/>
              </div>
              <div style={{ fontFamily:"JetBrains Mono", fontSize:10,
                color: selectedDay===d ? T.bg+"cc" : T.muted }}>{tot.calories} kcal</div>
            </button>
          );
        })}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
        {MEALS.map(meal => {
          const foods = plan[selectedDay][meal];
          const tot = sumMacros(foods);
          return (
            <div key={meal} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <span style={{ fontFamily:"Bebas Neue", fontSize:20, letterSpacing:1, color:T.text }}>{meal}</span>
                <span style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.accent }}>{tot.calories} kcal</span>
              </div>
              {foods.map((f, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"8px 10px", background:T.surface, borderRadius:8, marginBottom:6 }}>
                  <div>
                    <div style={{ fontFamily:"DM Sans", fontSize:12, color:T.text, fontWeight:500 }}>{f.name}</div>
                    <div style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.muted, marginTop:2 }}>
                      P:{f.protein}g · C:{f.carbs}g · F:{f.fat}g
                    </div>
                  </div>
                  <button onClick={() => removeFood(selectedDay, meal, i)}
                    style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:16, padding:"0 4px", lineHeight:1 }}
                    onMouseEnter={e=>e.target.style.color="#ef4444"}
                    onMouseLeave={e=>e.target.style.color=T.muted}>×</button>
                </div>
              ))}
              <button onClick={() => { setSelectedMeal(meal); setShowFoodPicker(true); }}
                style={{ width:"100%", padding:"8px", background:"none", border:`1px dashed ${T.border}`,
                  borderRadius:8, color:T.muted, fontFamily:"DM Sans", fontSize:12, cursor:"pointer", transition:"all 0.2s", marginTop:4 }}
                onMouseEnter={e=>{ e.target.style.borderColor=T.accent; e.target.style.color=T.accent; }}
                onMouseLeave={e=>{ e.target.style.borderColor=T.border; e.target.style.color=T.muted; }}>
                + Add Food
              </button>
            </div>
          );
        })}
      </div>

      {showFoodPicker && (
        <div style={{ position:"fixed", inset:0, background:"#000000cc", zIndex:100,
          display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setShowFoodPicker(false)}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20,
            padding:24, width:400, maxHeight:"70vh", overflowY:"auto" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontFamily:"Bebas Neue", fontSize:28, letterSpacing:2, color:T.text, marginBottom:16 }}>
              ADD TO {selectedMeal?.toUpperCase()}
            </div>
            {sampleFoods.map((f, i) => (
              <button key={i} onClick={() => addFood(f)}
                style={{ width:"100%", textAlign:"left", padding:"12px 14px", background:T.card,
                  border:`1px solid ${T.border}`, borderRadius:10, marginBottom:8, cursor:"pointer", transition:"all 0.2s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:"DM Sans", fontSize:13, color:T.text, fontWeight:500 }}>{f.name}</span>
                  <span style={{ fontFamily:"JetBrains Mono", fontSize:12, color:T.accent }}>{f.calories} kcal</span>
                </div>
                <div style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.muted, marginTop:4 }}>
                  P:{f.protein}g · C:{f.carbs}g · F:{f.fat}g
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Macro Tracker ─────────────────────────────────────────────────────────────
function MacroTracker({ plan, selectedDay }) {
  const tot = dayTotals(plan[selectedDay]);
  const remaining = {
    calories: macroGoals.calories - tot.calories,
    protein: macroGoals.protein - tot.protein,
    carbs: macroGoals.carbs - tot.carbs,
    fat: macroGoals.fat - tot.fat,
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:20, padding:30,
        display:"flex", alignItems:"center", gap:40, flexWrap:"wrap" }}>
        <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <MacroRing value={tot.calories} goal={macroGoals.calories} color={T.accent} label="KCAL" size={130}/>
          <div style={{ position:"absolute", textAlign:"center", marginTop:-4 }}>
            <div style={{ fontFamily:"Bebas Neue", fontSize:36, color:T.accent, lineHeight:1 }}>{tot.calories}</div>
            <div style={{ fontFamily:"DM Sans", fontSize:10, color:T.muted, letterSpacing:2 }}>CALORIES</div>
          </div>
        </div>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ fontFamily:"Bebas Neue", fontSize:14, letterSpacing:2, color:T.muted, marginBottom:16 }}>
            TODAY'S MACROS — {selectedDay}
          </div>
          <MacroBar label="Protein" value={tot.protein} goal={macroGoals.protein} color={T.protein}/>
          <MacroBar label="Carbs" value={tot.carbs} goal={macroGoals.carbs} color={T.carbs}/>
          <MacroBar label="Fat" value={tot.fat} goal={macroGoals.fat} color={T.fat}/>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { label:"CALORIES LEFT", val:`${Math.max(remaining.calories,0)}`, unit:"kcal", color:T.accent },
          { label:"PROTEIN LEFT", val:`${Math.max(remaining.protein,0)}`, unit:"g", color:T.protein },
          { label:"CARBS LEFT", val:`${Math.max(remaining.carbs,0)}`, unit:"g", color:T.carbs },
          { label:"FAT LEFT", val:`${Math.max(remaining.fat,0)}`, unit:"g", color:T.fat },
        ].map(s => (
          <div key={s.label} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14,
            padding:"18px 16px", textAlign:"center" }}>
            <div style={{ fontFamily:"Bebas Neue", fontSize:32, color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.muted, marginTop:2 }}>{s.unit}</div>
            <div style={{ fontFamily:"DM Sans", fontSize:10, color:T.muted, letterSpacing:1, marginTop:6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:20, padding:24 }}>
        <div style={{ fontFamily:"Bebas Neue", fontSize:18, letterSpacing:2, color:T.muted, marginBottom:16 }}>
          WEEKLY CALORIE OVERVIEW
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:100 }}>
          {DAYS.map(d => {
            const cal = dayTotals(plan[d]).calories;
            const h = Math.max((cal / macroGoals.calories) * 100, 4);
            return (
              <div key={d} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                <div style={{ fontFamily:"JetBrains Mono", fontSize:9, color:T.muted }}>{cal||""}</div>
                <div style={{ width:"100%", height:`${h}%`, background: d===selectedDay ? T.accent : T.border,
                  borderRadius:"4px 4px 0 0", transition:"height 0.5s ease", minHeight:4 }}/>
                <div style={{ fontFamily:"Bebas Neue", fontSize:11, color: d===selectedDay ? T.accent : T.muted,
                  letterSpacing:1 }}>{d}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Profile Badge ─────────────────────────────────────────────────────────────
function ProfileBadge({ profile }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ width:38, height:38, borderRadius:"50%", background:T.accent,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"Bebas Neue", fontSize:16, color:T.bg }}>
        {profile.name.charAt(0)}
      </div>
      <div>
        <div style={{ fontFamily:"DM Sans", fontSize:13, fontWeight:600, color:T.text }}>{profile.name}</div>
        <div style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.muted }}>
          {profile.sport} · {profile.goal}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("planner");
  const [plan, setPlan] = useState(initWeekPlan);
  const [selectedDay, setSelectedDay] = useState("MON");
  const [profile] = useState({
    name: "Alex Morgan",
    sport: "Triathlon",
    goal: "Performance",
    weight: "78kg",
    trainingDays: 5,
  });

  const tabs = [
    { id:"planner",  label:"WEEK PLAN" },
    { id:"tracker",  label:"MACRO TRACKER" },
    { id:"coach",    label:"💬 COACH MSG", highlight: true },
    { id:"mfp",      label:"MFP SYNC", mfp: true },
  ];

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"DM Sans" }}>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:${T.surface}; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:2px; }
        input::placeholder { color:${T.muted}; }
        input { caret-color:${T.accent}; }
        textarea::placeholder { color:${T.muted}; }
        @keyframes pulse {
          0%,100% { transform:scale(0.6); opacity:0.4; }
          50% { transform:scale(1); opacity:1; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to { opacity:1; transform:translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom:`1px solid ${T.border}`, padding:"0 28px",
        display:"flex", alignItems:"center", justifyContent:"space-between", height:64, position:"sticky",
        top:0, background:T.bg+"f0", backdropFilter:"blur(12px)", zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ fontFamily:"Bebas Neue", fontSize:26, letterSpacing:2, color:T.accent, lineHeight:1 }}>
            NO RULES<span style={{ color:T.text }}> NUTRITION</span>
          </div>
          <div style={{ width:1, height:20, background:T.border }}/>
          <div style={{ fontFamily:"DM Sans", fontSize:11, color:T.muted, letterSpacing:1, textTransform:"uppercase" }}>
            Athlete Nutrition OS
          </div>
        </div>
        <ProfileBadge profile={profile}/>
      </div>

      {/* Tab nav */}
      <div style={{ borderBottom:`1px solid ${T.border}`, padding:"0 28px",
        display:"flex", alignItems:"center", gap:2, overflowX:"auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:"14px 18px", background:"none", border:"none", cursor:"pointer",
              fontFamily:"Bebas Neue", fontSize:14, letterSpacing:1.5, whiteSpace:"nowrap",
              color: tab===t.id ? (t.mfp ? T.mfp : t.highlight ? T.coachGreen : T.accent) : T.muted,
              borderBottom: tab===t.id ? `2px solid ${t.mfp ? T.mfp : t.highlight ? T.coachGreen : T.accent}` : "2px solid transparent",
              transition:"all 0.2s", marginBottom:-1 }}>
            {t.label}
          </button>
        ))}

        <div style={{ marginLeft:"auto", display:"flex", gap:16, alignItems:"center", paddingLeft:16 }}>
          {[
            { label:"CAL", val:macroGoals.calories, unit:"kcal", color:T.accent },
            { label:"PRO", val:macroGoals.protein, unit:"g", color:T.protein },
            { label:"CARB", val:macroGoals.carbs, unit:"g", color:T.carbs },
            { label:"FAT", val:macroGoals.fat, unit:"g", color:T.fat },
          ].map(g => (
            <div key={g.label} style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"JetBrains Mono", fontSize:12, color:g.color, fontWeight:600 }}>
                {g.val}<span style={{ fontSize:9, color:T.muted }}>{g.unit}</span>
              </div>
              <div style={{ fontFamily:"DM Sans", fontSize:9, color:T.muted, letterSpacing:1 }}>{g.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:28, maxWidth:1200, margin:"0 auto", animation:"fadeUp 0.3s ease" }}>
        {tab === "planner" && (
          <WeeklyPlanner plan={plan} setPlan={setPlan} selectedDay={selectedDay} setSelectedDay={setSelectedDay}/>
        )}
        {tab === "tracker" && (
          <MacroTracker plan={plan} selectedDay={selectedDay}/>
        )}
        {tab === "coach" && (
          <div style={{ height:"calc(100vh - 200px)", display:"flex", flexDirection:"column" }}>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontFamily:"Bebas Neue", fontSize:28, letterSpacing:2, color:T.text }}>
                DIRECT COACH MESSAGING
              </div>
              <div style={{ fontFamily:"DM Sans", fontSize:13, color:T.muted, marginTop:4 }}>
                Your coach has live visibility of your macros · Real-time support & guidance
              </div>
            </div>
            <div style={{ flex:1, minHeight:0 }}>
              <CoachPanel plan={plan} selectedDay={selectedDay} profile={profile}/>
            </div>
          </div>
        )}
        {tab === "mfp" && (
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontFamily:"Bebas Neue", fontSize:28, letterSpacing:2, color:T.text }}>
                MYFITNESSPAL INTEGRATION
              </div>
              <div style={{ fontFamily:"DM Sans", fontSize:13, color:T.muted, marginTop:4 }}>
                Sync your food diary · Coach sees your adherence in real time
              </div>
            </div>
            <MFPPanel plan={plan} selectedDay={selectedDay}/>
          </div>
        )}
      </div>
    </div>
  );
}
