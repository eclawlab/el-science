// User Account System — registration, login, subscription, progress persistence.
// Users register with phone number, system auto-obtains eclaw-router API key.
// All data stored as JSON files in ~/data/el-science-accounts/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const ACCOUNTS_DIR = path.join(process.env.HOME, 'data', 'el-science-accounts');
const ECLAW_ROUTER_URL = process.env.ECLAW_API_URL || '';
const ECLAW_OEM_KEY = process.env.ECLAW_OEM_KEY || '';

// ── Subscription Plans ──

const PLANS = {
  monthly: { id: 'monthly', name: '月度套餐', amountFen: 2780, days: 30, label: '¥27.80/月' },
  quarterly: { id: 'quarterly', name: '季度套餐', amountFen: 7980, days: 90, label: '¥79.80/季' },
  yearly: { id: 'yearly', name: '年度套餐', amountFen: 19800, days: 365, label: '¥198/年' },
};

// ── Helpers ──

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const result = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return result === hash;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function sanitizePhone(phone) {
  return phone.replace(/[^0-9+]/g, '');
}

function userFilePath(userId) {
  ensureDir(ACCOUNTS_DIR);
  return path.join(ACCOUNTS_DIR, `${userId}.json`);
}

function phoneIndexPath() {
  ensureDir(ACCOUNTS_DIR);
  return path.join(ACCOUNTS_DIR, '_phone_index.json');
}

function tokenIndexPath() {
  ensureDir(ACCOUNTS_DIR);
  return path.join(ACCOUNTS_DIR, '_token_index.json');
}

// ── Phone → userId Index ──

function loadPhoneIndex() {
  const f = phoneIndexPath();
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* */ }
  }
  return {};
}

function savePhoneIndex(index) {
  fs.writeFileSync(phoneIndexPath(), JSON.stringify(index, null, 2));
}

// ── Token → userId Index ──

function loadTokenIndex() {
  const f = tokenIndexPath();
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* */ }
  }
  return {};
}

function saveTokenIndex(index) {
  fs.writeFileSync(tokenIndexPath(), JSON.stringify(index, null, 2));
}

// ── User CRUD ──

