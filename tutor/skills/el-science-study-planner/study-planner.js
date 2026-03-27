#!/usr/bin/env node
// EL Science — Study Planner Module (学习计划)
// CLI: node study-planner.js <command> <studentId> [args...]

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'el-science-study-planner');
const command = process.argv[2];
const studentId = process.argv[3];

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

const SKILLS = [
  { id: 'daily-plan', name: '每日计划', grade: 1 },
  { id: 'weekly-plan', name: '每周计划', grade: 2 },
  { id: 'review-strategy', name: '复习策略', grade: 3 },
  { id: 'goal-setting', name: '目标设定', grade: 3 },
  { id: 'time-management', name: '时间管理', grade: 4 },
  { id: 'self-assessment', name: '自我评估', grade: 4 },
];

const EXERCISES = {
  'daily-plan': [
    { question: '制定每日学习计划时，最重要的是什么？\nA) 安排尽可能多的内容  B) 只学喜欢的  C) 合理安排时间，有休息  D) 不需要计划', answer: 'C', hint: '学习需要劳逸结合。', explanation: '好的学习计划要合理安排时间，既有学习也有休息。过多的内容会让人疲劳，只学喜欢的会导致偏科。' },
  ],
  'review-strategy': [
    { question: '下面哪种复习方法最有效？\nA) 考试前一晚通宵背书  B) 每天花一点时间复习  C) 只看笔记不做题  D) 只做新题不看旧题', answer: 'B', hint: '记忆需要反复巩固。', explanation: '每天花一点时间复习（间隔重复法）是最有效的方法。大脑需要反复接触信息才能长期记住，临时抱佛脚效果很差。' },
    { question: '艾宾浩斯遗忘曲线告诉我们什么？\nA) 人不会遗忘  B) 学过的东西会很快遗忘，需要及时复习  C) 只要学一遍就够了  D) 越难的越不容易忘', answer: 'B', hint: '学完新知识后，如果不复习会怎样？', explanation: '艾宾浩斯遗忘曲线表明，新学的知识如果不复习，一天后就会遗忘约70%。及时复习可以大大减缓遗忘速度。' },
  ],
  'goal-setting': [
    { question: '一个好的学习目标应该是什么样的？\nA) "我要学好科学"  B) "这周我要完成3个生命科学练习并全部正确"  C) "我要成为科学家"  D) "我要比别人厉害"', answer: 'B', hint: '好的目标要具体、可测量。', explanation: '好的学习目标要具体、可测量、可实现、有时间限制。"完成3个练习并全部正确"比"学好科学"更明确，更容易执行和检验。' },
  ],
  'time-management': [
    { question: '学习一段时间后感到疲劳，应该怎么做？\nA) 继续硬撑  B) 休息5-10分钟再继续  C) 今天不学了  D) 换一个更难的科目', answer: 'B', hint: '番茄工作法建议学习25分钟休息5分钟。', explanation: '短暂休息（5-10分钟）可以恢复注意力。番茄工作法建议每学习25分钟休息5分钟，这样效率最高。' },
  ],
  'self-assessment': [
    { question: '完成一个单元的学习后，你应该怎么评估自己？\nA) 不需要评估  B) 只看分数  C) 思考自己学会了什么、还有什么不懂  D) 只问别人觉得怎么样', answer: 'C', hint: '自我评估要全面。', explanation: '好的自我评估要思考：学会了什么？还有什么不懂？哪些方面可以提高？这样才能有针对性地改进学习。' },
    { question: '发现自己某个知识点不理解，最好的做法是？\nA) 跳过它  B) 回到那个知识点重新学习  C) 等别人教你  D) 假装理解了', answer: 'B', hint: '科学知识是一环扣一环的。', explanation: '科学知识有很强的连贯性，如果某个基础知识点不理解，后面的内容可能都会受影响。最好回去重新学习，打好基础。' },
  ],
};

function getExercise(skill) {
  const pool = EXERCISES[skill] || EXERCISES['daily-plan'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// -- Commands --

if (command === 'start') {
  ensureDir(DATA_DIR);
  console.log(JSON.stringify({ ok: true, module: 'study-planner', skills: SKILLS.length }));
}
else if (command === 'skills') {
  console.log(JSON.stringify({ skills: SKILLS }));
}
else if (command === 'lesson') {
  console.log(JSON.stringify({
    text: '📅 学习计划 — 让我们学会科学地管理学习！\n\n好的学习方法能让你事半功倍。科学家们也需要制定研究计划呢！\n\n你知道吗？研究表明，有学习计划的学生成绩比没有计划的学生平均高出20%！\n\n让我来帮你制定一个适合你的学习计划吧。'
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
    text: '📅 学习建议：\n\n根据你的学习进度，这里是推荐的学习计划：\n\n每日计划（约30分钟）：\n• 5分钟 — 复习昨天学的关键词(vocab)\n• 10分钟 — 学习新课(lesson)\n• 10分钟 — 做练习(exercise)\n• 5分钟 — 做一个实验模拟(lab)\n\n每周目标：\n• 完成2个模块的课程\n• 做至少10道练习题\n• 完成1个CER探究\n• 尝试2个新的实验模拟'
  }));
}
else if (command === 'cer') {
  console.log(JSON.stringify({
    topic: '学习方法探究',
    text: '🔍 CER 探究：学习方法探究\n\n主张(Claim)：制定学习计划并按计划执行，比随意学习更有效。\n\n请你找出证据(Evidence)来支持或反驳这个主张，然后解释你的推理(Reasoning)。\n\n你可以想想：你有没有制定过学习计划？按计划学习和随意学习，哪个效果更好？'
  }));
}
else if (command === 'vocab') {
  console.log(JSON.stringify({
    text: '📖 学习计划关键词：\n\n• 间隔重复(Spaced repetition) — 定期复习以加强记忆\n• 番茄工作法(Pomodoro) — 学习25分钟休息5分钟\n• 自我评估(Self-assessment) — 评价自己的学习情况\n• 学习目标(Learning goal) — 具体、可测量的学习目的\n• 遗忘曲线(Forgetting curve) — 记忆随时间衰退的规律\n• 元认知(Metacognition) — 对自己学习过程的思考'
  }));
}
else {
  console.log(JSON.stringify({ error: `Unknown command: ${command}` }));
}
