const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.jsx');
let code = fs.readFileSync(filePath, 'utf8');

// ── 1. Replace hardcoded login with real API call ──────────────────────────
const oldLogin = `  const handleLogin = () => {
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const account = ACCOUNTS.find(
        (a) => a.email === email.trim().toLowerCase() && a.password === password
      );
      if (account) {
        onLogin(account);
      } else {
        setError("Incorrect email or password. Try a demo account below.");
      }
      setLoading(false);
    }, 700);
  };`;

const newLogin = `  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("https://no-rules-api-production.up.railway.app/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onLogin(data.user);
      } else {
        setError(data.error || "Incorrect email or password.");
      }
    } catch (err) {
      setError("Could not connect to server. Please try again.");
    }
    setLoading(false);
  };`;

if (code.includes(oldLogin)) {
  code = code.replace(oldLogin, newLogin);
  console.log('✅ Login function updated to use real backend');
} else {
  console.log('⚠️  Login function not found — may already be updated');
}

// ── 2. Remove demo accounts UI block ──────────────────────────────────────
// Find from {/* Demo accounts */} to the closing </div> of that section
const demoStart = `        {/* Demo accounts */}`;
const startIdx = code.indexOf(demoStart);

if (startIdx === -1) {
  console.log('⚠️  Demo accounts block not found — may already be removed');
} else {
  // Find the closing </div>\n      </div> that ends the demo block
  // The demo block is a <div> containing the list — we find its closing tag
  // by counting div opens/closes from startIdx
  let depth = 0;
  let i = startIdx;
  let inBlock = false;
  let endIdx = -1;

  while (i < code.length) {
    if (code.slice(i, i + 5) === '<div ') {
      depth++;
      inBlock = true;
      i += 5;
    } else if (code.slice(i, i + 4) === '<div') {
      depth++;
      inBlock = true;
      i += 4;
    } else if (code.slice(i, i + 6) === '</div>') {
      if (inBlock) {
        depth--;
        if (depth === 0) {
          endIdx = i + 6;
          break;
        }
      }
      i += 6;
    } else {
      i++;
    }
  }

  if (endIdx !== -1) {
    // Remove from startIdx to endIdx (inclusive of trailing newline)
    let removeEnd = endIdx;
    if (code[removeEnd] === '\n') removeEnd++;
    code = code.slice(0, startIdx) + code.slice(removeEnd);
    console.log('✅ Demo accounts block removed');
  } else {
    console.log('⚠️  Could not find end of demo accounts block');
  }
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ App.jsx patched and saved');
console.log('');
console.log('Now run:');
console.log('  git add .');
console.log('  git commit -m "remove demo accounts, connect real login"');
console.log('  git push');
