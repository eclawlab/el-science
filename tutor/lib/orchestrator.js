// EL Science Orchestrator — multi-turn conversational tutor over 5 elementary science domains.
// Turn pipeline: Route → Load → State → Wrap → Respond.
// LLM-enhanced: uses Claude for wrong-answer feedback, open-ended scoring, and CER evaluation.
// Falls back to rule-based when ANTHROPIC_API_KEY is not set.

const state = require('./state');
const router = require('./router');
const loader = require('./loader');
const wrapper = require('./wrapper');
const llm = require('./llm');

class Orchestrator {
  constructor() {
    this.sessions = {};
  }

  // ── Session Management ──

  startSession(studentId, grade, tutorId) {
    let session = state.loadSession(studentId);
    const isNew = session.turnCount === 0 && !session.activeModule && !session.onboarded;

    if (isNew && tutorId) session.tutor = tutorId;
    if (grade) session.grade = grade;
    this.sessions[studentId] = session;
    state.saveSession(session);

    // Ensure profile exists in all modules
    for (const mod of state.CONTENT_MODULES) {
      try { loader.startStudent(mod, studentId, session.grade); } catch { /* ok */ }
    }

    const message = wrapper.presentWelcome(session, isNew);

    // If new student, start onboarding
    if (isNew && !session.onboarded) {
      session.onboardingStep = 0;
      state.saveSession(session);
      const q1 = wrapper.getOnboardingQuestion(session.tutor, 0);
      return { session, message: message + '\n\n' + q1 };
    }

    return { session, message };
  }

  // ── Main Turn Pipeline ──

