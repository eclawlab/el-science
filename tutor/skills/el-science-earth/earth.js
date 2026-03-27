#!/usr/bin/env node
// EL Science — Earth & Space Science Module (地球与太空)
// CLI: node earth.js <command> <studentId> [args...]

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'el-science-earth');
const command = process.argv[2];
const studentId = process.argv[3];

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

const SKILLS = [
  { id: 'rocks-minerals', name: '岩石与矿物', grade: 2 },
  { id: 'soil', name: '土壤', grade: 2 },
  { id: 'weather', name: '天气', grade: 1 },
  { id: 'water-cycle', name: '水循环', grade: 3 },
  { id: 'clouds-rain', name: '云与降水', grade: 2 },
  { id: 'seasons', name: '四季', grade: 1 },
  { id: 'day-night', name: '昼夜交替', grade: 1 },
  { id: 'moon-phases', name: '月相变化', grade: 3 },
  { id: 'solar-system', name: '太阳系', grade: 4 },
  { id: 'erosion', name: '侵蚀作用', grade: 4 },
  { id: 'fossils', name: '化石', grade: 5 },
];

const EXERCISES = {
  'rocks-minerals': [
    { question: '下面哪种岩石是由火山喷发形成的？\nA) 石灰岩  B) 花岗岩  C) 砂岩  D) 页岩', answer: 'B', hint: '这种岩石来自地球深处的岩浆。', explanation: '花岗岩是火成岩，由地下岩浆冷却凝固形成。石灰岩、砂岩和页岩都是沉积岩。' },
    { question: '岩石按照形成方式可以分成几大类？\nA) 两类  B) 三类  C) 四类  D) 五类', answer: 'B', hint: '想想岩石是怎么形成的。', explanation: '岩石分为三大类：火成岩（岩浆冷却）、沉积岩（沉积物堆积）和变质岩（高温高压改变）。' },
  ],
  'weather': [
    { question: '下面哪个工具用来测量气温？\nA) 风速计  B) 温度计  C) 雨量计  D) 气压计', answer: 'B', hint: '这个工具里有刻度和红色液体。', explanation: '温度计用来测量气温。风速计测风速，雨量计测降水量，气压计测大气压力。' },
    { question: '乌云密布通常预示着什么天气？\nA) 晴天  B) 下雨  C) 大风  D) 下雪', answer: 'B', hint: '乌云里有很多水分。', explanation: '乌云（积雨云）里含有大量水滴，通常预示着即将下雨。' },
  ],
  'water-cycle': [
    { question: '水循环中，水从海洋变成水蒸气的过程叫什么？\nA) 凝结  B) 蒸发  C) 降水  D) 径流', answer: 'B', hint: '太阳加热水面，水变成了气体。', explanation: '蒸发是液态水受热变成水蒸气的过程。太阳的热量使海洋、湖泊的水蒸发到空气中。' },
    { question: '水蒸气在高空遇冷变成小水滴的过程叫什么？\nA) 蒸发  B) 降水  C) 凝结  D) 渗透', answer: 'C', hint: '气态变成液态。', explanation: '凝结是水蒸气遇冷变成小水滴的过程。这些小水滴聚集在一起就形成了云。' },
  ],
  'seasons': [
    { question: '为什么会有四季变化？\nA) 太阳大小变化  B) 地球自转  C) 地球公转和地轴倾斜  D) 月球引力', answer: 'C', hint: '地球绕太阳转一圈是一年，而且地球是歪着转的。', explanation: '四季变化是因为地球绕太阳公转，加上地轴倾斜约23.5度，使得不同时间太阳照射角度不同。' },
  ],
  'solar-system': [
    { question: '太阳系中离太阳最近的行星是哪个？\nA) 金星  B) 地球  C) 水星  D) 火星', answer: 'C', hint: '它的名字和"水"有关，但其实非常热。', explanation: '水星是离太阳最近的行星，距离太阳约5800万公里。虽然叫水星，但表面温度极高。' },
    { question: '太阳系有几颗行星？\nA) 7颗  B) 8颗  C) 9颗  D) 10颗', answer: 'B', hint: '2006年冥王星被重新分类了。', explanation: '太阳系有8颗行星：水星、金星、地球、火星、木星、土星、天王星和海王星。冥王星在2006年被划为矮行星。' },
  ],
  'day-night': [
    { question: '白天和黑夜是怎么产生的？\nA) 太阳绕地球转  B) 地球自转  C) 月球遮挡  D) 云层变化', answer: 'B', hint: '地球自己在不停地转动。', explanation: '地球自转（绕自己的轴旋转）产生了昼夜交替。面向太阳的一面是白天，背向太阳的一面是黑夜。' },
  ],
  'erosion': [
    { question: '河流两岸的岩石被水慢慢冲刷变小，这种现象叫什么？\nA) 风化  B) 沉积  C) 侵蚀  D) 地震', answer: 'C', hint: '水的力量把岩石带走了。', explanation: '侵蚀是指水、风、冰等自然力量把岩石和土壤搬运到其他地方的过程。河流的侵蚀作用可以形成峡谷。' },
  ],
};

function getExercise(skill) {
  const pool = EXERCISES[skill] || EXERCISES['rocks-minerals'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// -- Commands --

if (command === 'start') {
  ensureDir(DATA_DIR);
  console.log(JSON.stringify({ ok: true, module: 'earth', skills: SKILLS.length }));
}
else if (command === 'skills') {
  console.log(JSON.stringify({ skills: SKILLS }));
}
else if (command === 'lesson') {
  console.log(JSON.stringify({
    text: '🌍 地球与太空 — 让我们一起探索我们的地球和广阔的宇宙！\n\n地球科学研究的是我们脚下的大地、头顶的天空，还有遥远的星球！\n\n你知道吗？地球已经有46亿年的历史了，而光从太阳到地球只需要8分钟！\n\n让我们从一个简单的问题开始吧。'
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
    text: '🌍 推荐实验：\n\n1. 我的太阳系(My Solar System) — 创建自己的行星系统，观察轨道运动\n2. 重力与轨道(Gravity and Orbits) — 探索重力如何让行星绕太阳运转\n\n点击实验室面板打开模拟！'
  }));
}
else if (command === 'cer') {
  console.log(JSON.stringify({
    topic: '水循环与天气',
    text: '🔍 CER 探究：水循环与天气\n\n主张(Claim)：水循环是地球上所有天气现象的基础。\n\n请你找出证据(Evidence)来支持或反驳这个主张，然后解释你的推理(Reasoning)。\n\n你可以想想：下雨、下雪、起雾，这些现象和水循环有什么关系？'
  }));
}
else if (command === 'vocab') {
  console.log(JSON.stringify({
    text: '📖 地球与太空关键词：\n\n• 蒸发(Evaporation) — 液态水变成水蒸气\n• 凝结(Condensation) — 水蒸气变成小水滴\n• 侵蚀(Erosion) — 水、风等搬运岩石和土壤\n• 公转(Revolution) — 地球绕太阳运转\n• 自转(Rotation) — 地球绕自己的轴旋转\n• 化石(Fossil) — 保存在岩石中的古生物遗迹'
  }));
}
else {
  console.log(JSON.stringify({ error: `Unknown command: ${command}` }));
}
