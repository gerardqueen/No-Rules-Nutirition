import { useState, useEffect, useRef } from "react";

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
const fl = document.createElement("link"); fl.rel = "stylesheet";
fl.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap";
document.head.appendChild(fl);

// ── Theme ────────────────────────────────────────────────────────────────────
const C = { bg:"#0a0a0a", surface:"#131313", card:"#1a1a1a", border:"#222", accent:"#FF9A52", green:"#22c55e", red:"#ef4444", blue:"#3b82f6", purple:"#a855f7", text:"#f2f2f2", muted:"#777", protein:"#f97316", carbs:"#3b82f6", fat:"#a855f7" };
const F = { main:"'Outfit',system-ui,sans-serif", mono:"'JetBrains Mono',ui-monospace,monospace" };

// ── Helpers ──────────────────────────────────────────────────────────────────
const DAYS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
const MEALS = ["Breakfast","Lunch","Dinner","Snack"];
const MOODS = [{ id:5, emoji:"😄", label:"Great", color:"#22c55e" },{ id:4, emoji:"🙂", label:"Good", color:"#FF9A52" },{ id:3, emoji:"😐", label:"Neutral", color:"#f97316" },{ id:2, emoji:"😔", label:"Low", color:"#3b82f6" },{ id:1, emoji:"😩", label:"Terrible", color:"#ef4444" }];
const pad2 = n => String(n).padStart(2,"0");
const iso = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const today = () => iso(new Date());
const dk = ds => { const d = new Date(ds+"T00:00:00"); const w = d.getDay(); return DAYS[w===0?6:w-1]; };
const weekDates = () => { const t = new Date(), dw = t.getDay(), ix = dw===0?6:dw-1, o=[]; for(let i=0;i<7;i++){const d=new Date(t);d.setDate(d.getDate()+(i-ix));o.push({dk:DAYS[i],date:iso(d),isToday:i===ix});}return o; };
const sumF = foods => foods.reduce((a,f)=>({cal:a.cal+(f.calories||0),pro:a.pro+(f.protein||0),carb:a.carb+(f.carbs||0),fat:a.fat+(f.fat||0)}),{cal:0,pro:0,carb:0,fat:0});
const mTot = dp => dp ? sumF(Object.values(dp).flat()) : {cal:0,pro:0,carb:0,fat:0};
let goals = {calories:2000,protein:150,carbs:250,fat:70}, goalsByDay = {};
const gFor = ds => goalsByDay[dk(ds)] || goals;

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [email,setEmail]=useState(""), [pw,setPw]=useState(""), [err,setErr]=useState(""), [ld,setLd]=useState(false);
  const go = async () => {
    setErr(""); if(!email||!pw){setErr("Enter email and password");return;} setLd(true);
    try { const d=await fetch(`${API}/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email.trim().toLowerCase(),password:pw})}); const j=await d.json().catch(()=>({})); if(d.ok&&j.token){localStorage.setItem(TK,j.token);onLogin(j.user,j.token);}else setErr(j.error||"Login failed"); } catch{setErr("Cannot connect");}
    setLd(false);
  };
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:F.main}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}input::placeholder{color:${C.muted}}input,textarea,select{caret-color:${C.accent};outline:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      <div style={{width:"100%",maxWidth:380,animation:"fadeUp .4s ease"}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <svg width="100" height="100" viewBox="0 0 200 200"><circle cx="100" cy="100" r="98" fill="#1a1a1a" stroke={C.accent+"55"} strokeWidth="2"/><circle cx="100" cy="100" r="82" fill="#fff"/><circle cx="100" cy="95" r="28" fill="none" stroke="#FF9A52" strokeWidth="4"/><ellipse cx="90" cy="89" rx="4" ry="5" fill="#FF9A52"/><ellipse cx="110" cy="89" rx="4" ry="5" fill="#FF9A52"/><path d="M86 100Q100 114 114 100" fill="none" stroke="#FF9A52" strokeWidth="3.5" strokeLinecap="round"/><path id="tA" d="M30 100A70 70 0 0 1 170 100" fill="none"/><text fontFamily="Arial Black,Impact,sans-serif" fontSize="22" fontWeight="900" fill="#1a1a1a" letterSpacing="3"><textPath href="#tA" startOffset="50%" textAnchor="middle">NO RULE</textPath></text><path id="bA" d="M30 105A70 70 0 0 0 170 105" fill="none"/><text fontFamily="Arial Black,Impact,sans-serif" fontSize="19" fontWeight="900" fill="#1a1a1a" letterSpacing="2"><textPath href="#bA" startOffset="50%" textAnchor="middle">NUTRITION</textPath></text></svg>
          <div style={{fontSize:12,color:C.muted,marginTop:12,letterSpacing:3,textTransform:"uppercase"}}>Fuel Your Performance</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Email" type="email" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px",color:C.text,fontFamily:F.main,fontSize:16}}/>
          <input value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Password" type="password" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px",color:C.text,fontFamily:F.main,fontSize:16}}/>
          {err&&<div style={{background:`${C.red}15`,border:`1px solid ${C.red}33`,borderRadius:10,padding:"10px 14px",color:C.red,fontSize:13}}>{err}</div>}
          <button onClick={go} disabled={ld} style={{width:"100%",padding:"16px",background:ld?C.border:C.accent,color:ld?C.muted:C.bg,border:"none",borderRadius:14,fontFamily:F.main,fontSize:17,fontWeight:700,letterSpacing:1,cursor:"pointer"}}>{ld?"Signing in…":"Sign In"}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORCE PASSWORD CHANGE
// ══════════════════════════════════════════════════════════════════════════════
function ForcePw({ profile, onDone }) {
  const [np,setNp]=useState(""), [cp,setCp]=useState(""), [err,setErr]=useState(""), [sv,setSv]=useState(false);
  const go = async () => {
    if(np.length<6){setErr("Min 6 characters");return;} if(np!==cp){setErr("Passwords don't match");return;} setSv(true);
    try{await api("/auth/change-password",{method:"PUT",body:JSON.stringify({newPassword:np})});onDone({...profile,mustChangePassword:false});}catch(e){setErr(e.message);} setSv(false);
  };
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:F.main}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:32}}><div style={{fontSize:48,marginBottom:12}}>🔒</div><div style={{fontSize:20,fontWeight:700,color:C.text}}>Set Your Password</div><div style={{fontSize:13,color:C.muted,marginTop:6}}>Welcome, {profile.name}!</div></div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <input value={np} onChange={e=>setNp(e.target.value)} placeholder="New password" type="password" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",color:C.text,fontFamily:F.main,fontSize:15}}/>
          <input value={cp} onChange={e=>setCp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Confirm password" type="password" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",color:C.text,fontFamily:F.main,fontSize:15}}/>
          {np&&cp&&np===cp&&<div style={{color:C.green,fontSize:12}}>✓ Match</div>}
          {err&&<div style={{color:C.red,fontSize:12}}>{err}</div>}
          <button onClick={go} disabled={sv||np.length<6||np!==cp} style={{width:"100%",padding:"15px",background:np.length>=6&&np===cp?C.accent:C.border,color:np.length>=6&&np===cp?C.bg:C.muted,border:"none",borderRadius:14,fontFamily:F.main,fontSize:16,fontWeight:700,cursor:"pointer"}}>{sv?"Saving…":"Set Password & Continue"}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RING
// ══════════════════════════════════════════════════════════════════════════════
function Ring({value,max,size=120,sw=10,color=C.accent,label,sub}) {
  const r=(size-sw)/2, ci=2*Math.PI*r, pct=max>0?Math.min(value/max,1):0;
  return (
    <div style={{position:"relative",width:size,height:size}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={sw}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={`${pct*ci} ${ci}`} strokeLinecap="round" style={{transition:"stroke-dasharray .6s ease"}}/></svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontFamily:F.mono,fontSize:size*.18,fontWeight:600,color:C.text}}>{value}</span>
        {label&&<span style={{fontFamily:F.main,fontSize:size*.09,color:C.muted,marginTop:2}}>{label}</span>}
        {sub&&<span style={{fontFamily:F.mono,fontSize:size*.08,color}}>{sub}</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOME TAB
// ══════════════════════════════════════════════════════════════════════════════
function HomeTab({ profile, plan, events, moodLog, setMoodLog, videos }) {
  const td = today(), tot = mTot(plan[td]), dg = gFor(td);
  const firstName = profile.name?.split(" ")[0]||"Athlete";
  const hr = new Date().getHours();
  const greet = hr<12?"Good morning":hr<17?"Good afternoon":"Good evening";
  const wd = weekDates();
  const nci = [...(events||[])].filter(e=>e.date>=td&&(e.type==="checkin"||(e.title||"").toLowerCase().includes("check"))).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const ciD = nci ? Math.ceil((new Date(nci.date+"T00:00:00")-new Date(td+"T00:00:00"))/86400000) : null;
  const todayMood = moodLog[td];
  const saveMood = async (m) => {
    setMoodLog(prev => ({...prev, [td]: m}));
    try { await api(`/mood/${profile.id}`, { method:"POST", body:JSON.stringify({ date:td, score:m.id, label:m.label }) }); } catch {}
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16,paddingBottom:20}}>
      <div><div style={{fontSize:14,color:C.muted}}>{greet}</div><div style={{fontSize:26,fontWeight:700,color:C.text}}>{firstName} <span style={{color:C.accent}}>💪</span></div></div>

      {/* Ring + macros */}
      <div style={{background:C.card,borderRadius:20,padding:20,display:"flex",alignItems:"center",gap:20}}>
        <Ring value={tot.cal} max={dg.calories} size={120} label="kcal" sub={`/ ${dg.calories}`}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
          {[{k:"pro",l:"PROTEIN",v:tot.pro,g:dg.protein,c:C.protein},{k:"carb",l:"CARBS",v:tot.carb,g:dg.carbs,c:C.carbs},{k:"fat",l:"FAT",v:tot.fat,g:dg.fat,c:C.fat}].map(m=>{
            const p=m.g>0?Math.min(m.v/m.g,1):0;
            return(<div key={m.k}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:10,color:C.muted,fontWeight:600,letterSpacing:1}}>{m.l}</span><span style={{fontFamily:F.mono,fontSize:10,color:m.c}}>{m.v}<span style={{color:C.muted}}>/{m.g}g</span></span></div><div style={{height:5,background:C.border,borderRadius:3}}><div style={{height:"100%",width:`${p*100}%`,background:m.c,borderRadius:3,transition:"width .5s"}}/></div></div>);
          })}
        </div>
      </div>

      {/* Weekly bars */}
      <div style={{background:C.card,borderRadius:16,padding:14}}>
        <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:1,marginBottom:10}}>THIS WEEK</div>
        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:50}}>
          {wd.map(({dk:d,date,isToday})=>{const c=mTot(plan[date]).cal,g=gFor(date).calories||2000,p=g>0?c/g:0,h=Math.max(Math.min(p*100,100),c>0?8:4),col=c===0?C.border:Math.abs(p-1)<=.1?C.green:Math.abs(p-1)<=.2?C.accent:C.red;
            return(<div key={date} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><div style={{width:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",height:36}}><div style={{width:"65%",margin:"0 auto",height:`${h}%`,background:isToday?col:col+"88",borderRadius:"3px 3px 0 0",minHeight:2}}/></div><span style={{fontSize:8,fontWeight:isToday?700:400,color:isToday?C.text:C.muted}}>{d}</span></div>);
          })}
        </div>
      </div>

      {/* Mood */}
      <div style={{background:C.card,borderRadius:16,padding:16}}>
        <div style={{fontSize:12,fontWeight:600,color:C.muted,letterSpacing:1,marginBottom:12}}>HOW ARE YOU FEELING?</div>
        <div style={{display:"flex",justifyContent:"space-around"}}>
          {MOODS.map(m=>(
            <button key={m.id} onClick={()=>saveMood(m)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:todayMood?.id===m.id?`${m.color}22`:"transparent",border:todayMood?.id===m.id?`2px solid ${m.color}66`:"2px solid transparent",borderRadius:12,padding:"8px 10px",cursor:"pointer"}}>
              <span style={{fontSize:28}}>{m.emoji}</span>
              <span style={{fontSize:9,color:todayMood?.id===m.id?m.color:C.muted,fontWeight:todayMood?.id===m.id?700:400}}>{m.label}</span>
            </button>
          ))}
        </div>
        {todayMood && <div style={{textAlign:"center",marginTop:8,fontSize:11,color:C.green}}>✓ Logged: {todayMood.label}</div>}
      </div>

      {/* Check-in countdown */}
      {ciD!==null&&(<div style={{background:`${C.green}12`,border:`1px solid ${C.green}33`,borderRadius:16,padding:14,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:44,height:44,borderRadius:11,background:`${C.green}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✅</div>
        <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Check-in in {ciD} day{ciD!==1?"s":""}</div><div style={{fontSize:11,color:C.muted}}>{profile.coachName||"Your Coach"}</div></div>
      </div>)}

      {/* Coach videos */}
      {videos.length>0&&(
        <div style={{background:C.card,borderRadius:16,padding:16}}>
          <div style={{fontSize:12,fontWeight:600,color:C.muted,letterSpacing:1,marginBottom:12}}>COACH VIDEOS</div>
          <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
            {videos.map(v=>(
              <a key={v.id} href={v.youtube_url} target="_blank" rel="noopener noreferrer" style={{flexShrink:0,width:160,textDecoration:"none"}}>
                <div style={{position:"relative",paddingBottom:"56%",background:"#111",borderRadius:10,overflow:"hidden"}}>
                  <img src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",objectFit:"cover"}}/>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff"}}>▶</div></div>
                </div>
                <div style={{fontSize:11,fontWeight:600,color:C.text,marginTop:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</div>
                <div style={{fontSize:9,color:C.muted}}>{v.category}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[{icon:"🔥",label:"Today",val:`${tot.cal} kcal`,color:C.accent},{icon:"🎯",label:"Remaining",val:`${Math.max(0,dg.calories-tot.cal)} kcal`,color:C.green},{icon:"🥩",label:"Protein",val:`${tot.pro}g / ${dg.protein}g`,color:C.protein},{icon:"📅",label:"Logged",val:`${wd.filter(({date})=>mTot(plan[date]).cal>0).length}/7 days`,color:C.blue}].map(s=>(
          <div key={s.label} style={{background:C.card,borderRadius:12,padding:12,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>{s.icon}</span><div><div style={{fontFamily:F.mono,fontSize:13,fontWeight:600,color:s.color}}>{s.val}</div><div style={{fontSize:9,color:C.muted}}>{s.label}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MEALS TAB
// ══════════════════════════════════════════════════════════════════════════════
function MealsTab({ plan, setPlan, selectedDay, setSelectedDay, shoppingItems, setShoppingItems }) {
  const [search,setSearch]=useState(""), [results,setResults]=useState([]), [addingTo,setAddingTo]=useState(null), [searching,setSearching]=useState(false);
  const [scanning,setScanning]=useState(false), [scanResult,setScanResult]=useState(null), [scanErr,setScanErr]=useState("");
  const timerRef=useRef(null), scannerRef=useRef(null), libLoaded=useRef(false);
  const tot=mTot(plan[selectedDay]), dg=gFor(selectedDay);

  useEffect(()=>{if(!search.trim()){setResults([]);return;}clearTimeout(timerRef.current);timerRef.current=setTimeout(async()=>{setSearching(true);try{const r=await api(`/off/search?q=${encodeURIComponent(search.trim())}`);setResults(Array.isArray(r)?r.slice(0,12):[]);}catch{setResults([]);}setSearching(false);},500);},[search]);

  const addFood=(food,meal)=>{setPlan(prev=>{const n={...prev};if(!n[selectedDay]){n[selectedDay]={};MEALS.forEach(m=>n[selectedDay][m]=[]);}n[selectedDay]={...n[selectedDay],[meal]:[...(n[selectedDay][meal]||[]),food]};return n;});setAddingTo(null);setSearch("");setResults([]);};
  const removeFood=(meal,idx)=>{setPlan(prev=>{const n={...prev};const a=[...(n[selectedDay]?.[meal]||[])];a.splice(idx,1);n[selectedDay]={...n[selectedDay],[meal]:a};return n;});};
  const addToCart=(name)=>{setShoppingItems(prev=>{if(prev.some(i=>i.name===name))return prev;return[...prev,{name,checked:false}];});};

  const stopScan=()=>{if(scannerRef.current){try{scannerRef.current.stop().then(()=>scannerRef.current.clear());}catch{}scannerRef.current=null;}setScanning(false);};
  const startScan=()=>{setScanning(true);setScanResult(null);setScanErr("");};
  useEffect(()=>{if(!scanning)return;
    (async()=>{if(!libLoaded.current){await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});libLoaded.current=true;}
    const sc=new window.Html5Qrcode("m-scanner");scannerRef.current=sc;
    try{await sc.start({facingMode:"environment"},{fps:10,qrbox:{width:250,height:120}},async(code)=>{stopScan();try{const r=await api(`/off/barcode/${code}`);if(r&&r.name)setScanResult(r);else setScanErr("Not found");}catch{setScanErr("Lookup failed");}},()=>{});}catch{setScanErr("Camera denied");setScanning(false);}})();
    return()=>stopScan();
  },[scanning]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,paddingBottom:20}}>
      <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:4}}>
        {weekDates().map(({dk:d,date,isToday})=>{const a=date===selectedDay;return(
          <button key={date} onClick={()=>setSelectedDay(date)} style={{padding:"7px 12px",borderRadius:10,border:`1px solid ${a?C.accent:C.border}`,background:a?`${C.accent}18`:C.surface,color:a?C.accent:C.muted,fontFamily:F.main,fontSize:11,fontWeight:a?700:500,cursor:"pointer",whiteSpace:"nowrap",position:"relative"}}>
            {d}{isToday&&<div style={{position:"absolute",bottom:-2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:2,background:C.accent}}/>}</button>);})}
      </div>

      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <div style={{flex:1,display:"flex",gap:6}}>
          {[{l:"Cal",v:tot.cal,g:dg.calories,c:C.accent},{l:"Pro",v:tot.pro,g:dg.protein,c:C.protein},{l:"Carb",v:tot.carb,g:dg.carbs,c:C.carbs},{l:"Fat",v:tot.fat,g:dg.fat,c:C.fat}].map(m=>(
            <div key={m.l} style={{flex:1,background:C.card,borderRadius:10,padding:"8px 4px",textAlign:"center"}}><div style={{fontFamily:F.mono,fontSize:12,fontWeight:600,color:m.c}}>{m.v}</div><div style={{fontSize:8,color:C.muted}}>/{m.g}</div></div>
          ))}
        </div>
        <button onClick={startScan} style={{width:44,height:44,borderRadius:12,background:`${C.accent}18`,border:`1px solid ${C.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer"}}>📷</button>
      </div>

      {(scanning||scanResult||scanErr)&&(
        <div style={{background:C.card,borderRadius:16,padding:16}}>
          {scanning&&<div><div id="m-scanner" style={{width:"100%",borderRadius:12,overflow:"hidden"}}/><button onClick={stopScan} style={{width:"100%",marginTop:8,padding:10,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,color:C.muted,fontFamily:F.main,fontSize:12,cursor:"pointer"}}>Cancel</button></div>}
          {scanErr&&<div style={{color:C.red,fontSize:12,textAlign:"center",padding:8}}>{scanErr} <button onClick={()=>setScanErr("")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:11}}>dismiss</button></div>}
          {scanResult&&(<div>
            <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:8}}>{scanResult.name}</div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>{[{l:"Cal",v:Math.round(scanResult.calories||0),c:C.accent},{l:"Pro",v:Math.round(scanResult.protein||0),c:C.protein},{l:"Carb",v:Math.round(scanResult.carbs||0),c:C.carbs},{l:"Fat",v:Math.round(scanResult.fat||0),c:C.fat}].map(m=>(<div key={m.l} style={{flex:1,textAlign:"center"}}><div style={{fontFamily:F.mono,fontSize:14,fontWeight:600,color:m.c}}>{m.v}</div><div style={{fontSize:8,color:C.muted}}>{m.l}</div></div>))}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{MEALS.map(m=>(<button key={m} onClick={()=>{addFood({name:scanResult.name,calories:Math.round(scanResult.calories||0),protein:Math.round(scanResult.protein||0),carbs:Math.round(scanResult.carbs||0),fat:Math.round(scanResult.fat||0),source:"barcode"},m);setScanResult(null);}} style={{padding:10,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontFamily:F.main,fontSize:12,cursor:"pointer"}}>{m}</button>))}</div>
          </div>)}
        </div>
      )}

      {MEALS.map(meal=>{const foods=plan[selectedDay]?.[meal]||[]; const mt=sumF(foods); return(
        <div key={meal} style={{background:C.card,borderRadius:14,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>{meal==="Breakfast"?"🌅":meal==="Lunch"?"☀️":meal==="Dinner"?"🌙":"🍎"}</span><span style={{fontSize:13,fontWeight:600,color:C.text}}>{meal}</span><span style={{fontFamily:F.mono,fontSize:9,color:C.muted}}>{mt.cal}kcal</span></div>
            <button onClick={()=>setAddingTo(addingTo===meal?null:meal)} style={{width:28,height:28,borderRadius:7,border:`1px solid ${addingTo===meal?C.accent:C.border}`,background:addingTo===meal?`${C.accent}22`:"transparent",color:addingTo===meal?C.accent:C.muted,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{addingTo===meal?"×":"+"}</button>
          </div>
          {foods.length>0&&foods.map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",padding:"8px 14px",borderBottom:`1px solid ${C.border}10`,gap:8}}>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.name}</div><div style={{fontFamily:F.mono,fontSize:8,color:C.muted}}>{f.calories}cal·{f.protein}p·{f.carbs}c·{f.fat}f</div></div>
              <button onClick={()=>addToCart(f.name)} style={{background:"none",border:"none",color:C.green,fontSize:12,cursor:"pointer",padding:4}}>🛒</button>
              <button onClick={()=>removeFood(meal,i)} style={{background:"none",border:"none",color:C.red,fontSize:12,cursor:"pointer",padding:4}}>✕</button>
            </div>
          ))}
          {addingTo===meal&&(<div style={{padding:10,borderTop:`1px solid ${C.border}`}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search foods..." autoFocus style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 10px",color:C.text,fontFamily:F.main,fontSize:12}}/>
            {searching&&<div style={{padding:6,fontSize:10,color:C.muted}}>Searching…</div>}
            {results.map((r,i)=>(<div key={i} onClick={()=>addFood({name:r.name,calories:Math.round(r.calories||0),protein:Math.round(r.protein||0),carbs:Math.round(r.carbs||0),fat:Math.round(r.fat||0),source:"off"},meal)} style={{display:"flex",justifyContent:"space-between",padding:"8px 2px",borderBottom:`1px solid ${C.border}08`,cursor:"pointer"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:11,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div><div style={{fontFamily:F.mono,fontSize:8,color:C.muted}}>{Math.round(r.calories||0)}kcal·{Math.round(r.protein||0)}p</div></div><span style={{color:C.green,fontSize:16}}>+</span></div>))}
          </div>)}
        </div>
      );})}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHOPPING TAB
// ══════════════════════════════════════════════════════════════════════════════
function ShoppingTab({ items, setItems, plan }) {
  const [input,setInput]=useState("");
  const add=()=>{if(!input.trim())return;setItems(prev=>[...prev,{name:input.trim(),checked:false}]);setInput("");};
  const toggle=i=>{setItems(prev=>prev.map((it,idx)=>idx===i?{...it,checked:!it.checked}:it));};
  const remove=i=>{setItems(prev=>prev.filter((_,idx)=>idx!==i));};
  const clearDone=()=>{setItems(prev=>prev.filter(it=>!it.checked));};
  const mealFoods=[]; const wd=weekDates();
  wd.forEach(({date})=>{const dp=plan[date];if(dp)MEALS.forEach(m=>(dp[m]||[]).forEach(f=>{if(!mealFoods.includes(f.name))mealFoods.push(f.name);}));});
  const suggestions=mealFoods.filter(n=>!items.some(it=>it.name===n)).slice(0,8);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,paddingBottom:20}}>
      <div style={{fontSize:20,fontWeight:700,color:C.text}}>🛒 Shopping List</div>
      <div style={{display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Add item…" style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",color:C.text,fontFamily:F.main,fontSize:14}}/>
        <button onClick={add} style={{padding:"0 16px",background:input.trim()?C.accent:C.border,color:input.trim()?C.bg:C.muted,border:"none",borderRadius:10,fontFamily:F.main,fontWeight:700,fontSize:14,cursor:"pointer"}}>+</button>
      </div>
      {suggestions.length>0&&(<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {suggestions.map(n=>(<button key={n} onClick={()=>setItems(prev=>[...prev,{name:n,checked:false}])} style={{padding:"6px 12px",background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontFamily:F.main,fontSize:11,cursor:"pointer"}}>+ {n.slice(0,25)}</button>))}
      </div>)}
      {items.length===0?<div style={{textAlign:"center",padding:40,color:C.muted,fontSize:13}}>Your shopping list is empty</div>:
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {items.map((it,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:C.card,borderRadius:10,padding:"12px 14px"}}>
              <button onClick={()=>toggle(i)} style={{width:22,height:22,borderRadius:6,border:`2px solid ${it.checked?C.green:C.border}`,background:it.checked?`${C.green}22`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:12,color:C.green}}>{it.checked?"✓":""}</button>
              <span style={{flex:1,fontSize:13,color:it.checked?C.muted:C.text,textDecoration:it.checked?"line-through":"none"}}>{it.name}</span>
              <button onClick={()=>remove(i)} style={{background:"none",border:"none",color:C.red,fontSize:14,cursor:"pointer"}}>✕</button>
            </div>
          ))}
          {items.some(it=>it.checked)&&<button onClick={clearDone} style={{padding:10,background:"none",border:`1px solid ${C.border}`,borderRadius:10,color:C.muted,fontFamily:F.main,fontSize:12,cursor:"pointer",marginTop:4}}>Clear completed</button>}
        </div>
      }
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INBOX TAB
// ══════════════════════════════════════════════════════════════════════════════
function InboxTab({ profile }) {
  const [view,setView]=useState("threads");
  const [threads,setThreads]=useState([]), [active,setActive]=useState(null), [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState(""), [subject,setSubject]=useState(""), [ld,setLd]=useState(false);
  const [checkIns,setCheckIns]=useState([]);
  const bottomRef=useRef(null);
  const cid=profile?.coachId;

  const loadThreads=async()=>{if(!cid)return;try{const r=await api(`/messages/threads/${cid}`);if(Array.isArray(r))setThreads(r);}catch{}};
  const loadCheckIns=async()=>{if(!profile?.id)return;try{const r=await api(`/checkins/${profile.id}`);if(Array.isArray(r))setCheckIns(r);}catch{}};
  useEffect(()=>{loadThreads();loadCheckIns();const i=setInterval(loadThreads,15000);return()=>clearInterval(i);},[cid]);

  const openThread=async(t)=>{setActive(t);setView("thread");try{const r=await api(`/messages/thread/${cid}/${t.threadId}`);if(Array.isArray(r))setMsgs(r);}catch{setMsgs([]);}};
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const sendReply=async()=>{if(!input.trim()||!active||!cid||ld)return;setLd(true);try{const m=await api(`/messages/${cid}`,{method:"POST",body:JSON.stringify({content:input.trim(),threadId:active.threadId,subject:active.subject})});setMsgs(p=>[...p,m]);setInput("");}catch{}setLd(false);};
  const sendNew=async()=>{if(!input.trim()||!subject.trim()||!cid||ld)return;setLd(true);try{const m=await api(`/messages/${cid}`,{method:"POST",body:JSON.stringify({content:input.trim(),subject:subject.trim()})});setInput("");setSubject("");await loadThreads();openThread({threadId:m.threadId,subject:m.subject||subject.trim()});}catch{}setLd(false);};

  const ToggleBar = () => (
    <div style={{display:"flex",gap:6,marginBottom:14}}>
      {[{id:"threads",label:"💬 Messages"},{id:"checkins",label:"📋 Check-Ins"}].map(t=>(
        <button key={t.id} onClick={()=>setView(t.id)} style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${(view===t.id||(view==="thread"||view==="compose")&&t.id==="threads")?C.accent:C.border}`,background:(view===t.id||(view==="thread"||view==="compose")&&t.id==="threads")?`${C.accent}15`:C.surface,color:(view===t.id||(view==="thread"||view==="compose")&&t.id==="threads")?C.accent:C.muted,fontFamily:F.main,fontSize:12,fontWeight:600,cursor:"pointer"}}>{t.label}</button>
      ))}
    </div>
  );

  if (view==="checkins") return (
    <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:20}}>
      <ToggleBar/>
      <div style={{fontSize:18,fontWeight:700,color:C.text}}>Check-In Notes</div>
      {checkIns.length===0?<div style={{textAlign:"center",padding:30,color:C.muted}}>No check-in notes yet</div>:
        checkIns.map(n=>(
          <div key={n.id} style={{background:C.card,borderRadius:14,padding:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <span style={{background:`${C.green}22`,border:`1px solid ${C.green}44`,borderRadius:6,padding:"3px 8px",fontFamily:F.mono,fontSize:10,color:C.green,fontWeight:600}}>{n.date?new Date(n.date+"T00:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}):"—"}</span>
              <span style={{fontSize:13,fontWeight:600,color:C.text}}>{n.title}</span>
            </div>
            <div style={{fontSize:12,color:C.text,lineHeight:1.6,whiteSpace:"pre-wrap",background:C.surface,borderRadius:8,padding:12}}>{n.notes}</div>
            <div style={{fontSize:9,color:C.muted,marginTop:8}}>{n.createdByName&&`Coach: ${n.createdByName}`} {n.created_at&&`· ${new Date(n.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}`}</div>
          </div>
        ))
      }
    </div>
  );

  if (view==="compose") return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 140px)"}}>
      <ToggleBar/>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><button onClick={()=>setView("threads")} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>←</button><span style={{fontSize:16,fontWeight:700,color:C.text}}>New Message</span></div>
      <div style={{fontSize:10,color:C.muted,marginBottom:4}}>TO</div><div style={{fontSize:14,color:C.green,fontWeight:600,marginBottom:10}}>{profile.coachName||"Your Coach"}</div>
      <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",color:C.text,fontFamily:F.main,fontSize:14,marginBottom:10}}/>
      <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Message…" rows={5} style={{width:"100%",flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",color:C.text,fontFamily:F.main,fontSize:13,resize:"none"}}/>
      <button onClick={sendNew} disabled={ld||!input.trim()||!subject.trim()} style={{marginTop:10,padding:14,background:input.trim()&&subject.trim()?C.accent:C.border,color:input.trim()&&subject.trim()?C.bg:C.muted,border:"none",borderRadius:12,fontFamily:F.main,fontSize:15,fontWeight:700,cursor:"pointer"}}>{ld?"Sending…":"Send"}</button>
    </div>
  );

  if (view==="thread"&&active) return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 140px)"}}>
      <ToggleBar/>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><button onClick={()=>{setView("threads");loadThreads();}} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>←</button><div><div style={{fontSize:14,fontWeight:700,color:C.text}}>{active.subject}</div><div style={{fontSize:10,color:C.muted}}>with {profile.coachName||"Coach"}</div></div></div>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,paddingBottom:8}}>
        {msgs.map((m,i)=>{const me=m.fromId===profile?.id;return(
          <div key={m.id||i} style={{display:"flex",justifyContent:me?"flex-end":"flex-start"}}><div style={{maxWidth:"78%",padding:"10px 14px",borderRadius:16,background:me?C.accent:C.surface,color:me?C.bg:C.text,borderBottomRightRadius:me?4:16,borderBottomLeftRadius:me?16:4}}><div style={{fontSize:13,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{m.content}</div>{m.created_at&&<div style={{fontFamily:F.mono,fontSize:8,color:me?C.bg+"88":C.muted,marginTop:4,textAlign:"right"}}>{new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>}</div></div>
        );})}
        <div ref={bottomRef}/>
      </div>
      <div style={{display:"flex",gap:8,paddingTop:6}}><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendReply()} placeholder="Reply…" style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",color:C.text,fontFamily:F.main,fontSize:13}}/><button onClick={sendReply} disabled={ld||!input.trim()} style={{padding:"12px 16px",background:input.trim()?C.accent:C.border,color:input.trim()?C.bg:C.muted,border:"none",borderRadius:12,fontFamily:F.main,fontSize:14,fontWeight:700,cursor:"pointer"}}>↑</button></div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12,paddingBottom:20}}>
      <ToggleBar/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:18,fontWeight:700,color:C.text}}>Messages</div>
        <button onClick={()=>{setView("compose");setSubject("");setInput("");}} style={{padding:"8px 14px",background:C.accent,color:C.bg,border:"none",borderRadius:10,fontFamily:F.main,fontSize:11,fontWeight:600,cursor:"pointer"}}>✉ New</button></div>
      {!cid&&<div style={{textAlign:"center",padding:30,color:C.muted,fontSize:13}}>No coach assigned</div>}
      {cid&&threads.length===0&&<div style={{textAlign:"center",padding:30,color:C.muted,fontSize:13}}>No messages yet</div>}
      {threads.map(t=>(
        <div key={t.threadId} onClick={()=>openThread(t)} style={{background:C.card,borderRadius:12,padding:14,cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:t.unreadCount>0?700:500,color:C.text}}>{t.subject}</span>{t.unreadCount>0&&<div style={{width:18,height:18,borderRadius:9,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:F.mono,fontSize:9,color:C.bg,fontWeight:700}}>{t.unreadCount}</span></div>}</div>
          <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.lastMessage}</div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE TAB
// ══════════════════════════════════════════════════════════════════════════════
function ProfileTab({ profile, onLogout }) {
  const [weight,setWeight]=useState(""), [unit,setUnit]=useState("kg"), [saved,setSaved]=useState(false);
  const [weightLog,setWeightLog]=useState({});
  const [showPw,setShowPw]=useState(false), [pwC,setPwC]=useState(""), [pwN,setPwN]=useState(""), [pwR,setPwR]=useState(""), [pwE,setPwE]=useState(""), [pwOk,setPwOk]=useState(false);
  const toDisp = kg => unit==="lbs"?parseFloat((kg*2.20462).toFixed(1)):kg;

  useEffect(()=>{if(!profile?.id)return;(async()=>{try{const r=await api(`/weights/${profile.id}`);if(Array.isArray(r)){const m={};r.forEach(w=>{m[w.date]={weight:Number(w.kg),date:w.date};});setWeightLog(m);};}catch{}})();},[profile?.id]);

  const logW=async()=>{const v=parseFloat(weight);if(!v||v<=0)return;const kg=unit==="lbs"?v/2.20462:v;setWeightLog(prev=>({...prev,[today()]:{weight:parseFloat(kg.toFixed(2)),date:today()}}));try{await api(`/weights/${profile.id}`,{method:"POST",body:JSON.stringify({date:today(),kg:parseFloat(kg.toFixed(2))})});}catch{} setSaved(true);setWeight("");setTimeout(()=>setSaved(false),2000);};

  const changePw=async()=>{setPwE("");if(!pwC){setPwE("Enter current password");return;}if(pwN.length<6){setPwE("Min 6 chars");return;}if(pwN!==pwR){setPwE("Don't match");return;}try{await api("/auth/change-password",{method:"PUT",body:JSON.stringify({currentPassword:pwC,newPassword:pwN})});setPwOk(true);setTimeout(()=>{setShowPw(false);setPwOk(false);setPwC("");setPwN("");setPwR("");},1500);}catch(e){setPwE(e.message);}};

  const initials=(profile.name||"").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  const entries=Object.entries(weightLog).filter(([,v])=>v).sort(([a],[b])=>a.localeCompare(b)).map(([d,v])=>({date:d,w:v.weight}));
  const recent=entries.slice(-30);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,paddingBottom:20}}>
      <div style={{background:C.card,borderRadius:20,padding:20,textAlign:"center"}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:`${C.accent}22`,border:`2px solid ${C.accent}44`,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:10}}><span style={{fontSize:22,fontWeight:700,color:C.accent}}>{initials}</span></div>
        <div style={{fontSize:18,fontWeight:700,color:C.text}}>{profile.name}</div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>{profile.email}</div>
        {profile.sport&&<div style={{display:"inline-block",marginTop:6,padding:"3px 10px",background:`${C.accent}15`,borderRadius:6,fontSize:10,color:C.accent,fontWeight:600}}>{profile.sport}</div>}
        {profile.coachName&&<div style={{fontSize:11,color:C.green,marginTop:6}}>Coach: {profile.coachName}</div>}
      </div>

      {recent.length>=2&&(
        <div style={{background:C.card,borderRadius:16,padding:16}}>
          <div style={{fontSize:12,fontWeight:600,color:C.muted,letterSpacing:1,marginBottom:10}}>WEIGHT TREND</div>
          {(()=>{
            const wMin=Math.min(...recent.map(p=>p.w))-.5, wMax=Math.max(...recent.map(p=>p.w))+.5, wR=wMax-wMin||1;
            const cW=400, cH=120, pd={t:14,r:6,b:24,l:36}, iW=cW-pd.l-pd.r, iH=cH-pd.t-pd.b;
            const toX=i=>pd.l+(i/(recent.length-1))*iW, toY=w=>pd.t+(1-(w-wMin)/wR)*iH;
            const pathD=recent.map((p,i)=>`${i===0?"M":"L"}${toX(i).toFixed(1)},${toY(p.w).toFixed(1)}`).join(" ");
            return (
              <svg viewBox={`0 0 ${cW} ${cH}`} style={{width:"100%"}}>
                <defs><linearGradient id="wg2" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={C.accent} stopOpacity=".25"/><stop offset="100%" stopColor={C.accent} stopOpacity=".02"/></linearGradient></defs>
                {[0,.5,1].map(f=>{const v=wMin+f*wR;return <g key={f}><line x1={pd.l} x2={cW-pd.r} y1={toY(v)} y2={toY(v)} stroke={C.border} strokeWidth=".4" strokeDasharray="3 3"/><text x={pd.l-3} y={toY(v)+3} fill={C.muted} fontSize="7" fontFamily={F.mono} textAnchor="end">{toDisp(Number(v.toFixed(1)))}</text></g>;})}
                <path d={pathD+` L${toX(recent.length-1).toFixed(1)},${cH-pd.b} L${pd.l},${cH-pd.b} Z`} fill="url(#wg2)"/>
                <path d={pathD} fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinejoin="round"/>
                {recent.map((p,i)=><circle key={i} cx={toX(i)} cy={toY(p.w)} r="2.5" fill={C.card} stroke={C.accent} strokeWidth="1.5"/>)}
                {recent.filter((_,i)=>i===0||i===recent.length-1).map(p=>{const i=recent.indexOf(p);return <text key={p.date} x={toX(i)} y={cH-6} fill={C.muted} fontSize="7" fontFamily={F.main} textAnchor="middle">{new Date(p.date+"T00:00:00").getDate()}/{new Date(p.date+"T00:00:00").getMonth()+1}</text>;})}
              </svg>
            );
          })()}
        </div>
      )}

      <div style={{background:C.card,borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:600,color:C.muted,letterSpacing:1,marginBottom:10}}>LOG WEIGHT</div>
        <div style={{display:"flex",gap:6}}>
          <input value={weight} onChange={e=>setWeight(e.target.value)} onKeyDown={e=>e.key==="Enter"&&logW()} placeholder={`Today (${unit})`} type="number" step="0.1" style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontFamily:F.mono,fontSize:13}}/>
          <select value={unit} onChange={e=>setUnit(e.target.value)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",color:C.text,fontFamily:F.main,fontSize:11}}><option value="kg">kg</option><option value="lbs">lbs</option></select>
          <button onClick={logW} style={{padding:"0 14px",background:weight?C.accent:C.border,color:weight?C.bg:C.muted,border:"none",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer"}}>{saved?"✓":"Log"}</button>
        </div>
      </div>

      <div style={{background:C.card,borderRadius:14,padding:14}}>
        <button onClick={()=>setShowPw(!showPw)} style={{width:"100%",display:"flex",justifyContent:"space-between",background:"none",border:"none",cursor:"pointer"}}><span style={{fontSize:13,fontWeight:600,color:C.text}}>🔒 Change Password</span><span style={{color:C.muted}}>{showPw?"▲":"▼"}</span></button>
        {showPw&&(<div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
          {pwOk?<div style={{textAlign:"center",color:C.green,padding:12}}>✅ Updated!</div>:<>
            <input value={pwC} onChange={e=>setPwC(e.target.value)} placeholder="Current password" type="password" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontFamily:F.main,fontSize:12}}/>
            <input value={pwN} onChange={e=>setPwN(e.target.value)} placeholder="New password" type="password" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontFamily:F.main,fontSize:12}}/>
            <input value={pwR} onChange={e=>setPwR(e.target.value)} placeholder="Confirm" type="password" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontFamily:F.main,fontSize:12}}/>
            {pwE&&<div style={{color:C.red,fontSize:11}}>{pwE}</div>}
            <button onClick={changePw} disabled={!pwC||pwN.length<6||pwN!==pwR} style={{padding:10,background:pwC&&pwN.length>=6&&pwN===pwR?C.accent:C.border,color:pwC&&pwN.length>=6&&pwN===pwR?C.bg:C.muted,border:"none",borderRadius:8,fontFamily:F.main,fontSize:13,fontWeight:700,cursor:"pointer"}}>Update</button>
          </>}
        </div>)}
      </div>

      <button onClick={onLogout} style={{padding:14,background:"none",border:`1px solid ${C.red}44`,borderRadius:14,color:C.red,fontFamily:F.main,fontSize:14,fontWeight:600,cursor:"pointer"}}>Sign Out</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP SHELL
