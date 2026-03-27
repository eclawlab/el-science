// Session State Manager — elementary science orchestrator.
// Persistent module state in skills data dirs. Session state is ephemeral.

const fs = require('fs');
const path = require('path');

const SESSION_DIR = path.join(process.env.HOME, 'data', 'sessions');

const MODULE_ABBREVS = {
  'life': 'life',
  'physical': 'phys',
  'earth': 'eart',
  'matter': 'matt',
  'inquiry': 'inqu',
  'study-planner': 'plan',
};

const MODULES = Object.keys(MODULE_ABBREVS);
const CONTENT_MODULES = MODULES.filter(m => m !== 'study-planner');

const MODULE_LABELS = {
  'life': 'Life Science',
  'physical': 'Physical Science',
  'earth': 'Earth & Space',
  'matter': 'Matter & Chemistry',
  'inquiry': 'Science Inquiry',
  'study-planner': 'Study Plan',
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Session Object ──

function createSession(studentId, grade, tutorId) {
  return {
    studentId,
    grade: grade || 'grade-3',
    goal: 'on-level',
    tutor: tutorId || 'methodical',
    studyProfile: null,
    onboarded: false,
    onboardingStep: 0,
    activeModule: null,
    activeSkill: null,
    phase: 'idle',
    turnCount: 0,
    correctStreak: 0,
    consecutiveWrong: 0,
    recentResults: [],
    currentExercise: null,
    currentLab: null,
    currentCER: null,
    currentDiagram: null,
    reviewQueue: [],
    history: [],
    historySummary: '',
    lastDetour: null,
    difficultyAdjustments: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function loadSession(studentId) {
  ensureDir(SESSION_DIR);
  const file = path.join(SESSION_DIR, `sci-${String(studentId).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
  if (fs.existsSync(file)) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { return createSession(studentId); }
  }
  return createSession(studentId);
}

function saveSession(session) {
  ensureDir(SESSION_DIR);
  session.updatedAt = new Date().toISOString();
  const file = path.join(SESSION_DIR, `sci-${String(session.studentId).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
  fs.writeFileSync(file, JSON.stringify(session, null, 2));
}

function incrementTurn(session) {
  session.turnCount++;
}

function addToHistory(session, role, text) {
  session.history.push({ role, text, ts: Date.now() });
  // Keep only last 40 turns in memory
  if (session.history.length > 40) {
    session.history = session.history.slice(-40);
  }
}

function recordResult(session, skill, score, total) {
  session.recentResults.push({ skill, score, total, ts: Date.now() });
  if (session.recentResults.length > 20) {
    session.recentResults = session.recentResults.slice(-20);
  }
}

// ── Mastery Aggregation ──

function computeMastery(studentId) {
  const mastery = {};
  for (const mod of CONTENT_MODULES) {
    mastery[mod] = 0;
  }
  // Placeholder — modules will provide actual mastery data
  return mastery;
}

module.exports = {
  MODULES,
  CONTENT_MODULES,
  MODULE_LABELS,
  MODULE_ABBREVS,
  createSession,
  loadSession,
  saveSession,
  incrementTurn,
  addToHistory,
  recordResult,
  computeMastery,
};
