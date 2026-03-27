// Module Loader — three-tier lazy loading for elementary science modules.
// T0: routing table (always loaded)
// T1: module descriptor (loaded after routing)
// T2: exercise/lesson/lab/CER content (loaded on demand from module CLI)

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');
const SKILLS_DIR = path.join(__dirname, '..', 'skills');

const MODULE_MAP = {
  'life': { dir: 'el-science-life', script: 'life.js' },
  'physical': { dir: 'el-science-physical', script: 'physical.js' },
  'earth': { dir: 'el-science-earth', script: 'earth.js' },
  'matter': { dir: 'el-science-matter', script: 'matter.js' },
  'inquiry': { dir: 'el-science-inquiry', script: 'inquiry.js' },
  'study-planner': { dir: 'el-science-study-planner', script: 'study-planner.js' },
};

// ── T0: Static Prompt Loading ──

function loadPersona() {
  const p = path.join(PROMPTS_DIR, 'base-persona.txt');
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  return 'You are a friendly elementary school science tutor.';
}

function loadRoutingTable() {
  const p = path.join(PROMPTS_DIR, 'routing-table.txt');
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  return '';
}

// ── Module CLI Execution ──

function getModulePath(moduleName) {
  const info = MODULE_MAP[moduleName];
  if (!info) return null;
  return path.join(SKILLS_DIR, info.dir, info.script);
}

/**
 * Execute a module CLI command and return parsed JSON output.
 */
function execModule(moduleName, args = []) {
  const scriptPath = getModulePath(moduleName);
  if (!scriptPath || !fs.existsSync(scriptPath)) {
    return { error: `Module ${moduleName} not found at ${scriptPath}` };
  }

  try {
    const result = execFileSync('node', [scriptPath, ...args], {
      encoding: 'utf8',
      timeout: 10000,
      cwd: path.dirname(scriptPath),
    });

    try {
      return JSON.parse(result.trim());
    } catch {
      return { text: result.trim() };
    }
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : '';
    const stdout = err.stdout ? err.stdout.toString().trim() : '';
    if (stdout) {
      try { return JSON.parse(stdout); } catch { /* fall through */ }
    }
    return { error: `${moduleName} command failed: ${stderr || stdout || err.message}` };
  }
}

// ── T2: Content Generation via Module CLI ──

function startStudent(moduleName, studentId, grade) {
  return execModule(moduleName, ['start', studentId, grade || 'grade-3']);
}

function generateLesson(moduleName, studentId) {
  return execModule(moduleName, ['lesson', studentId]);
}

function generateExercise(moduleName, studentId, skill) {
  const args = ['exercise', studentId];
  if (skill) args.push(skill);
  return execModule(moduleName, args);
}

function checkAnswer(moduleName, studentId, answer) {
  return execModule(moduleName, ['check', studentId, answer]);
}

function getSkillTree(moduleName, studentId) {
  return execModule(moduleName, ['skills', studentId]);
}

function getReviewQueue(moduleName, studentId) {
  return execModule(moduleName, ['review', studentId]);
}

function generateLab(moduleName, studentId, labId) {
  const args = ['lab', studentId];
  if (labId) args.push(labId);
  return execModule(moduleName, args);
}

function generateCER(moduleName, studentId, topic) {
  const args = ['cer', studentId];
  if (topic) args.push(topic);
  return execModule(moduleName, args);
}

function generateDiagram(moduleName, studentId, topic) {
  const args = ['diagram', studentId];
  if (topic) args.push(topic);
  return execModule(moduleName, args);
}

function getVocabulary(moduleName, studentId, skill) {
  const args = ['vocab', studentId];
  if (skill) args.push(skill);
  return execModule(moduleName, args);
}

module.exports = {
  loadPersona,
  loadRoutingTable,
  startStudent,
  generateLesson,
  generateExercise,
  checkAnswer,
  getSkillTree,
  getReviewQueue,
  generateLab,
  generateCER,
  generateDiagram,
  getVocabulary,
  MODULE_MAP,
};