  async processTurn(studentId, input) {
    let session = this.sessions[studentId] || state.loadSession(studentId);
    this.sessions[studentId] = session;
    state.incrementTurn(session);
    state.addToHistory(session, 'user', input);

    // ── Onboarding: collect study profile answers ──
    if (session.onboarded === false && session.onboardingStep !== undefined) {
      return this._handleOnboardingAnswer(session, input);
    }

    const lower = input.toLowerCase();

    // ── Meta-intent detection (Chinese + English) ──
    const isProgressQuery = /\b(progress|how am i doing|report|score|show my|dashboard)\b/.test(lower) || /进度|成绩|表现|得分|做得怎么样/.test(lower);
    const isNextQuery = /\b(what should i|what's next|what next|recommend|suggest)\b/.test(lower) || /接下来|下一步|学什么|推荐|建议/.test(lower);
    const isReviewQuery = /\b(review|spaced|due|refresh)\b/.test(lower) || /复习|回顾|到期|温习/.test(lower);
    const isLabQuery = /\b(lab|experiment|simulate|virtual lab|simulation)\b/.test(lower) || /实验|模拟|动手做/.test(lower);
    const isCERQuery = /\b(cer|claim|evidence|reasoning|explain why|scientific explanation|explore|investigate)\b/.test(lower) || /探究|主张|证据|推理|科学解释/.test(lower);
    const isDiagramQuery = /\b(diagram|label|draw|model)\b/.test(lower) || /图表|标注|画图|模型/.test(lower);
    const isVocabQuery = /\b(vocab|vocabulary|define|definition|key terms|word)\b/.test(lower) || /词汇|术语|定义|关键词/.test(lower);
    const isHintQuery = /\b(hint|help me|clue|stuck)\b/.test(lower) || /提示|帮我|线索|卡住|不会/.test(lower);
    const isExplicitSwitch = /\b(switch|change|let's do|can we do|move to|instead|different)\b/.test(lower) || /换|切换|我想学|想学|转到|改学/.test(lower);

    const peekRoute = router.route(input, null);
    const isModuleSwitchRequest = isExplicitSwitch ||
      (peekRoute.module && peekRoute.module !== session.activeModule && peekRoute.confidence !== 'none');

    // ── Frustration support ──
    if (session.consecutiveWrong >= 3) {
      const frustrationChoice = this._parseFrustrationChoice(input);
      if (frustrationChoice) {
        const result = this._handleFrustrationChoice(session, frustrationChoice);
        if (result) return result;
      }
      if (session.phase === 'exercise' && session.currentExercise) {
        const frustrationMsg = wrapper.checkFrustration(session);
        if (frustrationMsg) {
          state.addToHistory(session, 'assistant', frustrationMsg);
          state.saveSession(session);
          this.sessions[studentId] = session;
          return { message: frustrationMsg, session };
        }
      }
    }

    // ── CER phase: collect steps ──
    if (session.phase === 'cer' && session.currentCER && !isModuleSwitchRequest) {
      return await this._handleCERInput(session, input);
    }

    // ── Progress query ──
    if (isProgressQuery) {
      const mastery = this.getMasteryData(studentId);
      const msg = wrapper.presentProgress(session, mastery);
      state.addToHistory(session, 'assistant', msg);
      state.saveSession(session);
      return { message: msg, session };
    }

    // ── Module switch ──
    if (isModuleSwitchRequest && peekRoute.module) {
      const mastery = this.getMasteryData(studentId);
      const gateCheck = router.checkGates(mastery, peekRoute.module);
      if (!gateCheck.allowed) {
        const msg = gateCheck.gate.reason;
        session.activeModule = gateCheck.gate.target;
        state.addToHistory(session, 'assistant', msg);
        state.saveSession(session);
        return { message: msg, session };
      }
      session.activeModule = peekRoute.module;
      session.activeSkill = null;
      session.phase = 'idle';
      session.currentExercise = null;
      session.consecutiveWrong = 0;
      const msg = wrapper.presentModuleSwitch(session, peekRoute.module);

      // Try to get a lesson
      const lesson = loader.generateLesson(peekRoute.module, studentId);
      const lessonMsg = wrapper.presentLesson(session, lesson);
      session.phase = 'lesson';
      const fullMsg = msg + '\n\n' + lessonMsg;
      state.addToHistory(session, 'assistant', fullMsg);
      state.saveSession(session);
      return { message: fullMsg, session };
    }

    // ── Lab query ──
    if (isLabQuery && session.activeModule) {
      const lab = loader.generateLab(session.activeModule, studentId);
      if (lab && !lab.error) {
        session.phase = 'lab';
        session.currentLab = lab;
        const msg = lab.text || '让我们来做一个有趣的科学实验吧！打开实验室面板试试看。';
        state.addToHistory(session, 'assistant', msg);
        state.saveSession(session);
        return { message: msg, session };
      }
      const msg = '好的！打开右上角的"实验室"按钮，你可以找到很多有趣的科学实验模拟！';
      state.addToHistory(session, 'assistant', msg);
      state.saveSession(session);
      return { message: msg, session };
    }

    // ── CER query ──
    if (isCERQuery && session.activeModule) {
      const cer = loader.generateCER(session.activeModule, studentId);
      if (cer && !cer.error) {
        session.phase = 'cer';
        session.currentCER = cer;
        const msg = cer.text || cer.prompt || '让我们来做一个CER（主张-证据-推理）科学探究！';
        state.addToHistory(session, 'assistant', msg);
        state.saveSession(session);
        return { message: msg, session };
      }
    }

    // ── Vocabulary query ──
    if (isVocabQuery && session.activeModule) {
      const vocab = loader.getVocabulary(session.activeModule, studentId, session.activeSkill);
      if (vocab && !vocab.error) {
        const msg = vocab.text || JSON.stringify(vocab);
        state.addToHistory(session, 'assistant', msg);
        state.saveSession(session);
        return { message: msg, session };
      }
    }

    // ── Hint query ──
    if (isHintQuery && session.currentExercise) {
      const hint = session.currentExercise.hint || '仔细想一想，观察一下题目里的关键词。';
      state.addToHistory(session, 'assistant', hint);
      state.saveSession(session);
      return { message: hint, session };
    }

    // ── Exercise answer check (if in exercise phase) ──
    if (session.phase === 'exercise' && session.currentExercise) {
      return await this._checkExerciseAnswer(session, input);
    }

    // ── Next query or idle: generate exercise ──
    if (isNextQuery || session.phase === 'idle' || session.phase === 'lesson') {
      if (!session.activeModule) {
        const msg = '你想探索哪个科学领域呀？\n\n🌱 生命科学\n🚀 物理科学\n🌍 地球与太空\n🧪 物质与变化\n🔬 科学探究';
        state.addToHistory(session, 'assistant', msg);
        state.saveSession(session);
        return { message: msg, session };
      }

      // Route to correct module if input has module context
      if (peekRoute.module && peekRoute.confidence !== 'none') {
        session.activeModule = peekRoute.module;
      }

      const exercise = loader.generateExercise(session.activeModule, studentId, session.activeSkill);
      if (exercise && !exercise.error) {
        session.phase = 'exercise';
        session.currentExercise = exercise;
        const msg = wrapper.presentExercise(session, exercise);
        state.addToHistory(session, 'assistant', msg);
        state.saveSession(session);
        return { message: msg, session };
      }

      const msg = '让我为你准备下一个科学问题... 你也可以点击"实验室"按钮去玩科学模拟！';
      state.addToHistory(session, 'assistant', msg);
      state.saveSession(session);
      return { message: msg, session };
    }

    // ── Default: try to understand and respond ──
    const msg = await this._generateResponse(session, input);
    state.addToHistory(session, 'assistant', msg);
    state.saveSession(session);
    return { message: msg, session };
  }

  // ── Onboarding ──

  _handleOnboardingAnswer(session, input) {
    const step = session.onboardingStep || 0;
    const lower = input.toLowerCase().trim();

    // Parse answer (A/B/C or keywords)
    let choice = null;
    if (/^[aA1]|动手|实验|试/.test(lower)) choice = 'a';
    else if (/^[bB2]|看|例子|别人|故事/.test(lower)) choice = 'b';
    else if (/^[cC3]|直接|做|冒险|先/.test(lower)) choice = 'c';
    else choice = 'a'; // default

    if (!session.studyProfile) {
      session.studyProfile = { name: '', learningPref: '', errorStrat: '', studyPace: '' };
    }

    if (step === 0) {
      session.studyProfile.learningPref = choice === 'a' ? 'hands-on' : choice === 'b' ? 'examples-first' : 'trial-and-error';
      session.onboardingStep = 1;
      state.saveSession(session);
      const q = wrapper.getOnboardingQuestion(session.tutor, 1);
      return { message: q, session };
    }
    if (step === 1) {
      session.studyProfile.errorStrat = choice === 'a' ? 'persist' : choice === 'b' ? 'seek-help' : 'skip-return';
      session.onboardingStep = 2;
      state.saveSession(session);
      const q = wrapper.getOnboardingQuestion(session.tutor, 2);
      return { message: q, session };
    }
    if (step === 2) {
      session.studyProfile.studyPace = choice === 'a' ? 'steady' : choice === 'b' ? 'flexible' : 'intensive';
      session.onboarded = true;
      session.onboardingStep = undefined;
      state.saveSession(session);
      const msg = wrapper.presentOnboardingSummary(session.tutor, session.studyProfile);
      state.addToHistory(session, 'assistant', msg);
      return { message: msg, session };
    }

    return { message: '好的！让我们开始科学探索吧！', session };
  }

  // ── Exercise Checking ──

  async _checkExerciseAnswer(session, input) {
    const exercise = session.currentExercise;
    if (!exercise) return { message: '没有当前练习题。', session };

    // Simple answer matching
    const correct = exercise.answer || exercise.correctAnswer;
    const isCorrect = this._matchAnswer(input, correct);

    if (isCorrect) {
      session.correctStreak = (session.correctStreak || 0) + 1;
      session.consecutiveWrong = 0;
      state.recordResult(session, session.activeSkill || 'general', 1, 1);
      session.currentExercise = null;

      let msg = wrapper.presentCorrect(session);
      const streakMsg = wrapper.presentStreak(session);
      if (streakMsg) msg += ' ' + streakMsg;

      if (exercise.explanation) {
        msg += '\n\n💡 ' + exercise.explanation;
      }

      msg += '\n\n继续下一题？输入"下一题"或问我任何科学问题！';
      session.phase = 'idle';
      state.addToHistory(session, 'assistant', msg);
      state.saveSession(session);
      return { message: msg, session };
    }

    // Wrong answer
    session.correctStreak = 0;
    session.consecutiveWrong = (session.consecutiveWrong || 0) + 1;

    let msg;
    if (session.consecutiveWrong >= 2) {
      // Reveal answer
      msg = wrapper.presentWrong(session, true);
      msg += `\n\n正确答案是：${correct}`;
      if (exercise.explanation) {
        msg += '\n\n💡 ' + exercise.explanation;
      }
      state.recordResult(session, session.activeSkill || 'general', 0, 1);
      session.currentExercise = null;
      session.phase = 'idle';
      msg += '\n\n别灰心！让我们继续学习。输入"下一题"继续！';
    } else {
      msg = wrapper.presentWrong(session, false);
      if (exercise.hint) {
        msg += '\n\n💡 提示：' + exercise.hint;
      }
      msg += '\n再试一次吧！';
    }

    // Try LLM-enhanced feedback
    if (llm.isEnabled() && session.consecutiveWrong < 2) {
      try {
        const feedback = await llm.chat([
          { role: 'system', content: '你是一位友善的小学科学老师。学生答错了一道题，请用简短鼓励的话给出提示，不要直接告诉答案。用中文回答，2-3句话。' },
          { role: 'user', content: `题目：${exercise.question || exercise.text}\n学生答案：${input}\n正确答案：${correct}` },
        ]);
        if (feedback) msg = feedback;
      } catch { /* use rule-based fallback */ }
    }

    state.addToHistory(session, 'assistant', msg);
    state.saveSession(session);
    return { message: msg, session };
  }

  _matchAnswer(input, correct) {
    if (!correct) return false;
    const normalizedInput = input.trim().toLowerCase();
    const normalizedCorrect = String(correct).trim().toLowerCase();

    // Exact match
    if (normalizedInput === normalizedCorrect) return true;

    // Contains match for short answers
    if (normalizedCorrect.length <= 20 && normalizedInput.includes(normalizedCorrect)) return true;

    // Letter matching (A, B, C, D)
    const letterMatch = /^([a-dA-D])[.)）\s]?$/.exec(normalizedInput);
    if (letterMatch && letterMatch[1].toLowerCase() === normalizedCorrect.toLowerCase()) return true;

    return false;
  }

  // ── Frustration Handling ──

  _parseFrustrationChoice(input) {
    const lower = input.trim().toLowerCase();
    if (/^1|实验|模拟|lab/.test(lower)) return 'lab';
    if (/^2|简单|换|easy/.test(lower)) return 'easier';
    if (/^3|故事|有趣|story/.test(lower)) return 'story';
    return null;
  }

  _handleFrustrationChoice(session, choice) {
    session.consecutiveWrong = 0;
    session.currentExercise = null;

    if (choice === 'lab') {
      session.phase = 'idle';
      const msg = '好的！打开右上角的"实验室"按钮，你可以找到很多有趣的科学模拟！通过实验来理解这些概念会更容易哦。';
      state.addToHistory(session, 'assistant', msg);
      state.saveSession(session);
      return { message: msg, session };
    }
    if (choice === 'easier') {
      session.phase = 'idle';
      const msg = '没问题！让我给你找一个更简单的知识点来学习。\n\n你想探索哪个方向？\n🌱 生命科学\n🚀 物理科学\n🌍 地球与太空\n🧪 物质与变化\n🔬 科学探究';
      state.addToHistory(session, 'assistant', msg);
      state.saveSession(session);
      return { message: msg, session };
    }
    if (choice === 'story') {
      session.phase = 'idle';
      const mod = session.activeModule || 'life';
      const stories = {
        life: '你知道吗？一棵大树每天可以产生足够一个人呼吸的氧气！植物就像地球的"肺"，默默地为我们制造新鲜空气。',
        physical: '你知道吗？如果没有摩擦力，你连一步都走不了！想象一下在冰面上走路的样子——那就是摩擦力很小的感觉。',
        earth: '你知道吗？地球每天都在自转，速度大约1670公里/小时——比飞机还快！但我们感觉不到，是因为一切都在一起转。',
        matter: '你知道吗？水是地球上唯一在自然状态下同时以固体（冰）、液体（水）和气体（水蒸气）存在的物质！',
        inquiry: '你知道吗？科学家牛顿据说是被苹果砸到头才想出万有引力定律的！好奇心是科学最好的起点。',
      };
      const msg = (stories[mod] || stories.life) + '\n\n有趣吧？想继续学习的话，告诉我你想探索什么！';
      state.addToHistory(session, 'assistant', msg);
      state.saveSession(session);
      return { message: msg, session };
    }

    return null;
  }

  // ── CER Handling ──

  async _handleCERInput(session, input) {
    const cer = session.currentCER;
    if (!cer) {
      session.phase = 'idle';
      state.saveSession(session);
      return { message: '探究活动结束了。想做什么？', session };
    }

    // Try LLM evaluation
    if (llm.isEnabled()) {
      try {
        const feedback = await llm.chat([
          { role: 'system', content: '你是一位小学科学老师，正在指导学生做CER（主张-证据-推理）科学探究。请评价学生的回答，给出鼓励和建议。用中文，3-4句话。' },
          { role: 'user', content: `探究主题：${cer.topic || '科学探究'}\n学生回答：${input}` },
        ]);
        if (feedback) {
          state.addToHistory(session, 'assistant', feedback);
          session.phase = 'idle';
          session.currentCER = null;
          state.saveSession(session);
          return { message: feedback + '\n\n做得很好！想继续探索还是做练习题？', session };
        }
      } catch { /* fallback */ }
    }

    // Rule-based fallback
    const msg = '很好的思考！科学探究需要我们大胆假设、仔细观察、认真推理。\n\n你的回答很有想法。想继续探索还是做练习题？';
    state.addToHistory(session, 'assistant', msg);
    session.phase = 'idle';
    session.currentCER = null;
    state.saveSession(session);
    return { message: msg, session };
  }

  // ── General Response ──

  async _generateResponse(session, input) {
    // Try LLM first
    if (llm.isEnabled()) {
      try {
        const mod = session.activeModule ? wrapper.formatModuleName(session.activeModule) : '科学';
        const response = await llm.chat([
          { role: 'system', content: `你是一位友善的小学科学老师（${wrapper.TUTORS[session.tutor]?.name || '猫头鹰博士'}），正在教${session.grade?.replace('grade-', '') || '3'}年级的学生。当前学习领域：${mod}。请用简短、有趣、鼓励的语言回答学生的问题。如果学生的问题不是关于科学的，温柔地引导回科学话题。用中文回答，3-5句话。` },
          { role: 'user', content: input },
        ]);
        if (response) return response;
      } catch { /* fallback */ }
    }

    // Rule-based fallback
    const route = router.route(input, session.activeModule);
    if (route.module && route.confidence !== 'none') {
      return `这是一个关于${wrapper.formatModuleName(route.module)}的好问题！让我们一起来探索吧。输入"下一题"开始练习，或者去实验室做实验！`;
    }

    return '有趣的问题！作为你的科学老师，我很乐意帮你探索。你可以问我任何科学问题，或者输入"下一题"来做练习，也可以打开实验室玩科学模拟！';
  }

  // ── Data Access ──

  getMasteryData(studentId) {
    return state.computeMastery(studentId);
  }

  getSessionData(studentId) {
    return this.sessions[studentId] || state.loadSession(studentId);
  }
}

module.exports = Orchestrator;
