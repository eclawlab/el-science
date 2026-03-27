// LLM Helper — supports both eclaw-router (cloud) and local LLM (Ollama, llama.cpp, LM Studio, vLLM).
// Both use OpenAI-compatible /v1/chat/completions endpoint.
// Priority: local LLM first (free, fast), eclaw-router fallback (cloud).
// Falls back to rule-based logic if neither is configured or both fail.
//
// Local LLM config:
//   LOCAL_LLM_URL=http://localhost:11434   (Ollama default)
//   LOCAL_LLM_MODEL=qwen2.5:7b            (or any model name)
//
// eclaw-router config:
//   ECLAW_API_URL=https://router.eclaw.ai
//   ECLAW_API_KEY=sk-eclaw-...

const https = require('https');
const http = require('http');
const { URL } = require('url');

// ── Provider configs ──

const LOCAL_URL = process.env.LOCAL_LLM_URL || '';
const LOCAL_MODEL = process.env.LOCAL_LLM_MODEL || 'qwen2.5:7b';
const LOCAL_TIMEOUT = parseInt(process.env.LOCAL_LLM_TIMEOUT || '15000', 10);

const ECLAW_URL = process.env.ECLAW_API_URL || '';
const ECLAW_KEY = process.env.ECLAW_API_KEY || '';
const ECLAW_MODEL = process.env.LLM_MODEL || 'claude-haiku-4-5-20251001';

const MAX_TOKENS = 200;

function isLocalEnabled() {
  return LOCAL_URL.length > 0;
}

function isEclawEnabled() {
  return ECLAW_URL.length > 0 && ECLAW_KEY.length > 0;
}

function isEnabled() {
  return isLocalEnabled() || isEclawEnabled();
}

/**
 * Returns which provider(s) are active.
 */
function getProviderStatus() {
  return {
    local: isLocalEnabled() ? { url: LOCAL_URL, model: LOCAL_MODEL } : null,
    eclaw: isEclawEnabled() ? { url: ECLAW_URL, model: ECLAW_MODEL } : null,
  };
}

// ── Generic OpenAI-compatible call ──

