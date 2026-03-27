#!/usr/bin/env node
// EL Science — Matter & Chemistry Module (物质与变化)
// CLI: node matter.js <command> <studentId> [args...]

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'el-science-matter');
const command = process.argv[2];
const studentId = process.argv[3];

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

const SKILLS = [
  { id: 'properties-of-matter', name: '物质的性质', grade: 1 },
  { id: 'states-of-matter', name: '物质的状态', grade: 2 },
  { id: 'changing-states', name: '物态变化', grade: 2 },
  { id: 'mixtures-solutions', name: '混合物与溶液', grade: 3 },
  { id: 'atoms-molecules', name: '原子与分子', grade: 4 },
  { id: 'chemical-changes', name: '化学变化', grade: 4 },
  { id: 'acids-bases', name: '酸与碱', grade: 5 },
  { id: 'density-floating', name: '密度与浮沉', grade: 3 },
];

const EXERCISES = {
  'states-of-matter': [
    { question: '水在常温下是什么状态？\nA) 固态  B) 液态  C) 气态  D) 等离子态', answer: 'B', hint: '想想你喝的水是什么样的。', explanation: '水在常温下是液态，能流动，没有固定的形状，但有固定的体积。' },
    { question: '下面哪个是气体的特征？\nA) 有固定形状  B) 有固定体积  C) 能填满整个容器  D) 不能被压缩', answer: 'C', hint: '气球里的空气是什么样的？', explanation: '气体没有固定的形状和体积，能扩散填满整个容器。气体也可以被压缩。' },
  ],
  'changing-states': [
    { question: '冰变成水的过程叫什么？\nA) 凝固  B) 蒸发  C) 融化  D) 升华', answer: 'C', hint: '冰淇淋在太阳下会怎样？', explanation: '融化（也叫熔化）是固体变成液体的过程。冰在0°C以上就会融化成水。' },
    { question: '水烧开后冒出的白气是什么？\nA) 水蒸气  B) 小水滴  C) 烟  D) 空气', answer: 'B', hint: '真正的水蒸气是看不见的。', explanation: '白气其实是水蒸气遇冷后凝结成的小水滴。真正的水蒸气是无色透明、看不见的气体。' },
  ],
  'mixtures-solutions': [
    { question: '把盐放入水中搅拌，盐消失了，这个过程叫什么？\nA) 融化  B) 溶解  C) 蒸发  D) 化学反应', answer: 'B', hint: '盐还在水里，只是看不见了。', explanation: '溶解是指固体（溶质）均匀分散到液体（溶剂）中的过程。盐溶解在水中形成盐水溶液。' },
  ],
  'density-floating': [
    { question: '为什么木头能浮在水面上？\nA) 木头太轻  B) 木头密度比水小  C) 水有魔力  D) 木头怕水', answer: 'B', hint: '比较同样大小的木头和水的重量。', explanation: '木头的密度比水小，所以能浮在水面上。密度比水大的物体（如铁块）会沉入水中。' },
    { question: '一个铁球和一个同样大小的木球，哪个密度更大？\nA) 铁球  B) 木球  C) 一样大  D) 无法确定', answer: 'A', hint: '哪个更重？', explanation: '铁球的密度比木球大。同样体积的铁比木头重得多，这就是密度大的意思。' },
  ],
  'chemical-changes': [
    { question: '下面哪个是化学变化？\nA) 冰融化  B) 纸被撕碎  C) 铁生锈  D) 水蒸发', answer: 'C', hint: '哪个变化产生了新的物质？', explanation: '铁生锈是化学变化，铁和氧气反应生成了新物质——氧化铁（铁锈）。冰融化、撕纸和水蒸发都是物理变化。' },
  ],
  'acids-bases': [
    { question: '柠檬汁尝起来很酸，它是什么性质的？\nA) 酸性  B) 碱性  C) 中性  D) 无法判断', answer: 'A', hint: '酸的东西是什么性质？', explanation: '柠檬汁含有柠檬酸，是酸性物质。酸性物质通常味道酸，能使石蕊试纸变红。' },
    { question: '肥皂水是什么性质的？\nA) 酸性  B) 碱性  C) 中性  D) 有毒的', answer: 'B', hint: '肥皂水摸起来滑滑的。', explanation: '肥皂水是碱性物质。碱性物质通常摸起来滑滑的，能使石蕊试纸变蓝。' },
  ],
  'properties-of-matter': [
    { question: '下面哪个不是物质的物理性质？\nA) 颜色  B) 形状  C) 能不能燃烧  D) 大小', answer: 'C', hint: '物理性质是不需要发生化学变化就能观察到的。', explanation: '能不能燃烧是化学性质，需要发生化学变化才能知道。颜色、形状、大小都是物理性质，用眼睛就能观察到。' },
  ],
};

function getExercise(skill) {
  const pool = EXERCISES[skill] || EXERCISES['states-of-matter'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// -- Commands --

if (command === 'start') {
  ensureDir(DATA_DIR);
  console.log(JSON.stringify({ ok: true, module: 'matter', skills: SKILLS.length }));
}
else if (command === 'skills') {
  console.log(JSON.stringify({ skills: SKILLS }));
}
else if (command === 'lesson') {
  console.log(JSON.stringify({
    text: '🧪 物质与变化 — 让我们一起探索物质的奇妙世界！\n\n物质科学研究的是所有东西是由什么组成的，以及它们是怎么变化的！\n\n你知道吗？宇宙中的所有东西——包括你自己——都是由微小的原子组成的！一杯水里大约有10的25次方个水分子！\n\n让我们从一个简单的问题开始吧。'
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
    text: '🧪 推荐实验：\n\n1. 物质的状态(States of Matter) — 观察固体、液体、气体的粒子运动\n2. 构建原子(Build an Atom) — 用质子、中子和电子搭建原子\n3. 构建分子(Build a Molecule) — 把原子组合成分子\n4. 密度(Density) — 探索不同物体的密度和浮沉\n5. pH值(pH Scale) — 测试不同液体的酸碱性\n\n点击实验室面板打开模拟！'
  }));
}
else if (command === 'cer') {
  console.log(JSON.stringify({
    topic: '物态变化与温度',
    text: '🔍 CER 探究：物态变化与温度\n\n主张(Claim)：温度的变化是引起物态变化的主要原因。\n\n请你找出证据(Evidence)来支持或反驳这个主张，然后解释你的推理(Reasoning)。\n\n你可以想想：冰为什么会融化？水为什么会沸腾？这些变化和温度有什么关系？'
  }));
}
else if (command === 'vocab') {
  console.log(JSON.stringify({
    text: '📖 物质与变化关键词：\n\n• 物质(Matter) — 占有空间、有质量的东西\n• 固态(Solid) — 有固定形状和体积\n• 液态(Liquid) — 有固定体积但没有固定形状\n• 气态(Gas) — 没有固定形状和体积\n• 溶解(Dissolve) — 固体均匀分散到液体中\n• 密度(Density) — 单位体积的质量\n• 化学变化(Chemical change) — 产生新物质的变化'
  }));
}
else {
  console.log(JSON.stringify({ error: `Unknown command: ${command}` }));
}
