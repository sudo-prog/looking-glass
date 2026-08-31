/**
 * LOOKING GLASS — Liquid AI Orb
 * A floating glass orb at the bottom center of the screen.
 * After setup, opens the pill then full AI chat.
 * Uses the shared AI config from aiConfig.js (same key as SettingsPanel).
 * Chat-only: all provider/model/key configuration lives in SettingsPanel.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { loadAIConfig, getProviderDef, resolveModelAlias, resolveEndpoint } from '../utils/aiConfig.js';
import { initDebugLog, getDebugLog, clearDebugLog, downloadDebugLog, copyDebugLog, onDebugLogChange, addDebugEntry } from '../utils/debugLog.js';
import './LiquidOrb.css';

// ═══════════════════════════════════════════════════════════════════
//  SYSTEM PROMPT — shared across all providers
// ═══════════════════════════════════════════════════════════════════
const SYS = `You are the AI brain of "Looking Glass" — a live PWA whose entire UI you can read and rewrite in real time.

You receive a JSON snapshot of every element, all CSS values, and the live DOM structure.
Respond ONLY with a JSON mutation plan — no markdown, no prose outside JSON:
{"plan":"one sentence","ops":[...array of op objects...]}

━━━ SELF-EDIT OPS (rewrite any element) ━━━

PATCH_ELEMENT — rewrite innerHTML, style, attributes, or classes of any element:
  {"type":"PATCH_ELEMENT","selector":"#orb","innerHTML":"<div>New</div>"}
  {"type":"PATCH_ELEMENT","selector":".lg-orb-pill-inner","style":{"borderRadius":"8px"}}
  Add "all":true to target ALL matching elements.
  Add "addClass":"className" or "removeClass":"className" to toggle classes.

APPEND_ELEMENT — inject new HTML inside any element:
  {"type":"APPEND_ELEMENT","selector":"#orb-root","html":"<div style='...'>New</div>"}

REMOVE_ELEMENT — remove any element (animated fade):
  {"type":"REMOVE_ELEMENT","selector":".some-class"}

REWRITE_ORB — change icon, size, glow:
  {"type":"REWRITE_ORB","iconSvg":"<svg ...>...</svg>","glowColor":"rgba(40,200,120,0.22)","size":64}

━━━ STYLE OPS ━━━
  {"type":"SET_CSS_VAR","variable":"--orb-bg","value":"#0a0a14"}
  {"type":"SET_CSS","css":".lg-orb{animation:none}"}
  {"type":"REPLACE_CSS","css":"/* full replacement */"}

━━━ LENS OPS (glass physics) ━━━
  {"type":"MUTATE_LENS","params":{"scale":0.18,"depth":14,"curvature":55,"chroma":0.30}}

━━━ SCENE OPS ━━━
  {"type":"ADD_FEATURE","id":"x","html":"<div>...</div>","label":"Name"}
  {"type":"REMOVE_FEATURE","id":"x"}
  {"type":"SHOW_NOTIFICATION","message":"Done!","variant":"success","duration":2500}

