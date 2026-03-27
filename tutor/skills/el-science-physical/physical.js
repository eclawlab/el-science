#!/usr/bin/env node
// EL Science — Physical Science Module (物理科学)

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'el-science-physical');
const command = process.argv[2];
const studentId = process.argv[3];

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

const SKILLS = [
  { id: 'push-pull', name: '推力和拉力', grade: 1 },
  { id: 'magnets', name: '磁铁', grade: 2 },
  { id: 'friction', name: '摩擦力', grade: 3 },
  { id: 'gravity', name: '重力', grade: 3 },
  { id: 'energy-forms', name: '能量形式', grade: 3 },
  { id: 'sound-vibration', name: '声音与振动', grade: 3 },
  { id: 'light-shadow', name: '光和影子', grade: 4 },
  { id: 'electricity-circuits', name: '电路', grade: 4 },
  { id: 'forces-motion', name: '力与运动', grade: 5 },
  { id: 'energy-transfer', name: '能量转换', grade: 5 },
  { id: 'waves', name: '波', grade: 5 },
];

const EXERCISES = {
  'push-pull': [
    { question: '打开门用的是什么力？\nA) 推力或拉力  B) 磁力  C) 浮力  D) 弹力', answer: 'A', hint: '想想你开门的动作。', explanation: '打开门可以用推力（向前推）或拉力（向后拉）。' },
    { question: '踢足球时，你对球施加的是什么？\nA) 拉力  B) 推力  C) 磁力  D) 没有力', answer: 'B', hint: '你的脚让球向前运动了。', explanation: '踢球时，脚对球施加了推力，让球向前运动。' },
  ],
  'friction': [
    { question: '在冰面上走路很滑，是因为冰面的摩擦力怎样？\nA) 很大  B) 很小  C) 没有  D) 不确定', answer: 'B', hint: '光滑的表面会怎样？', explanation: '冰面很光滑，摩擦力很小，所以我们容易滑倒。粗糙的表面摩擦力更大。' },
  ],
  'gravity': [
    { question: '苹果从树上掉下来是因为什么力？\nA) 磁力  B) 摩擦力  C) 重力  D) 弹力', answer: 'C', hint: '是什么让所有东西都往下掉？', explanation: '重力是地球对所有物体的吸引力，它让苹果（和所有东西）往下掉。' },
    { question: '在月球上，你会觉得自己比在地球上怎样？\nA) 更重  B) 更轻  C) 一样  D) 无法站立', answer: 'B', hint: '月球比地球小，引力也不同。', explanation: '月球的引力只有地球的1/6，所以你在月球上会感觉比地球上轻很多！' },
  ],
  'energy-forms': [
    { question: '太阳给地球提供的主要能量形式是什么？\nA) 声能  B) 电能  C) 光能和热能  D) 动能', answer: 'C', hint: '太阳又亮又暖。', explanation: '太阳发出光能和热能。光能让我们看见东西，热能让地球温暖。' },
  ],
  'electricity-circuits': [
    { question: '一个完整的电路需要哪些基本部件？\nA) 电池、导线、灯泡  B) 只要电池  C) 只要导线  D) 只要灯泡', answer: 'A', hint: '电需要从哪里来，经过哪里，到哪里去？', explanation: '完整的电路需要：电池（提供电能）、导线（传导电流）和灯泡（使用电能）。电流必须能形成一个完整的回路。' },
  ],
  'sound-vibration': [
    { question: '声音是由什么产生的？\nA) 光  B) 振动  C) 热  D) 磁', answer: 'B', hint: '摸摸你说话时的喉咙。', explanation: '声音是由物体的振动产生的。比如说话时声带振动，敲鼓时鼓面振动。' },
  ],
};

function getExercise(skill) {
  const pool = EXERCISES[skill] || EXERCISES['push-pull'];
  return pool[Math.floor(Math.random() * pool.length)];
}

if (command === 'start') {
  ensureDir(DATA_DIR);
  console.log(JSON.stringify({ ok: true, module: 'physical', skills: SKILLS.length }));
}
else if (command === 'skills') {
  console.log(JSON.stringify({ skills: SKILLS }));
}
else if (command === 'lesson') {
  console.log(JSON.stringify({
    text: '🚀 物理科学 — 让我们探索力和能量的奇妙世界！\n\n物理科学帮助我们理解世界是怎么运动的——为什么球会弹起来？为什么会有声音？光是怎么传播的？\n\n牛顿说过：每一个动作都有一个反作用力。让我们来看看这是什么意思吧！'
  }));
}
else if (command === 'exercise') {
  const skill = process.argv[4] || SKILLS[Math.floor(Math.random() * SKILLS.length)].id;
  console.log(JSON.stringify(getExercise(skill)));
}
else if (command === 'check') {
  console.log(JSON.stringify({ checked: true }));
}
else if (command === 'lab') {
  console.log(JSON.stringify({
    text: '🚀 推荐实验：\n\n1. 力与运动基础 — 推拉物体，观察力的效果\n2. 摩擦力 — 在不同表面上滑动物体\n3. 能量滑板公园 — 观察动能和势能的转换\n4. 声波 — 看见声音的波形\n5. 色觉 — 用红绿蓝光混合颜色\n6. 电路搭建 — 搭建你自己的电路\n\n点击实验室面板打开模拟！'
  }));
}
else if (command === 'cer') {
  console.log(JSON.stringify({
    topic: '摩擦力与运动',
    text: '🔍 CER 探究：摩擦力与运动\n\n主张(Claim)：表面越粗糙，物体滑动时的摩擦力越大。\n\n请你设计一个实验来验证这个主张。\n想一想：你需要什么材料？怎么确保实验是公平的？你怎么测量结果？'
  }));
}
else if (command === 'vocab') {
  console.log(JSON.stringify({
    text: '📖 物理科学关键词：\n\n• 力(Force) — 推或拉物体的作用\n• 摩擦力(Friction) — 阻碍物体运动的力\n• 重力(Gravity) — 地球对物体的吸引力\n• 能量(Energy) — 做功的能力\n• 振动(Vibration) — 物体来回快速运动\n• 电路(Circuit) — 电流流过的完整路径'
  }));
}
else {
  console.log(JSON.stringify({ error: `Unknown command: ${command}` }));
}