function callProvider(apiUrl, apiKey, model, messages, maxTokens, timeout) {
  const body = JSON.stringify({
    model,
    messages,
    max_tokens: maxTokens,
    stream: false,
  });

  const url = new URL('/v1/chat/completions', apiUrl);
  const transport = url.protocol === 'https:' ? https : http;

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  return new Promise((resolve, reject) => {
    const req = transport.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
            resolve(parsed.choices[0].message.content);
          } else if (parsed.error) {
            reject(new Error(parsed.error.message || parsed.error || 'API error'));
          } else {
            reject(new Error('Unexpected API response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

/**
 * Call LLM with automatic provider selection and fallback.
 * Priority: local → eclaw-router → throws (caller falls back to rule-based).
 */
async function call(systemPrompt, userPrompt, maxTokens = MAX_TOKENS) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // Try local LLM first (free, no latency to cloud)
  if (isLocalEnabled()) {
    try {
      return await callProvider(LOCAL_URL, '', LOCAL_MODEL, messages, maxTokens, LOCAL_TIMEOUT);
    } catch (err) {
      // Local failed — fall through to eclaw-router
      if (isEclawEnabled()) {
        console.error(`Local LLM failed (${err.message}), falling back to eclaw-router`);
      } else {
        throw err; // No fallback available
      }
    }
  }

  // Try eclaw-router
  if (isEclawEnabled()) {
    return await callProvider(ECLAW_URL, ECLAW_KEY, ECLAW_MODEL, messages, maxTokens, 10000);
  }

  throw new Error('No LLM provider configured');
}

// ─── Use Case 1: Wrong Answer Feedback ────────────────────────────────────────

async function explainWrongAnswer({ question, expectedAnswer, studentAnswer, hint, misconception, rule, tutorName, grade }) {
  const system = [
    `你是${tutorName || '熊老师'}，一位温暖有耐心的小学数学老师（${grade || '3年级'}）。`,
    '用简单、鼓励的语言解释为什么学生的答案不对。',
    '规则：',
    '- 最多2-3句话',
    '- 不要直接给出正确答案',
    '- 指出学生具体哪里搞错了',
    '- 给一个具体的提示帮助他们找到正确答案',
    '- 用生活中的例子让孩子容易理解',
    '- 语气温暖鼓励，不要让孩子觉得自己笨',
  ].join('\n');

  const parts = [`题目：${question}`, `正确答案：${expectedAnswer}`, `学生的答案：${studentAnswer}`];
  if (hint) parts.push(`提示信息：${hint}`);
  if (misconception) parts.push(`常见错误：${misconception}`);
  if (rule) parts.push(`相关规则：${rule}`);
  parts.push('\n请解释为什么学生的答案不对，并给出提示（不要直接说答案）。');

  return call(system, parts.join('\n'), 150);
}

// ─── Use Case 2: Open-Ended Answer Scoring ────────────────────────────────────

async function scoreOpenAnswer({ question, expectedAnswer, studentAnswer, concept, tutorName, grade }) {
  const system = [
    '你是一位小学数学阅卷老师。判断学生的开放性回答是否正确。',
    '规则：',
    '- 回复JSON格式：{"correct": true/false, "feedback": "一句话反馈"}',
    '- 只要学生表达了核心概念就算对，不要求完美措辞',
    '- 小学生的表达可能不规范，要宽容判分',
    '- feedback用中文，1句话，温暖鼓励',
    '- 只回复JSON，不要其他内容',
  ].join('\n');

  const parts = [`题目：${question}`, `参考答案：${expectedAnswer}`, `学生回答：${studentAnswer}`];
  if (concept) parts.push(`考察概念：${concept}`);

  let raw;
  try {
    raw = await call(system, parts.join('\n'), 100);
  } catch (err) {
    console.error(`scoreOpenAnswer LLM call failed: ${err.message}`);
    return { correct: false, feedback: '评分暂时不可用，请继续练习' };
  }

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch { /* fall through */ }

  const lower = raw.toLowerCase().replace(/\s+/g, '');
  return {
    correct: lower.includes('"correct":true') || lower.includes("'correct':true") || lower.includes('correct:true'),
    feedback: raw.replace(/[{}"\n]/g, '').trim().slice(0, 100),
  };
}

// ─── Use Case 3: CER Evaluation ──────────────────────────────────────────────

async function scoreCER({ topic, phenomenon, claim, evidence, reasoning, grade }) {
  const system = [
    '你是一位小学数学探究评分老师。用CER（主张-证据-推理）框架评分。',
    '规则：',
    '- 回复JSON格式：{"claim": 0-3, "evidence": 0-3, "reasoning": 0-3, "feedback": "2句话反馈"}',
    '- 评分标准：0=没有回答 1=尝试了但不准确 2=基本正确 3=优秀',
    '- 小学生标准，要求不要太高',
    '- feedback用中文，先表扬做得好的，再建议改进的',
    '- 只回复JSON，不要其他内容',
  ].join('\n');

  const parts = [
    `年级：${grade || '3年级'}`,
    `探究主题：${topic}`,
    phenomenon ? `现象：${phenomenon}` : null,
    `学生的主张：${claim}`,
    `学生的证据：${evidence}`,
    `学生的推理：${reasoning}`,
  ].filter(Boolean);

  let raw;
  try {
    raw = await call(system, parts.join('\n'), 200);
  } catch (err) {
    console.error(`scoreCER LLM call failed: ${err.message}`);
    return { claim: 1, evidence: 1, reasoning: 1, feedback: '评分暂时不可用，请继续探究练习。' };
  }

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        claim: Math.min(3, Math.max(0, parsed.claim || 0)),
        evidence: Math.min(3, Math.max(0, parsed.evidence || 0)),
        reasoning: Math.min(3, Math.max(0, parsed.reasoning || 0)),
        feedback: parsed.feedback || '',
      };
    }
  } catch { /* fall through */ }

  return { claim: 1, evidence: 1, reasoning: 1, feedback: '继续努力！多练习探究思维。' };
}

module.exports = {
  isEnabled,
  isLocalEnabled,
  isEclawEnabled,
  getProviderStatus,
  call,
  explainWrongAnswer,
  scoreOpenAnswer,
  scoreCER,
};
