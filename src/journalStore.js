// src/journalStore.js
// Local-first persistence for athlete daily journal by date (YYYY-MM-DD).
// NOTE: Backend sync is handled in App.jsx via API calls.

const key = (athleteId) => `nrn_journal_${athleteId}`;

const emptyDay = (dateISO) => ({
  date: dateISO,
  foods: [],
  totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  weight: null, // { kg:number, note?:string }
  mood: null,   // { id:number, emoji?:string, label?:string, color?:string, note?:string }
  calendar: [], // [{ id, title, startISO, endISO, notes }]
  notes: "",
});

export function loadJournal(athleteId) {
  try {
    return JSON.parse(localStorage.getItem(key(athleteId)) || "{}");
  } catch {
    return {};
  }
}

export function saveJournal(athleteId, journalObj) {
  localStorage.setItem(key(athleteId), JSON.stringify(journalObj || {}));
}

export function getDay(athleteId, dateISO) {
  const j = loadJournal(athleteId);
  return j[dateISO] || emptyDay(dateISO);
}

export function upsertDay(athleteId, dateISO, patch) {
  const j = loadJournal(athleteId);
  const prev = j[dateISO] || emptyDay(dateISO);
  const next = {
    ...prev,
    ...patch,
    date: dateISO,
    totals: patch?.totals ? { ...prev.totals, ...patch.totals } : prev.totals,
    foods: Array.isArray(patch?.foods) ? patch.foods : prev.foods,
    calendar: Array.isArray(patch?.calendar) ? patch.calendar : prev.calendar,
  };
  j[dateISO] = next;
  saveJournal(athleteId, j);
  return next;
}