function loadUser(userId) {
  const f = userFilePath(userId);
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

function saveUser(user) {
  user.updatedAt = new Date().toISOString();
  fs.writeFileSync(userFilePath(user.userId), JSON.stringify(user, null, 2));
}

function findUserByPhone(phone) {
  const index = loadPhoneIndex();
  const userId = index[sanitizePhone(phone)];
  return userId ? loadUser(userId) : null;
}

function findUserByToken(token) {
  const index = loadTokenIndex();
  const userId = index[token];
  if (!userId) return null;
  const user = loadUser(userId);
  if (!user) return null;
  // Check token expiration (30 days)
  if (user.tokenIssuedAt) {
    const issued = new Date(user.tokenIssuedAt).getTime();
    if (Date.now() - issued > 30 * 24 * 60 * 60 * 1000) return null;
  }
  return user;
}

// ── eclaw-router Auto-Registration ──

async function activateEclawRouter(userId, phone) {
  if (!ECLAW_ROUTER_URL || !ECLAW_OEM_KEY) return null;

  const body = JSON.stringify({
    oem_key: ECLAW_OEM_KEY,
    phone_number: phone,
    device_id: `el-science-${userId}`,
    device_info: `el-science user ${phone}`,
    app_version: '1.0.0',
  });

  const url = new URL('/api/activate', ECLAW_ROUTER_URL);
  const transport = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.router_api_key) {
            resolve({
              apiKey: parsed.router_api_key,
              activationId: parsed.activation_id,
              token: parsed.token,
            });
          } else {
            reject(new Error(parsed.error || 'Activation failed'));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

// ── Public API ──

/**
 * Register a new user with phone number and password.
 * Auto-activates eclaw-router for LLM access.
 */
async function register(phone, password, name) {
  phone = sanitizePhone(phone);
  if (!phone || phone.length < 8) throw new Error('请输入有效的手机号');
  if (!password || password.length < 6) throw new Error('密码至少6位');

  // Check if phone already registered
  const existing = findUserByPhone(phone);
  if (existing) throw new Error('该手机号已注册');

  const userId = crypto.randomUUID();
  const { hash, salt } = hashPassword(password);
  const token = generateToken();

  const user = {
    userId,
    phone,
    name: name || '',
    passwordHash: hash,
    passwordSalt: salt,
    token,
    tokenIssuedAt: new Date().toISOString(),
    grade: 'grade-3',
    tutor: 'methodical',
    eclawApiKey: null,
    eclawActivationId: null,
    subscription: {
      plan: null,
      status: 'none',
      expiresAt: null,
      lastPaymentOrderId: null,
    },
    progress: {
      numbers: 0, shapes: 0, measurement: 0, patterns: 0, data: 0,
    },
    totalExercises: 0,
    totalCorrect: 0,
    streakBest: 0,
    badges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Try to activate eclaw-router
  try {
    const eclaw = await activateEclawRouter(userId, phone);
    if (eclaw) {
      user.eclawApiKey = eclaw.apiKey;
      user.eclawActivationId = eclaw.activationId;
    }
  } catch (err) {
    console.error(`eclaw-router activation failed for ${phone}: ${err.message}`);
    // Non-fatal — user can still use rule-based mode
  }

  saveUser(user);

  // Update indices
  const phoneIndex = loadPhoneIndex();
  phoneIndex[phone] = userId;
  savePhoneIndex(phoneIndex);

  const tokenIndex = loadTokenIndex();
  tokenIndex[token] = userId;
  saveTokenIndex(tokenIndex);

  return { userId, token, eclawEnabled: !!user.eclawApiKey };
}

/**
 * Login with phone + password. Returns token.
 */
function login(phone, password) {
  phone = sanitizePhone(phone);
  const user = findUserByPhone(phone);
  if (!user) throw new Error('手机号未注册');
  if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    throw new Error('密码错误');
  }

  // Issue new token
  const oldToken = user.token;
  const token = generateToken();
  user.token = token;
  user.tokenIssuedAt = new Date().toISOString();
  saveUser(user);

  // Update token index
  const tokenIndex = loadTokenIndex();
  delete tokenIndex[oldToken];
  tokenIndex[token] = user.userId;
  saveTokenIndex(tokenIndex);

  return { userId: user.userId, token };
}

/**
 * Get user profile (safe, no password hash).
 */
function getProfile(userId) {
  const user = loadUser(userId);
  if (!user) return null;
  return {
    userId: user.userId,
    phone: user.phone,
    name: user.name,
    grade: user.grade,
    tutor: user.tutor,
    eclawEnabled: !!user.eclawApiKey,
    subscription: user.subscription,
    progress: user.progress,
    totalExercises: user.totalExercises || 0,
    totalCorrect: user.totalCorrect || 0,
    streakBest: user.streakBest || 0,
    badges: user.badges || [],
    createdAt: user.createdAt,
  };
}

/**
 * Update user profile fields (name, grade, tutor).
 */
function updateProfile(userId, updates) {
  const user = loadUser(userId);
  if (!user) throw new Error('用户不存在');
  if (updates.name !== undefined) user.name = updates.name;
  if (updates.grade !== undefined) user.grade = updates.grade;
  if (updates.tutor !== undefined) user.tutor = updates.tutor;
  saveUser(user);
  return getProfile(userId);
}

/**
 * Save progress snapshot from session mastery data.
 */
function saveProgress(userId, mastery, sessionStats) {
  const user = loadUser(userId);
  if (!user) return;
  if (mastery) {
    user.progress = { ...user.progress, ...mastery };
  }
  if (sessionStats) {
    if (sessionStats.exercisesDone) user.totalExercises = (user.totalExercises || 0) + sessionStats.exercisesDone;
    if (sessionStats.correctAnswers) user.totalCorrect = (user.totalCorrect || 0) + sessionStats.correctAnswers;
    if (sessionStats.streak && sessionStats.streak > (user.streakBest || 0)) user.streakBest = sessionStats.streak;
  }
  saveUser(user);
}

/**
 * Award a badge to the user.
 */
function awardBadge(userId, badge) {
  const user = loadUser(userId);
  if (!user) return;
  if (!user.badges) user.badges = [];
  if (!user.badges.find(b => b.id === badge.id)) {
    user.badges.push({ ...badge, awardedAt: new Date().toISOString() });
    saveUser(user);
  }
}

/**
 * Check if user has active subscription.
 */
function hasActiveSubscription(userId) {
  const user = loadUser(userId);
  if (!user) return false;
  const sub = user.subscription;
  if (!sub || sub.status !== 'active') return false;
  if (!sub.expiresAt || new Date(sub.expiresAt) < new Date()) {
    // Expired or missing expiry — update status
    user.subscription.status = 'expired';
    saveUser(user);
    return false;
  }
  return true;
}

/**
 * Activate subscription after successful payment.
 */
function activateSubscription(userId, planId, orderId) {
  const user = loadUser(userId);
  if (!user) throw new Error('用户不存在');
  const plan = PLANS[planId];
  if (!plan) throw new Error('无效的套餐');

  const now = new Date();
  // If currently active, extend from current expiry
  let startDate = now;
  if (user.subscription && user.subscription.status === 'active' && user.subscription.expiresAt) {
    const currentExpiry = new Date(user.subscription.expiresAt);
    if (currentExpiry > now) startDate = currentExpiry;
  }

  const expiresAt = new Date(startDate.getTime() + plan.days * 24 * 60 * 60 * 1000);

  user.subscription = {
    plan: planId,
    status: 'active',
    expiresAt: expiresAt.toISOString(),
    lastPaymentOrderId: orderId,
    activatedAt: now.toISOString(),
  };
  saveUser(user);
  return user.subscription;
}

/**
 * Get user's eclaw API key (for LLM calls).
 */
function getEclawApiKey(userId) {
  const user = loadUser(userId);
  return user ? user.eclawApiKey : null;
}

/**
 * Get subscription plans.
 */
function getPlans() {
  return Object.values(PLANS);
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  saveProgress,
  awardBadge,
  hasActiveSubscription,
  activateSubscription,
  getEclawApiKey,
  getPlans,
  findUserByToken,
  findUserByPhone,
  loadUser,
  PLANS,
};
