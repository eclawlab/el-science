#!/usr/bin/env node
// EL Science — Science Inquiry Module (科学探究)
// CLI: node inquiry.js <command> <studentId> [args...]

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'el-science-inquiry');
const command = process.argv[2];
const studentId = process.argv[3];

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

const SKILLS = [
  { id: 'observation', name: '观察', grade: 1 },
  { id: 'asking-questions', name: '提出问题', grade: 1 },
  { id: 'hypothesis', name: '假设', grade: 2 },
  { id: 'experiments', name: '实验设计', grade: 2 },
  { id: 'variables', name: '变量控制', grade: 3 },
  { id: 'measuring', name: '测量', grade: 2 },
  { id: 'recording-data', name: '记录数据', grade: 3 },
  { id: 'drawing-conclusions', name: '得出结论', grade: 4 },
  { id: 'scientific-tools', name: '科学工具', grade: 1 },
  { id: 'fair-test', name: '公平测试', grade: 3 },
];

const EXERCISES = {
  'observation': [
    { question: '科学观察和日常看东西有什么不同？\nA) 没有不同  B) 科学观察更仔细、有目的  C) 科学观察只能用眼睛  D) 科学观察不需要记录', answer: 'B', hint: '科学家观察时会怎么做？', explanation: '科学观察是有目的、有计划的，需要仔细记录看到的现象。日常看东西往往是随意的。科学观察还可以用各种感官和工具。' },
    { question: '下面哪个是好的科学观察记录？\nA) "花很漂亮"  B) "花是红色的，有5片花瓣，高约15厘米"  C) "我喜欢这朵花"  D) "花长得很快"', answer: 'B', hint: '科学记录应该是具体的、可以测量的。', explanation: '好的科学观察记录要具体、客观，最好包含可测量的数据。"红色、5片花瓣、高约15厘米"都是具体可验证的描述。' },
  ],
  'hypothesis': [
    { question: '什么是科学假设？\nA) 随便猜一猜  B) 一个可以验证的预测  C) 已经证明的事实  D) 老师说的话', answer: 'B', hint: '假设需要能通过实验来检验。', explanation: '科学假设是根据已有知识做出的、可以通过实验验证的预测。好的假设通常用"如果...那么..."的格式。' },
    { question: '下面哪个是好的科学假设？\nA) "植物需要阳光"  B) "如果给植物更多阳光，那么植物会长得更高"  C) "植物是绿色的"  D) "我觉得植物很有趣"', answer: 'B', hint: '好的假设用"如果...那么..."的格式。', explanation: '好的假设有明确的"如果...那么..."结构，说明了要改变什么（更多阳光）和预期结果（长得更高），可以通过实验验证。' },
  ],
  'variables': [
    { question: '在"阳光对植物生长影响"的实验中，自变量是什么？\nA) 植物的高度  B) 阳光的多少  C) 水的多少  D) 土壤的种类', answer: 'B', hint: '自变量是你主动改变的东西。', explanation: '自变量是实验中你主动改变的因素。在这个实验中，你改变的是阳光的多少，来观察它对植物生长的影响。' },
    { question: '在实验中，为什么要保持其他条件不变？\nA) 节省时间  B) 确保实验结果是由你改变的因素引起的  C) 老师要求的  D) 没有原因', answer: 'B', hint: '如果改变了很多条件，你能确定是哪个条件导致了结果吗？', explanation: '控制变量是为了确保实验公平。如果同时改变多个因素，就无法确定结果是由哪个因素引起的。' },
  ],
  'experiments': [
    { question: '设计实验的第一步通常是什么？\nA) 收集材料  B) 提出问题  C) 记录数据  D) 得出结论', answer: 'B', hint: '先要知道你想研究什么。', explanation: '科学探究从提出问题开始。先有了问题，才能设计实验来寻找答案。科学方法的步骤是：提问→假设→实验→记录→结论。' },
  ],
  'measuring': [
    { question: '测量液体的体积应该用什么工具？\nA) 尺子  B) 量筒  C) 温度计  D) 天平', answer: 'B', hint: '这个工具上有刻度，专门装液体。', explanation: '量筒是测量液体体积的工具，上面有毫升(mL)的刻度。尺子量长度，温度计量温度，天平量质量。' },
  ],
  'fair-test': [
    { question: '什么是"公平测试"？\nA) 让每个人都赢  B) 每次只改变一个因素  C) 不做实验  D) 只做一次实验', answer: 'B', hint: '公平的意思是比较时条件相同。', explanation: '公平测试（控制变量法）要求每次实验只改变一个因素（自变量），保持其他因素不变，这样才能确定是哪个因素导致了结果的变化。' },
  ],
  'scientific-tools': [
    { question: '用放大镜可以做什么？\nA) 测量温度  B) 放大观察微小物体  C) 测量重量  D) 记录时间', answer: 'B', hint: '放大镜让小东西看起来更大。', explanation: '放大镜是一种凸透镜，能把微小的物体放大，让我们看到肉眼看不清的细节。' },
  ],
  'drawing-conclusions': [
    { question: '实验结果和你的假设不一样，你应该怎么做？\nA) 修改数据让它符合假设  B) 接受结果，思考原因  C) 放弃实验  D) 假装没发现', answer: 'B', hint: '科学家对结果要诚实。', explanation: '科学家必须诚实面对实验结果。假设被推翻并不是失败，而是学习的机会。应该分析原因，提出新的假设，重新实验。' },
  ],
};

