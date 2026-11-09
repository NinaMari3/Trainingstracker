import { useState, useEffect, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Dot } from "recharts";
import { Dumbbell, Activity, TrendingUp, Calendar, Plus, X, Trophy, Music, Footprints, Flame, ChevronRight, AlertTriangle, Check, Trash2, Flower2, Sparkles, ClipboardList, Copy, Pencil, Moon, ChevronUp, ChevronDown, Timer, Play, Pause, RotateCcw, SkipForward, Minimize2, Maximize2 } from "lucide-react";

const INK = "#123049";
const PAPER = "#E9F3FB";
const CARD = "#FFFFFF";
const LINE = "#CBE3F3";
const IRON = "#2E86C1";
const CHALK = "#5CA8E0";
const AMBER = "#C9862B";
const RUST = "#B4502F";
const MUTE = "#6C8AA3";

const TYPES = [
  { id: "calisthenics", label: "Calisthenics", icon: Dumbbell, color: IRON, load: "Skill" },
  { id: "legs", label: "Beine", icon: Flame, color: RUST, load: "Hard" },
  { id: "strength", label: "Kraft (Gym)", icon: Dumbbell, color: CHALK, load: "Hard" },
  { id: "hyrox", label: "HYROX", icon: Activity, color: RUST, load: "Hard/Very Hard" },
  { id: "running", label: "Zone 2 Run", icon: Footprints, color: CHALK, load: "Easy" },
  { id: "twerk", label: "Tanzen", icon: Music, color: AMBER, load: "Moderate" },
  { id: "yoga", label: "Yoga", icon: Flower2, color: CHALK, load: "Easy/Moderate" },
  { id: "recovery", label: "Ruhetag", icon: Check, load: "Easy" },
  { id: "other", label: "Sonstiges", icon: Sparkles, color: MUTE, load: "—" },
];

const WEEK_PLAN = [
  { day: "Mo", label: "Tanzen", parts: [{ type: "twerk" }] },
  { day: "Di", label: "HYROX", parts: [{ type: "hyrox" }] },
  { day: "Mi", label: "Calli A", parts: [{ type: "calisthenics", focus: "a" }] },
  { day: "Do", label: "Beintag", parts: [{ type: "legs", focus: "do" }] },
  { day: "Fr", label: "Ruhetag", rest: true, parts: [] },
  { day: "Sa", label: "Calli B + Beine", load: "Skill + Beine", parts: [{ type: "calisthenics", focus: "b" }, { type: "legs", focus: "sa" }] },
  { day: "So", label: "Ruhetag", rest: true, parts: [] },
];
function planMeta(w) {
  if (w.rest) return { icon: Moon, color: MUTE, load: "Easy" };
  const m = TYPES.find(t => t.id === w.parts[0].type);
  return { icon: m.icon, color: m.color, load: w.load || m.load };
}
function sessionLabel(s) {
  const meta = TYPES.find(t => t.id === s.type);
  if (s.type === "other") return s.customLabel || "Sonstiges";
  if (s.planName) return s.planName;
  if (s.type === "calisthenics" && s.focus) return "Calisthenics " + s.focus.toUpperCase();
  if (s.type === "legs" && s.focus === "sa") return "Beine (Samstag)";
  if (s.type === "legs" && s.focus === "do") return "Beintag";
  return meta ? meta.label : s.type;
}

const LADDERS = {
  muscleup: ["Baseline", "Chest-to-bar", "Explosive high pull", "Straight-bar dip", "Assisted MU", "Reduced assistance", "Freier Muscle-up"],
  handstand: ["Baseline", "Wall hold 10s", "Freier hold 10s", "20s frei", "30s frei", "Stabiler Handstand"],
  lsit: ["Baseline", "Tuck hold", "One-leg", "Vollständiger L-Sit", "20-30s Hold"],
};

const SESSION_TEMPLATES = {
  legs: { title: "Beintag – Kraft & Muskelaufbau", note: "Teste, ob Goblet Squat oder Leg Press für deinen Rücken angenehmer ist. Romanian Deadlifts nur, wenn sie schmerzfrei sind. Kontrolliert ausführen und das Gewicht schrittweise steigern.", exercises: [
    { name: "Leg Press", sets: 4, hint: "6-10" },
    { name: "Goblet Squat", sets: 4, hint: "6-10", altOf: "Leg Press", skipInAll: true },
    { name: "Romanian Deadlift", sets: 3, hint: "6-10" },
    { name: "Hip Thrust", sets: 4, hint: "8-10" },
    { name: "Step-ups", sets: 3, hint: "8-10/Bein" },
  ]},
  legs_sa: { title: "Samstag – Beine & Gesäß", note: "Darf etwas leichter sein als donnerstags. Nicht jeden Satz bis zum Muskelversagen. Bist du noch stark vom Donnerstag erschöpft, reduziere das Volumen.", exercises: [
    { name: "Hip Thrust", sets: 3, hint: "8-12" },
    { name: "Bulgarian Split Squat", sets: 3, hint: "8-12/Bein" },
  ]},
  calisthenics_a: { title: "Calisthenics A – Muscle-up & Push", note: "High Pulls mit maximaler Explosivität. Negative Muscle-ups kontrolliert und sauber. Parallette Push-ups: langsam runter, explosiv hoch, Satz beenden, sobald es nicht mehr sauber geht. Australian Rows: Füße erhöht oder Zusatzgewicht für mehr Schwierigkeit. Den Muscle-up-Übergang ergänzt du nach deinem Kurs.", exercises: [
    { name: "Handstand", sets: 1, hint: "10-15 Min Balance Drills, bester Hold", isHold: true },
    { name: "Explosive High Pulls", sets: 4, hint: "3-5" },
    { name: "Negative Muscle-ups", sets: 3, hint: "3-5" },
    { name: "Australian Rows", sets: 3, hint: "8-12" },
    { name: "Parallette Push-ups", sets: 4, hint: "sauber" },
    { name: "Pike Push-ups", sets: 3, hint: "6-10" },
    { name: "Toes-to-Bar", sets: 3, hint: "8-10" },
  ]},
  calisthenics_b: { title: "Calisthenics B – Handstand, Pull & L-Sit", note: "Pull-ups mit schulterbreitem bis etwas breiterem Obergriff. Skin the Cat kontrolliert, keine schmerzhafte Schulterbewegung erzwingen. Beim L-Sit eine Progression wählen, die du sauber halten kannst.", exercises: [
    { name: "Handstand", sets: 1, hint: "10-15 Min Balance Drills, bester Hold", isHold: true },
    { name: "Pull-ups", sets: 3, hint: "5-8" },
    { name: "Skin the Cat", sets: 3, hint: "3-5" },
    { name: "L-Sit", sets: 1, hint: "3-4 Sätze, bester Hold", isHold: true },
  ]},
  hyrox: { title: "HYROX (Kurs, variabel)", exercises: [
    { name: "Sled Push", sets: 1, hint: "laut Kurs" },
    { name: "Sled Pull", sets: 1, hint: "laut Kurs" },
    { name: "Wall Balls", sets: 1, hint: "laut Kurs" },
    { name: "Farmers Carry", sets: 1, hint: "laut Kurs" },
    { name: "Burpee Broad Jumps", sets: 1, hint: "laut Kurs" },
    { name: "Rowing", sets: 1, hint: "laut Kurs" },
  ]},
};

const SEED = {
  sessions: [
    {
      id: "backfill-1", date: "2026-08-20", type: "calisthenics", focus: "a",
      exercises: [
        { name: "Explosive High Pulls", sets: [
          { reps: 8, weight: 0, rir: 2, assist: "Lila Band" },
          { reps: 7, weight: 0, rir: 2, assist: "Lila Band" },
          { reps: 6, weight: 0, rir: 2, assist: "Lila Band" },
          { reps: 6, weight: 0, rir: 2, assist: "Lila Band" },
        ]},
        { name: "Close-grip Pull-ups", sets: [
          { reps: 5, weight: 0, rir: 0, assist: "Kein Band" },
          { reps: 6, weight: 0, rir: 0, assist: "Rotes Band" },
          { reps: 6, weight: 0, rir: 1, assist: "Rotes Band" },
        ]},
        { name: "Toes-to-Bar", sets: [
          { reps: 8, weight: 0, rir: 2, assist: "Kein Band" },
          { reps: 8, weight: 0, rir: 2, assist: "Kein Band" },
          { reps: 8, weight: 0, rir: 2, assist: "Kein Band" },
          { reps: 8, weight: 0, rir: 2, assist: "Kein Band" },
        ]},
        { name: "Dips", sets: [
          { reps: 9, weight: 10, rir: 2, assist: "Kein Band", weightMode: "assist" },
          { reps: 8, weight: 10, rir: 2, assist: "Kein Band", weightMode: "assist" },
          { reps: 8, weight: 10, rir: 2, assist: "Kein Band", weightMode: "assist" },
          { reps: 8, weight: 10, rir: 0, assist: "Kein Band", weightMode: "assist" },
        ]},
        { name: "Chin-ups", sets: [
          { reps: 3, weight: 0, rir: 0, assist: "Kein Band" },
          { reps: 5, weight: 0, rir: 1, assist: "Rotes Band" },
          { reps: 5, weight: 0, rir: 1, assist: "Rotes Band" },
          { reps: 5, weight: 0, rir: 2, assist: "Rotes Band" },
        ]},
      ],
      notes: "Handstand 4 Versuche geübt (Bauch & Rücken zur Wand), keine Zeit erfasst. Toes-to-Bar: ROM nur ~90°, nur erste 2 Wdh näher an voll.",
    },
    {
      id: "backfill-2", date: "2026-08-25", type: "calisthenics", focus: "a",
      exercises: [
        { name: "Explosive High Pulls", sets: [
          { reps: 8, weight: 0, rir: 2, assist: "Schwarzes Band" },
          { reps: 8, weight: 0, rir: 2, assist: "Schwarzes Band" },
          { reps: 7, weight: 0, rir: 2, assist: "Schwarzes Band" },
          { reps: 6, weight: 0, rir: 2, assist: "Schwarzes Band" },
        ]},
        { name: "Wide Pull-ups", sets: [
          { reps: 6, weight: 0, rir: null, assist: "Rotes Band" },
          { reps: 5, weight: 0, rir: null, assist: "Rotes Band" },
          { reps: 5, weight: 0, rir: null, assist: "Rotes Band" },
          { reps: 5, weight: 0, rir: null, assist: "Rotes Band" },
        ]},
        { name: "Chin-ups", sets: [
          { reps: 5, weight: 0, rir: 1, assist: "Rotes Band" },
          { reps: 5, weight: 0, rir: 1, assist: "Rotes Band" },
          { reps: 5, weight: 0, rir: 1, assist: "Rotes Band" },
          { reps: 5, weight: 0, rir: 1, assist: "Rotes Band" },
        ]},
        { name: "Parallette Push-ups", sets: [
          { reps: 10, weight: 0, rir: 2, assist: "Kein Band" },
          { reps: 10, weight: 0, rir: 2, assist: "Kein Band" },
          { reps: 10, weight: 0, rir: 2, assist: "Kein Band" },
          { reps: 10, weight: 0, rir: 2, assist: "Kein Band" },
        ]},
        { name: "Hanging Leg Raises", sets: [
          { reps: 8, weight: 0, rir: 2, assist: "Kein Band" },
          { reps: 8, weight: 0, rir: 2, assist: "Kein Band" },
          { reps: 8, weight: 0, rir: 2, assist: "Kein Band" },
          { reps: 8, weight: 0, rir: 2, assist: "Kein Band" },
        ]},
        { name: "Dips", sets: [
          { reps: 8, weight: 10, rir: 2, assist: "Kein Band", weightMode: "assist" },
          { reps: 8, weight: 10, rir: 2, assist: "Kein Band", weightMode: "assist" },
          { reps: 6, weight: 5, rir: 1, assist: "Kein Band", weightMode: "assist" },
          { reps: 5, weight: 5, rir: 1, assist: "Kein Band", weightMode: "assist" },
        ]},
      ],
      notes: "Handstand 4 Versuche geübt, keine Zeit erfasst. Wide Pull-ups RIR grob 1-2, nicht exakt pro Satz erfasst.",
    },
  ],
  milestoneStages: { muscleup: 1, handstand: 1, lsit: 0 },
  baseline: {
    "Close-grip Pull-ups": { value: 10, unit: "reps" },
    "Wide Pull-ups": { value: 6, unit: "reps" },
    "Dips": { value: 5, unit: "reps" },
    "Chest-to-bar Pull-ups": { value: 5, unit: "reps" },
    "Straight-bar Dips": { value: 4, unit: "reps" },
    "Muscle-up": { value: 0, unit: "reps" },
    "Handstand": { value: 10, unit: "s" },
    "L-Sit": { value: 5, unit: "s" },
    "Hip Thrust": { value: 110, unit: "kg" },
    "Squat": { value: 67.5, unit: "kg" },
    "Romanian Deadlift": { value: 70, unit: "kg" },
    "Lunges": { value: 12, unit: "kg" },
  },
  prs: [],
  plans: [],
};

function uid() { return Math.random().toString(36).slice(2, 10); }
function toLocalISO(d) { const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,"0"); const day = String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function todayISO() { return toLocalISO(new Date()); }
function fmtDate(iso) { const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }); }
function mondayOf(d) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x; }

const ASSIST_LEVELS = ["Kein Band", "Gelbes Band", "Rotes Band", "Schwarzes Band", "Lila Band"];
function assistRank(a) { const i = ASSIST_LEVELS.indexOf(a || "Kein Band"); return i === -1 ? 0 : i; }
const WEIGHT_MODES = ["Zusatzlast (mehr = schwerer)", "Unterstützung in kg (weniger = schwerer)"];
function weightModeOf(s) { return s.weightMode === "assist" || s.weightMode === WEIGHT_MODES[1] ? "assist" : "add"; }

const SET_TYPES = ["Normal", "Aufwärmen", "Supersatz", "Dropset", "Bis Versagen", "Max-Test"];
const NON_WORKING = ["Aufwärmen", "Dropset"];
const GRIPS = ["Keine Angabe", "Normal", "Monkey Grip", "Zughilfen (Straps)", "Obergriff", "Untergriff", "Neutral (parallel)", "Breit", "Eng", "False Grip", "Gemischt"];