// ══════════════════════════════════════════════════════════════════════════════
export default function MobileApp() {
  const [token,setToken]=useState(()=>gt()), [profile,setProfile]=useState(null), [tab,setTab]=useState("home");
  const [plan,setPlan]=useState({}), [selectedDay,setSelectedDay]=useState(today()), [events,setEvents]=useState([]);
  const [moodLog,setMoodLog]=useState({}), [videos,setVideos]=useState([]), [shoppingItems,setShoppingItems]=useState([]);
  const saveTimer=useRef(null), shopTimer=useRef(null);

  useEffect(()=>{if(!token)return;(async()=>{try{const me=await api("/auth/me");setProfile(me);}catch{setToken("");setProfile(null);localStorage.removeItem(TK);}})();},[token]);

  useEffect(()=>{if(!profile?.id)return;const load=async()=>{try{const rows=await api(`/macro-plans/${profile.id}`);const vals=(rows||[]).filter(Boolean);if(!vals.length)return;const byDay={};vals.forEach(r=>{if(r.day_of_week)byDay[r.day_of_week]={calories:Number(r.calories||0),protein:Number(r.protein_g||0),carbs:Number(r.carbs_g||0),fat:Number(r.fat_g||0)};});goalsByDay=byDay;const sum=vals.reduce((a,r)=>({calories:a.calories+Number(r.calories||0),protein:a.protein+Number(r.protein_g||0),carbs:a.carbs+Number(r.carbs_g||0),fat:a.fat+Number(r.fat_g||0)}),{calories:0,protein:0,carbs:0,fat:0});const n=Math.max(1,vals.length);goals={calories:Math.round(sum.calories/n),protein:Math.round(sum.protein/n),carbs:Math.round(sum.carbs/n),fat:Math.round(sum.fat/n)};}catch{}};load();const i=setInterval(load,30000);return()=>clearInterval(i);},[profile?.id]);

  useEffect(()=>{if(!profile?.id)return;(async()=>{try{const wd=weekDates(),s=wd[0].date,e=wd[6].date,rows=await api(`/food-logs/${profile.id}?start=${s}&end=${e}`);if(!Array.isArray(rows))return;const p={};wd.forEach(({date})=>{p[date]={};MEALS.forEach(m=>p[date][m]=[]);});rows.forEach(r=>{if(!p[r.date]){p[r.date]={};MEALS.forEach(m=>p[r.date][m]=[]);}(r.foods||[]).forEach(f=>{const meal=MEALS.includes(f.meal)?f.meal:"Snack";p[r.date][meal].push({name:f.name,calories:Number(f.calories||0),protein:Number(f.protein_g??f.protein??0),carbs:Number(f.carbs_g??f.carbs??0),fat:Number(f.fat_g??f.fat??0),source:f.source||"manual"});});});setPlan(p);}catch{}})();},[profile?.id]);

  useEffect(()=>{if(!profile?.id)return;(async()=>{try{const rows=await api(`/calendar-events/${profile.id}`);if(Array.isArray(rows))setEvents(rows.map(ev=>{const n=ev.notes||"";const m=n.match(/^\[type:(\w+)\]/);return{...ev,type:m?m[1]:"reminder",notes:m?n.replace(/^\[type:\w+\]/,""):n};}));}catch{}})();},[profile?.id]);

  useEffect(()=>{if(!profile?.id)return;(async()=>{try{const rows=await api(`/mood/${profile.id}`);if(Array.isArray(rows)){const m={};rows.forEach(r=>{m[r.date]={id:r.score,label:r.label};});setMoodLog(m);};}catch{}})();},[profile?.id]);

  useEffect(()=>{if(!profile?.id)return;(async()=>{try{const r=await api(`/coach-videos/${profile.id}`);if(Array.isArray(r))setVideos(r);}catch{}})();},[profile?.id]);

  useEffect(()=>{if(!profile?.id)return;(async()=>{try{const r=await api(`/shopping-list/${profile.id}`);if(r&&Array.isArray(r.items))setShoppingItems(r.items);}catch{}})();},[profile?.id]);

  useEffect(()=>{if(!profile?.id)return;clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>{let has=false;Object.keys(plan).forEach(ds=>{const dp=plan[ds];if(dp)MEALS.forEach(m=>{if((dp[m]||[]).length>0)has=true;});});if(!has)return;Object.keys(plan).forEach(ds=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(ds))return;const dp=plan[ds];if(!dp)return;const foods=[];MEALS.forEach(meal=>(dp[meal]||[]).forEach(f=>foods.push({name:f.name||"",calories:Math.round(f.calories||0),protein_g:Math.round(f.protein||0),carbs_g:Math.round(f.carbs||0),fat_g:Math.round(f.fat||0),meal,source:f.source||"manual"})));if(foods.length===0)return;api(`/food-logs/${profile.id}`,{method:"PUT",body:JSON.stringify({date:ds,foods})}).catch(()=>{});});},2000);return()=>clearTimeout(saveTimer.current);},[plan,profile?.id]);

  useEffect(()=>{if(!profile?.id)return;clearTimeout(shopTimer.current);shopTimer.current=setTimeout(()=>{api(`/shopping-list/${profile.id}`,{method:"PUT",body:JSON.stringify({items:shoppingItems})}).catch(()=>{});},800);return()=>clearTimeout(shopTimer.current);},[shoppingItems,profile?.id]);

  const logout=()=>{localStorage.removeItem(TK);setToken("");setProfile(null);setPlan({});setTab("home");};

  if(!token||!profile) return <Login onLogin={(u,t)=>{setToken(t);setProfile(u);}}/>;
  if(profile.mustChangePassword) return <ForcePw profile={profile} onDone={p=>setProfile(p)}/>;

  const tabs=[{id:"home",icon:"🏠",label:"Home"},{id:"meals",icon:"🍽️",label:"Meals"},{id:"shop",icon:"🛒",label:"Shop"},{id:"inbox",icon:"💬",label:"Inbox"},{id:"profile",icon:"👤",label:"Me"}];

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F.main,color:C.text,display:"flex",flexDirection:"column"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{display:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      <div style={{flex:1,padding:"16px 16px 88px",overflowY:"auto",animation:"fadeUp .25s ease"}}>
        {tab==="home"&&<HomeTab profile={profile} plan={plan} events={events} moodLog={moodLog} setMoodLog={setMoodLog} videos={videos}/>}
        {tab==="meals"&&<MealsTab plan={plan} setPlan={setPlan} selectedDay={selectedDay} setSelectedDay={setSelectedDay} shoppingItems={shoppingItems} setShoppingItems={setShoppingItems}/>}
        {tab==="shop"&&<ShoppingTab items={shoppingItems} setItems={setShoppingItems} plan={plan}/>}
        {tab==="inbox"&&<InboxTab profile={profile}/>}
        {tab==="profile"&&<ProfileTab profile={profile} onLogout={logout}/>}
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.bg+"f5",backdropFilter:"blur(16px)",borderTop:`1px solid ${C.border}`,display:"flex",padding:"6px 0 env(safe-area-inset-bottom, 6px)",zIndex:100}}>
        {tabs.map(t=>{const a=tab===t.id;return(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1,background:"none",border:"none",cursor:"pointer",padding:"5px 0"}}>
            <span style={{fontSize:20,filter:a?"none":"grayscale(1)",opacity:a?1:.5}}>{t.icon}</span>
            <span style={{fontSize:8,fontWeight:a?700:400,color:a?C.accent:C.muted}}>{t.label}</span>
            {a&&<div style={{width:4,height:4,borderRadius:2,background:C.accent,marginTop:1}}/>}
          </button>
        );})}
      </div>
    </div>
  );
}