━━━ POWER OPS (use when simple edits aren't enough) ━━━

EVAL — execute JavaScript in the page context to fix any issue:
  {"type":"EVAL","code":"document.querySelectorAll('.stale-toast').forEach(el=>el.remove())"}
  Use for: removing stuck elements, fixing state, clearing timers, resetting UI.

PATCH_SOURCE — commit a source code fix to GitHub (permanent fix):
  {"type":"PATCH_SOURCE","file":"src/ui/LiquidOrb.jsx","find":"const [logs, setLogs] = useState([])","replace":"const [logs, setLogs] = useState([]);\\n  // Auto-clear logs after 5s\\n  useEffect(() => { const t = setInterval(()=>setLogs(p=>p.slice(0,2)), 5000); return ()=>clearInterval(t); }, []);"}
  repo: "sudo-prog/looking-glass" (default). Supports: LiquidOrb.jsx, aiConfig.js, etc.

━━━ RULES ━━━
- ONLY output valid JSON. No prose outside the JSON object.
- Max 8 ops per response. Ops execute sequentially with 220ms gaps.
- Always end with SHOW_NOTIFICATION to confirm.
- The UI snapshot includes domTree (all elements with id/class) — use it to target real elements.
- NEVER guess selectors — check domTree first.
- For logic bugs or stuck UI: use EVAL to run JavaScript directly in the page.
- For permanent source fixes: use PATCH_SOURCE to specify file/find/replace (logged to console for dev review).
- Prefer EVAL for immediate fixes, PATCH_SOURCE for permanent ones that survive page reload.`

// ═══════════════════════════════════════════════════════════════════
//  CHAT MODE SYSTEM PROMPT — general conversational assistant
// ═══════════════════════════════════════════════════════════════════
const SYS_CHAT = `You are the AI assistant for "Looking Glass" — a visual bookmarking and note-taking app. Help the user with general questions, explanations, and advice about their saved items, the app, or anything else they ask. Respond in natural, helpful prose. Do NOT emit JSON mutation plans or rewrite the UI unless the user explicitly asks you to. Be concise and friendly.`;

// ═══════════════════════════════════════════════════════════════════
//  MULTI-PROVIDER AI CALLER (omniroute + openrouter only)
// ═══════════════════════════════════════════════════════════════════
async function callAI(userMsg, snapshot, mode) {
  const cfg = loadAIConfig();
  const pid = cfg.provider;
  const p = getProviderDef(pid);
  const key = cfg.key;
  const model = resolveModelAlias(cfg.model);
  const systemPrompt = mode === 'chat' ? SYS_CHAT : SYS;

  if (!model) throw new Error(`No model selected — configure AI in Settings → AI Assistant`);
  if (p.needsKey && !key) throw new Error(`No API key — add your ${p.name} key in Settings → AI Assistant`);

  const prompt = mode === 'chat'
    ? userMsg
    : `User instruction: "${userMsg}"\n\nCurrent UI snapshot:\n${JSON.stringify(snapshot, null, 2)}`;

  // Finalize the raw model text into {plan, ops} based on mode.
  const finalize = (text) => {
    if (mode === 'chat') return { plan: text || 'No response', ops: [] };
    try {
      const parsed = parseJSON(text);
      return { plan: parsed.plan || text || 'AI plan missing', ops: Array.isArray(parsed.ops) ? parsed.ops : [] };
    } catch (e) {
      return { plan: text || 'AI response could not be parsed', ops: [] };
    }
  };

  // ── OpenAI-compatible: OmniRoute / OpenRouter ───────────────────
  const endpoint = resolveEndpoint(pid, p);
  const headers = { 'Content-Type': 'application/json' };
  if (key) headers['Authorization'] = `Bearer ${key}`;
  if (pid === 'openrouter') {
    headers['HTTP-Referer'] = 'https://looking-glass.app';
    headers['X-Title'] = 'Looking Glass';
  }

  const r = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      temperature: 0.3,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]
    })
  });
  if (!r.ok) throw new Error(`${p.name} ${r.status}: ${(await r.text().catch(() => ''))}`);
  const d = await r.json();
  const content = d.choices?.[0]?.message?.content || '';
  return finalize(content);
}

function parseJSON(raw) {
  const clean = raw.replace(/```json|```/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object in response');
  return JSON.parse(match[0]);
}

// ═══════════════════════════════════════════════════════════════════
//  SPRING PHYSICS
// ═══════════════════════════════════════════════════════════════════
function makeSpring(initial, { k = 180, b = 22, mass = 1 } = {}) {
  let pos = initial, vel = 0, target = initial;
  let raf = null, onFrame = null;
  function tick() {
    const F = -k * (pos - target) - b * vel;
    vel += (F / mass) / 60;
    pos += vel / 60;
    onFrame?.(pos);
    const settled = Math.abs(pos - target) < 0.0002 && Math.abs(vel) < 0.0002;
    if (!settled) raf = requestAnimationFrame(tick);
    else { pos = target; vel = 0; onFrame?.(pos); raf = null; }
  }
  return {
    get value() { return pos; },
    set target(t) { target = t; if (!raf) raf = requestAnimationFrame(tick); },
    set onChange(fn) { onFrame = fn; },
    cancel() { if (raf) { cancelAnimationFrame(raf); raf = null; } },
  };
}

// ═══════════════════════════════════════════════════════════════════
//  LENS MAP GENERATION (Aave four-fold technique)
// ═══════════════════════════════════════════════════════════════════
function generateLensMap(lens) {
  const { W, H, borderRadius, scale, depth, curvature, splay } = lens;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const data = img.data;
  const hw = Math.ceil(W / 2), hh = Math.ceil(H / 2);
  const EPS = 0.002;

  function rSDF(nx, ny) {
    const px = nx * 2 - 1, py = ny * 2 - 1;
    const rx = (borderRadius / W) * 2, ry = (borderRadius / H) * 2;
    const qx = Math.abs(px) - (1 - rx), qy = Math.abs(py) - (1 - ry);
    return Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2) - Math.min(rx, ry) + Math.min(Math.max(qx, qy), 0);
  }
  function grad(nx, ny) {
    return {
      gx: (rSDF(nx + EPS, ny) - rSDF(nx - EPS, ny)) / (2 * EPS),
      gy: (rSDF(nx, ny + EPS) - rSDF(nx, ny - EPS)) / (2 * EPS),
    };
  }
  function wp(x, y, r, g) {
    const i = (y * W + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = 0; data[i + 3] = 255;
  }

  const df = depth / 10;
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw; x++) {
      const nx = x / W, ny = y / H;
      const sdf = rSDF(nx, ny);
      if (sdf > 0) {
        wp(x, y, 128, 128);
        wp(W - 1 - x, y, 127, 128);
        wp(x, H - 1 - y, 128, 127);
        wp(W - 1 - x, H - 1 - y, 127, 127);
        continue;
      }
      const bm = Math.sin(-sdf * Math.PI * curvature / 100) * scale * df;
      const { gx, gy } = grad(nx, ny);
      const gl = Math.sqrt(gx * gx + gy * gy) + .0001;
      const dx = (gx / gl) * bm * splay, dy = (gy / gl) * bm;
      const rH = Math.max(0, Math.min(255, Math.round((.5 + dx) * 255)));
      const rV = Math.max(0, Math.min(255, Math.round((.5 + dy) * 255)));
      wp(x, y, rH, rV);
      wp(W - 1 - x, y, 255 - rH, rV);
      wp(x, H - 1 - y, rH, 255 - rV);
      wp(W - 1 - x, H - 1 - y, 255 - rH, 255 - rV);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

// ═══════════════════════════════════════════════════════════════════
//  SVG FILTER BUILDER
// ═══════════════════════════════════════════════════════════════════
let fid = 0;
function buildFilter(id, url, lens) {
  const { W, H, chroma, glow, edgeHighlight, specularAngle } = lens;
  const lx = Math.cos((specularAngle * Math.PI) / 180);
  const ly = -Math.sin((specularAngle * Math.PI) / 180);
  const ds = (lens.scale * lens.depth * 28).toFixed(1);
  return `
  <filter id="${id}" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="linearRGB">
    <feImage id="${id}-img" href="${url}" result="dm" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/>
    <feDisplacementMap in="SourceGraphic" in2="dm" scale="${ds}" xChannelSelector="R" yChannelSelector="G" result="disp"/>
    <feColorMatrix in="disp" type="matrix"
      values="${(1 + chroma * .08).toFixed(3)} 0 0 0 ${(-chroma * .04).toFixed(3)} 0 1 0 0 0 0 0 ${(1 - chroma * .08).toFixed(3)} 0 ${(chroma * .04).toFixed(3)} 0 0 0 1 0"
      result="chr"/>
    <feSpecularLighting in="chr" result="spec" x="0" y="0" width="${W}" height="${H}"
        surfaceScale="4" specularConstant="${edgeHighlight.toFixed(3)}" specularExponent="20" lighting-color="white">
      <fePointLight x="${(W * (.5 + lx * .4)).toFixed(1)}" y="${(H * (.5 + ly * .4) - 60).toFixed(1)}" z="80"/>
    </feSpecularLighting>
    <feComposite in="spec" in2="SourceGraphic" operator="in" result="sm"/>
    <feBlend in="chr" in2="sm" mode="screen"/>
  </filter>`;
}

function esc(s) {
  const str = String(s);
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '&') result += '\x26amp;';
    else if (ch === '<') result += '\x26lt;';
    else if (ch === '>') result += '\x26gt;';
    else result += ch;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════
//  REACT COMPONENT
// ═══════════════════════════════════════════════════════════════════
const ORB_LENS = {
  W: 58, H: 58, borderRadius: 29,
  scale: .10, depth: 10, curvature: 42, splay: 1,
  chroma: .18, glow: .10, edgeHighlight: .22, specularAngle: 45
};

export default function LiquidOrb() {
  const [phase, setPhase] = useState('orb'); // 'orb' | 'pill' | 'chat'
  const [thinking, setThinking] = useState(false);
  const [thinkLabel, setThinkLabel] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [mutPreview, setMutPreview] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [activeAction, setActiveAction] = useState(null);
  const [chatMode, setChatMode] = useState('chat'); // 'edit' | 'chat'
  const [draft, setDraft] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showDebugLog, setShowDebugLog] = useState(false);
  const [dbgEntries, setDbgEntries] = useState([]);

  const [isConfigured, setIsConfigured] = useState(() => {
    try {
      const cfg = loadAIConfig();
      const p = getProviderDef(cfg.provider);
      return !!(cfg.provider && cfg.model && (!p.needsKey || cfg.key));
    } catch { return false; }
  });

  const orbRef = useRef(null);
  const fdefsRef = useRef(null);
  const filterRef = useRef(null);
  const feImgRef = useRef(null);
  const feDispRef = useRef(null);
  const taRef = useRef(null);
  const lensRef = useRef({ ...ORB_LENS });
  const springRef = useRef(makeSpring(ORB_LENS.depth, { k: 300, b: 20, mass: 1 }));
  const featuresRef = useRef({});
  const uiStylesRef = useRef(null);

  // ── Apply orb filter ─────────────────────────────────────────────
  const applyOrbFilter = useCallback((lens) => {
    const url = generateLensMap(lens);
    const id = `lg-f-${++fid}`;
    const fdefs = fdefsRef.current;
    if (!fdefs) return;

    if (!filterRef.current) {
      fdefs.innerHTML = buildFilter(id, url, lens);
      filterRef.current = fdefs.querySelector('filter');
      feImgRef.current = filterRef.current?.querySelector('feImage');
      feDispRef.current = filterRef.current?.querySelector('feDisplacementMap');
      if (orbRef.current) orbRef.current.style.filter = `url(#${id})`;
      return;
    }
    filterRef.current.id = id;
    if (feImgRef.current) {
      feImgRef.current.id = `${id}-img`;
      feImgRef.current.setAttribute('href', url);
    }
    if (feDispRef.current) {
      feDispRef.current.setAttribute('scale', (lens.scale * lens.depth * 28).toFixed(1));
    }
    if (orbRef.current) orbRef.current.style.filter = `url(#${id})`;
  }, []);

  // ── Init spring ──────────────────────────────────────────────────
  useEffect(() => {
    const spring = springRef.current;
    spring.onChange = (d) => {
      lensRef.current.depth = Math.max(.05, d);
      applyOrbFilter({ ...lensRef.current });
    };
    applyOrbFilter(lensRef.current);
    return () => spring.cancel();
  }, [applyOrbFilter]);

  // ── Init debug log capture on mount ──
  useEffect(() => {
    initDebugLog();
    const unsub = onDebugLogChange((entries) => {
      setDbgEntries(entries.slice());
    });
    setDbgEntries(getDebugLog());
    return unsub;
  }, []);

  // ── Load shared config on mount & check if configured ────────────
  useEffect(() => {
    const cfg = loadAIConfig();
    const p = getProviderDef(cfg.provider);
    setIsConfigured(!!cfg.model && (!p.needsKey || !!cfg.key));
  }, []);

  // ── Mutation log helper ──────────────────────────────────────────
  const logMut = useCallback((type, text) => {
    if (text.startsWith('No element:')) return;

    const icons = { add: '✦', rm: '✕', fix: '⬡', sty: '◈', info: '◎' };
    const id = Date.now() + Math.random();
    setLogs(prev => {
      const next = [{ id, type, text, icon: icons[type] || '◎' }, ...prev];
      return next.slice(0, 4);
    });

    setTimeout(() => {
      setLogs(prev => prev.filter(l => l.id !== id));
    }, 4000);

    addDebugEntry(type === 'info' ? 'info' : 'mutation', 'orb', text);
  }, []);

  // ── Orb tap handler ──────────────────────────────────────────────
  const handleOrbTap = useCallback((e) => {
    if (phase !== 'orb') return;
    e.preventDefault?.();
    const rect = orbRef.current?.getBoundingClientRect();
    if (rect) {
      const cx = (e.clientX ?? e.touches?.[0]?.clientX ?? rect.left + rect.width / 2) - rect.left;
      const cy = (e.clientY ?? e.touches?.[0]?.clientY ?? rect.top + rect.height / 2) - rect.top;
      lensRef.current.specularAngle = 45 + (cx / rect.width - .5) * 60 + (cy / rect.height - .5) * 30;
    }
    springRef.current.target = 0;
    setTimeout(() => { springRef.current.target = ORB_LENS.depth; }, 80);

    if (!isConfigured) {
      // Show chat with inline "not configured" message — no settings UI
      setTimeout(() => setPhase('pill'), 200);
    } else {
      setTimeout(() => setPhase('pill'), 200);
    }
  }, [phase, isConfigured]);

  // ── Phase transitions ────────────────────────────────────────────
  const goToPhase = useCallback((next) => {
    setPhase(next);
    if (next === 'orb') {
      setThinking(false);
      setAiResponse('');
      setMutPreview('');
      setActiveAction(null);
    }
  }, []);

  // ── DOM Snapshot builder ─────────────────────────────────────────
  const buildSnapshot = useCallback(() => {
    const cs = getComputedStyle(document.documentElement);
    const cssVars = {};
    ['--bg', '--fg', '--fg2', '--glass-tint', '--glass-border'].forEach(v => {
      cssVars[v] = cs.getPropertyValue(v).trim();
    });

    const domTree = [];
    const walk = (el, depth) => {
      if (depth > 4) return;
      if (!el || el.nodeType !== 1) return;
      const tag = el.tagName?.toLowerCase();
      if (!tag) return;
      const entry = {
        tag,
        id: el.id || undefined,
        classes: el.className && typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean) : undefined,
        text: el.children?.length === 0 ? (el.textContent || '').slice(0, 60) : undefined,
      };
      if (entry.id || entry.classes?.length) {
        domTree.push(entry);
      }
      for (const child of el.children || []) {
        walk(child, depth + 1);
      }
    };
    walk(document.body, 0);

    return {
      cssVars,
      lens: { ...lensRef.current },
      injectedCSS: uiStylesRef.current?.textContent?.slice(0, 600) || '',
      domTree,
    };
  }, []);

  // ── Send handler ─────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const txt = draft.trim();
    if (!txt && attachments.length === 0) return;

    if (/^\/debug\b/i.test(txt)) {
      setDebugMode(m => !m);
      setDraft('');
      logMut('info', debugMode ? 'Debug mode off' : 'Debug mode on — AI will inspect DOM for real fixes');
      return;
    }

    setDraft('');

    const cfg = loadAIConfig();
    if (!cfg.key && getProviderDef(cfg.provider).needsKey) {
      setAiResponse('AI not configured — open Settings → AI Assistant.');
      return;
    }

    setThinking(true);
    setThinkLabel('Reading UI…');
    setAiResponse('');
    setMutPreview('');

    try {
      setThinkLabel(chatMode === 'chat' ? 'Thinking…' : 'Planning edits…');
      const snapshot = chatMode === 'chat' ? null : buildSnapshot();
      const result = await callAI(debugMode ? `[DEBUG MODE] ${txt}` : txt, snapshot, chatMode);

      setThinking(false);
      setMutPreview(
        `<span class="lg-orb-op-fix">${chatMode === 'chat' ? 'RESPONSE' : 'PLAN'}</span> ${esc(result.plan)}\n\n` +
        (result.ops || []).map(op => {
          const cls = op.type.includes('REMOVE') ? 'lg-orb-op-rm'
            : op.type.includes('FIX') || op.type.includes('PATCH') || op.type.includes('REWRITE') ? 'lg-orb-op-fix'
            : op.type.includes('CSS') || op.type.includes('LENS') || op.type.includes('STYLE') ? 'lg-orb-op-sty'
            : 'lg-orb-op-add';
          const s = JSON.stringify(op);
          return `<span class="${cls}">${op.type}</span> ${esc(s.slice(0, 82))}${s.length > 82 ? '…' : ''}`;
        }).join('\n')
      );

      const totalDelay = ((result.ops || []).length * 220) + 400;
      setTimeout(() => {
        execMutations(result.ops || []);
        setTimeout(() => {
          setMutPreview('');
          setAiResponse(result.plan);
        }, totalDelay);
      }, 700);

    } catch (err) {
      setThinking(false);
      setAiResponse(`⚠ ${err.message}`);
      addDebugEntry('error', 'orb.callAI', err.message);
    }
  }, [draft, debugMode, attachments, logMut, goToPhase, chatMode, buildSnapshot]);

  // ── Mutation executor ────────────────────────────────────────────
  const execMutations = useCallback((ops, delay = 220) => {
    (ops || []).forEach((op, i) => setTimeout(() => {
      try { applyOp(op); } catch (e) { console.error('[LG orb]', e); }
    }, i * delay));
  }, []);

  const applyOp = useCallback((op) => {
    switch (op.type) {
      case 'SET_CSS_VAR':
        document.documentElement.style.setProperty(op.variable, op.value);
        logMut('sty', `${op.variable} → ${op.value}`); break;
      case 'SET_CSS':
        if (!uiStylesRef.current) {
          uiStylesRef.current = document.createElement('style');
          uiStylesRef.current.id = 'lg-orb-ai-styles';
          document.head.appendChild(uiStylesRef.current);
        }
        uiStylesRef.current.textContent += '\n' + op.css;
        logMut('sty', 'CSS injected'); break;
      case 'REPLACE_CSS':
        if (!uiStylesRef.current) {
          uiStylesRef.current = document.createElement('style');
          uiStylesRef.current.id = 'lg-orb-ai-styles';
          document.head.appendChild(uiStylesRef.current);
        }
        uiStylesRef.current.textContent = op.css || '';
        logMut('sty', 'CSS replaced'); break;
      case 'MUTATE_LENS': {
        const allowed = ['scale', 'depth', 'curvature', 'splay', 'chroma', 'glow', 'edgeHighlight', 'specularAngle', 'borderRadius'];
        allowed.forEach(k => { if (op.params?.[k] !== undefined) lensRef.current[k] = op.params[k]; });
        applyOrbFilter({ ...lensRef.current });
        logMut('sty', 'Lens updated'); break;
      }
      case 'REWRITE_ORB': {
        if (op.iconSvg) {
          const ic = orbRef.current?.querySelector('.lg-orb-icon');
          if (ic) ic.innerHTML = op.iconSvg;
        }
        if (op.glowColor && uiStylesRef.current) {
          uiStylesRef.current.textContent += `\n.lg-orb-glow{background:radial-gradient(circle,${op.glowColor} 0%,transparent 68%)!important}`;
        }
        logMut('fix', 'Orb updated'); break;
      }
      case 'ADD_FEATURE': {
        const id = op.id || `feat-${Date.now()}`;
        if (document.getElementById(id)) return;
        const w = document.createElement('div'); w.id = id;
        w.innerHTML = op.html || `<div style="position:fixed;top:20px;right:80px;z-index:600;background:rgba(16,16,24,.82);border:1px solid rgba(255,255,255,.09);color:rgba(238,238,248,.82);font-family:'DM Sans',sans-serif;font-size:12px;padding:8px 16px;border-radius:20px;backdrop-filter:blur(20px);">${esc(op.label || 'Feature')}</div>`;
        document.body.appendChild(w);
        featuresRef.current[id] = w;
        logMut('add', `Feature: ${op.label || id}`); break;
      }
      case 'REMOVE_FEATURE': {
        const el = featuresRef.current[op.id];
        if (el) { el.remove(); delete featuresRef.current[op.id]; logMut('rm', `Feature: ${op.id}`); }
        break;
      }
      case 'SHOW_NOTIFICATION': {
        const variants = { success: 'rgba(80,200,120,.75)', error: 'rgba(255,80,80,.75)', info: 'rgba(165,165,185,.55)' };
        const dot = variants[op.variant] || variants.info;
        const n = document.createElement('div');
        n.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(12,12,20,.92);border:1px solid rgba(255,255,255,.09);color:rgba(238,238,248,.88);font-family:'DM Sans',sans-serif;font-size:13px;padding:10px 18px;border-radius:16px;backdrop-filter:blur(20px);box-shadow:0 8px 32px rgba(0,0,0,.4);display:flex;align-items:center;gap:9px;pointer-events:none;`;
        n.innerHTML = `<span style="color:${dot}">✦</span><span>${esc(op.message || '')}</span>`;
        document.body.appendChild(n);
        setTimeout(() => { n.remove(); }, op.duration || 3000);
        break;
      }
      case 'PATCH_ELEMENT': {
        const targets = op.all
          ? [...document.querySelectorAll(op.selector)]
          : [document.querySelector(op.selector)].filter(Boolean);
        if (!targets.length) { logMut('info', `No element: "${op.selector}"`); return; }
        targets.forEach(el => {
          if (op.innerHTML !== undefined) el.innerHTML = op.innerHTML;
          if (op.textContent !== undefined) el.textContent = op.textContent;
          if (op.style) Object.entries(op.style).forEach(([k, v]) => el.style[k] = v);
          if (op.addClass) op.addClass.split(' ').forEach(c => el.classList.add(c));
          if (op.removeClass) op.removeClass.split(' ').forEach(c => el.classList.remove(c));
          const prev = el.style.outline;
          el.style.outline = '2px solid rgba(100,200,140,0.50)';
          setTimeout(() => el.style.outline = prev, 700);
        });
        logMut('fix', `Patched: ${op.selector}`); break;
      }
      case 'APPEND_ELEMENT': {
        const parent = document.querySelector(op.selector);
        if (!parent) { logMut('info', `No element: "${op.selector}"`); return; }
        const tmp = document.createElement('div');
        tmp.innerHTML = op.html || '';
        while (tmp.firstChild) parent.appendChild(tmp.firstChild);
        logMut('add', `Appended to: ${op.selector}`); break;
      }
      case 'REMOVE_ELEMENT': {
        const targets = op.all
          ? [...document.querySelectorAll(op.selector)]
          : [document.querySelector(op.selector)].filter(Boolean);
        if (!targets.length) { logMut('info', `No element: "${op.selector}"`); return; }
        targets.forEach(el => {
          el.style.transition = 'opacity .25s'; el.style.opacity = '0';
          setTimeout(() => el.remove(), 260);
        });
        logMut('rm', `Removed: ${op.selector}`); break;
      }
      case 'EVAL': {
        const code = op.code || '';
        const ok = window.confirm(
          `Allow the AI to run this code on the page?\n\n${code.length > 400 ? code.slice(0, 400) + '…' : code}\n\nOnly confirm if you trust this action.`
        );
        if (!ok) {
          logMut('info', `EVAL cancelled by user`);
          break;
        }
        try {
          // eslint-disable-next-line no-new-func
          const result = new Function(code)();
          logMut('fix', `EVAL OK: ${code.slice(0, 60)}…`);
        } catch (e) {
          logMut('info', `EVAL error: ${e.message}`);
        }
        break;
      }
      case 'PATCH_SOURCE': {
        logMut('fix', `🛠 SOURCE FIX SUGGESTED: ${op.file || 'unknown file'}`);
        if (op.eval) {
          const ok = window.confirm(
            `Allow the AI to apply this hotfix code on the page?\n\n${op.eval.length > 400 ? op.eval.slice(0, 400) + '…' : op.eval}\n\nOnly confirm if you trust this action.`
          );
          if (!ok) {
            logMut('info', `PATCH_SOURCE hotfix cancelled by user`);
          } else {
            try { new Function(op.eval)(); logMut('fix', `Hotfix applied via EVAL`); }
            catch (e) { logMut('info', `Hotfix error: ${e.message}`); }
          }
        }
        console.log('[LG AI PATCH_SOURCE]', JSON.stringify({ file: op.file, find: op.find, replace: op.replace }));
        break;
      }
      default:
        logMut('info', `Unknown op: ${op.type}`);
    }
  }, [applyOrbFilter, logMut]);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <>
      {/* SVG filter definitions */}
      <svg className="lg-orb-svg-defs" aria-hidden="true">
        <defs ref={fdefsRef} />
      </svg>

      {/* AI-injected styles */}
      <style ref={uiStylesRef} id="lg-orb-ai-styles" />

      {/* Backdrop */}
      <div
        className={`lg-orb-bd ${phase !== 'orb' ? 'on' : ''}`}
        onClick={() => goToPhase(phase === 'chat' ? 'pill' : 'orb')}
      />

      {/* Hint */}
      <div className={`lg-orb-hint ${phase !== 'orb' ? 'off' : ''}`}>
        {isConfigured ? 'Tap the orb' : 'Tap to open AI'}
      </div>

      {/* Mutation log */}
      <div className="lg-orb-mlog">
        {logs.map(log => (
          <div key={log.id} className={`lg-orb-log-e t-${log.type}`}>
            <span>{log.icon}</span>
            <span>{log.text}</span>
          </div>
        ))}
      </div>

      {/* ── Root container ── */}
      <div className="lg-orb-root">
        {/* ORB */}
        <div
          ref={orbRef}
          className={`lg-orb ${phase !== 'orb' ? 'hidden' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Open AI assistant"
          onClick={handleOrbTap}
          onTouchStart={(e) => { e.preventDefault(); handleOrbTap(e); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOrbTap(e); }}
          style={{ minHeight: 44, minWidth: 44 }}
        >
          <div className="lg-orb-glow" />
          <div className="lg-orb-glass lg-orb-glass-surf">
            <div className="lg-orb-icon">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
              </svg>
            </div>
            <div className="lg-orb-rim" />
            <div className="lg-orb-sheen" />
          </div>
        </div>

        {/* PILL */}
        <div className={`lg-orb-pill ${phase === 'pill' ? 'visible' : ''}`}>
          <div className="lg-orb-pill-inner lg-orb-glass-surf">
            <button className="lg-orb-pill-brand" onClick={() => goToPhase('chat')}>
              <div className="lg-orb-pill-orb lg-orb-glass-surf">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
                </svg>
                <div className="lg-orb-pill-orb-sheen" />
              </div>
              <span className="lg-orb-pill-label">Looking Glass AI</span>
            </button>
            <div className="lg-orb-pill-divider" />
            <button className="lg-orb-pill-close" onClick={() => goToPhase('orb')} style={{ minHeight: 44, minWidth: 44 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <div className="lg-orb-pill-sheen" />
          </div>
        </div>

        {/* CHAT */}
        <div className={`lg-orb-chat ${phase === 'chat' ? 'visible' : ''}`}>
          <div className="lg-orb-chat-inner lg-orb-glass-surf">
            <div className="lg-orb-chat-sheen" />
            <div className="lg-orb-chat-rim" />

            {/* Not-configured inline message */}
            {!isConfigured && (
              <div style={{
                padding: '12px 14px',
                fontSize: 12,
                color: 'var(--text-secondary)',
                textAlign: 'center',
                borderBottom: '1px solid var(--color-border)',
                lineHeight: 1.5,
              }}>
                AI not configured — open Settings → AI Assistant.
              </div>
            )}

            {/* Mode toggle: Edit UI vs Chat */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 12px 0', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setChatMode('edit')}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.10)', background: chatMode === 'edit' ? 'rgba(255,255,255,0.14)' : 'transparent', color: 'var(--text-primary)', fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: chatMode === 'edit' ? 600 : 400, cursor: 'pointer', minHeight: '44px', minWidth: '44px' }}
              >Edit UI</button>
              <button
                type="button"
                onClick={() => setChatMode('chat')}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.10)', background: chatMode === 'chat' ? 'rgba(255,255,255,0.14)' : 'transparent', color: 'var(--text-primary)', fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: chatMode === 'chat' ? 600 : 400, cursor: 'pointer', minHeight: '44px', minWidth: '44px' }}
              >Chat</button>
            </div>

            {/* Thinking */}
            {thinking && (
              <div className="lg-orb-thinking">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" /></svg>
                <div className="lg-orb-dots"><span /><span /><span /></div>
                <span>{thinkLabel}</span>
              </div>
            )}

            {/* AI Response */}
            {aiResponse && (
              <div className="lg-orb-ai-resp">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" /></svg>
                <span>{aiResponse}</span>
              </div>
            )}

            {/* Mutation preview */}
            {mutPreview && (
              <div className="lg-orb-mut-preview" dangerouslySetInnerHTML={{ __html: mutPreview }} />
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="lg-orb-attachments" style={{ overflowX: 'auto' }}>
                {attachments.map(a => (
                  <div key={a.id} className="lg-orb-att">
                    <img src={a.src} alt={a.name} />
                    <button className="lg-orb-att-rm" style={{ minHeight: 44, minWidth: 44 }} onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="lg-orb-chat-row">
              <textarea
                ref={taRef}
                className="lg-orb-ta"
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={isConfigured ? (debugMode ? 'Debug mode: describe the bug…' : 'Ask AI to change the UI…') : 'Open Settings → AI Assistant to configure'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  if (e.key === 'Escape') { goToPhase('pill'); }
                }}
              />
            </div>

            {/* Toolbar */}
            <div className="lg-orb-toolbar" style={{ flexWrap: 'wrap' }}>
              <div className="lg-orb-tb-l" style={{ flexWrap: 'wrap' }}>
                <button className="lg-orb-tool" style={{ minHeight: 44, minWidth: 44 }} onClick={() => { setDraft(''); goToPhase('pill'); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                <span className="lg-orb-ctx-lbl">
                  {isConfigured
                    ? `${getProviderDef(loadAIConfig().provider).name} · ${loadAIConfig().model || 'no model'}`
                    : 'Not configured'}
                </span>
              </div>
              <div className="lg-orb-tb-r" style={{ flexWrap: 'wrap' }}>
                <button className="lg-orb-tool" style={{ minHeight: 44, minWidth: 44 }} onClick={() => setShowDebugLog(true)} title="Debug Log">
                  <span style={{ fontSize: 11 }}>⚠</span>
                </button>
                <button className="lg-orb-send" style={{ minHeight: 44, minWidth: 44 }} disabled={!draft.trim() && attachments.length === 0} onClick={handleSend}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Debug Log Viewer ── */}
      {showDebugLog && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, height: '100dvh', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          onClick={() => setShowDebugLog(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(560px, 94vw)',
              maxHeight: '80vh',
              background: 'var(--glass-frost)',
              backdropFilter: 'blur(32px) saturate(180%)',
              WebkitBackdropFilter: 'blur(32px) saturate(180%)',
              border: '1px solid var(--color-border)',
              borderRadius: 20,
              boxShadow: '0 24px 80px var(--glass-cast-shadow), inset 0 1px 0 var(--glass-specular)',
              padding: '24px 20px',
              fontFamily: "'DM Sans',system-ui,sans-serif",
              color: 'var(--text-primary)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
                <span>⚠</span>
                <span>Debug Log</span>
                <span style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 400 }}>
                  {dbgEntries.length} entries
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={copyDebugLog}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)',
                    borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                    color: 'var(--text-secondary)', fontSize: 10, fontFamily: "'DM Sans',sans-serif",
                    minHeight: 44, minWidth: 44,
                  }}
                  title="Copy as Markdown"
                >📋 Copy</button>
                <button
                  onClick={downloadDebugLog}
                  style={{
                    background: 'rgba(80,200,120,0.10)', border: '1px solid rgba(80,200,120,0.25)',
                    borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                    color: 'rgba(80,200,120,0.75)', fontSize: 10, fontFamily: "'DM Sans',sans-serif",
                    minHeight: 44, minWidth: 44,
                  }}
                  title="Download as .md file"
                >⬇ Download</button>
                <button
                  onClick={() => { clearDebugLog(); }}
                  style={{
                    background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.18)',
                    borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                    color: 'rgba(255,100,100,0.65)', fontSize: 10, fontFamily: "'DM Sans',sans-serif",
                    minHeight: 44, minWidth: 44,
                  }}
                  title="Clear all entries"
                >✕ Clear</button>
                <button
                  onClick={() => setShowDebugLog(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 10,
                    color: 'var(--text-secondary)', fontSize: 20, lineHeight: 1,
                    minWidth: 44, minHeight: 44,
                  }}
                >×</button>
              </div>
            </div>

            {/* Log entries */}
            <div style={{
              flex: 1, overflow: 'auto', minHeight: 0,
              fontFamily: "'DM Mono',monospace", fontSize: 10, lineHeight: 1.6,
            }}>
              {dbgEntries.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-disabled)', fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>
                  No errors captured yet. Reproduce the issue and check back here.
                  <div style={{ marginTop: 8, fontSize: 10, opacity: 0.6 }}>
                    All runtime errors (window errors, AI call failures, mutation errors) are automatically logged.
                  </div>
                </div>
              ) : (
                dbgEntries.map(e => (
                  <div key={e.id} style={{
                    padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', gap: 6,
                  }}>
                    <span style={{ flexShrink: 0, width: 12 }}>
                      {e.level === 'error' ? '🔴' : e.level === 'warn' ? '🟡' : '🔵'}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-disabled)', fontSize: 9 }}>
                          {new Date(e.time).toLocaleTimeString()}
                        </span>
                        <span style={{
                          color: e.level === 'error' ? 'rgba(255,100,100,0.7)' : 'rgba(255,180,60,0.6)',
                          fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
                        }}>
                          {e.source}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-primary)', wordBreak: 'break-word', marginTop: 1 }}>
                        {e.message}
                      </div>
                      {e.detail?.stack && (
                        <div style={{ color: 'var(--text-disabled)', fontSize: 9, marginTop: 2, whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>
                          {e.detail.stack}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div style={{
              marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border)',
              fontSize: 10, color: 'var(--text-disabled)', textAlign: 'center',
            }}>
              Download the log as .md to share with the AI for diagnosis
            </div>
          </div>
        </div>
      )}
    </>
  );
}
