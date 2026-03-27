// EL Science Tutor — Express server.
// Serves the student UI, wraps the orchestrator as a REST API,
// and serves PhET interactive simulations from the science lab.

// Load .env before anything else
const path = require('path');
const fs = require('fs');
(function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
})();

const express = require('express');
const Orchestrator = require('./lib/orchestrator');
const payment = require('./lib/payment');
const accounts = require('./lib/accounts');

const app = express();
const orch = new Orchestrator();

// Root of the science lab (parent of tutor/)
const LAB_ROOT = path.resolve(__dirname, '..');

app.use(express.json());
app.use(express.text({ type: 'text/xml' }));    // for Leshua XML notifications
app.use(express.text({ type: 'application/xml' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── PhET Simulation Catalog (Elementary Science) ─────────────────────────
const topics = [
  {
    id: 'forces-and-motion', title: '力与运动', icon: '🚀', color: '#ef4444',
    description: '学习推力、拉力、摩擦力和重力。',
    sims: [
      { slug: 'forces-and-motion-basics', title: '力与运动基础', desc: '推、拉物体，观察力如何让物体运动和停止。' },
      { slug: 'friction',                 title: '摩擦力',       desc: '探索不同表面的摩擦力大小。' },
      { slug: 'gravity-force-lab',        title: '万有引力实验室', desc: '探索两个物体之间的引力如何变化。' },
      { slug: 'gravity-and-orbits',       title: '引力与轨道',   desc: '观察行星如何绕恒星运转。' },
      { slug: 'buoyancy-basics',          title: '浮力基础',     desc: '为什么有些东西浮在水上，有些沉下去？' },
      { slug: 'buoyancy',                 title: '浮力探究',     desc: '深入探索浮力和密度的关系。' },
      { slug: 'density',                  title: '密度',         desc: '比较不同物质的密度，预测沉浮。' },
      { slug: 'under-pressure',           title: '压强',         desc: '了解液体压强如何随深度变化。' },
      { slug: 'pendulum-lab',             title: '摆钟实验室',   desc: '改变摆长和质量，观察摆动变化。' },
      { slug: 'projectile-motion',        title: '抛体运动',     desc: '发射物体，观察抛物线运动。' },
      { slug: 'collision-lab',            title: '碰撞实验室',   desc: '探索物体碰撞时动量和能量的变化。' },
    ]
  },
  {
    id: 'energy-and-heat', title: '能量与热', icon: '🔥', color: '#f59e0b',
    description: '学习能量的形式和转换。',
    sims: [
      { slug: 'energy-forms-and-changes',  title: '能量形式与转换', desc: '观察热能、光能、机械能如何相互转换。' },
      { slug: 'energy-skate-park-basics',  title: '能量滑板公园',   desc: '滑板手的动能和势能如何变化？' },
      { slug: 'states-of-matter-basics',   title: '物态变化基础',   desc: '固体、液体、气体是怎么变化的？' },
      { slug: 'states-of-matter',          title: '物质状态',       desc: '从原子角度观察加热和冷却的效果。' },
      { slug: 'eating-exercise-and-energy', title: '饮食与运动',   desc: '了解食物中的能量和运动消耗。' },
    ]
  },
  {
    id: 'light-and-sound', title: '光与声', icon: '🌈', color: '#8b5cf6',
    description: '探索光的颜色、折射和声音的传播。',
    sims: [
      { slug: 'color-vision',       title: '色觉',       desc: '用红绿蓝三种光混合出各种颜色。' },
      { slug: 'bending-light',      title: '光的折射',   desc: '观察光在不同介质中如何弯曲。' },
      { slug: 'wave-on-a-string',   title: '绳波',       desc: '抖动绳子，观察波的传播。' },
      { slug: 'sound-waves',        title: '声波',       desc: '看见声音！观察声波如何传播。' },
      { slug: 'molecules-and-light', title: '分子与光',  desc: '光照射到不同分子上会怎样？' },
      { slug: 'waves-intro',        title: '波动入门',   desc: '用水波和声波来理解波的基本特性。' },
      { slug: 'wave-interference',   title: '波的干涉',  desc: '两列波相遇时会发生什么？' },
    ]
  },
  {
    id: 'matter-and-chemistry', title: '物质与变化', icon: '🧪', color: '#10b981',
    description: '认识原子分子，了解化学变化。',
    sims: [
      { slug: 'build-an-atom',               title: '搭建原子',     desc: '用质子、中子、电子搭建不同的原子。' },
      { slug: 'build-a-molecule',             title: '搭建分子',     desc: '把原子组合成分子，认识常见物质。' },
      { slug: 'concentration',                title: '浓度',         desc: '往水里加溶质，观察浓度变化。' },
      { slug: 'ph-scale-basics',              title: '酸碱度基础',   desc: '测试不同液体是酸性还是碱性。' },
      { slug: 'ph-scale',                     title: '酸碱度',       desc: '深入了解pH值和酸碱指示剂。' },
      { slug: 'balancing-chemical-equations',  title: '化学方程式配平', desc: '学习如何配平化学方程式。' },
      { slug: 'reactants-products-and-leftovers', title: '反应物与生成物', desc: '化学反应中物质是怎么变化的？' },
      { slug: 'diffusion',                    title: '扩散',         desc: '观察粒子如何从高浓度扩散到低浓度。' },
    ]
  },
  {
    id: 'life-and-earth', title: '生命与地球', icon: '🌍', color: '#3b82f6',
    description: '探索生物进化和太阳系。',
    sims: [
      { slug: 'natural-selection',  title: '自然选择',   desc: '观察兔子种群如何适应环境变化。' },
      { slug: 'my-solar-system',    title: '我的太阳系', desc: '创建你自己的太阳系，探索引力和轨道。' },
    ]
  },
  {
    id: 'electricity-and-magnets', title: '电与磁', icon: '⚡', color: '#ec4899',
    description: '学习电路、静电和磁铁。',
    sims: [
      { slug: 'balloons-and-static-electricity', title: '气球与静电', desc: '用气球在毛衣上摩擦，体验静电。' },
      { slug: 'circuit-construction-kit-dc',      title: '电路搭建',   desc: '用电池、灯泡、导线搭建电路。' },
      { slug: 'faradays-law',                     title: '法拉第定律', desc: '移动磁铁产生电流，探索电磁感应。' },
      { slug: 'ohms-law',                         title: '欧姆定律',   desc: '探索电压、电流和电阻的关系。' },
    ]
  },
];

// Directory layout mapping: slug -> category sub-folder
// Auto-discovered from filesystem for robustness.
const CATEGORY_DIRS = ['forces-and-motion', 'energy-and-heat', 'light-and-sound', 'matter-and-chemistry', 'life-and-earth', 'electricity-and-magnets', 'framework'];

const slugToCategory = {};
for (const cat of CATEGORY_DIRS) {
  const catPath = path.join(LAB_ROOT, cat);
  if (fs.existsSync(catPath)) {
    try {
      for (const entry of fs.readdirSync(catPath)) {
        const full = path.join(catPath, entry);
        if (fs.statSync(full).isDirectory()) {
          slugToCategory[entry] = cat;
        }
      }
    } catch { /* skip unreadable dirs */ }
  }
}

const MIME_TYPES = {
  '.html': 'text/html',       '.css': 'text/css',
  '.js':   'text/javascript',  '.mjs': 'text/javascript',
  '.ts':   'text/javascript',
  '.json': 'application/json', '.png': 'image/png',
  '.jpg':  'image/jpeg',       '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',        '.svg': 'image/svg+xml',
  '.ico':  'image/x-icon',     '.webp': 'image/webp',
  '.mp3':  'audio/mpeg',       '.wav': 'audio/wav',
  '.ogg':  'audio/ogg',        '.woff': 'font/woff',
  '.woff2':'font/woff2',       '.ttf':  'font/ttf',
};

// ── Auth Middleware ──

function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '请先登录' });
  const user = accounts.findUserByToken(token);
  if (!user) return res.status(401).json({ error: '登录已过期，请重新登录' });
  req.user = user;
  next();
}

