// Intent Router — classifies student input to the correct elementary science module.
// Keyword trigger matching. No LLM call needed.

const TRIGGERS = {
  'life': ['life', 'animal', 'plant', 'living', 'grow', 'seed', 'flower', 'root', 'leaf', 'stem', 'photosynthesis', 'food chain', 'habitat', 'ecosystem', 'environment', 'species', 'inherit', 'trait', 'adapt', 'evolve', 'cell', 'organ', 'body', 'skeleton', 'muscle', 'digest', 'breathe', 'heart', 'blood', 'brain', 'sense', 'eye', 'ear', 'nose', 'skin', 'insect', 'mammal', 'reptile', 'bird', 'fish', 'amphibian', '生命', '动物', '植物', '生长', '种子', '花', '根', '叶', '茎', '光合作用', '食物链', '栖息地', '生态', '环境', '物种', '遗传', '特征', '适应', '进化', '细胞', '器官', '身体', '骨骼', '肌肉', '消化', '呼吸', '心脏', '血液', '大脑', '感官', '昆虫', '哺乳', '爬行', '鸟', '鱼'],
  'physical': ['force', 'motion', 'push', 'pull', 'speed', 'velocity', 'accelerat', 'gravity', 'friction', 'energy', 'kinetic', 'potential', 'heat', 'temperature', 'light', 'shadow', 'reflect', 'refract', 'lens', 'mirror', 'sound', 'vibrat', 'wave', 'pitch', 'volume', 'magnet', 'magnetic', 'electric', 'circuit', 'battery', 'wire', 'bulb', 'switch', 'static', 'charge', 'current', 'voltage', 'resist', '力', '运动', '推', '拉', '速度', '加速', '重力', '摩擦', '能量', '动能', '势能', '热', '温度', '光', '影子', '反射', '折射', '透镜', '镜子', '声音', '振动', '波', '音调', '音量', '磁铁', '磁', '电', '电路', '电池', '导线', '灯泡', '开关', '静电', '电荷', '电流', '电压', '电阻'],
  'earth': ['earth', 'rock', 'mineral', 'soil', 'erosion', 'weather', 'climate', 'cloud', 'rain', 'snow', 'wind', 'storm', 'tornado', 'hurricane', 'earthquake', 'volcano', 'mountain', 'ocean', 'river', 'lake', 'water cycle', 'evaporat', 'condens', 'precipit', 'sun', 'moon', 'star', 'planet', 'solar system', 'orbit', 'season', 'day', 'night', 'rotation', 'revolution', 'fossil', 'dinosaur', 'layer', '地球', '岩石', '矿物', '土壤', '侵蚀', '天气', '气候', '云', '雨', '雪', '风', '暴风', '龙卷风', '地震', '火山', '山', '海洋', '河', '湖', '水循环', '蒸发', '凝结', '降水', '太阳', '月亮', '星星', '行星', '太阳系', '轨道', '季节', '白天', '夜晚', '自转', '公转', '化石', '恐龙'],
  'matter': ['matter', 'solid', 'liquid', 'gas', 'state', 'melt', 'freeze', 'boil', 'evaporat', 'condens', 'atom', 'molecule', 'element', 'compound', 'mixture', 'solution', 'dissolve', 'chemical', 'reaction', 'acid', 'base', 'pH', 'metal', 'property', 'mass', 'volume', 'density', 'float', 'sink', 'material', 'wood', 'plastic', 'glass', 'rubber', '物质', '固体', '液体', '气体', '状态', '熔化', '凝固', '沸腾', '蒸发', '凝结', '原子', '分子', '元素', '化合物', '混合物', '溶液', '溶解', '化学', '反应', '酸', '碱', 'pH', '金属', '性质', '质量', '体积', '密度', '浮', '沉', '材料', '木头', '塑料', '玻璃', '橡胶'],
  'inquiry': ['experiment', 'hypothesis', 'predict', 'observe', 'measure', 'record', 'data', 'graph', 'result', 'conclusion', 'variable', 'control', 'test', 'fair test', 'method', 'procedure', 'investigate', 'discover', 'explore', 'compare', 'classify', 'group', 'sort', 'tool', 'microscope', 'magnif', 'thermometer', 'balance', 'ruler', '实验', '假设', '预测', '观察', '测量', '记录', '数据', '图表', '结果', '结论', '变量', '控制', '测试', '公平', '方法', '步骤', '调查', '发现', '探索', '比较', '分类', '分组', '排序', '工具', '显微镜', '放大', '温度计', '天平', '尺子'],
  'study-planner': ['plan', 'schedule', 'progress', 'what should i study', "what's next", 'what next', 'goals', 'diagnostic', 'review all', '计划', '安排', '进度', '学什么', '下一步', '目标'],
};