function trainingSets(sets) { return workingSets(sets).filter(s => s.setType !== "Max-Test"); }
function workingSets(sets) {
  return (sets || []).filter(s => !NON_WORKING.includes(s.setType) && ((s.reps || 0) > 0 || (s.weight || 0) > 0));
}
function fmtNum(n) { return String(Math.round(n * 100) / 100).replace(".", ","); }
function parseRange(str) {
  if (!str) return null;
  const t = String(str);
  const m = t.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return { min: +m[1], max: +m[2] };
  const n = t.match(/^\s*(\d+)\s*(\/.*)?$/);
  if (n) return { min: +n[1], max: +n[1] };
  return null;
}
function rangeText(hint) { const r = parseRange(hint); return r && r.max > r.min ? `${r.min}-${r.max}` : ""; }
function weightStep(name) { return /hip thrust|leg press|romanian|deadlift|^squat/i.test(name) ? 5 : 2.5; }
function guessRest(name) {
  const n = String(name).toLowerCase();
  if (/explosive|muscle-up|high pull/.test(n)) return 150;
  if (/hip thrust|leg press|squat|deadlift/.test(n)) return 120;
  if (/handstand|skin the cat|l-sit/.test(n)) return 60;
  return 90;
}
function templateHintFor(name) {
  for (const t of Object.values(SESSION_TEMPLATES)) {
    const f = t.exercises.find(e => e.name.toLowerCase() === String(name).toLowerCase());
    if (f) return f.hint;
  }
  return undefined;
}
function bandDat(b) {
  if (!b || b === "Kein Band") return "ohne Band";
  return "dem " + b.replace(/es Band$/, "en Band").replace(/^./, c => c.toLowerCase()).replace(/band$/, "Band");
}
function fmtSet(st, compact) {
  const w = st.weight ? `x${fmtNum(st.weight)}kg${st.weightMode === "assist" ? " Unterst." : ""}` : "";
  const r = st.rir != null ? (compact ? `(${st.rir}RIR)` : ` (${st.rir} RIR)`) : "";
  const b = st.assist && st.assist !== "Kein Band" ? (compact ? `[${st.assist}]` : ` [${st.assist}]`) : "";
  const t = st.setType && st.setType !== "Normal" ? (compact ? `{${st.setType}}` : ` {${st.setType}}`) : "";
  return `${st.reps || 0}${w}${r}${b}${t}`;
}

function exerciseValue(ex) {
  if (ex.holdSeconds) return { value: ex.holdSeconds, unit: "s", assist: "Kein Band" };
  const sets = workingSets(ex.sets);
  if (!sets.length) return null;
  const minRank = Math.min(...sets.map(s => assistRank(s.assist)));
  const hardestSets = sets.filter(s => assistRank(s.assist) === minRank);
  const withWeight = hardestSets.filter(s => s.weight > 0);
  const assistLabel = ASSIST_LEVELS[minRank];
  if (withWeight.length) {
    const mode = weightModeOf(withWeight[0]);
    const value = mode === "assist" ? Math.min(...withWeight.map(s => s.weight)) : Math.max(...withWeight.map(s => s.weight));
    return { value, unit: "kg", assist: assistLabel, weightMode: mode };
  }
  return { value: Math.max(...hardestSets.map(s => s.reps || 0)), unit: "reps", assist: assistLabel };
}

function metricSeries(sessions, name) {
  const pts = [];
  sessions.forEach(s => {
    (s.exercises || []).forEach(ex => {
      if (ex.name.toLowerCase() === name.toLowerCase()) {
        const v = exerciseValue(ex);
        if (v) pts.push({ date: s.date, value: v.value, unit: v.unit, assist: v.assist, weightMode: v.weightMode });
      }
    });
  });
  return pts.sort((a, b) => a.date.localeCompare(b.date));
}

function currentBest(sessions, name, baseline) {
  const series = metricSeries(sessions, name);
  const base = baseline[name];
  let best = base ? { value: base.value, unit: base.unit, date: null, assist: "Kein Band", weightMode: "add" } : null;
  series.forEach(p => {
    if (!best || (best.date === null && best.unit !== p.unit)) { best = p; return; }
    const isAssistKg = p.unit === "kg" && p.weightMode === "assist";
    const better = isAssistKg ? p.value <= best.value : p.value >= best.value;
    if (better) best = p;
  });
  return best;
}

function findPreviousExercise(sessions, name, focus) {
  const all = [];
  sessions.forEach(sess => {
    (sess.exercises || []).forEach(ex => {
      if (ex.name.toLowerCase() === name.toLowerCase()) all.push({ date: sess.date, ex, focus: sess.focus });
    });
  });
  all.reverse();
  all.sort((a, b) => b.date.localeCompare(a.date));
  if (focus) {
    const same = all.filter(m => m.focus === focus);
    if (same.length) return same;
  }
  return all;
}

function exerciseHistoryNote(sessions, name, focus) {
  const matches = findPreviousExercise(sessions, name, focus);
  if (!matches.length) return null;
  const last = matches[0];
  const v = exerciseValue(last.ex);
  if (!v) return `Zuletzt am ${fmtDate(last.date)} geloggt.`;
  const assistSuffix = v.assist && v.assist !== "Kein Band" ? ` (${v.assist})` : "";
  if (v.unit === "kg") {
    let streak = 0;
    for (const m of matches) {
      const mv = exerciseValue(m.ex);
      if (mv && mv.unit === "kg" && mv.value === v.value) streak++; else break;
    }
    const modeLabel = v.weightMode === "assist" ? "Unterstützung" : "Gewicht";
    return `${v.value} kg ${modeLabel}${assistSuffix} zuletzt am ${fmtDate(last.date)} · bereits ${streak}x in Folge verwendet`;
  }
  return `Zuletzt ${v.value} ${v.unit}${assistSuffix} am ${fmtDate(last.date)}`;
}

function daysBetween(a, b) { return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000); }
function kindOfSet(s) { return s.weight > 0 ? (weightModeOf(s) === "assist" ? "assistkg" : "add") : "bodyweight"; }
function setScore(kind, s) {
  const reps = s.reps || 0;
  if (kind === "add") return (s.weight || 0) * 1000 + reps;
  if (kind === "assistkg") return (1000 - (s.weight || 0)) * 1000 + reps;
  return (10 - assistRank(s.assist)) * 1000 + reps;
}
function fmtMaxSet(kind, s) {
  if (kind === "add") return `${fmtNum(s.weight)} kg${s.reps ? ` × ${s.reps}` : ""}`;
  if (kind === "assistkg") return `${fmtNum(s.weight)} kg Unterst.${s.reps ? ` × ${s.reps}` : ""}`;
  return `${s.reps} Wdh${assistRank(s.assist) > 0 ? ` (${s.assist})` : ""}`;
}
function maxCandidates(sets) {
  return (sets || []).filter(s => ((s.reps || 0) > 0 || (s.weight || 0) > 0) && !NON_WORKING.includes(s.setType));
}