// ── Account API ──

// Register with phone number
app.post('/api/account/register', async (req, res) => {
  try {
    const { phone, password, name } = req.body;
    const result = await accounts.register(phone, password, name);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login with phone + password
app.post('/api/account/login', (req, res) => {
  try {
    const { phone, password } = req.body;
    const result = accounts.login(phone, password);
    const profile = accounts.getProfile(result.userId);
    res.json({ ...result, profile });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Get own profile (requires auth)
app.get('/api/account/profile', authMiddleware, (req, res) => {
  const profile = accounts.getProfile(req.user.userId);
  res.json(profile);
});

// Update profile (name, grade, tutor)
app.put('/api/account/profile', authMiddleware, (req, res) => {
  try {
    const profile = accounts.updateProfile(req.user.userId, req.body);
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get subscription plans
app.get('/api/account/plans', (req, res) => {
  res.json({ plans: accounts.getPlans() });
});

// Subscribe — creates payment order for a plan
app.post('/api/account/subscribe', authMiddleware, async (req, res) => {
  if (!payment.isEnabled()) {
    return res.status(503).json({ error: '支付功能未配置' });
  }
  try {
    const { planId } = req.body;
    const plan = accounts.PLANS[planId];
    if (!plan) return res.status(400).json({ error: '无效的套餐' });

    const result = await payment.createOrder({
      amountFen: plan.amountFen,
      body: `科学乐园 — ${plan.name}`,
      payWay: undefined,
      jsPayFlag: '0',
    });

    if (result.success) {
      // Save order with userId and planId
      const orderDir = path.join(process.env.HOME, 'data', 'el-science-orders');
      if (!fs.existsSync(orderDir)) fs.mkdirSync(orderDir, { recursive: true });
      fs.writeFileSync(path.join(orderDir, `${result.orderId}.json`), JSON.stringify({
        orderId: result.orderId,
        leshuaOrderId: result.leshuaOrderId,
        userId: req.user.userId,
        planId,
        amountFen: plan.amountFen,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }, null, 2));
    }

    res.json({ ...result, plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check subscription status
app.get('/api/account/subscription', authMiddleware, (req, res) => {
  const active = accounts.hasActiveSubscription(req.user.userId);
  const profile = accounts.getProfile(req.user.userId);
  res.json({ active, subscription: profile.subscription });
});

// Save progress (called by frontend after exercises)
app.post('/api/account/progress', authMiddleware, (req, res) => {
  try {
    const { mastery, exercisesDone, correctAnswers, streak } = req.body;
    accounts.saveProgress(req.user.userId, mastery, { exercisesDone, correctAnswers, streak });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Tutor API Routes ──

// Start or resume a session
app.post('/api/start', authMiddleware, (req, res) => {
  try {
    const { studentId, grade, tutorId } = req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId required' });
    const result = orch.startSession(studentId, grade, tutorId);
    res.json({
      message: result.message,
      session: sanitizeSession(result.session),
      mastery: orch.getMasteryData(studentId),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process a student turn (async for LLM calls)
app.post('/api/turn', authMiddleware, async (req, res) => {
  try {
    const { studentId, message } = req.body;
    if (!studentId || !message) return res.status(400).json({ error: 'studentId and message required' });
    const result = await orch.processTurn(studentId, message);
    res.json({
      message: result.message,
      session: sanitizeSession(result.session),
      mastery: orch.getMasteryData(studentId),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get mastery dashboard data
app.get('/api/progress/:studentId', authMiddleware, (req, res) => {
  try {
    const mastery = orch.getMasteryData(req.params.studentId);
    const session = orch.getSessionData(req.params.studentId);
    res.json({
      mastery,
      session: sanitizeSession(session),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get session state
app.get('/api/session/:studentId', authMiddleware, (req, res) => {
  try {
    const session = orch.getSessionData(req.params.studentId);
    res.json({ session: sanitizeSession(session) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Simulation Catalog API ──

app.get('/api/simulations', (req, res) => {
  res.json({ topics });
});

// ── Payment API (Leshua 乐刷) ──

// Check if payment is configured
app.get('/api/payment/status', (req, res) => {
  res.json({ enabled: payment.isEnabled() });
});

// Create QR code payment order (requires auth)
app.post('/api/payment/create', authMiddleware, async (req, res) => {
  if (!payment.isEnabled()) {
    return res.status(503).json({ error: 'Payment not configured' });
  }
  try {
    const { amountFen, body, payWay, studentId } = req.body;
    if (!amountFen || amountFen <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const result = await payment.createOrder({
      amountFen,
      body: body || '科学乐园 — 学习套餐',
      payWay: payWay || undefined,
      jsPayFlag: '0', // QR scan mode
    });
    if (result.success) {
      // Save order to session data
      const orderFile = path.join(process.env.HOME, 'data', 'el-science-orders', `${result.orderId}.json`);
      const orderDir = path.dirname(orderFile);
      if (!fs.existsSync(orderDir)) fs.mkdirSync(orderDir, { recursive: true });
      fs.writeFileSync(orderFile, JSON.stringify({
        orderId: result.orderId,
        leshuaOrderId: result.leshuaOrderId,
        userId: req.user.userId,
        studentId: studentId || 'anonymous',
        amountFen,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }, null, 2));
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Barcode payment (requires auth)
app.post('/api/payment/barcode', authMiddleware, async (req, res) => {
  if (!payment.isEnabled()) {
    return res.status(503).json({ error: 'Payment not configured' });
  }
  try {
    const { amountFen, authCode, body, studentId } = req.body;
    if (!amountFen || !authCode) {
      return res.status(400).json({ error: 'amountFen and authCode required' });
    }
    const result = await payment.barcodePay({
      amountFen,
      authCode,
      body: body || '科学乐园 — 学习套餐',
    });
    if (result.success) {
      const orderFile = path.join(process.env.HOME, 'data', 'el-science-orders', `${result.orderId}.json`);
      const orderDir = path.dirname(orderFile);
      if (!fs.existsSync(orderDir)) fs.mkdirSync(orderDir, { recursive: true });
      fs.writeFileSync(orderFile, JSON.stringify({
        orderId: result.orderId,
        leshuaOrderId: result.leshuaOrderId,
        userId: req.user.userId,
        studentId: studentId || 'anonymous',
        amountFen,
        status: result.status === '2' ? 'paid' : 'pending',
        createdAt: new Date().toISOString(),
      }, null, 2));
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Query order status
app.get('/api/payment/query/:orderId', authMiddleware, async (req, res) => {
  if (!payment.isEnabled()) {
    return res.status(503).json({ error: 'Payment not configured' });
  }
  try {
    const result = await payment.queryOrder({ orderId: req.params.orderId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refund (requires auth)
app.post('/api/payment/refund', authMiddleware, async (req, res) => {
  if (!payment.isEnabled()) {
    return res.status(503).json({ error: 'Payment not configured' });
  }
  try {
    const { orderId, leshuaOrderId, refundAmountFen } = req.body;
    if (!refundAmountFen) {
      return res.status(400).json({ error: 'refundAmountFen required' });
    }
    const result = await payment.refund({ orderId, leshuaOrderId, refundAmountFen });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leshua async payment notification callback (receives XML)
app.post('/api/payment/notify', (req, res) => {
  try {
    const xmlBody = typeof req.body === 'string' ? req.body : '';
    const result = payment.handleNotification(xmlBody);

    if (!result.valid) {
      console.error('Payment notification: invalid signature');
      res.status(400).send('FAIL');
      return;
    }

    console.log(`Payment notification: order=${result.orderId} status=${result.status} paid=${result.paid} amount=${result.amount}`);

    // Update order file and activate subscription if paid
    if (result.orderId) {
      const orderFile = path.join(process.env.HOME, 'data', 'el-science-orders', `${result.orderId}.json`);
      if (fs.existsSync(orderFile)) {
        try {
          const order = JSON.parse(fs.readFileSync(orderFile, 'utf8'));
          order.status = result.paid ? 'paid' : 'failed';
          order.paidAt = result.paid ? new Date().toISOString() : undefined;
          order.leshuaOrderId = result.leshuaOrderId || order.leshuaOrderId;
          fs.writeFileSync(orderFile, JSON.stringify(order, null, 2));

          // Auto-activate subscription on successful payment
          if (result.paid && order.userId && order.planId) {
            try {
              accounts.activateSubscription(order.userId, order.planId, order.orderId);
              console.log(`Subscription activated: user=${order.userId} plan=${order.planId}`);
            } catch (e) {
              console.error(`Subscription activation failed: ${e.message}`);
            }
          }
        } catch (e) { console.error('Order file update error:', e.message); }
      }
    }

    // Respond with success to stop Leshua from retrying
    res.send('000000');
  } catch (err) {
    console.error('Payment notification error:', err.message);
    res.status(500).send('FAIL');
  }
});

// ── PhET Simulation File Serving ──

app.get('/sim/:slug/*', (req, res, next) => {
  const slug = req.params.slug;
  const rest = req.params[0];
  const cat = slugToCategory[slug];
  if (!cat) { res.status(404).send('Simulation not found'); return; }

  const filePath = path.join(LAB_ROOT, cat, slug, rest);
  serveLabFile(filePath, res, next);
});

app.get('/sim-lib/:lib/*', (req, res, next) => {
  const lib = req.params.lib;
  const rest = req.params[0];
  const cat = slugToCategory[lib];
  if (!cat) { res.status(404).send('Library not found'); return; }

  const filePath = path.join(LAB_ROOT, cat, lib, rest);
  serveLabFile(filePath, res, next);
});

app.use((req, res, next) => {
  const segments = req.path.split('/').filter(Boolean);
  if (segments.length >= 1) {
    const first = segments[0];
    if (['api', 'css', 'js', 'sim', 'sim-lib'].includes(first)) return next();
    const cat = slugToCategory[first];
    if (cat) {
      const rest = segments.slice(1).join('/');
      const filePath = path.join(LAB_ROOT, cat, first, rest);
      return serveLabFile(filePath, res, next);
    }
  }
  next();
});

function serveLabFile(filePath, res, next) {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(LAB_ROOT + path.sep) && resolved !== LAB_ROOT) {
    res.status(403).send('Forbidden');
    return;
  }
  fs.stat(resolved, (err, stats) => {
    if (err || !stats.isFile()) { res.status(404).send('Not found'); return; }
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.set({
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(resolved).pipe(res);
  });
}

// Strip heavy data from session for frontend
function sanitizeSession(session) {
  if (!session) return null;
  return {
    studentId: session.studentId,
    grade: session.grade,
    goal: session.goal,
    tutor: session.tutor,
    onboarded: session.onboarded,
    studyProfile: session.studyProfile,
    activeModule: session.activeModule,
    activeSkill: session.activeSkill,
    phase: session.phase,
    turnCount: session.turnCount,
    correctStreak: session.correctStreak,
    consecutiveWrong: session.consecutiveWrong,
    recentResults: session.recentResults,
    currentLab: session.currentLab ? { labId: session.currentLab.labId, step: session.currentLab.step, totalSteps: session.currentLab.totalSteps } : null,
    currentCER: session.currentCER ? { topic: session.currentCER.topic, step: session.currentCER.step } : null,
    currentDiagram: session.currentDiagram ? { topic: session.currentDiagram.topic } : null,
  };
}

// ── Start Server ──

const PORT = process.env.PORT || 3903;
app.listen(PORT, () => {
  console.log('');
  console.log('  ┌──────────────────────────────────────────────────┐');
  console.log('  │                                                  │');
  console.log('  │   🔬  EL Science — 小学科学乐园                  │');
  console.log('  │                                                  │');
  console.log(`  │   ➜  http://localhost:${PORT}                       │`);
  console.log('  │                                                  │');
  console.log('  └──────────────────────────────────────────────────┘');
  console.log('');
});
