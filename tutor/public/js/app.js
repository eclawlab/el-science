// 小学科学乐园 — 前端应用
(function () {
  'use strict';

  // ── State ──
  let studentId = '';
  let grade = 'grade-3';
  let tutorId = 'methodical';
  let currentSession = null;
  let authToken = localStorage.getItem('el-science-token') || '';
  let userProfile = null;

  // ── DOM ──
  const authScreen = document.getElementById('auth-screen');
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app-screen');
  const loginName = document.getElementById('login-name');
  const loginGrade = document.getElementById('login-grade');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const typing = document.getElementById('typing');
  const studentInfo = document.getElementById('student-info');
  const sidebarAvatar = document.getElementById('sidebar-avatar');

  // ── Auth: Toggle Login / Register ──
  function showAuthPanel(panel) {
    document.getElementById('auth-login').style.display = panel === 'login' ? '' : 'none';
    document.getElementById('auth-register').style.display = panel === 'register' ? '' : 'none';
    document.getElementById('auth-error').textContent = '';
  }
  document.getElementById('show-register').addEventListener('click', (e) => { e.preventDefault(); showAuthPanel('register'); });
  document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); showAuthPanel('login'); });

  // ── Auth: Register ──
  document.getElementById('register-btn').addEventListener('click', async () => {
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const name = document.getElementById('reg-name').value.trim();
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = '';
    try {
      const res = await api('/api/account/register', { phone, password, name });
      authToken = res.token;
      localStorage.setItem('el-science-token', authToken);
      await loadProfileAndProceed();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  // ── Auth: Login ──
  document.getElementById('login-btn').addEventListener('click', async () => {
    const phone = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = '';
    try {
      const res = await api('/api/account/login', { phone, password });
      authToken = res.token;
      localStorage.setItem('el-science-token', authToken);
      userProfile = res.profile;
      await loadProfileAndProceed();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  // Enter key support for auth inputs
  document.getElementById('login-phone').addEventListener('keypress', e => {
    if (e.key === 'Enter') document.getElementById('login-password').focus();
  });
  document.getElementById('login-password').addEventListener('keypress', e => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
  });
  document.getElementById('reg-phone').addEventListener('keypress', e => {
    if (e.key === 'Enter') document.getElementById('reg-password').focus();
  });
  document.getElementById('reg-password').addEventListener('keypress', e => {
    if (e.key === 'Enter') document.getElementById('reg-name').focus();
  });
  document.getElementById('reg-name').addEventListener('keypress', e => {
    if (e.key === 'Enter') document.getElementById('register-btn').click();
  });

  // ── Auth: Auto-login if token exists ──
  if (authToken) {
    loadProfileAndProceed().catch(() => {
      authToken = '';
      userProfile = null;
      localStorage.removeItem('el-science-token');
      authScreen.style.display = '';
    });
  }

  async function loadProfileAndProceed() {
    if (!userProfile) {
      userProfile = await apiAuth('/api/account/profile');
    }
    authScreen.style.display = 'none';

    // If user already has grade/tutor set, go straight to app
    if (userProfile.grade && userProfile.tutor && userProfile.name) {
      grade = userProfile.grade;
      tutorId = userProfile.tutor;
      studentId = userProfile.userId;
      loginScreen.style.display = 'none';
      await enterApp();
    } else {
      // Show setup screen
      loginScreen.style.display = '';
      if (userProfile.name) loginName.value = userProfile.name;
      if (userProfile.grade) loginGrade.value = userProfile.grade;
    }
  }

  // ── Setup: Start button ──
  document.getElementById('start-btn').addEventListener('click', async () => {
    const name = loginName.value.trim();
    if (!name) { loginName.focus(); return; }
    grade = loginGrade.value;

    // Save profile
    try {
      userProfile = await apiAuth('/api/account/profile', { name, grade, tutor: tutorId }, 'PUT');
    } catch { /* non-fatal */ }

    studentId = userProfile?.userId || name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '_');
    loginScreen.style.display = 'none';
    await enterApp();
  });

  async function enterApp() {
    try {
      const res = await apiAuth('/api/start', { studentId, grade, tutorId });
      currentSession = res.session;
      appScreen.style.display = 'block';
      const tutorNames = { methodical: '猫头鹰博士', competitive: '火箭狮', creative: '狐博士' };
      const tutorAvatars = { methodical: '🦉', competitive: '🦁', creative: '🦊' };
      const displayName = userProfile?.name || studentId;
      studentInfo.textContent = `${displayName} — ${grade.replace('grade-', '')}年级 — ${tutorNames[tutorId] || tutorId}`;
      sidebarAvatar.textContent = tutorAvatars[tutorId] || '🦉';
      addMessage('tutor', res.message);
      updateSidebar(res.mastery, res.session);
      chatInput.focus();
    } catch (err) {
      alert('启动失败: ' + err.message);
    }
  }

  // ── Tutor Selection ──
  document.querySelectorAll('.tutor-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.tutor-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      tutorId = card.dataset.tutor;
    });
  });

  // ── Chat ──

  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

  async function sendMessage() {
    const msg = chatInput.value.trim();
    if (!msg) return;

    addMessage('student', msg);
    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await apiAuth('/api/turn', { studentId, message: msg });
      const prevStreak = currentSession?.correctStreak || 0;
      currentSession = res.session;

      hideTyping();
      addMessage('tutor', res.message);
      updateSidebar(res.mastery, res.session);
      updateDomainNav(res.session);

      // Celebration only when streak crosses threshold (3 or 5)
      const newStreak = res.session?.correctStreak || 0;
      if ((newStreak >= 3 && prevStreak < 3) || (newStreak >= 5 && prevStreak < 5)) {
        triggerCelebration();
      }

      // Save progress to account
      if (authToken && res.mastery) {
        const wasExercise = res.session?.phase === 'exercise' || res.session?.phase === 'review';
        apiAuth('/api/account/progress', {
          mastery: res.mastery,
          exercisesDone: wasExercise ? 1 : 0,
          correctAnswers: wasExercise && newStreak > prevStreak ? 1 : 0,
          streak: newStreak,
        }).catch(() => {});
      }
    } catch (err) {
      hideTyping();
      addMessage('tutor', '哎呀，出了点问题，请再试一次吧？');
    }

    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }

  // ── Quick Actions ──

  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chatInput.value = btn.dataset.msg;
      sendMessage();
    });
  });

  // ── Domain Nav ──

  document.querySelectorAll('.domain-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chatInput.value = `我想学习${btn.textContent.trim()}`;
      sendMessage();
    });
  });

  function updateDomainNav(session) {
    document.querySelectorAll('.domain-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.domain === session?.activeModule);
    });
  }

  // ── Messages ──

  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message ${role}`;

    const sender = document.createElement('div');
    sender.className = 'sender';
    const tutorNames = { methodical: '猫头鹰博士', competitive: '火箭狮', creative: '狐博士' };
    sender.textContent = role === 'tutor' ? (tutorNames[tutorId] || '老师') : '你';

    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = text;

    div.appendChild(sender);
    div.appendChild(content);

    // Insert before typing indicator
    chatMessages.insertBefore(div, typing);
    scrollToBottom();
  }

  function showTyping() { typing.classList.add('show'); scrollToBottom(); }
  function hideTyping() { typing.classList.remove('show'); }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  // ── Celebration ──

  function triggerCelebration() {
    const avatar = document.getElementById('sidebar-avatar');
    if (avatar) {
      avatar.classList.add('celebrate');
      setTimeout(() => avatar.classList.remove('celebrate'), 700);
    }
  }

  // ── Sidebar Updates ──

  function updateSidebar(mastery, session) {
    updateMasteryBars(mastery);
    updateSessionInfo(session);
    updateRecentResults(session);
    updateRewards(session);
  }

  function updateMasteryBars(mastery) {
    const container = document.getElementById('mastery-bars');
    if (!mastery) return;

    const domains = [
      { key: 'life', label: '🌱 生命科学' },
      { key: 'physical', label: '🚀 物理科学' },
      { key: 'earth', label: '🌍 地球与太空' },
      { key: 'matter', label: '🧪 物质与变化' },
      { key: 'inquiry', label: '🔬 科学探究' },
    ];

    container.innerHTML = domains.map(d => {
      const pct = Math.round((mastery[d.key] || 0) * 100);
      const level = pct >= 80 ? 'high' : pct >= 50 ? 'mid' : 'low';
      return `
        <div class="mastery-domain">
          <div class="mastery-label">
            <span class="name">${d.label}</span>
            <span class="pct">${pct}%</span>
          </div>
          <div class="mastery-bar">
            <div class="fill ${level}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function updateSessionInfo(session) {
    if (!session) return;

    document.getElementById('info-module').textContent =
      formatModule(session.activeModule) || '—';
    document.getElementById('info-skill').textContent =
      formatSkill(session.activeSkill) || '—';

    const phaseMap = {
      idle: '等待中', exercise: '练习', lesson: '课程',
      lab: '实验', cer: '探究', diagram: '模型', review: '复习'
    };
    document.getElementById('info-phase').textContent =
      phaseMap[session.phase] || session.phase || '等待中';

    const streakEl = document.getElementById('info-streak');
    const streak = session.correctStreak || 0;
    if (streak >= 5) {
      streakEl.innerHTML = `<span class="streak-badge hot">${streak} 连对！</span>`;
    } else if (streak >= 3) {
      streakEl.innerHTML = `<span class="streak-badge">${streak} 连对</span>`;
    } else {
      streakEl.textContent = streak;
    }
  }

  function updateRecentResults(session) {
    const container = document.getElementById('recent-results');
    if (!session?.recentResults?.length) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">还没有成绩哦</p>';
      return;
    }

    container.innerHTML = session.recentResults.slice().reverse().map(r => {
      const pct = r.total > 0 ? Math.round(r.score / r.total * 100) : 0;
      const level = pct >= 80 ? 'good' : pct >= 60 ? 'ok' : 'low';
      return `
        <div class="recent-result">
          <span class="skill">${formatSkill(r.skill)}</span>
          <span class="score ${level}">${r.score}/${r.total}</span>
        </div>
      `;
    }).join('');
  }

  function updateRewards(session) {
    const container = document.getElementById('rewards');
    if (!container) return;

    const streak = session?.correctStreak || 0;
    const totalCorrect = (session?.recentResults || []).reduce((acc, r) => acc + r.score, 0);

    const badges = [
      { emoji: '⭐', label: '第一道题', unlocked: totalCorrect >= 1 },
      { emoji: '🌟', label: '连对3题', unlocked: streak >= 3 },
      { emoji: '💫', label: '连对5题', unlocked: streak >= 5 },
      { emoji: '🏆', label: '答对10题', unlocked: totalCorrect >= 10 },
      { emoji: '🔬', label: '答对20题', unlocked: totalCorrect >= 20 },
      { emoji: '🚀', label: '科学达人', unlocked: totalCorrect >= 50 },
    ];

    container.innerHTML = badges.map(b => `
      <div class="reward-badge ${b.unlocked ? '' : 'locked'}" title="${b.label}">
        ${b.emoji}
      </div>
    `).join('');
  }

  // ── Science Lab Panel ──

  const labToggleBtn = document.getElementById('lab-toggle-btn');
  const labPanel = document.getElementById('lab-panel');
  const labCloseBtn = document.getElementById('lab-close-btn');
  const labSearch = document.getElementById('lab-search');
  const labTopics = document.getElementById('lab-topics');
  const chatPanel = document.querySelector('.chat-panel');
  const simOverlay = document.getElementById('sim-overlay');
  const simFrame = document.getElementById('sim-frame');
  const simOverlayTitle = document.getElementById('sim-overlay-title');
  const simOverlayClose = document.getElementById('sim-overlay-close');

  let labLoaded = false;

  labToggleBtn.addEventListener('click', () => {
    const opening = !labPanel.classList.contains('open');
    labPanel.classList.toggle('open', opening);
    chatPanel.style.display = opening ? 'none' : '';
    labToggleBtn.classList.toggle('active', opening);
    if (opening && !labLoaded) loadLabCatalog();
  });

  labCloseBtn.addEventListener('click', () => {
    labPanel.classList.remove('open');
    chatPanel.style.display = '';
    labToggleBtn.classList.remove('active');
  });

  async function loadLabCatalog() {
    try {
      const res = await api('/api/simulations');
      renderLabCatalog(res.topics);
      labLoaded = true;
    } catch (err) {
      labTopics.innerHTML = '<p style="color:var(--danger);padding:20px;">加载实验失败。</p>';
    }
  }

  function renderLabCatalog(topicsList) {
    labTopics.innerHTML = topicsList.map(topic => {
      const simCards = topic.sims.map(sim => `
        <div class="lab-sim-card" data-slug="${sim.slug}" data-title="${sim.title}" data-search="${sim.title.toLowerCase()} ${sim.desc.toLowerCase()}">
          <div class="lab-sim-thumb">
            <img src="/${sim.slug}/assets/${sim.slug}-screenshot.png" alt="${sim.title}" loading="lazy"
                 onerror="this.style.display='none'" />
            <div class="lab-sim-play">▶</div>
          </div>
          <div class="lab-sim-info">
            <h4>${sim.title}</h4>
            <p>${sim.desc}</p>
          </div>
        </div>
      `).join('');

      return `
        <div class="lab-topic" data-topic-id="${topic.id}">
          <div class="lab-topic-header">
            <span class="lab-topic-icon">${topic.icon}</span>
            <h3>${topic.title}</h3>
            <span class="lab-topic-count">${topic.sims.length} 个实验</span>
          </div>
          <div class="lab-sim-grid">${simCards}</div>
        </div>
      `;
    }).join('');

    // Click handlers for sim cards
    labTopics.querySelectorAll('.lab-sim-card').forEach(card => {
      card.addEventListener('click', () => {
        const slug = card.dataset.slug;
        const title = card.dataset.title;
        openSimulation(slug, title);
      });
    });
  }

  // Search within lab
  labSearch.addEventListener('input', () => {
    const q = labSearch.value.toLowerCase().trim();
    const cards = labTopics.querySelectorAll('.lab-sim-card');
    cards.forEach(card => {
      const show = !q || card.dataset.search.includes(q);
      card.classList.toggle('hidden', !show);
    });
    labTopics.querySelectorAll('.lab-topic').forEach(topic => {
      const hasVisible = topic.querySelectorAll('.lab-sim-card:not(.hidden)').length > 0;
      topic.style.display = hasVisible ? '' : 'none';
    });
  });

  // Open simulation in new tab
  function openSimulation(slug, title) {
    window.open(`/${slug}/${slug}_en.html`, '_blank');
  }

  // Close sim overlay
  simOverlayClose.addEventListener('click', closeSimOverlay);
  simOverlay.addEventListener('click', e => { if (e.target === simOverlay) closeSimOverlay(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSimOverlay(); });

  function closeSimOverlay() {
    simOverlay.classList.remove('open');
    simFrame.src = '';
  }

  // ── Helpers ──

  function formatModule(mod) {
    if (!mod) return null;
    const names = {
      life: '生命科学',
      physical: '物理科学',
      earth: '地球与太空',
      matter: '物质与变化',
      inquiry: '科学探究',
      'study-planner': '学习计划',
    };
    return names[mod] || mod;
  }

  function formatSkill(skill) {
    if (!skill) return null;
    return skill.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // ── Account Panel ──

  const accountPanel = document.getElementById('account-panel');
  const accountToggleBtn = document.getElementById('account-toggle-btn');
  const accountCloseBtn = document.getElementById('account-close-btn');

  accountToggleBtn.addEventListener('click', async () => {
    accountPanel.style.display = accountPanel.style.display === 'none' ? '' : 'none';
    if (accountPanel.style.display !== 'none') {
      await refreshAccountPanel();
    }
  });

  accountCloseBtn.addEventListener('click', () => {
    accountPanel.style.display = 'none';
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    authToken = '';
    userProfile = null;
    localStorage.removeItem('el-science-token');
    accountPanel.style.display = 'none';
    appScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    authScreen.style.display = '';
    location.reload();
  });

  async function refreshAccountPanel() {
    try {
      const profile = await apiAuth('/api/account/profile');
      document.getElementById('acct-phone').textContent = profile.phone || '—';
      document.getElementById('acct-name').textContent = profile.name || '—';
      document.getElementById('acct-grade').textContent = (profile.grade || '').replace('grade-', '') + '年级';
      document.getElementById('acct-eclaw').textContent = profile.eclawEnabled ? '已开通' : '未开通';
      document.getElementById('acct-total-ex').textContent = profile.totalExercises || 0;
      document.getElementById('acct-total-correct').textContent = profile.totalCorrect || 0;
      document.getElementById('acct-best-streak').textContent = profile.streakBest || 0;

      const sub = profile.subscription || {};
      const statusMap = { active: '已订阅', expired: '已过期', none: '未订阅' };
      document.getElementById('acct-sub-status').textContent = statusMap[sub.status] || '未订阅';
      document.getElementById('acct-sub-expires').textContent = sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('zh-CN') : '—';

      // Load plans
      const planData = await api('/api/account/plans');
      const planCards = document.getElementById('plan-cards');
      planCards.innerHTML = (planData.plans || []).map(p => `
        <div class="plan-card" data-plan="${p.id}">
          <span class="plan-name">${p.name}</span>
          <span class="plan-price">${p.label}</span>
        </div>
      `).join('');

      planCards.querySelectorAll('.plan-card').forEach(card => {
        card.addEventListener('click', () => subscribePlan(card.dataset.plan));
      });
    } catch (err) {
      console.error('Account panel error:', err);
    }
  }

  let payPollTimer = null;

  function showPayModal(title, qrUrl, orderId) {
    const modal = document.getElementById('pay-modal');
    document.getElementById('pay-modal-title').textContent = title;
    document.getElementById('pay-qr-img').src = qrUrl;
    document.getElementById('pay-order-id').textContent = '订单号：' + orderId;
    const status = document.getElementById('pay-status');
    status.textContent = '等待扫码支付...';
    status.className = 'pay-status';
    modal.style.display = 'flex';
  }

  function closePayModal() {
    document.getElementById('pay-modal').style.display = 'none';
    if (payPollTimer) { clearInterval(payPollTimer); payPollTimer = null; }
  }

  document.getElementById('pay-modal-close').addEventListener('click', closePayModal);
  document.getElementById('pay-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closePayModal();
  });

  function pollPaymentStatus(orderId) {
    if (payPollTimer) clearInterval(payPollTimer);
    payPollTimer = setInterval(async () => {
      try {
        const res = await apiAuth(`/api/payment/query/${orderId}`);
        if (res.success && res.status === '2') {
          clearInterval(payPollTimer);
          payPollTimer = null;
          const status = document.getElementById('pay-status');
          status.textContent = '支付成功！';
          status.className = 'pay-status pay-success';
          setTimeout(() => {
            closePayModal();
            refreshAccountPanel();
          }, 1500);
        }
      } catch (_) { /* keep polling */ }
    }, 3000);
  }

  async function subscribePlan(planId) {
    try {
      const res = await apiAuth('/api/account/subscribe', { planId });
      if (res.success && res.qrCodeUrl) {
        showPayModal('扫码支付', res.qrCodeUrl, res.orderId);
        pollPaymentStatus(res.orderId);
      } else if (res.error) {
        alert('创建订单失败：' + (res.errorMsg || res.error));
      } else {
        alert('支付功能暂未配置');
      }
    } catch (err) {
      alert(err.message);
    }
  }

  // ── API Helpers ──

  async function api(url, body) {
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '请求失败' }));
      throw new Error(err.error || '请求失败');
    }
    return res.json();
  }

  async function apiAuth(url, body, method) {
    const res = await fetch(url, {
      method: method || (body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '请求失败' }));
      throw new Error(err.error || '请求失败');
    }
    return res.json();
  }
})();
