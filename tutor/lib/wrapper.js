// 对话包装器 — 将结构化模块输出转换为导师的对话。
// 小学科学专用：可爱、鼓励、充满好奇心的语言。

// ── 工具函数 ──

function formatSkillName(skill) {
  if (!skill) return '这个知识点';
  return skill.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatModuleName(mod) {
  if (!mod) return '新的主题';
  const names = {
    'life': '生命科学',
    'physical': '物理科学',
    'earth': '地球与太空',
    'matter': '物质与变化',
    'inquiry': '科学探究',
    'study-planner': '你的学习计划',
  };
  return names[mod] || mod.replace(/-/g, ' ');
}

function extractHint(rule) {
  if (!rule) return '这里涉及的科学知识';
  const clause = rule.split(/[.;]/)[0].trim();
  const words = clause.split(' ');
  if (words.length <= 10) return clause.toLowerCase();
  return words.slice(0, 8).join(' ').toLowerCase() + '...';
}

// ── 导师定义 (Elementary Science personas) ──

const TUTORS = {
  methodical: {
    id: 'methodical',
    name: '猫头鹰博士',
    title: 'Dr. Owl',
    style: '耐心引导型',
    description: '像猫头鹰一样聪明智慧，慢慢带你观察和发现科学奥秘。',
    affirmations: ['太棒了！', '答对啦！', '观察得真仔细！', '发现了！', '非常厉害！', '很好的推理！', '你真是个小科学家！'],
    wrongFirst: '嗯，再想想哦——科学家也经常要多试几次呢！',
    wrongReveal: '这个问题确实有点难——让我来解释给你听吧。',
    encourageAfterReveal: '现在明白了吧？科学就是不断学习和发现！我们继续！',
    streakMild: '你的科学知识越来越丰富了，加油！',
    streakHot: '哇塞！你简直是小小科学家！来个更有趣的实验！',
    welcomeNew: (name) => [
      `你好呀${name ? '，' + name : ''}！我是猫头鹰博士，你的科学探索小伙伴！`,
      '',
      '我们可以一起探索动植物、力与运动、光和声音、物质变化，还有地球和太空！',
      '',
      '在开始之前，我想问你几个小问题，这样我就知道怎么帮你最好啦。',
    ].join('\n'),
    welcomeBack: (name, mod) => {
      const parts = [`欢迎回来${name ? '，' + name : ''}！`];
      if (mod) { parts.push(`上次我们一起探索了${formatModuleName(mod)}哦。`); parts.push('想继续上次的探索，还是发现新的科学奥秘？'); }
      else parts.push('今天想探索什么呀？');
      return parts.join(' ');
    },
    askQ1: '你平时喜欢怎么学新东西呀？\n\nA) 自己动手做实验、试一试\nB) 先看别人怎么做，再自己来\nC) 直接做做看，做错了也没关系',
    askQ2: '遇到不会的问题，你会怎么做呢？\n\nA) 自己再观察想一想\nB) 请人帮忙或看提示\nC) 先做别的，回头再看',
    askQ3: '你喜欢怎样的学习节奏？\n\nA) 慢慢来，每次学一点点\nB) 看心情，有时多有时少\nC) 一口气学好多好多！',
    onboardingSummary: (profile) => {
      const parts = ['好的，我了解你啦！\n'];
      if (profile.learningPref === 'hands-on') parts.push('- 你喜欢动手——我会给你很多好玩的实验和活动！');
      else if (profile.learningPref === 'examples-first') parts.push('- 你喜欢先看例子——我会先演示给你看，再让你试。');
      else parts.push('- 你喜欢直接试——我会让你先做实验，有困难我来帮你。');
      if (profile.studyPace === 'steady') parts.push('- 我们慢慢来，不着急。');
      else if (profile.studyPace === 'intensive') parts.push('- 你精力充沛！我们多探索一些。');
      else parts.push('- 我们根据你的状态来安排。');
      parts.push('\n你想从哪里开始探索呀？生命科学、物理科学、地球与太空、物质与变化、还是科学探究？');
      return parts.join('\n');
    },
  },
  competitive: {
    id: 'competitive',
    name: '火箭狮',
    title: 'Rocket Lion',
    style: '闯关挑战型',
    description: '像火箭一样勇往直前，带你闯过科学挑战，赢得实验勋章！',
    affirmations: ['厉害！', '闯关成功！', '完美通过！', '实验大成功！', '科学达人！', '太酷了！', '天才科学家！'],
    wrongFirst: '差一点点！科学家失败过无数次才成功的——再来！',
    wrongReveal: '这关有点难——让我告诉你秘诀！',
    encourageAfterReveal: '记住这个知识点，下次一定能闯过！冲鸭！',
    streakMild: '连胜中！你正在成为科学冠军！',
    streakHot: '无敌了！！！你就是未来的大科学家！',
    welcomeNew: (name) => [
      `嘿${name ? '，' + name : ''}！我是火箭狮，准备好和我一起闯科学关卡了吗？`,
      '',
      '每学一个知识点就是一次闯关，答对就能赢得实验勋章！',
      '',
      '先回答几个小问题，让我看看你的科学实力！',
    ].join('\n'),
    welcomeBack: (name, mod) => {
      const parts = [`又来啦${name ? '，' + name : ''}！好样的！`];
      if (mod) { parts.push(`上次我们在${formatModuleName(mod)}闯到了不少关！`); parts.push('继续闯关还是换个新挑战？'); }
      else parts.push('今天想挑战哪个科学领域？');
      return parts.join(' ');
    },
    askQ1: '你喜欢哪种方式学习？\n\nA) 动手做实验！\nB) 先看看再说\nC) 直接上！做错了也不怕',
    askQ2: '遇到难题你会？\n\nA) 反复尝试\nB) 找人帮忙\nC) 跳过先做别的',
    askQ3: '你喜欢什么样的节奏？\n\nA) 稳扎稳打\nB) 随心所欲\nC) 全速前进！',
    onboardingSummary: (profile) => {
      const parts = ['了解了！准备好迎接挑战！\n'];
      if (profile.learningPref === 'hands-on') parts.push('- 你是实验派！我会给你超多动手的挑战！');
      else if (profile.learningPref === 'examples-first') parts.push('- 你是观察派！我先示范，你跟着来！');
      else parts.push('- 你是冲锋派！直接上，做错了也不怕！');
      if (profile.studyPace === 'steady') parts.push('- 稳扎稳打，每关都拿满分！');
      else if (profile.studyPace === 'intensive') parts.push('- 全速前进！今天多闯几关！');
      else parts.push('- 随你的节奏来，但别偷懒哦！');
      parts.push('\n选一个科学领域开始闯关吧！生命科学、物理科学、地球与太空、物质与变化、还是科学探究？');
      return parts.join('\n');
    },
  },
  creative: {
    id: 'creative',
    name: '狐博士',
    title: 'Dr. Fox',
    style: '故事探索型',
    description: '用有趣的故事和实验带你走进奇妙的科学世界！',
    affirmations: ['发现了！', '好厉害的观察！', '你的猜测完全正确！', '科学探险成功！', '真棒！', '你发现了一个重要的秘密！', '太有趣了！'],
    wrongFirst: '嗯，这个猜测不太对——不过科学家就是要大胆猜测、小心求证！',
    wrongReveal: '让我来讲个故事帮你理解这个知识——',
    encourageAfterReveal: '现在你知道这个科学秘密了！让我们继续探险吧！',
    streakMild: '你收集的科学知识越来越多了！',
    streakHot: '不可思议！你已经成为一个真正的科学探险家了！',
    welcomeNew: (name) => [
      `你好呀${name ? '，' + name : ''}！我是狐博士，一个爱讲科学故事的探险家！`,
      '',
      '科学世界充满了神奇的秘密：为什么天是蓝的？植物怎么"吃饭"？磁铁为什么能吸东西？',
      '',
      '让我先问你几个小问题，然后我们就一起出发探险吧！',
    ].join('\n'),
    welcomeBack: (name, mod) => {
      const parts = [`欢迎回来${name ? '，' + name : ''}！我的科学探险伙伴！`];
      if (mod) { parts.push(`上次我们在${formatModuleName(mod)}发现了好多有趣的秘密！`); parts.push('想继续探险，还是去发现新的科学世界？'); }
      else parts.push('今天想探索哪个科学秘密呀？');
      return parts.join(' ');
    },
    askQ1: '你平时最喜欢怎么学新东西？\n\nA) 亲手做实验！\nB) 先听故事再动手\nC) 先试试看，做错了也没关系',
    askQ2: '遇到想不通的问题，你会？\n\nA) 继续观察和思考\nB) 问问别人或找提示\nC) 先放一放，以后再想',
    askQ3: '你喜欢什么样的探险节奏？\n\nA) 慢慢探索，仔细观察\nB) 看心情\nC) 飞速冒险！',
    onboardingSummary: (profile) => {
      const parts = ['太好了，我了解你了！\n'];
      if (profile.learningPref === 'hands-on') parts.push('- 你是行动派探险家！我会给你好多有趣的实验！');
      else if (profile.learningPref === 'examples-first') parts.push('- 你是好奇派探险家！我先讲故事，再做实验。');
      else parts.push('- 你是冒险派探险家！直接动手，发现惊喜！');
      if (profile.studyPace === 'steady') parts.push('- 我们像科学家一样仔细观察。');
      else if (profile.studyPace === 'intensive') parts.push('- 精力满满！我们多发现一些秘密！');
      else parts.push('- 跟着你的好奇心走！');
      parts.push('\n你想先探索哪个科学世界？生命科学、物理科学、地球与太空、物质与变化、还是科学探究？');
      return parts.join('\n');
    },
  },
};

// ── Presentation Functions ──

function presentWelcome(session, isNew) {
  const tutor = TUTORS[session.tutor] || TUTORS.methodical;
  const name = session.studyProfile?.name || '';
  if (isNew) {
    return tutor.welcomeNew(name);
  }
  return tutor.welcomeBack(name, session.activeModule);
}

function getOnboardingQuestion(tutorId, step) {
  const tutor = TUTORS[tutorId] || TUTORS.methodical;
  if (step === 0) return tutor.askQ1;
  if (step === 1) return tutor.askQ2;
  if (step === 2) return tutor.askQ3;
  return null;
}

function presentOnboardingSummary(tutorId, profile) {
  const tutor = TUTORS[tutorId] || TUTORS.methodical;
  return tutor.onboardingSummary(profile);
}

function presentExercise(session, exercise) {
  const tutor = TUTORS[session.tutor] || TUTORS.methodical;
  if (!exercise || exercise.error) return exercise?.error || '没有找到练习题。';
  return exercise.question || exercise.text || JSON.stringify(exercise);
}

function presentCorrect(session) {
  const tutor = TUTORS[session.tutor] || TUTORS.methodical;
  const arr = tutor.affirmations;
  return arr[Math.floor(Math.random() * arr.length)];
}

function presentWrong(session, isReveal) {
  const tutor = TUTORS[session.tutor] || TUTORS.methodical;
  if (isReveal) return tutor.wrongReveal;
  return tutor.wrongFirst;
}

function presentStreak(session) {
  const tutor = TUTORS[session.tutor] || TUTORS.methodical;
  const streak = session.correctStreak || 0;
  if (streak >= 5) return tutor.streakHot;
  if (streak >= 3) return tutor.streakMild;
  return '';
}

function checkFrustration(session) {
  if (session.consecutiveWrong < 3) return null;
  const tutor = TUTORS[session.tutor] || TUTORS.methodical;
  return [
    tutor.encourageAfterReveal,
    '',
    '你想要：',
    '1) 看一个相关的科学实验/模拟',
    '2) 换一个更简单的知识点',
    '3) 听一个关于这个知识的有趣故事',
    '',
    '输入 1、2 或 3 告诉我！',
  ].join('\n');
}

function presentLesson(session, lesson) {
  if (!lesson || lesson.error) return lesson?.error || '暂时没有课程内容。';
  return lesson.text || lesson.content || JSON.stringify(lesson);
}

function presentModuleSwitch(session, newModule) {
  const tutor = TUTORS[session.tutor] || TUTORS.methodical;
  return `好的！让我们一起来探索${formatModuleName(newModule)}吧！`;
}

function presentProgress(session, mastery) {
  const lines = ['📊 你的科学探索进度：\n'];
  const domains = [
    { key: 'life', label: '🌱 生命科学' },
    { key: 'physical', label: '🚀 物理科学' },
    { key: 'earth', label: '🌍 地球与太空' },
    { key: 'matter', label: '🧪 物质与变化' },
    { key: 'inquiry', label: '🔬 科学探究' },
  ];

  for (const d of domains) {
    const pct = Math.round((mastery[d.key] || 0) * 100);
    const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
    lines.push(`${d.label}: ${bar} ${pct}%`);
  }

  lines.push(`\n连对：${session.correctStreak || 0} | 总轮数：${session.turnCount || 0}`);
  return lines.join('\n');
}

module.exports = {
  TUTORS,
  presentWelcome,
  getOnboardingQuestion,
  presentOnboardingSummary,
  presentExercise,
  presentCorrect,
  presentWrong,
  presentStreak,
  checkFrustration,
  presentLesson,
  presentModuleSwitch,
  presentProgress,
  formatModuleName,
  formatSkillName,
};