// Max pro Übung: wird automatisch aus allen Logs berechnet (beste Wiederholungszahl, höchstes Gewicht,
// längster Hold, je nach Übungsformat). Ein selbst eingetragener Wert gilt, solange er nicht von einem
// späteren, besseren Log überholt wird.
function effectiveMax(sessions, name, extra, baseline) {
  const key = String(name).toLowerCase();
  const entries = [];
  sessions.forEach((sess, i) => (sess.exercises || []).forEach(ex => {
    if (ex.name.toLowerCase() === key) entries.push({ date: sess.date, i, ex });
  }));
  if (extra) entries.push({ date: extra.date, i: 1e9, ex: extra.ex });
  if (!entries.length) return null;
  entries.sort((a, b) => a.date.localeCompare(b.date) || a.i - b.i);

  let kind = null;
  for (let k = entries.length - 1; k >= 0 && !kind; k--) {
    const ex = entries[k].ex;
    if (ex.holdSeconds) kind = "hold";
    else { const c = maxCandidates(ex.sets); if (c.length) kind = kindOfSet(c[0]); }
  }
  let best = null;
  const base = baseline && baseline[name];
  if (kind && base) {
    if (kind === "hold" && base.unit === "s") best = { score: base.value, primary: base.value, date: null, text: `${base.value} s` };
    if (kind === "bodyweight" && base.unit === "reps") best = { score: 10 * 1000 + base.value, primary: base.value, date: null, text: `${base.value} Wdh` };
    if (kind === "add" && base.unit === "kg") best = { score: base.value * 1000, primary: base.value, date: null, text: `${fmtNum(base.value)} kg` };
  }
  let lastTest = null;
  entries.forEach(({ date, ex }) => {
    if ((ex.sets || []).some(s => s.setType === "Max-Test")) lastTest = date;
    if (!kind) return;
    if (kind === "hold") {
      if (ex.holdSeconds && (!best || ex.holdSeconds >= best.score)) best = { score: ex.holdSeconds, primary: ex.holdSeconds, date, text: `${ex.holdSeconds} s` };
      return;
    }
    maxCandidates(ex.sets).filter(s => kindOfSet(s) === kind).forEach(s => {
      const sc = setScore(kind, s);
      if (!best || sc >= best.score) best = { score: sc, primary: kind === "bodyweight" ? (s.reps || 0) : (s.weight || 0), date, text: fmtMaxSet(kind, s) };
    });
  });

  let manual = null;
  for (let k = entries.length - 1; k >= 0; k--) {
    const { ex, date } = entries[k];
    const txt = String(ex.max || "").trim();
    if (ex.maxManual === false) break;
    if (ex.maxManual === true) { if (txt) manual = { text: txt, date: ex.maxAt || date }; break; }
    if (txt) { manual = { text: txt, date: ex.maxAt || date }; break; }
  }
  const num = (t) => { const m = String(t).replace(",", ".").match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
  let useManual = false;
  if (manual) {
    if (!best) useManual = true;
    else {
      const mv = num(manual.text);
      if (mv == null) useManual = !best.date || manual.date >= best.date;
      else if (kind === "assistkg") useManual = mv < best.primary || (mv === best.primary && manual.date >= (best.date || ""));
      else useManual = mv > best.primary || (mv === best.primary && manual.date >= (best.date || ""));
    }
  }
  let source = "auto";
  let text = best ? best.text : null;
  let date = best ? best.date : null;
  if (useManual) { source = "manual"; text = manual.text; date = manual.date; }
  if (!text) return null;
  return {
    text, date, source, lastTest, lastLogged: entries[entries.length - 1].date,
    manualText: manual ? manual.text : null, manualDate: manual ? manual.date : null,
  };
}

// Hinweis, wenn das Max alt ist (ab 6 Wochen) und die Übung zuletzt noch aktiv trainiert wurde
function maxReminderFor(sessions, name, todayStr) {
  const em = effectiveMax(sessions, name, null, SEED.baseline);
  if (!em || !em.date) return null;
  const base = em.lastTest && em.lastTest > em.date ? em.lastTest : em.date;
  const age = daysBetween(base, todayStr);
  if (age < 42 || daysBetween(em.lastLogged, todayStr) > 56) return null;
  return { name, weeks: Math.floor(age / 7), text: em.text, age };
}
function exerciseNames(sessions) {
  const names = new Map();
  sessions.forEach(s => (s.exercises || []).forEach(ex => { const k = ex.name.toLowerCase(); if (!names.has(k)) names.set(k, ex.name); }));
  return Array.from(names.values());
}
function maxReminders(sessions, todayStr) {
  return exerciseNames(sessions).map(n => maxReminderFor(sessions, n, todayStr)).filter(Boolean).sort((a, b) => b.age - a.age);
}
function allMaxes(sessions, todayStr) {
  return exerciseNames(sessions).map(name => {
    const em = effectiveMax(sessions, name, null, SEED.baseline);
    if (!em) return null;
    const base = em.date ? (em.lastTest && em.lastTest > em.date ? em.lastTest : em.date) : null;
    return { name, text: em.text, date: em.date, weeks: base ? Math.floor(daysBetween(base, todayStr) / 7) : null, due: !!maxReminderFor(sessions, name, todayStr) };
  }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
}
function formExToStored(e) {
  return {
    name: e.name, holdSeconds: e.holdSeconds ? Number(e.holdSeconds) : undefined,
    max: e.max, maxManual: !!e.maxManual, maxAt: e.maxAt,
    sets: e.holdSeconds ? [] : e.sets.filter(s => s.reps !== "" || s.weight !== "").map(s => ({
      reps: s.reps === "" ? 0 : Number(s.reps), weight: s.weight === "" ? 0 : Number(s.weight), rir: s.rir === "" ? null : Number(s.rir),
      assist: s.assist || "Kein Band", weightMode: s.weightMode === WEIGHT_MODES[1] ? "assist" : "add", setType: s.setType || "Normal",
    })),
  };
}

function perfScore(ex) {
  if (ex.holdSeconds) return ex.holdSeconds;
  const all = trainingSets(ex.sets);
  if (!all.length) return 0;
  const minRank = Math.min(...all.map(s => assistRank(s.assist)));
  const sets = all.filter(s => assistRank(s.assist) === minRank);
  const ws = sets.filter(s => s.weight > 0);
  if (ws.length) {
    const mode = weightModeOf(ws[0]);
    const w = mode === "assist" ? Math.min(...ws.map(s => s.weight)) : Math.max(...ws.map(s => s.weight));
    const reps = Math.min(...ws.filter(s => s.weight === w).map(s => s.reps || 0));
    return (mode === "assist" ? 1000 - w : w) * 1000 + reps - minRank * 1e7;
  }
  return Math.min(...sets.map(s => s.reps || 0)) + (10 - minRank) * 1000;
}

// Doppelte Progression: erst Wiederholungen im Zielbereich füllen, dann Last erhöhen
// (bzw. Band-Hilfe verringern oder Variante verschärfen) und wieder unten im Bereich starten.
function nextTargetSuggestion(sessions, name, focus) {
  const matches = findPreviousExercise(sessions, name, focus);
  if (!matches.length) return null;
  const last = matches[0].ex;
  let stag = "";
  if (matches.length >= 3 && perfScore(matches[0].ex) <= perfScore(matches[2].ex)) {
    stag = " Seit 3 Einheiten kein Fortschritt: prüf Schlaf, Erholung und Technik. Bei Bedarf eine Deload-Woche (ca. 10 % weniger Gewicht oder ein Satz weniger).";
  }
  if (last.holdSeconds) {
    const h = last.holdSeconds;
    const step = Math.max(2, Math.round(h * 0.1));
    return `Ziel: ${h + step} s halten (zuletzt ${h} s, etwa +10 %). Zählt nur, wenn die Haltung sauber bleibt.` + stag;
  }
  const all = trainingSets(last.sets);
  if (!all.length) return null;
  const minRank = Math.min(...all.map(s => assistRank(s.assist)));
  const sets = all.filter(s => assistRank(s.assist) === minRank);
  const band = ASSIST_LEVELS[minRank];
  const bandTxt = minRank > 0 ? ` mit ${bandDat(band)}` : "";
  const rirVals = sets.map(s => s.rir).filter(v => v != null);
  const avgRir = rirVals.length ? rirVals.reduce((a, b) => a + b, 0) / rirVals.length : null;
  const weightSets = sets.filter(s => s.weight > 0);
  const range = parseRange(last.target) || parseRange(templateHintFor(name));

  if (weightSets.length) {
    const mode = weightModeOf(weightSets[0]);
    const w = mode === "assist" ? Math.min(...weightSets.map(s => s.weight)) : Math.max(...weightSets.map(s => s.weight));
    const at = weightSets.filter(s => s.weight === w);
    const minAt = Math.min(...at.map(s => s.reps || 0));
    const repMin = range ? range.min : 8;
    const repMax = range ? Math.max(range.max, range.min) : 12;
    if (mode === "assist") {
      const step = w > 5 ? 5 : w;
      const nw = w - step;
      if (minAt >= repMax) return `Alle Sätze bei ${minAt} Wdh (oberes Ende): nächstes Mal ${nw === 0 ? "ohne" : `nur ${fmtNum(nw)} kg`} Unterstützung und wieder ${repMin} Wdh anpeilen.` + stag;
      if (minAt < repMin) return `Ziel: ${fmtNum(w)} kg Unterstützung halten und alle Sätze auf mindestens ${repMin} Wdh bringen (zuletzt ${minAt}).` + stag;
      return `Ziel: ${fmtNum(w)} kg Unterstützung halten, ${minAt + 1} Wdh auf dem schwächsten Satz (Bereich ${repMin}-${repMax}). Sind alle Sätze bei ${repMax}, gibt es weniger Unterstützung.` + stag;
    }
    const inc = weightStep(name);
    if (minAt >= repMax && (avgRir == null || avgRir <= 3)) return `Alle Sätze am oberen Ende (${minAt} Wdh): Gewicht auf ${fmtNum(w + inc)} kg erhöhen und wieder ${repMin} Wdh anpeilen.` + stag;
    if (avgRir != null && avgRir >= 4) return `Letztes Mal waren noch ${fmtNum(avgRir)} Wdh übrig, ${fmtNum(w)} kg ist zu leicht. Probier ${fmtNum(w + inc)} kg im Bereich ${repMin}-${repMax}.` + stag;
    if (minAt < repMin) return `Ziel: ${fmtNum(w)} kg halten und alle Sätze auf mindestens ${repMin} Wdh bringen (zuletzt ${minAt}).` + stag;
    return `Ziel: ${fmtNum(w)} kg halten, ${minAt + 1} Wdh auf dem schwächsten Satz (Bereich ${repMin}-${repMax}). Sind alle Sätze bei ${repMax}, geht es auf ${fmtNum(w + inc)} kg.` + stag;
  }

  // Körpergewicht, ggf. mit Band
  const repMin = range ? range.min : 6;
  const repMax = range ? Math.max(range.max, range.min) : 12;
  const minReps = Math.min(...sets.map(s => s.reps || 0));
  const nextBand = minRank > 0 ? ASSIST_LEVELS[minRank - 1] : null;
  if (minReps >= repMax) {
    if (minRank > 0) return `Alle Sätze bei ${minReps} Wdh${bandTxt}: nächstes Mal ${bandDat(nextBand)} versuchen und wieder ${repMin} Wdh anpeilen.` + stag;
    return `Alle Sätze bei ${minReps} Wdh: Zeit für mehr Schwierigkeit. Nimm Zusatzgewicht (z. B. 2,5 kg) oder eine schwerere Variante und starte wieder bei ${repMin} Wdh.` + stag;
  }
  if (minReps < repMin) return `Ziel: alle Sätze${bandTxt} auf mindestens ${repMin} Wdh bringen (zuletzt ${minReps}).` + stag;
  const bonus = avgRir != null && avgRir >= 3 ? 2 : 1;
  const upNext = minRank > 0 ? `${bandDat(nextBand)} versuchen` : "Zusatzgewicht oder schwerere Variante";
  return `Ziel: ${Math.min(minReps + bonus, repMax)} Wdh${bandTxt} auf dem schwächsten Satz (Bereich ${repMin}-${repMax}). Sind alle Sätze bei ${repMax}: ${upNext}.` + stag;
}

function buildExportText(data, days) {
  const since = new Date(); since.setDate(since.getDate() - days);
  const sinceISO = toLocalISO(since);
  const sessions = data.sessions.filter(s => s.date >= sinceISO).sort((a,b) => a.date.localeCompare(b.date));
  const prs = data.prs.filter(p => p.date >= sinceISO);
  const lines = [];
  lines.push(`TRAINING UPDATE: letzte ${days} Tage (${fmtDate(sinceISO)} bis ${fmtDate(todayISO())})`);
  lines.push("");
  lines.push("AKTUELLE BESTWERTE");
  ["Close-grip Pull-ups","Wide Pull-ups","Dips","Chest-to-bar Pull-ups","Straight-bar Dips","Muscle-up","Handstand","L-Sit","Hip Thrust","Squat"].forEach(name => {
    const best = currentBest(data.sessions, name, data.baseline);
    lines.push(`- ${name}: ${best ? `${best.value}${best.unit==="reps"?" reps":best.unit==="s"?"s":" kg"}` : "—"}`);
  });
  lines.push("");
  lines.push("MAXIMA (automatisch aus den Logs)");
  const maxList = allMaxes(data.sessions, todayISO());
  if (!maxList.length) lines.push("(noch keine)");
  maxList.forEach(m => lines.push(`- ${m.name}: ${m.text}${m.date ? ` (${fmtDate(m.date)})` : ""}${m.due ? " [Test fällig]" : ""}`));
  lines.push("");
  lines.push(`GELOGGTE EINHEITEN (${sessions.length})`);
  if (!sessions.length) lines.push("(keine Einheiten in diesem Zeitraum geloggt)");
  sessions.forEach(s => {
    const meta = TYPES.find(t => t.id === s.type);
    const label = sessionLabel(s);
    lines.push(`[${fmtDate(s.date)}] ${label}`);
    (s.exercises || []).forEach(ex => {
      const gripTxt = (ex.grip ? ` (Griff: ${ex.grip})` : "") + (ex.max ? ` [Max: ${ex.max}]` : "");
      if (ex.holdSeconds) lines.push(`   - ${ex.name}${gripTxt}: ${ex.holdSeconds}s`);
      else if (ex.sets?.length) lines.push(`   - ${ex.name}${gripTxt}: ${ex.sets.map(st => fmtSet(st, true)).join(", ")}`);
      if (ex.note) lines.push(`       Notiz: ${ex.note}`);
    });
    const extras = [s.duration && `${s.duration}min`, s.distance && `${s.distance}km`, s.avgHR && `⌀HF ${s.avgHR}`, s.rpe && `RPE ${s.rpe}`].filter(Boolean).join(" · ");
    if (extras) lines.push(`   ${extras}`);
    if (s.notes) lines.push(`   Notiz: ${s.notes}`);
  });
  lines.push("");
  lines.push(`PRs IN DIESEM ZEITRAUM (${prs.length})`);
  if (!prs.length) lines.push("(keine)");
  prs.forEach(p => lines.push(`- ${p.category}: ${p.pr} (zuvor ${p.previous})`));
  lines.push("");
  lines.push("MILESTONE-STATUS");
  Object.entries(data.milestoneStages).forEach(([key, stage]) => {
    const label = key === "lsit" ? "L-Sit" : key.charAt(0).toUpperCase() + key.slice(1);
    lines.push(`- ${label}: ${LADDERS[key][stage]}`);
  });
  return lines.join("\n");
}

function ExportModal({ data, onClose, onImport }) {
  const [days, setDays] = useState(14);
  const [copied, setCopied] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.sessions) || !parsed.baseline || !parsed.milestoneStages) throw new Error("bad format");
        if (!window.confirm(`Backup mit ${parsed.sessions.length} Einheiten laden? Die aktuellen Daten in der App werden dabei ersetzt.`)) return;
        onImport({ prs: [], plans: [], ...parsed });
        setImportMsg("Backup geladen.");
      } catch {
        setImportMsg("Datei konnte nicht gelesen werden. Ist das ein Backup aus dieser App?");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }
  const text = useMemo(() => buildExportText(data, days), [data, days]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.getElementById("export-textarea");
      if (ta) { ta.select(); document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(18,48,73,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }} onClick={onClose}>
      <div className="modal-card" onClick={e=>e.stopPropagation()} style={{ background: PAPER, borderRadius: 14, padding: 24, maxWidth: 560, width: "100%", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="sg" style={{ fontSize: 17, fontWeight: 700 }}>Export für Coach-Update</div>
          <button onClick={onClose} style={{ background: "none", border: "none" }}><X size={18} color={MUTE} /></button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[7,14,30].map(d => (
            <button key={d} onClick={()=>setDays(d)} style={{
              padding: "6px 12px", borderRadius: 20, fontSize: 12, border: `1px solid ${days===d?IRON:LINE}`,
              background: days===d?"#DCEEFA":CARD, color: days===d?IRON:INK
            }}>letzte {d} Tage</button>
          ))}
        </div>
        <textarea id="export-textarea" readOnly value={text} rows={16} style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 12, fontFamily: "monospace", background: CARD, resize: "vertical", marginBottom: 12 }} />
        <button onClick={copy} style={{ width: "100%", padding: 12, borderRadius: 8, border: "none", background: INK, color: PAPER, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Copy size={15} /> {copied ? "Kopiert!" : "In Zwischenablage kopieren"}
        </button>
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: MUTE, marginBottom: 8 }}>Backup deiner Daten (z. B. beim Handywechsel)</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={downloadBackup} className="btn-ghost" style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${LINE}`, background: CARD, color: INK, fontSize: 13 }}>Backup speichern</button>
            <label className="btn-ghost" style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${LINE}`, background: CARD, color: INK, fontSize: 13, textAlign: "center", cursor: "pointer" }}>
              Backup laden
              <input type="file" accept="application/json,.json" onChange={handleImportFile} style={{ display: "none" }} />
            </label>
          </div>
          {importMsg && <div style={{ fontSize: 12, color: MUTE, marginTop: 8 }}>{importMsg}</div>}
        </div>
      </div>
    </div>
  );
}

function customExercisesForType(sessions, type) {
  const templateNames = new Set();
  const relevantTemplates = type === "calisthenics" ? [SESSION_TEMPLATES.calisthenics_a, SESSION_TEMPLATES.calisthenics_b] : type === "legs" ? [SESSION_TEMPLATES.legs, SESSION_TEMPLATES.legs_sa] : (SESSION_TEMPLATES[type] ? [SESSION_TEMPLATES[type]] : []);
  relevantTemplates.forEach(t => t.exercises.forEach(i => templateNames.add(i.name.toLowerCase())));
  const seen = new Map();
  sessions.filter(s => s.type === type).forEach(s => {
    (s.exercises || []).forEach(ex => {
      const key = ex.name.toLowerCase();
      if (!templateNames.has(key) && !seen.has(key)) seen.set(key, ex.name);
    });
  });
  return Array.from(seen.values());
}