// Cross-domain prerequisite gates (Tier 1) — elementary science adapted
const PREREQUISITE_GATES = [
  {
    id: 'matter-gates-physical',
    condition: (mastery, activeModule) =>
      activeModule === 'physical' &&
      (mastery.matter || 0) < 0.30,
    target: 'matter',
    reason: "学力和运动之前，先了解一下物质的基本知识吧！",
    priority: 1,
  },
  {
    id: 'life-gates-inquiry',
    condition: (mastery, activeModule) =>
      activeModule === 'inquiry' &&
      (mastery.life || 0) < 0.20 && (mastery.physical || 0) < 0.20,
    target: 'life',
    reason: "科学探究需要一些基础知识。我们先学点有趣的生命科学吧！",
    priority: 1,
  },
];

// Detour suggestions for learning path
const DETOUR_SUGGESTIONS = [
  {
    id: 'matter-before-chemistry',
    condition: (mastery, activeModule, activeSkill) =>
      activeModule === 'matter' &&
      activeSkill && activeSkill.includes('chemical') &&
      (mastery.matter || 0) < 0.40,
    target: 'matter',
    targetSkill: 'states-of-matter',
    reason: "化学变化有点难——我们先复习一下物质状态的基础知识？",
    priority: 2,
  },
];

/**
 * Route student input to a module.
 * Returns { module, confidence, triggers }
 */
function route(input, currentModule) {
  const lower = (input || '').toLowerCase();
  const scores = {};

  for (const [mod, keywords] of Object.entries(TRIGGERS)) {
    let count = 0;
    const matched = [];
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        count++;
        matched.push(kw);
      }
    }
    if (count > 0) {
      scores[mod] = { count, matched };
    }
  }

  // Pick best match
  let best = null;
  let bestCount = 0;
  for (const [mod, data] of Object.entries(scores)) {
    if (data.count > bestCount) {
      best = mod;
      bestCount = data.count;
    }
  }

  if (!best) {
    return { module: currentModule || null, confidence: 'none', triggers: [] };
  }

  const confidence = bestCount >= 3 ? 'high' : bestCount >= 2 ? 'medium' : 'low';
  return { module: best, confidence, triggers: scores[best].matched };
}

/**
 * Check prerequisite gates for the target module.
 * Returns { allowed, gate } — if not allowed, gate has the reason.
 */
function checkGates(mastery, targetModule) {
  for (const gate of PREREQUISITE_GATES) {
    if (gate.condition(mastery, targetModule)) {
      return { allowed: false, gate };
    }
  }
  return { allowed: true, gate: null };
}

/**
 * Check for learning detours.
 * Returns { suggested, detour } or null.
 */
function checkDetours(mastery, activeModule, activeSkill) {
  for (const d of DETOUR_SUGGESTIONS) {
    if (d.condition(mastery, activeModule, activeSkill)) {
      return { suggested: true, detour: d };
    }
  }
  return null;
}

module.exports = { route, checkGates, checkDetours, TRIGGERS };