function getExercise(skill) {
  const pool = EXERCISES[skill] || EXERCISES['observation'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// -- Commands --

if (command === 'start') {
  ensureDir(DATA_DIR);
  console.log(JSON.stringify({ ok: true, module: 'inquiry', skills: SKILLS.length }));
}
else if (command === 'skills') {
  console.log(JSON.stringify({ skills: SKILLS }));
}
else if (command === 'lesson') {
  console.log(JSON.stringify({
    text: '🔬 科学探究 — 让我们学会像科学家一样思考！\n\n科学探究是发现世界秘密的方法。科学家通过观察、提问、实验来寻找答案。\n\n你知道吗？每一个伟大的科学发现都是从一个简单的问题开始的！牛顿看到苹果掉下来问"为什么？"，最终发现了万有引力！\n\n让我们从一个简单的问题开始吧。'
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
    text: '🔬 推荐实验：\n\n科学探究的技能可以在所有实验中练习！建议你尝试每一个实验模拟：\n\n• 在每个实验中练习"提出问题"\n• 在开始实验前先写下你的"假设"\n• 注意区分"自变量"和"因变量"\n• 认真"记录数据"，用表格或图表\n• 最后"得出结论"，看看是否支持你的假设\n\n点击实验室面板选择任意一个模拟开始探究吧！'
  }));
}
else if (command === 'cer') {
  console.log(JSON.stringify({
    topic: '科学方法的重要性',
    text: '🔍 CER 探究：科学方法的重要性\n\n主张(Claim)：使用科学方法（提问、假设、实验、结论）比随意猜测能得到更可靠的答案。\n\n请你找出证据(Evidence)来支持或反驳这个主张，然后解释你的推理(Reasoning)。\n\n你可以想想：如果不做实验，只是猜测，结果会可靠吗？为什么科学家要反复实验？'
  }));
}
else if (command === 'vocab') {
  console.log(JSON.stringify({
    text: '📖 科学探究关键词：\n\n• 观察(Observation) — 用感官和工具仔细察看\n• 假设(Hypothesis) — 可以验证的科学预测\n• 自变量(Independent variable) — 实验中主动改变的因素\n• 因变量(Dependent variable) — 随自变量变化的因素\n• 控制变量(Controlled variable) — 保持不变的因素\n• 结论(Conclusion) — 根据数据得出的判断\n• 公平测试(Fair test) — 每次只改变一个因素的实验'
  }));
}
else {
  console.log(JSON.stringify({ error: `Unknown command: ${command}` }));
}