export default function TrainingTracker() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [planEditor, setPlanEditor] = useState(null);
  const [startPlanId, setStartPlanId] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chartMetric, setChartMetric] = useState("Close-grip Pull-ups");

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("training-data");
        setData(res ? JSON.parse(res.value) : SEED);
      } catch {
        setData(SEED);
      }
      try {
        const d = await window.storage.get("training-draft");
        if (d && JSON.parse(d.value)) setHasDraft(true);
      } catch { /* kein Entwurf */ }
    })();
  }, []);

  async function persist(next) {
    setData(next);
    setSaving(true);
    try { await window.storage.set("training-data", JSON.stringify(next)); }
    catch (e) { console.error("storage failed", e); }
    setSaving(false);
  }

  function saveSession(session) {
    const isEdit = data.sessions.some(s => s.id === session.id);
    if (isEdit) {
      const next = { ...data, sessions: data.sessions.map(s => s.id === session.id ? session : s) };
      persist(next);
    } else {
      const next = { ...data, sessions: [...data.sessions, session] };
      const newPrs = [...next.prs];
      (session.exercises || []).forEach(ex => {
        const v = exerciseValue(ex);
        if (!v) return;
        const prevBest = currentBest(data.sessions, ex.name, data.baseline);
        const isAssistKg = v.unit === "kg" && v.weightMode === "assist";
        const isPR = !prevBest || (prevBest.unit === v.unit && (isAssistKg ? v.value < prevBest.value : v.value > prevBest.value));
        if (isPR) {
          newPrs.push({ id: uid(), date: session.date, category: ex.name, pr: `${v.value} ${v.unit}`, previous: prevBest ? `${prevBest.value} ${prevBest.unit}` : "—" });
        }
      });
      persist({ ...next, prs: newPrs });
    }
    setShowForm(false);
    setEditingSession(null);
    setStartPlanId(null);
    setHasDraft(false);
  }

  function savePlan(pl) {
    const list = data.plans || [];
    const exists = list.some(x => x.id === pl.id);
    persist({ ...data, plans: exists ? list.map(x => x.id === pl.id ? pl : x) : [...list, pl] });
    setPlanEditor(null);
  }
  function deletePlan(id) {
    if (!window.confirm("Plan wirklich löschen? Bereits geloggte Einheiten bleiben erhalten.")) return;
    persist({ ...data, plans: (data.plans || []).filter(x => x.id !== id) });
  }
  async function startPlan(id) {
    if (hasDraft) {
      if (!window.confirm("Es gibt eine angefangene Einheit. Verwerfen und diesen Plan starten?")) return;
      try {
        if (typeof window.storage.delete === "function") await window.storage.delete("training-draft");
        else await window.storage.set("training-draft", "");
      } catch (e) { /* egal */ }
      setHasDraft(false);
    }
    setEditingSession(null);
    setStartPlanId(id);
    setShowForm(true);
  }

  function deleteSession(id) {
    persist({ ...data, sessions: data.sessions.filter(s => s.id !== id) });
  }

  function setMilestone(skill, idx) {
    persist({ ...data, milestoneStages: { ...data.milestoneStages, [skill]: idx } });
  }

  const insights = useMemo(() => {
    if (!data) return [];
    const out = [];
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    const recent = data.sessions.filter(s => new Date(s.date) >= weekAgo);
    const hardCount = recent.filter(s => s.type === "hyrox" || (s.type === "legs" && s.focus !== "sa")).length;
    if (hardCount >= 3) out.push({ level: "warn", text: `${hardCount} harte Einheiten (HYROX/Legs) in den letzten 7 Tagen. Erwäge Regeneration einzuplanen.` });

    const trackedNames = ["Pull-ups", "Close-grip Pull-ups", "Wide Pull-ups", "Dips", "Chest-to-bar Pull-ups"];
    trackedNames.forEach(name => {
      const series = metricSeries(data.sessions, name).slice(-3);
      if (series.length === 3 && series[2].value <= series[0].value) {
        out.push({ level: "warn", text: `${name}: letzte 3 Einträge zeigen keine Steigerung (${series.map(s=>s.value).join(" → ")}). Prüfe Regeneration, Technik oder Progressionsstufe.` });
      }
    });

    const calSessions = data.sessions.filter(s => s.type === "calisthenics" || s.type === "legs" || s.type === "strength").sort((a,b)=>a.date.localeCompare(b.date));
    if (calSessions.length >= 4) {
      const lastFour = calSessions.slice(-4);
      const avgRir = lastFour.flatMap(s => (s.exercises||[]).flatMap(e => (e.sets||[]).map(x=>x.rir).filter(v=>v!=null)));
      if (avgRir.length && (avgRir.reduce((a,b)=>a+b,0)/avgRir.length) < 1) {
        out.push({ level: "info", text: "Durchschnittlicher RIR der letzten Einheiten ist niedrig. Ein Deload in den nächsten 1-2 Wochen könnte sinnvoll sein." });
      }
    }
    maxReminders(data.sessions, todayISO()).slice(0, 3).forEach(r => {
      out.push({ level: "info", text: `Dein Max bei ${r.name} (${r.text}) ist ${r.weeks} Wochen alt, Zeit zum Testen. Tipp: als letzten Satz mit der Satzart "Max-Test" loggen.` });
    });
    if (out.length === 0) out.push({ level: "ok", text: "Keine Auffälligkeiten. Plan läuft wie vorgesehen." });
    return out;
  }, [data]);

  if (!data) return <div style={{ padding: 40, textAlign: "center", color: MUTE, fontFamily: "'Inter',sans-serif" }}>Lädt…</div>;

  const dashboardCards = [
    { name: "Close-grip Pull-ups", icon: Dumbbell, color: IRON },
    { name: "Wide Pull-ups", icon: Dumbbell, color: IRON },
    { name: "Dips", icon: Dumbbell, color: CHALK },
    { name: "Chest-to-bar Pull-ups", icon: TrendingUp, color: IRON },
    { name: "Muscle-up", icon: Trophy, color: AMBER },
    { name: "Handstand", icon: Sparkles, color: CHALK },
    { name: "L-Sit", icon: Activity, color: CHALK },
    { name: "Hip Thrust", icon: Flame, color: RUST },
    { name: "Squat", icon: Flame, color: RUST },
  ];

  const week = mondayOf(new Date());
  const weekEnd = new Date(week); weekEnd.setDate(week.getDate() + 6);
  const weekSessions = data.sessions.filter(s => { const d = new Date(s.date); return d >= week && d <= weekEnd; });
  const maxes = allMaxes(data.sessions, todayISO());
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(week); d.setDate(week.getDate() + i); return toLocalISO(d); });
  const dayLabels = ["Mo","Di","Mi","Do","Fr","Sa","So"];

  const allNames = Array.from(new Set([...Object.keys(data.baseline), ...data.sessions.flatMap(s => (s.exercises||[]).map(e=>e.name))]));

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: PAPER, color: INK, minHeight: "100vh", padding: "0 0 60px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .sg { font-family: 'Space Grotesk', sans-serif; }
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; }
        input, select, textarea { font-family: inherit; }
        .card { box-shadow: 0 1px 2px rgba(18,48,73,0.05), 0 8px 24px rgba(18,48,73,0.06); transition: transform .18s ease, box-shadow .18s ease; }
        .card.hoverable:hover { transform: translateY(-3px); box-shadow: 0 4px 10px rgba(18,48,73,0.09), 0 16px 34px rgba(18,48,73,0.13); }
        .btn-primary { background: linear-gradient(135deg, #3B9AE1, #123049); box-shadow: 0 6px 18px rgba(46,134,193,0.35); transition: transform .15s ease, box-shadow .15s ease; border: none; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(46,134,193,0.45); }
        .btn-ghost { transition: all .15s ease; }
        .btn-ghost:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(18,48,73,0.10); }
        .pill { transition: all .15s ease; }
        .pill:hover { transform: translateY(-1px); filter: brightness(1.03); }
        .stat-icon { width: 36px; height: 36px; border-radius: 11px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
        .tab-btn { position: relative; transition: color .15s ease; }
        .fade-in { animation: fadeIn .4s ease both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .glow-ring { box-shadow: 0 0 0 4px rgba(46,134,193,0.18); }
        .week-tile { transition: transform .15s ease; }
        .week-tile:hover { transform: translateY(-2px); }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #BFDCF0; border-radius: 8px; }
        .nav-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .nav-tabs::-webkit-scrollbar { display: none; }
        @media (max-width: 600px) {
          .header-inner { flex-wrap: wrap; }
          .header-actions { width: 100%; }
          .header-actions button { flex: 1; justify-content: center; }
          .modal-card { padding: 16px !important; max-width: 100% !important; }
          .set-row { flex-wrap: wrap; }
          .set-row input { flex: 1; min-width: 64px; }
          .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .two-col { grid-template-columns: 1fr !important; }
          button, select, input { min-height: 38px; }
        }
      `}</style>

      <header style={{ padding: "28px 24px 20px", borderBottom: `1px solid ${LINE}`, background: "linear-gradient(135deg, #DCEEFA 0%, #F3FAFF 55%, #F9FCFE 100%)" }}>
        <div className="header-inner" style={{ maxWidth: 980, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: "linear-gradient(135deg, #3B9AE1, #123049)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(46,134,193,0.4)" }}>
              <Dumbbell size={22} color="#fff" />
            </div>
            <div>
              <div className="sg" style={{ fontSize: 12, letterSpacing: "0.14em", color: IRON, textTransform: "uppercase", marginBottom: 2 }}>Hybrid Training Log</div>
              <div className="sg" style={{ fontSize: 28, fontWeight: 700 }}>Progression Tracker</div>
            </div>
          </div>
          <div className="header-actions" style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={() => setShowExport(true)} style={{ background: CARD, color: INK, border: `1px solid ${LINE}`, borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500 }}>
              <ClipboardList size={16} /> Export
            </button>
            <button className="btn-primary" onClick={() => { setStartPlanId(null); setEditingSession(null); setShowForm(true); }} style={{ color: "#fff", borderRadius: 10, padding: "10px 18px", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600 }}>
              <Plus size={16} /> {hasDraft ? "Einheit fortsetzen" : "Einheit loggen"}
            </button>
          </div>
        </div>
        <nav className="nav-tabs" style={{ maxWidth: 980, margin: "18px auto 0", display: "flex", gap: 4 }}>
          {[["dashboard","Dashboard"],["progress","Verlauf"],["plan","Plan & Skills"],["log","Log"]].map(([id,label]) => (
            <button key={id} className="tab-btn" onClick={() => setTab(id)} style={{
              background: tab===id ? CARD : "transparent", border: `1px solid ${tab===id?LINE:"transparent"}`,
              borderBottom: tab===id ? `1px solid ${CARD}` : "1px solid transparent", marginBottom: -1,
              borderRadius: "10px 10px 0 0", padding: "9px 18px", fontSize: 13, fontWeight: 600, color: tab===id?IRON:MUTE,
              boxShadow: tab===id ? "0 -2px 10px rgba(18,48,73,0.06)" : "none"
            }}>{label}</button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "24px" }}>

        {tab === "dashboard" && (
          <>
            <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 28 }}>
              {dashboardCards.map(c => {
                const best = currentBest(data.sessions, c.name, data.baseline);
                const Icon = c.icon;
                return (
                  <div key={c.name} className="card hoverable fade-in" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: "16px" }}>
                    <div className="stat-icon" style={{ background: `${c.color}1A` }}>
                      <Icon size={17} color={c.color} />
                    </div>
                    <div style={{ fontSize: 12, color: MUTE, marginBottom: 6 }}>{c.name}</div>
                    <div className="sg" style={{ fontSize: 22, fontWeight: 700 }}>
                      {best ? `${best.value}${best.unit==="reps"?"":best.unit}${best.weightMode==="assist"?" Unterst.":""}` : "—"}
                    </div>
                    <div style={{ fontSize: 11, color: MUTE, marginTop: 2 }}>
                      {best?.date ? fmtDate(best.date) : "Baseline"}
                      {best?.assist && best.assist !== "Kein Band" && <span style={{ color: AMBER }}> · {best.assist}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
              <div className="card hoverable fade-in" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 18 }}>
                <div className="sg" style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={15} color={IRON} /> Coaching Insights
                </div>
                {insights.map((ins, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderTop: i>0?`1px solid ${LINE}`:"none", fontSize: 13, lineHeight: 1.5 }}>
                    <span style={{ color: ins.level==="warn"?RUST:ins.level==="ok"?IRON:AMBER, fontWeight: 600, flexShrink: 0 }}>
                      {ins.level==="warn"?"!":ins.level==="ok"?"✓":"i"}
                    </span>
                    <span style={{ color: "#3A3A36" }}>{ins.text}</span>
                  </div>
                ))}
              </div>

              <div className="card hoverable fade-in" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 18 }}>
                <div className="sg" style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Trophy size={15} color={AMBER} /> Letzte PRs
                </div>
                {data.prs.length === 0 && <div style={{ fontSize: 13, color: MUTE }}>Noch keine PRs geloggt.</div>}
                {[...data.prs].reverse().slice(0,5).map(pr => (
                  <div key={pr.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, padding: "8px 0", borderTop: `1px solid ${LINE}` }}>
                    <div style={{ width: 24, height: 24, borderRadius: 8, background: `${AMBER}1F`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <Trophy size={12} color={AMBER} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{pr.category}: {pr.pr}</div>
                      <div style={{ color: MUTE, fontSize: 11 }}>{fmtDate(pr.date)} · zuvor {pr.previous}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {maxes.length > 0 && (
              <div className="card hoverable fade-in" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 18, marginTop: 16 }}>
                <div className="sg" style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <Trophy size={15} color={AMBER} /> Meine Maxima
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                  {maxes.map(m => (
                    <div key={m.name} style={{ fontSize: 13 }}>
                      <div style={{ color: MUTE, fontSize: 12 }}>{m.name}</div>
                      <div style={{ fontWeight: 600 }}>{m.text}</div>
                      <div style={{ fontSize: 10, color: m.due ? AMBER : MUTE }}>{m.weeks != null ? `vor ${m.weeks} ${m.weeks === 1 ? "Woche" : "Wochen"}${m.due ? ", Test fällig" : ""}` : "Startwert"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <div className="sg" style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Diese Woche</div>
              <div style={{ fontSize: 10, color: MUTE, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Plan</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8, marginBottom: 14 }}>
                {WEEK_PLAN.map(w => {
                  const doneCount = w.parts.filter(p => weekSessions.some(x => x.type === p.type && (!p.focus || x.focus === p.focus))).length;
                  const done = !w.rest && doneCount === w.parts.length;
                  const partial = !w.rest && doneCount > 0 && doneCount < w.parts.length;
                  const meta = planMeta(w);
                  const Icon = meta.icon;
                  return (
                    <div key={w.day} className={`week-tile${done?" glow-ring":""}`} style={{ background: done?CARD:"transparent", border: `1px solid ${done?LINE:"transparent"}`, borderRadius: 10, padding: "10px 6px", textAlign: "center", opacity: w.rest ? 0.7 : (done||partial ? 1 : 0.55), boxShadow: done?"0 2px 8px rgba(18,48,73,0.08)":"none" }}>
                      <div style={{ fontSize: 10, color: MUTE, marginBottom: 4 }}>{w.day}</div>
                      <Icon size={16} color={meta.color||MUTE} style={{ margin: "0 auto 4px" }} />
                      <div style={{ fontSize: 10 }}>{w.label}</div>
                      {done && <Check size={11} color={IRON} style={{ marginTop: 3 }} />}
                      {partial && <div style={{ fontSize: 9, color: AMBER, marginTop: 3 }}>{doneCount}/{w.parts.length}</div>}
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: 10, color: MUTE, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Tatsächlich trainiert</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
                {weekDates.map((iso, i) => {
                  const daySessions = data.sessions.filter(s => s.date === iso);
                  const hasAny = daySessions.length > 0;
                  return (
                    <div key={iso} className="week-tile" style={{ background: hasAny?CARD:"transparent", border: `1px dashed ${hasAny?LINE:"#DCE8F0"}`, borderRadius: 10, padding: "10px 6px", textAlign: "center", minHeight: 74, boxShadow: hasAny?"0 2px 8px rgba(18,48,73,0.06)":"none" }}>
                      <div style={{ fontSize: 10, color: MUTE, marginBottom: 4 }}>{dayLabels[i]}</div>
                      {!hasAny && <div style={{ fontSize: 14, color: LINE, marginTop: 10 }}>–</div>}
                      {daySessions.map((s, j) => {
                        const meta = TYPES.find(t => t.id === s.type);
                        const Icon = meta.icon;
                        const label = sessionLabel(s);
                        return (
                          <div key={j} style={{ marginTop: j>0?4:0 }}>
                            <Icon size={16} color={meta.color||MUTE} style={{ margin: "0 auto 4px" }} />
                            <div style={{ fontSize: 9, color: MUTE, lineHeight: 1.2 }}>{label}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === "progress" && (
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              <TrendingUp size={16} color={IRON} />
              <select value={chartMetric} onChange={e=>setChartMetric(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${LINE}`, background: CARD, fontSize: 13 }}>
                {allNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="card" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 18, height: 320 }}>
              {(() => {
                const series = metricSeries(data.sessions, chartMetric);
                if (series.length < 2) return <div style={{ color: MUTE, fontSize: 13, paddingTop: 40, textAlign: "center" }}>Noch nicht genug Datenpunkte für {chartMetric} ({series.length} geloggt). Mindestens 2 Einträge nötig.</div>;
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke={LINE} vertical={false} />
                      <XAxis dataKey="date" tickFormatter={fmtDate} fontSize={11} stroke={MUTE} />
                      <YAxis fontSize={11} stroke={MUTE} />
                      <Tooltip labelFormatter={fmtDate} formatter={(v,n,p)=>[`${v} ${p.payload.unit}`, chartMetric]} contentStyle={{ borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 12 }} />
                      <Line type="monotone" dataKey="value" stroke={IRON} strokeWidth={2.5} dot={{ r: 4, fill: IRON, strokeWidth: 0 }} activeDot={{ r: 6, fill: CHALK }} />
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>
        )}

        {tab === "plan" && (
          <div>
            <div className="sg" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Skill-Progressionsleiter</div>
            {Object.entries(LADDERS).map(([key, steps]) => {
              const stage = data.milestoneStages[key];
              const pct = (stage / (steps.length - 1)) * 100;
              return (
                <div key={key} className="card hoverable fade-in" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: "capitalize" }}>{key === "lsit" ? "L-Sit" : key}</div>
                  <div style={{ position: "relative", marginBottom: 16, height: 4, background: LINE, borderRadius: 4 }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "linear-gradient(90deg, #5CA8E0, #2E86C1)", borderRadius: 4, transition: "width .3s ease" }} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {steps.map((s, i) => {
                      const achieved = i <= stage;
                      const current = i === stage;
                      return (
                        <button key={i} className="pill" onClick={() => setMilestone(key, i)} style={{
                          border: `1px solid ${current?IRON:LINE}`, background: achieved?"linear-gradient(135deg,#E3F1FB,#F5FAFD)":"transparent",
                          color: achieved?IRON:MUTE, borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: current?700:400,
                          display: "flex", alignItems: "center", gap: 4, boxShadow: current?"0 0 0 3px rgba(46,134,193,0.18)":"none"
                        }}>
                          {achieved && <Check size={11} />} {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="sg" style={{ fontSize: 14, fontWeight: 700, margin: "22px 0 14px" }}>Feste Wochenstruktur</div>
            <div style={{ display: "grid", gap: 6 }}>
              {WEEK_PLAN.map(w => {
                const meta = planMeta(w);
                const Icon = meta.icon;
                return (
                  <div key={w.day} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="sg" style={{ fontSize: 12, width: 28, color: MUTE }}>{w.day}</div>
                    <Icon size={15} color={meta.color||MUTE} />
                    <div style={{ fontSize: 13, flex: 1 }}>{w.label}</div>
                    <div style={{ fontSize: 11, color: MUTE }}>{meta.load}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "26px 0 12px", gap: 8 }}>
              <div className="sg" style={{ fontSize: 14, fontWeight: 700 }}>Eigene Trainingspläne</div>
              <button onClick={() => setPlanEditor("new")} className="btn-ghost" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: INK, display: "flex", alignItems: "center", gap: 5 }}><Plus size={13} /> Neuen Plan erstellen</button>
            </div>
            {(data.plans || []).length === 0 && (
              <div style={{ fontSize: 12, color: MUTE, marginBottom: 12, lineHeight: 1.5 }}>Noch keine eigenen Pläne. Erstelle einen Plan, wähle ihn beim Loggen aus, und deine aktuellen Werte werden automatisch übernommen.</div>
            )}
            {(data.plans || []).map(pl => (
              <div key={pl.id} className="card" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                  <div className="sg" style={{ fontSize: 14, fontWeight: 700 }}>{pl.name}</div>
                  <div style={{ fontSize: 11, color: MUTE }}>{(TYPES.find(t => t.id === pl.type) || {}).label}</div>
                </div>
                <div style={{ fontSize: 12, color: MUTE, lineHeight: 1.5, marginBottom: 10 }}>{pl.exercises.map(e => e.name).join(" · ")}</div>
                {pl.note && <div style={{ fontSize: 11, color: MUTE, marginBottom: 10 }}>{pl.note}</div>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => startPlan(pl.id)} className="btn-primary" style={{ color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600 }}>Training starten</button>
                  <button onClick={() => setPlanEditor(pl)} className="btn-ghost" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: INK, display: "flex", alignItems: "center", gap: 4 }}><Pencil size={12} /> Bearbeiten</button>
                  <button onClick={() => deletePlan(pl.id)} className="btn-ghost" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: MUTE, display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={12} /> Löschen</button>
                </div>
              </div>
            ))}

            <div className="sg" style={{ fontSize: 14, fontWeight: 700, margin: "26px 0 14px" }}>Standardplan im Detail</div>
            {[["Mittwoch", "calisthenics_a"], ["Donnerstag", "legs"], ["Samstag", "calisthenics_b"], ["Samstag, danach", "legs_sa"]].map(([day, key]) => {
              const t = SESSION_TEMPLATES[key];
              return (
                <div key={key} className="card" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                  <div className="sg" style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{day}: {t.title}</div>
                  {t.exercises.map(ex => (
                    <div key={ex.name} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, padding: "4px 0", borderTop: `1px solid ${LINE}` }}>
                      <span>{ex.name}{ex.altOf ? ` (statt ${ex.altOf})` : ""}</span>
                      <span style={{ color: MUTE, textAlign: "right" }}>{ex.isHold ? ex.hint : `${ex.sets} × ${ex.hint}`}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: MUTE, marginTop: 8, lineHeight: 1.5 }}>{t.note}</div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "log" && (
          <div>
            {data.sessions.length === 0 && <div style={{ color: MUTE, fontSize: 13, textAlign: "center", padding: 40 }}>Noch keine Einheiten geloggt. Klicke oben auf "Einheit loggen".</div>}
            {[...data.sessions].reverse().map(s => {
              const meta = TYPES.find(t => t.id === s.type);
              const Icon = meta.icon;
              return (
                <div key={s.id} className="card hoverable" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon size={16} color={meta.color||MUTE} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{sessionLabel(s)}</div>
                        <div style={{ fontSize: 11, color: MUTE }}>{fmtDate(s.date)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => { setEditingSession(s); setShowForm(true); }} style={{ background: "none", border: "none", color: MUTE, padding: 4 }}><Pencil size={14} /></button>
                      <button onClick={() => deleteSession(s.id)} style={{ background: "none", border: "none", color: MUTE, padding: 4 }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {s.exercises?.length > 0 && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "#3A3A36" }}>
                      {s.exercises.map((ex,i) => (
                        <div key={i} style={{ padding: "3px 0" }}>
                          {ex.name}{ex.grip ? ` · ${ex.grip}` : ""}{ex.max ? ` · Max ${ex.max}` : ""}: {ex.holdSeconds ? `${ex.holdSeconds}s` : (ex.sets||[]).map(st => fmtSet(st, false)).join(", ")}{ex.note ? <div style={{ color: AMBER, fontSize: 11 }}>Notiz: {ex.note}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                  {(s.duration || s.distance || s.rpe || s.notes) && (
                    <div style={{ marginTop: 8, fontSize: 12, color: MUTE }}>
                      {[s.duration&&`${s.duration} min`, s.distance&&`${s.distance} km`, s.avgHR&&`⌀HF ${s.avgHR}`, s.rpe&&`RPE ${s.rpe}`].filter(Boolean).join(" · ")}
                      {s.notes && <div style={{ marginTop: 4 }}>{s.notes}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showExport && <ExportModal data={data} onClose={() => setShowExport(false)} onImport={(d) => { persist(d); setShowExport(false); }} />}
      {planEditor && <PlanEditor plan={planEditor === "new" ? null : planEditor} sessions={data.sessions} onSave={savePlan} onClose={() => setPlanEditor(null)} />}
      {showForm && <SessionForm onClose={() => { setShowForm(false); setEditingSession(null); setStartPlanId(null); }} onSave={saveSession} sessions={data.sessions} initialSession={editingSession} onDraft={setHasDraft} plans={data.plans || []} initialPlanId={startPlanId} />}
    </div>
  );
}

function PlanEditor({ plan, sessions, onSave, onClose }) {
  const [name, setName] = useState(plan ? plan.name : "");
  const [ptype, setPtype] = useState(plan ? plan.type : "calisthenics");
  const [note, setNote] = useState(plan && plan.note ? plan.note : "");
  const [items, setItems] = useState(() => (plan ? plan.exercises : []).map(e => ({
    uid: uid(), name: e.name, sets: String(e.sets || 3), hint: e.hint || "", isHold: !!e.isHold, rest: e.rest != null ? String(e.rest) : "",
  })));
  const [error, setError] = useState("");
  const known = useMemo(() => Array.from(new Set([
    ...Object.keys(SEED.baseline),
    ...Object.values(SESSION_TEMPLATES).flatMap(t => t.exercises.map(e => e.name)),
    ...sessions.flatMap(s => (s.exercises || []).map(e => e.name)),
  ])).sort((a, b) => a.localeCompare(b)), [sessions]);
  const recent = sessions.map((x, i) => ({ x, i })).filter(({ x }) => (x.exercises || []).length > 0)
    .sort((a, b) => b.x.date.localeCompare(a.x.date) || b.i - a.i).slice(0, 5).map(({ x }) => x);

  function addItem() { setItems(prev => [...prev, { uid: uid(), name: "", sets: "3", hint: "", isHold: false, rest: "" }]); }
  function addMany(list) {
    setItems(prev => {
      const have = new Set(prev.map(i => i.name.toLowerCase()));
      return [...prev, ...list.filter(i => !have.has(i.name.toLowerCase())).map(i => ({ uid: uid(), rest: "", ...i }))];
    });
  }
  function fromTemplate(key) {
    addMany(SESSION_TEMPLATES[key].exercises.filter(e => !e.skipInAll).map(e => ({ name: e.name, sets: String(e.sets), hint: e.hint, isHold: !!e.isHold })));
  }
  function fromSession(sess) {
    addMany((sess.exercises || []).map(e => ({ name: e.name, sets: String(Math.max(1, workingSets(e.sets).length || 3)), hint: e.target || "", isHold: !!e.holdSeconds })));
  }
  function update(id, patch) { setItems(prev => prev.map(i => i.uid === id ? { ...i, ...patch } : i)); }
  function remove(id) { setItems(prev => prev.filter(i => i.uid !== id)); }
  function move(id, dir) {
    setItems(prev => {
      const i = prev.findIndex(x => x.uid === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function save() {
    const clean = items.filter(i => i.name.trim()).map(i => {
      const o = { name: i.name.trim(), sets: Math.max(1, Number(i.sets) || 3), hint: (i.hint || "").trim(), isHold: !!i.isHold };
      if (i.rest !== "" && Number.isFinite(Number(i.rest))) o.rest = Number(i.rest);
      return o;
    });
    if (!name.trim()) { setError("Gib dem Plan einen Namen."); return; }
    if (!clean.length) { setError("Füge mindestens eine Übung hinzu."); return; }
    onSave({ id: plan ? plan.id : uid(), name: name.trim(), type: ptype, note: note.trim(), exercises: clean });
  }

  const inputBase = { padding: 7, borderRadius: 6, border: `1px solid ${LINE}`, background: CARD };
  const chip = { fontSize: 11, padding: "5px 10px", borderRadius: 20, border: `1px dashed ${MUTE}`, background: "transparent", color: MUTE, display: "flex", alignItems: "center", gap: 4 };
  const arrow = { background: "none", border: `1px solid ${LINE}`, borderRadius: 5, padding: 0, width: 28, minHeight: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(18,48,73,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 }} onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ background: PAPER, borderRadius: 14, padding: 24, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="sg" style={{ fontSize: 17, fontWeight: 700 }}>{plan ? "Plan bearbeiten" : "Neuer Trainingsplan"}</div>
          <button aria-label="Schließen" onClick={onClose} style={{ background: "none", border: "none" }}><X size={18} color={MUTE} /></button>
        </div>

        <input aria-label="Planname" placeholder="Planname (z. B. Oberkörper Gym)" value={name} onChange={e => setName(e.target.value)} style={{ ...inputBase, width: "100%", padding: 10, marginBottom: 10 }} />
        <label style={{ fontSize: 12, color: MUTE }}>Zählt als</label>
        <select aria-label="Art des Plans" value={ptype} onChange={e => setPtype(e.target.value)} style={{ ...inputBase, width: "100%", padding: 10, marginTop: 4, marginBottom: 10 }}>
          <option value="calisthenics">Calisthenics</option>
          <option value="legs">Beine</option>
          <option value="strength">Kraft (Gym)</option>
        </select>
        <textarea aria-label="Plannotiz" rows={2} placeholder="Notiz zum Plan (optional)" value={note} onChange={e => setNote(e.target.value)} style={{ ...inputBase, width: "100%", fontSize: 12, marginBottom: 14, resize: "vertical" }} />

        <datalist id="known-exercises">{known.map(n => <option key={n} value={n} />)}</datalist>
        <div style={{ fontSize: 12, color: MUTE, marginBottom: 8 }}>Übungen (Reihenfolge = Trainingsreihenfolge)</div>
        {items.map((it, idx) => (
          <div key={it.uid} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button aria-label="Plan-Übung nach oben" disabled={idx === 0} onClick={() => move(it.uid, -1)} style={{ ...arrow, opacity: idx === 0 ? 0.35 : 1 }}><ChevronUp size={14} color={MUTE} /></button>
                <button aria-label="Plan-Übung nach unten" disabled={idx === items.length - 1} onClick={() => move(it.uid, 1)} style={{ ...arrow, opacity: idx === items.length - 1 ? 0.35 : 1 }}><ChevronDown size={14} color={MUTE} /></button>
              </div>
              <input list="known-exercises" placeholder="Übungsname" value={it.name} onChange={e => update(it.uid, { name: e.target.value })} style={{ ...inputBase, flex: 1 }} />
              <button aria-label="Plan-Übung entfernen" onClick={() => remove(it.uid)} style={{ background: "none", border: "none" }}><X size={15} color={MUTE} /></button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label style={{ fontSize: 10, color: MUTE, display: "flex", flexDirection: "column", gap: 2 }}>Sätze
                <input type="number" aria-label="Anzahl Sätze" value={it.sets} onChange={e => update(it.uid, { sets: e.target.value })} style={{ ...inputBase, width: 58 }} />
              </label>
              <label style={{ fontSize: 10, color: MUTE, display: "flex", flexDirection: "column", gap: 2 }}>Ziel-Wdh
                <input aria-label="Ziel-Wiederholungen im Plan" placeholder="8-12" value={it.hint} onChange={e => update(it.uid, { hint: e.target.value })} style={{ ...inputBase, width: 86 }} />
              </label>
              <label style={{ fontSize: 10, color: MUTE, display: "flex", flexDirection: "column", gap: 2 }}>Pause (Sek)
                <input type="number" aria-label="Pause im Plan" placeholder="auto" value={it.rest} onChange={e => update(it.uid, { rest: e.target.value })} style={{ ...inputBase, width: 70 }} />
              </label>
              <label style={{ fontSize: 12, color: INK, display: "flex", alignItems: "center", gap: 4, paddingBottom: 8 }}>
                <input type="checkbox" checked={it.isHold} onChange={e => update(it.uid, { isHold: e.target.checked })} /> Halten (Sek)
              </label>
            </div>
          </div>
        ))}
        <button onClick={addItem} style={{ width: "100%", padding: 9, borderRadius: 8, border: `1px dashed ${LINE}`, background: "none", fontSize: 13, color: IRON, marginBottom: 14 }}>+ Übung hinzufügen</button>

        <div style={{ fontSize: 12, color: MUTE, marginBottom: 6 }}>Schnell befüllen: Standardplan kopieren</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {[["Calisthenics A", "calisthenics_a"], ["Calisthenics B", "calisthenics_b"], ["Beintag", "legs"], ["Beine Samstag", "legs_sa"]].map(([label, key]) => (
            <button key={key} onClick={() => fromTemplate(key)} style={chip}><Copy size={11} /> {label}</button>
          ))}
        </div>
        {recent.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: MUTE, marginBottom: 6 }}>Oder aus einer früheren Einheit</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {recent.map(x => (
                <button key={x.id} onClick={() => fromSession(x)} style={chip}><Copy size={11} /> {sessionLabel(x)} · {fmtDate(x.date)}</button>
              ))}
            </div>
          </>
        )}

        <div style={{ fontSize: 11, color: MUTE, marginBottom: 12, lineHeight: 1.5 }}>Beim Training werden für jede Übung automatisch deine letzten Werte, Notizen, Max und Pausen übernommen, auch wenn du sie in einem anderen Plan gemacht hast.</div>
        {error && <div style={{ fontSize: 12, color: RUST, marginBottom: 10 }}>{error}</div>}
        <button onClick={save} className="btn-primary" style={{ width: "100%", padding: 12, borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Check size={15} /> Plan speichern
        </button>
      </div>
    </div>
  );
}

const DRAFT_KEY = "training-draft";
const EMPTY_SW = { running: false, acc: 0, startedAt: null };

function setFromStored(st) {
  return {
    reps: st.reps ? String(st.reps) : "", weight: st.weight ? String(st.weight) : "", rir: st.rir == null ? "" : String(st.rir),
    assist: st.assist || "Kein Band", weightMode: st.weightMode === "assist" ? WEIGHT_MODES[1] : WEIGHT_MODES[0],
    setType: st.setType || "Normal", done: false, touched: {},
  };
}
function blankSet(from) {
  const auto = {};
  const out = { reps: "", weight: "", rir: "", assist: "Kein Band", weightMode: WEIGHT_MODES[0], setType: "Normal", done: false, touched: {}, auto };
  if (from) {
    ["reps", "weight", "rir"].forEach(f => { out[f] = from[f]; if (from[f] !== "") auto[f] = true; });
    out.assist = from.assist || "Kein Band";
    out.weightMode = from.weightMode || WEIGHT_MODES[0];
  }
  return out;
}
function storedToForm(ex) {
  return {
    id: uid(), name: ex.name, holdSeconds: ex.holdSeconds ? String(ex.holdSeconds) : "",
    target: ex.target || "", grip: ex.grip || "Keine Angabe",
    restSec: ex.restSec != null ? String(ex.restSec) : String(guessRest(ex.name)),
    note: ex.note || "", repHint: templateHintFor(ex.name),
    max: (ex.maxManual === true || (ex.maxManual === undefined && ex.max)) ? (ex.max || "") : "",
    maxManual: !!(ex.maxManual === true || (ex.maxManual === undefined && ex.max)), maxAt: ex.maxAt,
    sets: (ex.sets || []).map(setFromStored),
  };
}
function fmtClock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
function alarm() {
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* egal */ }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.start(); o.stop(ctx.currentTime + 0.55);
    setTimeout(() => { if (ctx.close) ctx.close(); }, 800);
  } catch (e) { /* egal */ }
}

function SessionForm({ onClose, onSave, sessions, initialSession, onDraft, plans = [], initialPlanId = null }) {
  const isEdit = !!initialSession;
  const initialPlan = initialSession && initialSession.focus && String(initialSession.focus).startsWith("plan:")
    ? (plans.find(p => "plan:" + p.id === initialSession.focus) || null)
    : (initialPlanId ? (plans.find(p => p.id === initialPlanId) || null) : null);
  const [planId, setPlanId] = useState(initialPlan ? initialPlan.id : null);
  const startedRef = useRef(false);
  const histSessions = isEdit ? sessions.filter(x => x.id !== initialSession.id) : sessions;
  const [showOther, setShowOther] = useState(false);
  const [type, setType] = useState(initialSession?.type || (initialPlan && initialPlan.type) || "calisthenics");
  const [calFocus, setCalFocus] = useState(initialSession?.type === "calisthenics" && initialSession.focus ? initialSession.focus : "a");
  const [legsFocus, setLegsFocus] = useState(initialSession?.type === "legs" && initialSession.focus ? initialSession.focus : "do");
  const [date, setDate] = useState(initialSession?.date || todayISO());
  const [exercises, setExercises] = useState(() => (initialSession?.exercises || []).map(storedToForm));
  const [duration, setDuration] = useState(initialSession?.duration != null ? String(initialSession.duration) : "");
  const [distance, setDistance] = useState(initialSession?.distance != null ? String(initialSession.distance) : "");
  const [avgHR, setAvgHR] = useState(initialSession?.avgHR != null ? String(initialSession.avgHR) : "");
  const [rpe, setRpe] = useState(initialSession?.rpe != null ? String(initialSession.rpe) : "");
  const [notes, setNotes] = useState(initialSession?.notes || "");
  const [customLabel, setCustomLabel] = useState(initialSession?.customLabel || "");

  // Timer: Trainingsdauer (Stoppuhr) und Satzpause
  const [sw, setSw] = useState(EMPTY_SW);
  const [now, setNow] = useState(Date.now());
  const [restEnd, setRestEnd] = useState(null);
  const [restTotal, setRestTotal] = useState(0);
  const [restLabel, setRestLabel] = useState("");
  const [restFinished, setRestFinished] = useState(false);
  // Entwurf
  const [draftReady, setDraftReady] = useState(isEdit);
  const [restored, setRestored] = useState(false);

  const elapsed = sw.acc + (sw.running ? now - sw.startedAt : 0);

  useEffect(() => {
    if (!sw.running) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [sw.running]);

  useEffect(() => {
    if (restEnd == null) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= restEnd) { setRestEnd(null); setRestFinished(true); alarm(); }
    }, 250);
    return () => clearInterval(t);
  }, [restEnd]);

  useEffect(() => {
    if (!restFinished) return;
    const t = setTimeout(() => setRestFinished(false), 5000);
    return () => clearTimeout(t);
  }, [restFinished]);

  function swStart() { setNow(Date.now()); setSw(s => ({ running: true, acc: s.acc, startedAt: Date.now() })); }
  function swPause() { setSw(s => ({ running: false, acc: s.acc + (Date.now() - s.startedAt), startedAt: null })); }
  function swReset() { setSw(EMPTY_SW); }
  function startRest(sec, label) {
    setRestTotal(sec); setRestLabel(label || ""); setRestFinished(false);
    setNow(Date.now()); setRestEnd(Date.now() + sec * 1000);
  }
  function adjustRest(delta) {
    setRestEnd(e => (e == null ? e : Math.max(Date.now() + 1000, e + delta * 1000)));
    setRestTotal(t => Math.max(5, t + delta));
  }
  function skipRest() { setRestEnd(null); }

  // Entwurf laden
  useEffect(() => {
    if (isEdit) return;
    (async () => {
      try {
        const r = await window.storage.get(DRAFT_KEY);
        const d = JSON.parse(r.value);
        if (d && d.v === 1) {
          setType(d.type); setPlanId(d.planId && plans.some(p => p.id === d.planId) ? d.planId : null); setCalFocus(d.calFocus); setLegsFocus(d.legsFocus); setDate(d.date);
          setExercises(d.exercises || []); setDuration(d.duration || ""); setDistance(d.distance || "");
          setAvgHR(d.avgHR || ""); setRpe(d.rpe || ""); setNotes(d.notes || ""); setCustomLabel(d.customLabel || "");
          const w = d.sw || EMPTY_SW;
          setSw(w.running ? { running: false, acc: w.acc + Math.max(0, (d.savedAt || Date.now()) - w.startedAt), startedAt: null } : w);
          setRestored(true);
        }
      } catch (e) { /* kein Entwurf */ }
      setDraftReady(true);
    })();
  }, []);
  // Entwurf speichern
  useEffect(() => {
    if (isEdit || !draftReady) return;
    const dirty = exercises.length > 0 || sw.acc > 0 || sw.running || notes || customLabel;
    if (!dirty) return;
    const id = setTimeout(async () => {
      try {
        await window.storage.set(DRAFT_KEY, JSON.stringify({ v: 1, savedAt: Date.now(), type, planId, calFocus, legsFocus, date, exercises, duration, distance, avgHR, rpe, notes, customLabel, sw }));
        if (onDraft) onDraft(true);
      } catch (e) { /* egal */ }
    }, 400);
    return () => clearTimeout(id);
  }, [type, planId, calFocus, legsFocus, date, exercises, duration, distance, avgHR, rpe, notes, customLabel, sw, draftReady]);

  async function clearDraft() {
    try {
      if (typeof window.storage.delete === "function") await window.storage.delete(DRAFT_KEY);
      else await window.storage.set(DRAFT_KEY, "");
    } catch (e) { /* egal */ }
    if (onDraft) onDraft(false);
  }
  function discardDraft() {
    setType("calisthenics"); setPlanId(null); setCalFocus("a"); setLegsFocus("do"); setDate(todayISO()); setExercises([]);
    setDuration(""); setDistance(""); setAvgHR(""); setRpe(""); setNotes(""); setCustomLabel("");
    setSw(EMPTY_SW); setRestEnd(null); setRestored(false);
    clearDraft();
  }

  const hasExercises = type === "calisthenics" || type === "legs" || type === "strength";
  const hasCardio = type === "running" || type === "hyrox" || type === "twerk" || type === "yoga" || type === "other";
  const plan = planId ? (plans.find(p => p.id === planId) || null) : null;
  const templateKey = type === "calisthenics" ? `calisthenics_${calFocus}` : type === "legs" ? (legsFocus === "sa" ? "legs_sa" : "legs") : type;
  const otherKey = plan ? null : (type === "calisthenics" ? (calFocus === "a" ? "calisthenics_b" : "calisthenics_a") : type === "legs" ? (legsFocus === "sa" ? "legs" : "legs_sa") : null);
  const focus = plan ? "plan:" + plan.id : (type === "calisthenics" ? calFocus : type === "legs" ? legsFocus : undefined);
  const template = plan ? { title: plan.name, note: plan.note, exercises: plan.exercises } : SESSION_TEMPLATES[templateKey];
  const customExNames = (hasExercises || type === "hyrox") ? customExercisesForType(sessions, type) : [];

  // Eine Übung aus Vorlage, Historie oder einer früheren Einheit aufbauen
  function buildExercise(name, item, srcEx, foc) {
    const hist = findPreviousExercise(histSessions, name, foc !== undefined ? foc : focus);
    const histAny = findPreviousExercise(histSessions, name);
    const prev = srcEx || (hist[0] ? hist[0].ex : null);
    const latest = histAny[0] ? histAny[0].ex : null;
    const hint = item ? item.hint : templateHintFor(name);
    const isHold = !!(item && item.isHold) || !!(prev && prev.holdSeconds);
    let sets = [];
    let holdSeconds = "";
    if (isHold) holdSeconds = prev && prev.holdSeconds ? String(prev.holdSeconds) : "";
    else if (prev && prev.sets && prev.sets.length) sets = prev.sets.map(setFromStored);
    else sets = Array.from({ length: item ? item.sets : 1 }, () => blankSet());
    const restPrev = prev && prev.restSec != null ? prev.restSec : (latest && latest.restSec != null ? latest.restSec : null);
    return {
      id: uid(), name, holdSeconds, repHint: hint,
      target: isHold ? "" : ((prev && prev.target) || (latest && latest.target) || rangeText(hint)),
      grip: (prev && prev.grip) || (latest && latest.grip) || "Keine Angabe",
      restSec: String(restPrev != null ? restPrev : (item && item.rest != null && item.rest !== "" ? item.rest : guessRest(name))),
      note: latest ? (latest.note || "") : "",
      max: (() => { const em = effectiveMax(histSessions, name, null, SEED.baseline); return em && em.source === "manual" ? em.manualText : ""; })(),
      maxManual: (() => { const em = effectiveMax(histSessions, name, null, SEED.baseline); return !!(em && em.source === "manual"); })(),
      maxAt: (() => { const em = effectiveMax(histSessions, name, null, SEED.baseline); return em && em.source === "manual" ? em.manualDate : undefined; })(),
      sets,
    };
  }
  function addFromTemplate(item, foc) {
    setExercises(prev => prev.some(e => e.name.toLowerCase() === item.name.toLowerCase()) ? prev : [...prev, buildExercise(item.name, item, undefined, foc)]);
  }
  function selectPlan(p) {
    setPlanId(p.id);
    setType(p.type);
    if (exercises.length === 0) p.exercises.filter(i => !i.skipInAll).forEach(i => addFromTemplate(i, "plan:" + p.id));
  }
  useEffect(() => {
    if (!draftReady || isEdit || !initialPlan || restored || startedRef.current) return;
    startedRef.current = true;
    initialPlan.exercises.filter(i => !i.skipInAll).forEach(i => addFromTemplate(i, "plan:" + initialPlan.id));
  }, [draftReady, restored]);
  useEffect(() => {
    let lock = null;
    let cancelled = false;
    const request = async () => { try { if (navigator.wakeLock) lock = await navigator.wakeLock.request("screen"); } catch (e) { /* egal */ } };
    request();
    const onVis = () => { if (document.visibilityState === "visible" && !cancelled) request(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVis); try { if (lock) lock.release(); } catch (e) { /* egal */ } };
  }, []);
  function toggleCollapse(id) { setExercises(prev => prev.map(e => e.id === id ? { ...e, collapsed: !e.collapsed } : e)); }
  function addCustomExercise(name) {
    setExercises(prev => prev.some(e => e.name.toLowerCase() === name.toLowerCase()) ? prev : [...prev, buildExercise(name, null)]);
  }
  function copyFromSession(sess) {
    setExercises(prev => {
      const have = new Set(prev.map(e => e.name.toLowerCase()));
      const added = (sess.exercises || []).filter(ex => !have.has(ex.name.toLowerCase())).map(ex => buildExercise(ex.name, null, ex));
      return [...prev, ...added];
    });
  }
  function loadAllTemplate() {
    if (!template) return;
    template.exercises.filter(item => !item.skipInAll).forEach(item => addFromTemplate(item));
  }
  const recentSessions = (hasExercises && !isEdit)
    ? sessions.map((x, i) => ({ x, i })).filter(({ x }) => x.type === type && (x.exercises || []).length > 0)
        .sort((a, b) => ((b.x.focus === focus ? 1 : 0) - (a.x.focus === focus ? 1 : 0)) || b.x.date.localeCompare(a.x.date) || b.i - a.i)
        .slice(0, 4).map(({ x }) => x)
    : [];

  const customLabelsUsed = Array.from(new Set(sessions.filter(s => s.type === "other" && s.customLabel).map(s => s.customLabel)));
  function selectCustomLabel(name) {
    setCustomLabel(name);
    const prev = sessions.filter(s => s.type === "other" && s.customLabel?.toLowerCase() === name.toLowerCase()).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (prev) {
      if (!duration && prev.duration != null) setDuration(String(prev.duration));
      if (!avgHR && prev.avgHR != null) setAvgHR(String(prev.avgHR));
      if (!rpe && prev.rpe != null) setRpe(String(prev.rpe));
    }
  }

  function addExercise() {
    setExercises(prev => [...prev, { id: uid(), name: "", holdSeconds: "", target: "", grip: "Keine Angabe", restSec: "90", note: "", max: "", maxManual: false, sets: [blankSet()] }]);
  }
  function updateExercise(id, patch) { setExercises(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e)); }
  function removeExercise(id) { setExercises(prev => prev.filter(e => e.id !== id)); }
  function moveExercise(id, dir) {
    setExercises(prev => {
      const i = prev.findIndex(e => e.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function addSet(exId, warmup) {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e;
      if (warmup) return { ...e, sets: [{ ...blankSet(), setType: "Aufwärmen" }, ...e.sets] };
      const last = [...e.sets].reverse().find(s => s.setType !== "Aufwärmen") || e.sets[e.sets.length - 1];
      return { ...e, sets: [...e.sets, blankSet(last)] };
    }));
  }
  function updateSet(exId, idx, patch) {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e;
      const keys = Object.keys(patch);
      const newSets = e.sets.map((st, i) => i === idx
        ? { ...st, ...patch,
            touched: { ...(st.touched || {}), ...Object.fromEntries(keys.map(k => [k, true])) },
            auto: { ...(st.auto || {}), ...Object.fromEntries(keys.map(k => [k, false])) } }
        : { ...st });
      const isDefault = (field, v) => v === "" || (field === "assist" && v === "Kein Band") || (field === "weightMode" && v === WEIGHT_MODES[0]);
      if (newSets[idx].setType !== "Aufwärmen") {
        keys.filter(k => k !== "setType" && k !== "done").forEach(field => {
          for (let i = idx + 1; i < newSets.length; i++) {
            const t = newSets[i];
            if (t.setType === "Aufwärmen") continue;
            const isProtected = (t.touched && t.touched[field]) || (!isDefault(field, t[field]) && !(t.auto && t.auto[field]));
            if (!isProtected) newSets[i] = { ...t, [field]: patch[field], auto: { ...(t.auto || {}), [field]: true } };
          }
        });
      }
      return { ...e, sets: newSets };
    }));
  }
  function removeSet(exId, idx) {
    setExercises(prev => prev.map(e => e.id === exId ? { ...e, sets: e.sets.filter((_, i) => i !== idx) } : e));
  }
  function prefillFromHistory(exId) {
    const ex = exercises.find(e => e.id === exId);
    if (!ex || !ex.name.trim()) return;
    const hasData = ex.sets.some(s => s.reps !== "" || s.weight !== "") || ex.holdSeconds;
    if (hasData) return;
    if (!findPreviousExercise(histSessions, ex.name.trim()).length) return;
    const b = buildExercise(ex.name.trim(), null);
    setExercises(prev => prev.map(e => e.id === exId ? { ...b, id: e.id, name: e.name } : e));
  }
  function toggleDone(exId, idx) {
    const ex = exercises.find(e => e.id === exId);
    if (!ex) return;
    const becoming = !ex.sets[idx].done;
    const allDone = ex.sets.every((st, i) => (i === idx ? becoming : st.done));
    setExercises(prev => prev.map(e => e.id === exId ? { ...e, collapsed: becoming && allDone ? true : e.collapsed, sets: e.sets.map((s, i) => i === idx ? { ...s, done: becoming } : s) } : e));
    if (!becoming) return;
    let rest = ex.restSec === "" ? guessRest(ex.name) : Number(ex.restSec);
    if (!Number.isFinite(rest)) rest = guessRest(ex.name);
    if (ex.sets[idx].setType === "Aufwärmen") rest = Math.min(rest, 45);
    if (rest > 0) startRest(rest, ex.name);
    if (!isEdit && !sw.running && sw.acc === 0) swStart();
  }

  function submit() {
    const cleanEx = exercises.filter(e => e.name.trim()).map(e => ({
      name: e.name.trim(),
      holdSeconds: e.holdSeconds ? Number(e.holdSeconds) : undefined,
      grip: e.grip && e.grip !== "Keine Angabe" ? e.grip : undefined,
      restSec: e.restSec === "" ? undefined : Number(e.restSec),
      target: e.target && e.target.trim() ? e.target.trim() : undefined,
      note: (e.note || "").trim(),
      max: e.maxManual && (e.max || "").trim() ? e.max.trim() : "",
      maxManual: !!(e.maxManual && (e.max || "").trim()),
      maxAt: e.maxManual && (e.max || "").trim() ? (e.maxAt || date) : undefined,
      sets: e.holdSeconds ? [] : e.sets.filter(s => s.reps !== "" || s.weight !== "").map(s => ({
        reps: s.reps === "" ? 0 : Number(s.reps), weight: s.weight === "" ? 0 : Number(s.weight), rir: s.rir === "" ? null : Number(s.rir),
        assist: s.assist || "Kein Band", weightMode: s.weightMode === WEIGHT_MODES[1] ? "assist" : "add", setType: s.setType || "Normal",
      })),
    }));
    const durFinal = duration ? Number(duration) : (elapsed >= 60000 ? Math.round(elapsed / 60000) : undefined);
    if (!isEdit) clearDraft();
    onSave({
      id: initialSession?.id || uid(), type, date, focus, planName: plan ? plan.name : undefined,
      customLabel: type === "other" ? (customLabel.trim() || "Sonstiges") : undefined,
      exercises: cleanEx,
      duration: durFinal,
      distance: distance ? Number(distance) : undefined,
      avgHR: avgHR ? Number(avgHR) : undefined,
      rpe: rpe ? Number(rpe) : undefined,
      notes: notes.trim() || undefined,
    });
  }

  const inputBase = { padding: 6, borderRadius: 6, border: `1px solid ${LINE}` };
  const smallBtn = { fontSize: 12, padding: "5px 9px", borderRadius: 8, border: `1px solid ${LINE}`, background: CARD, color: INK, display: "flex", alignItems: "center", gap: 4 };
  const restPct = restEnd != null && restTotal > 0 ? Math.min(100, Math.max(0, ((restEnd - now) / (restTotal * 1000)) * 100)) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(28,35,32,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }} onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ background: PAPER, borderRadius: 14, padding: 24, maxWidth: 520, width: "100%", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="sg" style={{ fontSize: 17, fontWeight: 700 }}>{isEdit ? "Einheit bearbeiten" : "Einheit loggen"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none" }}><X size={18} color={MUTE} /></button>
        </div>

        {(!isEdit || restEnd != null || restFinished) && (
          <div style={{ position: "sticky", top: 0, zIndex: 5, background: PAPER, margin: "0 -4px 12px", padding: "6px 4px 8px", borderBottom: `1px solid ${LINE}` }}>
            {!isEdit && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Timer size={15} color={IRON} />
                <span className="sg" data-testid="stopwatch" style={{ fontSize: 17, fontWeight: 700 }}>{fmtClock(elapsed)}</span>
                <span style={{ fontSize: 11, color: MUTE }}>Trainingsdauer</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  {sw.running
                    ? <button onClick={swPause} style={smallBtn}><Pause size={13} /> Stopp</button>
                    : <button onClick={swStart} style={smallBtn}><Play size={13} /> {sw.acc > 0 ? "Weiter" : "Start"}</button>}
                  {sw.acc > 0 && !sw.running && <button aria-label="Stoppuhr zurücksetzen" onClick={swReset} style={smallBtn}><RotateCcw size={13} /></button>}
                </div>
              </div>
            )}
            {restEnd != null && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: MUTE }}>{`Satzpause${restLabel ? ` · ${restLabel}` : ""}`}</span>
                  <span className="sg" data-testid="rest-countdown" style={{ fontSize: 20, fontWeight: 700, color: IRON }}>{fmtClock(restEnd - now)}</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button onClick={() => adjustRest(-15)} style={smallBtn}>−15</button>
                    <button onClick={() => adjustRest(15)} style={smallBtn}>+15</button>
                    <button aria-label="Pause überspringen" onClick={skipRest} style={smallBtn}><SkipForward size={13} /></button>
                  </div>
                </div>
                <div style={{ height: 4, background: LINE, borderRadius: 4, marginTop: 6 }}>
                  <div style={{ height: 4, width: `${restPct}%`, background: "linear-gradient(90deg, #5CA8E0, #2E86C1)", borderRadius: 4, transition: "width .25s linear" }} />
                </div>
              </div>
            )}
            {restFinished && restEnd == null && (
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: IRON }}>Pause vorbei, weiter geht's 💪</div>
            )}
          </div>
        )}

        {restored && (
          <div style={{ background: "#FFF7E0", border: "1px solid #F0DFA8", borderRadius: 8, padding: "8px 10px", fontSize: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span>Angefangene Einheit wiederhergestellt.</span>
            <button onClick={discardDraft} style={{ ...smallBtn, background: "transparent" }}>Verwerfen</button>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {TYPES.map(t => (
            <button key={t.id} onClick={() => { setType(t.id); if (plan && t.id !== plan.type) setPlanId(null); }} style={{
              padding: "7px 12px", borderRadius: 20, fontSize: 12, border: `1px solid ${type === t.id ? IRON : LINE}`,
              background: type === t.id ? "#DCEEFA" : CARD, color: type === t.id ? IRON : INK
            }}>{t.label}</button>
          ))}
        </div>

        {plans.length > 0 && !isEdit && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: MUTE, marginBottom: 6 }}>Meine Trainingspläne</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {plans.map(p => {
                const active = planId === p.id;
                return (
                  <button key={p.id} onClick={() => (active ? setPlanId(null) : selectPlan(p))} style={{
                    fontSize: 12, padding: "6px 12px", borderRadius: 20, border: `1px solid ${active ? IRON : LINE}`,
                    background: active ? "#DCEEFA" : CARD, color: active ? IRON : INK, display: "flex", alignItems: "center", gap: 4
                  }}>{active && <Check size={12} />} {p.name}</button>
                );
              })}
            </div>
            {plan && <div style={{ fontSize: 10, color: MUTE, marginTop: 6 }}>Plan aktiv. Tippe ihn nochmal an, um zum Standardplan zurückzukehren.</div>}
          </div>
        )}

        <label style={{ fontSize: 12, color: MUTE }}>Datum</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: "100%", padding: 9, borderRadius: 8, border: `1px solid ${LINE}`, marginTop: 4, marginBottom: 14, background: CARD }} />

        {(type === "calisthenics" || type === "legs") && !plan && (
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {(type === "calisthenics"
              ? [["a", "Calisthenics A (Mi)"], ["b", "Calisthenics B (Sa)"]]
              : [["do", "Beintag (Do)"], ["sa", "Beine Samstag"]]
            ).map(([id, label]) => {
              const active = (type === "calisthenics" ? calFocus : legsFocus) === id;
              return (
                <button key={id} onClick={() => (type === "calisthenics" ? setCalFocus(id) : setLegsFocus(id))} style={{
                  flex: 1, padding: "7px 10px", borderRadius: 8, fontSize: 12, border: `1px solid ${active ? IRON : LINE}`,
                  background: active ? "#DCEEFA" : CARD, color: active ? IRON : INK
                }}>{label}</button>
              );
            })}
          </div>
        )}

        {template && (
          <div style={{ background: "#E3F1FB", border: `1px solid ${LINE}`, borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: IRON }}>{plan ? "Plan" : "Vorschlag"}: {template.title}</div>
              <button onClick={loadAllTemplate} style={{ fontSize: 11, background: "none", border: `1px solid ${IRON}`, color: IRON, borderRadius: 6, padding: "4px 8px" }}>Alle übernehmen</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {template.exercises.map(item => {
                const already = exercises.some(e => e.name.toLowerCase() === item.name.toLowerCase());
                return (
                  <button key={item.name} onClick={() => addFromTemplate(item)} disabled={already} style={{
                    fontSize: 11, padding: "5px 10px", borderRadius: 20, border: `1px solid ${LINE}`,
                    background: already ? "#D3E7F5" : CARD, color: already ? MUTE : INK, display: "flex", alignItems: "center", gap: 4
                  }}>
                    {already ? <Check size={11} /> : <Plus size={11} />} {item.name}{item.altOf ? ` (statt ${item.altOf})` : ""} <span style={{ color: MUTE }}>({item.hint})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {template && otherKey && SESSION_TEMPLATES[otherKey] && (
          <div style={{ marginBottom: 14 }}>
            <button onClick={() => setShowOther(v => !v)} style={{ fontSize: 12, color: IRON, background: "none", border: "none", padding: 0 }}>
              {showOther ? "−" : "+"} Übungen aus „{SESSION_TEMPLATES[otherKey].title}“ hinzufügen
            </button>
            {showOther && (
              <div style={{ border: `1px dashed ${IRON}`, borderRadius: 10, padding: 12, marginTop: 8 }}>
                <div style={{ fontSize: 11, color: MUTE, marginBottom: 8 }}>Die Einheit zählt weiter als {sessionLabel({ type, focus })}, egal woher die Übungen kommen.</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SESSION_TEMPLATES[otherKey].exercises.map(item => {
                    const already = exercises.some(e => e.name.toLowerCase() === item.name.toLowerCase());
                    return (
                      <button key={item.name} onClick={() => addFromTemplate(item)} disabled={already} style={{
                        fontSize: 11, padding: "5px 10px", borderRadius: 20, border: `1px solid ${LINE}`,
                        background: already ? "#D3E7F5" : CARD, color: already ? MUTE : INK, display: "flex", alignItems: "center", gap: 4
                      }}>
                        {already ? <Check size={11} /> : <Plus size={11} />} {item.name}{item.altOf ? ` (statt ${item.altOf})` : ""} <span style={{ color: MUTE }}>({item.hint})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {recentSessions.length > 0 && (
          <div style={{ border: `1px solid ${LINE}`, background: CARD, borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: IRON, marginBottom: 8 }}>Übungen aus einer früheren Einheit übernehmen</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {recentSessions.map((x, i) => (
                <button key={x.id} onClick={() => copyFromSession(x)} style={{
                  fontSize: 11, padding: "6px 10px", borderRadius: 20, border: `1px solid ${i === 0 ? IRON : LINE}`,
                  background: i === 0 ? "#DCEEFA" : "transparent", color: i === 0 ? IRON : INK, display: "flex", alignItems: "center", gap: 4
                }}>
                  <Copy size={11} /> {i === 0 ? "Letzte: " : ""}{sessionLabel(x)} · {fmtDate(x.date)}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: MUTE, marginTop: 6 }}>Es zählt, was du oben als Calisthenics A/B bzw. Beintag/Samstag auswählst, nicht woher die Übungen stammen.</div>
          </div>
        )}

        {customExNames.length > 0 && (
          <div style={{ background: "transparent", border: `1px dashed ${LINE}`, borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: MUTE, marginBottom: 8 }}>Eigene Übungen (bereits genutzt, nicht Teil des festen Plans)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {customExNames.map(name => {
                const already = exercises.some(e => e.name.toLowerCase() === name.toLowerCase());
                return (
                  <button key={name} onClick={() => addCustomExercise(name)} disabled={already} style={{
                    fontSize: 11, padding: "5px 10px", borderRadius: 20, border: `1px dashed ${MUTE}`,
                    background: already ? "#EEF3F7" : "transparent", color: already ? "#A8B8C4" : MUTE, display: "flex", alignItems: "center", gap: 4
                  }}>
                    {already ? <Check size={11} /> : <Plus size={11} />} {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {hasExercises && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: MUTE, marginBottom: 8 }}>Übungen</div>
            {exercises.map((ex, exIdx) => {
              const suggestion = ex.name.trim() ? nextTargetSuggestion(histSessions, ex.name, focus) : null;
              const historyNote = ex.name.trim() ? exerciseHistoryNote(histSessions, ex.name, focus) : null;
              const maxReminder = ex.name.trim() ? maxReminderFor(histSessions, ex.name.trim(), todayISO()) : null;
              const liveMax = ex.name.trim() ? effectiveMax(histSessions, ex.name.trim(), { date, ex: formExToStored(ex) }, SEED.baseline) : null;
              const maxIsManual = ex.maxEdited ? true : !!(liveMax && liveMax.source === "manual");
              const histEntry = ex.name.trim() ? (findPreviousExercise(histSessions, ex.name.trim(), focus)[0] || null) : null;
              const prevSets = histEntry ? (histEntry.ex.sets || []) : [];
              const refFor = (i) => {
                const warm = ex.sets[i].setType === "Aufwärmen";
                const nth = ex.sets.slice(0, i).filter(st => (st.setType === "Aufwärmen") === warm).length;
                return prevSets.filter(st => ((st.setType === "Aufwärmen") === warm))[nth] || null;
              };
              const allDone = ex.sets.length > 0 && ex.sets.every(st => st.done);
              const doneCount = ex.sets.filter(st => st.done).length;
              if (ex.collapsed) {
                const summary = ex.holdSeconds ? `${ex.holdSeconds} s` : ex.sets.map(st => (st.reps ? `${st.reps}${st.weight ? `×${st.weight}kg` : ""}` : "–")).join(" · ");
                return (
                  <div key={ex.id} style={{ background: CARD, border: `1px solid ${allDone ? IRON : LINE}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 12, flexShrink: 0, background: allDone ? IRON : "transparent", border: `1px solid ${allDone ? IRON : LINE}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={13} color={allDone ? "#fff" : MUTE} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{ex.name || "Neue Übung"}</div>
                        <div style={{ fontSize: 11, color: MUTE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.sets.length > 0 ? `${doneCount}/${ex.sets.length} Sätze · ` : ""}{summary}</div>
                      </div>
                      <button aria-label="Übung aufklappen" onClick={() => toggleCollapse(ex.id)} style={{ background: "none", border: `1px solid ${LINE}`, borderRadius: 8, padding: "5px 8px", display: "flex", alignItems: "center" }}><Maximize2 size={14} color={MUTE} /></button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={ex.id} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button aria-label="Übung nach oben" disabled={exIdx === 0} onClick={() => moveExercise(ex.id, -1)} style={{ background: "none", border: `1px solid ${LINE}`, borderRadius: 5, padding: 0, width: 28, minHeight: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", opacity: exIdx === 0 ? 0.35 : 1 }}><ChevronUp size={14} color={MUTE} /></button>
                      <button aria-label="Übung nach unten" disabled={exIdx === exercises.length - 1} onClick={() => moveExercise(ex.id, 1)} style={{ background: "none", border: `1px solid ${LINE}`, borderRadius: 5, padding: 0, width: 28, minHeight: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", opacity: exIdx === exercises.length - 1 ? 0.35 : 1 }}><ChevronDown size={14} color={MUTE} /></button>
                    </div>
                    <input placeholder="Übungsname (z.B. Dips)" value={ex.name} onChange={e => updateExercise(ex.id, { name: e.target.value })} onBlur={() => prefillFromHistory(ex.id)} style={{ ...inputBase, flex: 1, padding: 8 }} />
                    <button aria-label="Übung einklappen" onClick={() => toggleCollapse(ex.id)} style={{ background: "none", border: "none" }}><Minimize2 size={15} color={MUTE} /></button>
                    <button aria-label="Übung entfernen" onClick={() => removeExercise(ex.id)} style={{ background: "none", border: "none" }}><X size={15} color={MUTE} /></button>
                  </div>
                  {historyNote && <div style={{ fontSize: 11, color: MUTE, marginBottom: 4 }}>{historyNote}</div>}
                  {maxReminder && <div style={{ fontSize: 11, color: AMBER, marginBottom: 6, lineHeight: 1.4 }}>Dein Max ist {maxReminder.weeks} Wochen alt ({maxReminder.text}). Teste ihn heute, z. B. als letzten Satz mit der Satzart „Max-Test“.</div>}
                  {suggestion && (
                    <div style={{ fontSize: 12, color: IRON, fontWeight: 500, marginBottom: 8, background: "#EAF4FC", borderRadius: 6, padding: "6px 8px", lineHeight: 1.45 }}>→ {suggestion}</div>
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "flex-end" }}>
                    <label style={{ fontSize: 10, color: MUTE, display: "flex", flexDirection: "column", gap: 2 }}>Ziel-Wdh
                      <input aria-label="Ziel-Wiederholungen" placeholder="8-12" value={ex.target} onChange={e => updateExercise(ex.id, { target: e.target.value })} style={{ ...inputBase, width: 70 }} />
                    </label>
                    <label style={{ fontSize: 10, color: MUTE, display: "flex", flexDirection: "column", gap: 2 }}>Pause (Sek, 0 = kein Timer)
                      <input aria-label="Pause in Sekunden" type="number" value={ex.restSec} onChange={e => updateExercise(ex.id, { restSec: e.target.value })} style={{ ...inputBase, width: 80 }} />
                    </label>
                    <label style={{ fontSize: 10, color: MUTE, display: "flex", flexDirection: "column", gap: 2 }}>
                      <span>Mein Max {maxIsManual
                        ? <button type="button" aria-label="Max wieder automatisch berechnen" onClick={() => updateExercise(ex.id, { max: "", maxManual: false, maxAt: undefined, maxEdited: false })} style={{ background: "none", border: "none", padding: 0, fontSize: 10, color: IRON, textDecoration: "underline", minHeight: 0 }}>auto</button>
                        : <span style={{ color: IRON }}>(auto)</span>}</span>
                      <input aria-label="Maximum dieser Übung" placeholder="automatisch" value={ex.maxEdited ? (ex.max || "") : (liveMax ? liveMax.text : "")} onChange={e => updateExercise(ex.id, { max: e.target.value, maxManual: true, maxAt: date, maxEdited: true })} style={{ ...inputBase, width: 132 }} />
                    </label>
                    <label style={{ fontSize: 10, color: MUTE, display: "flex", flexDirection: "column", gap: 2 }}>Griff
                      <select aria-label="Griffart" value={ex.grip || "Keine Angabe"} onChange={e => updateExercise(ex.id, { grip: e.target.value })} style={{ ...inputBase, fontSize: 12, background: CARD, color: ex.grip && ex.grip !== "Keine Angabe" ? INK : MUTE }}>
                        {GRIPS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </label>
                  </div>

                  <textarea aria-label="Notiz zur Übung" rows={2} placeholder="Notiz (z. B. Gewicht erhöhen, auf Ellbogen achten). Erscheint beim nächsten Mal wieder." value={ex.note || ""} onChange={e => updateExercise(ex.id, { note: e.target.value })}
                    style={{ ...inputBase, width: "100%", fontSize: 12, marginBottom: 8, resize: "vertical", background: ex.note ? "#FFF7E0" : CARD }} />

                  <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
                    <label style={{ fontSize: 11, color: MUTE }}>Hold (Sek, für Handstand/L-Sit):</label>
                    <input type="number" value={ex.holdSeconds} onChange={e => updateExercise(ex.id, { holdSeconds: e.target.value })} style={{ ...inputBase, width: 70 }} />
                  </div>
                  {!ex.holdSeconds && (
                    <div>
                      {ex.sets.map((s, i) => (
                        <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < ex.sets.length - 1 ? `1px dashed ${LINE}` : "none" }}>
                          <div className="set-row" style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                            <button aria-label="Satz erledigt" aria-pressed={s.done} onClick={() => toggleDone(ex.id, i)} style={{
                              width: 34, height: 34, minHeight: 34, borderRadius: 17, flexShrink: 0, padding: 0, border: `1px solid ${s.done ? IRON : LINE}`,
                              background: s.done ? IRON : CARD, display: "flex", alignItems: "center", justifyContent: "center"
                            }}><Check size={15} color={s.done ? "#fff" : MUTE} /></button>
                            <input type="number" placeholder={(ex.target || ex.repHint) ? `Reps (Ziel ${ex.target || ex.repHint})` : "Reps"} value={s.reps} onChange={e => updateSet(ex.id, i, { reps: e.target.value })} style={{ ...inputBase, width: 90 }} />
                            <input type="number" placeholder="kg" value={s.weight} onChange={e => updateSet(ex.id, i, { weight: e.target.value })} style={{ ...inputBase, width: 55 }} />
                            <input type="number" placeholder="RIR" value={s.rir} onChange={e => updateSet(ex.id, i, { rir: e.target.value })} style={{ ...inputBase, width: 48 }} />
                            <button aria-label="Satz entfernen" onClick={() => removeSet(ex.id, i)} style={{ background: "none", border: "none" }}><X size={13} color={MUTE} /></button>
                          </div>
                          {(() => { const ref = refFor(i); return ref ? <div style={{ fontSize: 10, color: MUTE, marginBottom: 4 }}>Letztes Mal: {fmtSet(ref, false)}</div> : null; })()}
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <select aria-label="Band" value={s.assist || "Kein Band"} onChange={e => updateSet(ex.id, i, { assist: e.target.value })} style={{ padding: "4px 6px", borderRadius: 6, border: `1px solid ${LINE}`, fontSize: 11, color: s.assist && s.assist !== "Kein Band" ? AMBER : MUTE, background: CARD }}>
                              {ASSIST_LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                            </select>
                            <select aria-label="Satzart" value={s.setType || "Normal"} onChange={e => updateSet(ex.id, i, { setType: e.target.value })} style={{ padding: "4px 6px", borderRadius: 6, border: `1px solid ${LINE}`, fontSize: 11, color: s.setType && s.setType !== "Normal" ? AMBER : MUTE, background: CARD }}>
                              {SET_TYPES.map(t => <option key={t} value={t}>{t === "Normal" ? "Arbeitssatz" : t}</option>)}
                            </select>
                            {s.weight !== "" && (
                              <select aria-label="Gewichtsart" value={s.weightMode || WEIGHT_MODES[0]} onChange={e => updateSet(ex.id, i, { weightMode: e.target.value })} style={{ padding: "4px 6px", borderRadius: 6, border: `1px solid ${LINE}`, fontSize: 11, color: s.weightMode === WEIGHT_MODES[1] ? AMBER : MUTE, background: CARD }}>
                                {WEIGHT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            )}
                          </div>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={() => addSet(ex.id, false)} style={{ fontSize: 11, color: IRON, background: "none", border: "none", padding: "2px 0" }}>+ Satz</button>
                        <button onClick={() => addSet(ex.id, true)} style={{ fontSize: 11, color: MUTE, background: "none", border: "none", padding: "2px 0" }}>+ Aufwärmsatz</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={addExercise} style={{ width: "100%", padding: 9, borderRadius: 8, border: `1px dashed ${LINE}`, background: "none", fontSize: 13, color: IRON }}>+ Übung hinzufügen</button>
          </div>
        )}

        {type === "other" && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: MUTE }}>Was hast du gemacht?</label>
            <input placeholder="z.B. Yoga, Schwimmen, Wandern..." value={customLabel} onChange={e => setCustomLabel(e.target.value)} style={{ width: "100%", padding: 9, borderRadius: 8, border: `1px solid ${LINE}`, marginTop: 4, marginBottom: customLabelsUsed.length ? 8 : 0, background: CARD }} />
            {customLabelsUsed.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {customLabelsUsed.map(name => (
                  <button key={name} onClick={() => selectCustomLabel(name)} style={{
                    fontSize: 11, padding: "5px 10px", borderRadius: 20, border: `1px dashed ${MUTE}`,
                    background: customLabel === name ? "#E3F1FB" : "transparent", color: customLabel === name ? IRON : MUTE, display: "flex", alignItems: "center", gap: 4
                  }}>
                    {customLabel === name && <Check size={11} />} {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {hasExercises && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: MUTE }}>Dauer (min)</label>
            <input type="number" value={duration} placeholder={elapsed >= 60000 ? `${Math.round(elapsed / 60000)} (aus Stoppuhr)` : ""} onChange={e => setDuration(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${LINE}`, marginTop: 4, background: CARD }} />
          </div>
        )}

        {hasCardio && (
          <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div><label style={{ fontSize: 12, color: MUTE }}>Dauer (min)</label><input type="number" value={duration} placeholder={elapsed >= 60000 ? `${Math.round(elapsed / 60000)} (aus Stoppuhr)` : ""} onChange={e => setDuration(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${LINE}`, marginTop: 4 }} /></div>
            {type === "running" && <div><label style={{ fontSize: 12, color: MUTE }}>Distanz (km)</label><input type="number" value={distance} onChange={e => setDistance(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${LINE}`, marginTop: 4 }} /></div>}
            <div><label style={{ fontSize: 12, color: MUTE }}>⌀ Herzfrequenz</label><input type="number" value={avgHR} onChange={e => setAvgHR(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${LINE}`, marginTop: 4 }} /></div>
            <div><label style={{ fontSize: 12, color: MUTE }}>RPE (1-10)</label><input type="number" value={rpe} onChange={e => setRpe(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${LINE}`, marginTop: 4 }} /></div>
          </div>
        )}

        <label style={{ fontSize: 12, color: MUTE }}>Notizen zur ganzen Einheit</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ width: "100%", padding: 9, borderRadius: 8, border: `1px solid ${LINE}`, marginTop: 4, marginBottom: 16, resize: "vertical" }} />

        <div style={{ fontSize: 11, color: MUTE, textAlign: "center", marginBottom: 8 }}>Wird gezählt als: <b style={{ color: INK }}>{sessionLabel({ type, focus, customLabel, planName: plan ? plan.name : undefined })}</b></div>
        <button onClick={submit} className="btn-primary" style={{ width: "100%", padding: 12, borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Check size={15} /> {isEdit ? "Änderungen speichern" : "Einheit speichern"}
        </button>
      </div>
    </div>
  );
}

export { nextTargetSuggestion, perfScore, parseRange, effectiveMax, maxReminders };
