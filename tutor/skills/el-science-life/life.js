#!/usr/bin/env node
// EL Science — Life Science Module (生命科学)
// CLI: node life.js <command> <studentId> [args...]

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'el-science-life');
const command = process.argv[2];
const studentId = process.argv[3];

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

const SKILLS = [
  { id: 'living-vs-nonliving', name: '生物与非生物', grade: 1 },
  { id: 'plant-parts', name: '植物的组成', grade: 1 },
  { id: 'animal-groups', name: '动物分类', grade: 2 },
  { id: 'life-cycles', name: '生命周期', grade: 2 },
  { id: 'habitats', name: '栖息地', grade: 3 },
  { id: 'food-chains', name: '食物链', grade: 3 },
  { id: 'ecosystems', name: '生态系统', grade: 4 },
  { id: 'photosynthesis', name: '光合作用', grade: 4 },
  { id: 'human-body-systems', name: '人体系统', grade: 5 },
  { id: 'heredity-traits', name: '遗传与特征', grade: 5 },
  { id: 'adaptation-evolution', name: '适应与进化', grade: 5 },
];

const EXERCISES = {
  'living-vs-nonliving': [
    { question: '下面哪个是生物？\nA) 石头  B) 小狗  C) 桌子  D) 水', answer: 'B', hint: '生物能呼吸、生长和繁殖。', explanation: '小狗是生物，因为它能呼吸、生长、繁殖。石头、桌子和水都是非生物。' },
    { question: '生物有哪些共同特征？\nA) 会说话  B) 需要食物和水  C) 都是绿色的  D) 都会飞', answer: 'B', hint: '想想所有活着的东西都需要什么。', explanation: '所有生物都需要食物和水来维持生命。不是所有生物都会说话、都是绿色的或都会飞。' },
  ],
  'plant-parts': [
    { question: '植物的哪个部分负责吸收水分和营养？\nA) 花  B) 叶子  C) 根  D) 茎', answer: 'C', hint: '这个部分在土里。', explanation: '根在土壤中，负责吸收水分和矿物质营养。' },
    { question: '叶子的主要功能是什么？\nA) 吸收水分  B) 制造食物  C) 传播种子  D) 支撑植物', answer: 'B', hint: '叶子利用阳光来做一件很重要的事。', explanation: '叶子通过光合作用，利用阳光、水和二氧化碳制造食物（葡萄糖）。' },
  ],
  'food-chains': [
    { question: '在食物链中，草→兔子→狐狸，谁是生产者？\nA) 草  B) 兔子  C) 狐狸  D) 太阳', answer: 'A', hint: '生产者能自己制造食物。', explanation: '草是生产者，因为它能通过光合作用自己制造食物。兔子和狐狸是消费者。' },
    { question: '如果食物链中的兔子全部消失了，狐狸会怎样？\nA) 更多  B) 更少  C) 不变  D) 变大', answer: 'B', hint: '想想狐狸吃什么。', explanation: '兔子是狐狸的食物来源。如果兔子消失，狐狸因为缺少食物，数量会减少。' },
  ],
  'habitats': [
    { question: '鱼最适合生活在哪种栖息地？\nA) 沙漠  B) 森林  C) 河流  D) 草原', answer: 'C', hint: '鱼需要什么来呼吸？', explanation: '鱼生活在水中，用鳃呼吸水中的氧气。河流是鱼的自然栖息地。' },
  ],
  'photosynthesis': [
    { question: '光合作用需要哪些原料？\nA) 水和氧气  B) 水和二氧化碳  C) 氧气和葡萄糖  D) 阳光和氧气', answer: 'B', hint: '植物从根吸收一种，从空气中吸收一种。', explanation: '光合作用需要水（从根吸收）和二氧化碳（从空气中吸收），在阳光的能量下，产生葡萄糖和氧气。' },
  ],
};

function getExercise(skill) {
  const pool = EXERCISES[skill] || EXERCISES['living-vs-nonliving'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Commands ──

if (command === 'start') {
  ensureDir(DATA_DIR);
  console.log(JSON.stringify({ ok: true, module: 'life', skills: SKILLS.length }));
}
else if (command === 'skills') {
  console.log(JSON.stringify({ skills: SKILLS }));
}
else if (command === 'lesson') {
  console.log(JSON.stringify({
    text: '🌱 生命科学 — 让我们一起探索生命的奇妙世界！\n\n生命科学研究的是所有活着的东西——动物、植物、微生物，还有我们人类自己！\n\n你知道吗？地球上有超过870万种生物，从微小的细菌到巨大的蓝鲸！\n\n让我们从一个简单的问题开始吧。'
  }));
}
else if (command === 'exercise') {
  const skill = process.argv[4] || SKILLS[Math.floor(Math.random() * SKILLS.length)].id;
  const ex = getExercise(skill);
  console.log(JSON.stringify(ex));
}
else if (command === 'check') {
  const answer = process.argv[4] || '';
  console.log(JSON.stringify({ checked: true, answer }));
}
else if (command === 'lab') {
  console.log(JSON.stringify({
    text: '🌱 推荐实验：\n\n1. 自然选择 — 观察兔子种群如何适应环境变化\n2. 我的太阳系 — 探索地球在太阳系中的位置\n\n点击实验室面板打开模拟！'
  }));
}
else if (command === 'cer') {
  console.log(JSON.stringify({
    topic: '食物链与生态平衡',
    text: '🔍 CER 探究：食物链与生态平衡\n\n主张(Claim)：如果一个生态系统中的某种动物消失了，整个生态系统都会受到影响。\n\n请你找出证据(Evidence)来支持或反驳这个主张，然后解释你的推理(Reasoning)。\n\n你可以想想：如果森林里所有的狼都消失了，会发生什么？'
  }));
}
else if (command === 'vocab') {
  console.log(JSON.stringify({
    text: '📖 生命科学关键词：\n\n• 生物(Living thing) — 能呼吸、生长、繁殖的东西\n• 栖息地(Habitat) — 生物生活的地方\n• 食物链(Food chain) — 生物之间"谁吃谁"的关系\n• 光合作用(Photosynthesis) — 植物利用阳光制造食物\n• 适应(Adaptation) — 生物为了生存而发展出的特征'
  }));
}
else {
  console.log(JSON.stringify({ error: `Unknown command: ${command}` }));
}
