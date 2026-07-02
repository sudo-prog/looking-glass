/**
 * LOOKING GLASS — Liquid AI Orb
 * A floating glass orb at the bottom center of the screen.
 * First click shows centered floating setup dialog (API key + model).
 * After setup, opens the pill then full AI chat.
 * Uses the shared AI config from aiConfig.js (same key as SettingsPanel).
 * Supports ALL providers: OpenRouter, Anthropic, OpenAI, Gemini, Groq, Ollama, LiteLLM
 * + custom model IDs for any provider.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { getProviders, loadAIConfig, saveAIConfig, getProviderDef, addCustomProvider, removeCustomProvider, refreshProviders } from '../utils/aiConfig.js';
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
  {"type":"PATCH_SOURCE","file":"src/ui/LiquidOrb.jsx","find":"const [logs, setLogs] = useState([])","replace":"const [logs, setLogs] = useState([]);\n  // Auto-clear logs after 5s\n  useEffect(() => { const t = setInterval(()=>setLogs(p=>p.slice(0,2)), 5000); return ()=>clearInterval(t); }, []);"}
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
//  MULTI-PROVIDER AI CALLER
// ═══════════════════════════════════════════════════════════════════
async function callAI(userMsg, snapshot) {
  const cfg = loadAIConfig();
  const pid = cfg.provider;
  const p = getProviderDef(pid);
  const key = cfg.key;
  const model = cfg.model;

  if (!model) throw new Error(`No model selected — configure AI in settings`);
  if (p.needsKey && !key) throw new Error(`No API key — add your ${p.name} key in settings`);

  const prompt = `User instruction: "${userMsg}"\n\nCurrent UI snapshot:\n${JSON.stringify(snapshot, null, 2)}`;

  // ── Anthropic Messages API ───────────────────────────────────────
  if (pid === 'anthropic') {
    const r = await fetch(p.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: 2000, system: SYS, messages: [{ role: 'user', content: prompt }] })
    });
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text().catch(() => ''))}`);
    const d = await r.json();
    return parseJSON(d.content?.map(b => b.text || '').join('') || '');
  }

  // ── Google Gemini ────────────────────────────────────────────────
  if (pid === 'google') {
    const url = p.baseURL.replace('{model}', model) + `?key=${key}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYS }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.3 },
      })
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text().catch(() => ''))}`);
    const d = await r.json();
    return parseJSON(d.candidates?.[0]?.content?.parts?.[0]?.text || '');
  }

  // ── OpenAI-compatible: OpenAI / Groq / OpenRouter / Ollama / LiteLLM ────
  const headers = { 'Content-Type': 'application/json' };
  if (key) headers['Authorization'] = `Bearer ${key}`;
  if (pid === 'openrouter') {
    headers['HTTP-Referer'] = 'https://looking-glass.app';
    headers['X-Title'] = 'Looking Glass';
  }

  const r = await fetch(p.baseURL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYS },
        { role: 'user', content: prompt },
      ]
    })
  });
  if (!r.ok) throw new Error(`${p.name} ${r.status}: ${(await r.text().catch(() => ''))}`);
  const d = await r.json();
  const content = d.choices?.[0]?.message?.content || '';
  try {
    const parsed = parseJSON(content);
    return {
      plan: parsed.plan || content || 'AI plan missing',
      ops: Array.isArray(parsed.ops) ? parsed.ops : [],
    };
  } catch (e) {
    return { plan: content || 'AI response could not be parsed', ops: [] };
  }
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

const ACTIONS = ['Fix errors', 'Add feature', 'Change theme', 'Edit self'];

export default function LiquidOrb() {
  const [phase, setPhase] = useState('orb'); // 'orb' | 'pill' | 'chat'
  const [showSetup, setShowSetup] = useState(false); // centered setup dialog
  const [thinking, setThinking] = useState(false);
  const [thinkLabel, setThinkLabel] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [mutPreview, setMutPreview] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [activeAction, setActiveAction] = useState(null);
  const [logs, setLogs] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Settings state — read from shared config
  const [cfgProvider, setCfgProvider] = useState('openrouter');
  const [cfgModel, setCfgModel] = useState('');
  const [cfgKey, setCfgKey] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [cfgStatus, setCfgStatus] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  // Custom provider add form
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderIcon, setNewProviderIcon] = useState('');
  const [newProviderURL, setNewProviderURL] = useState('');
  const [newProviderModels, setNewProviderModels] = useState('');
  const [newProviderNeedsKey, setNewProviderNeedsKey] = useState(true);

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

  // ── Load shared config on mount & check if configured ────────────
  useEffect(() => {
    const cfg = loadAIConfig();
    setCfgProvider(cfg.provider);
    setCfgModel(cfg.model);
    setCfgKey(cfg.key);
    setCustomModel(cfg.model);
    // Check if we have a model and key (if needed)
    const p = getProviderDef(cfg.provider);
    const hasConfig = !!cfg.model && (!p.needsKey || !!cfg.key);
    setIsConfigured(hasConfig);
  }, []);

  // ── Mutation log helper ──────────────────────────────────────────
  const logMut = useCallback((type, text) => {
    // Suppress "No element" noise from AI trying to patch non-existent selectors
    if (text.startsWith('No element:')) return;

    const icons = { add: '✦', rm: '✕', fix: '⬡', sty: '◈', info: '◎' };
    const id = Date.now() + Math.random();
    setLogs(prev => {
      const next = [{ id, type, text, icon: icons[type] || '◎' }, ...prev];
      return next.slice(0, 4);
    });

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setLogs(prev => prev.filter(l => l.id !== id));
    }, 4000);
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

    // Check if configured — if not, show setup dialog
    if (!isConfigured) {
      setTimeout(() => setShowSetup(true), 200);
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

  // ── Setup save handler ───────────────────────────────────────────────
  const handleSaveSetup = useCallback(() => {
    const p = getProviderDef(cfgProvider);
    const modelToSave = cfgModel === 'custom' || (!p.models.includes(cfgModel) && cfgModel !== p.models[0])
      ? customModel
      : cfgModel;
    const finalModel = modelToSave || p.models[0];
    saveAIConfig({ provider: cfgProvider, model: finalModel, key: cfgKey });
    setCfgModel(finalModel);
    setCfgStatus(`✓ ${p.name} · ${finalModel}`);
    logMut('fix', `${p.name} settings saved`);
    setIsConfigured(true);
    setShowSetup(false);
    // Open the pill after setup
    setTimeout(() => setPhase('pill'), 200);
  }, [cfgProvider, cfgModel, cfgKey, customModel, logMut]);

  const handleClearKey = useCallback(() => {
    setCfgKey('');
    saveAIConfig({ provider: cfgProvider, model: cfgModel, key: '' });
    setIsConfigured(false);
    logMut('rm', `Key cleared`);
  }, [cfgProvider, cfgModel, logMut]);

  // ── Add custom provider handler ──
  const handleAddCustomProvider = useCallback(() => {
    if (!newProviderName.trim() || !newProviderURL.trim()) return;
    const models = newProviderModels.split(',').map(s => s.trim()).filter(Boolean);
    const id = addCustomProvider({
      name: newProviderName.trim(),
      icon: newProviderIcon.trim() || '⊕',
      baseURL: newProviderURL.trim(),
      models: models.length > 0 ? models : ['custom-model'],
      needsKey: newProviderNeedsKey,
      showBaseURL: true,
    });
    // Refresh providers and switch to the new one
    refreshProviders();
    setCfgProvider(id);
    setCfgModel(models.length > 0 ? models[0] : 'custom-model');
    setCustomModel('');
    setShowAddProvider(false);
    setNewProviderName('');
    setNewProviderIcon('');
    setNewProviderURL('');
    setNewProviderModels('');
    setNewProviderNeedsKey(true);
    logMut('add', `Added provider: ${newProviderName}`);
  }, [newProviderName, newProviderIcon, newProviderURL, newProviderModels, newProviderNeedsKey, logMut]);

  // ── Remove custom provider handler ──
  const handleRemoveProvider = useCallback((pid) => {
    if (!confirm(`Remove "${getProviders()[pid]?.name}"? This will remove it from the list.`)) return;
    removeCustomProvider(pid);
    // If we removed the active provider, switch to openrouter
    if (cfgProvider === pid) {
      setCfgProvider('openrouter');
      setCfgModel('anthropic/claude-sonnet-4-5');
      setCfgKey('');
      setCustomModel('');
    }
    logMut('rm', `Removed provider: ${getProviders()[pid]?.name || pid}`);
  }, [cfgProvider, logMut]);

  // ── Settings panel (in-orb) ──────────────────────────────
  const handleSaveSettings = useCallback(() => {
    const p = getProviderDef(cfgProvider);
    const modelToSave = cfgModel === 'custom' || (!p.models.includes(cfgModel) && cfgModel !== p.models[0])
      ? customModel
      : cfgModel;
    const finalModel = modelToSave || p.models[0];
    saveAIConfig({ provider: cfgProvider, model: finalModel, key: cfgKey });
    setCfgModel(finalModel);
    setCfgStatus(`✓ ${p.name} · ${finalModel}`);
    logMut('fix', `${p.name} settings saved`);
    setIsConfigured(true);
    setSettingsOpen(false);
  }, [cfgProvider, cfgModel, cfgKey, customModel, logMut]);

  // ── Send handler ─────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const txt = taRef.current?.value?.trim();
    if (!txt && attachments.length === 0) return;

    const cfg = loadAIConfig();
    if (!cfg.key && getProviderDef(cfg.provider).needsKey) {
      setSettingsOpen(true);
      logMut('info', `Add your ${getProviderDef(cfg.provider).name} API key first (⚙ button)`);
      return;
    }

    setThinking(true);
    setThinkLabel('Reading UI…');
    setAiResponse('');
    setMutPreview('');

    try {
      setThinkLabel('Planning edits…');
      const snapshot = buildSnapshot();
      const result = await callAI(txt, snapshot);

      setThinking(false);
      // Show mutation preview
      setMutPreview(
        `<span class="lg-orb-op-fix">PLAN</span> ${esc(result.plan)}\n\n` +
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
          setTimeout(() => {
            setThinking(false);
            setAiResponse('');
            setMutPreview('');
            goToPhase('pill');
          }, 2800);
        }, totalDelay);
      }, 700);

    } catch (err) {
      setThinking(false);
      setAiResponse(`⚠ ${err.message}`);
      if (err.message.includes('key') || err.message.includes('401')) {
        setTimeout(() => setSettingsOpen(true), 400);
      }
    }
  }, [attachments, logMut, goToPhase]);

  // ── DOM Snapshot builder ─────────────────────────────────────────
  const buildSnapshot = useCallback(() => {
    const cs = getComputedStyle(document.documentElement);
    const cssVars = {};
    ['--bg', '--fg', '--fg2', '--glass-tint', '--glass-border'].forEach(v => {
      cssVars[v] = cs.getPropertyValue(v).trim();
    });

    // Build DOM tree snapshot — list all elements with id/tag/classes
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
      // Only include if it has an id or classes (useful for targeting)
      if (entry.id || entry.classes?.length) {
        domTree.push(entry);
      }
      // Walk children
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
        try {
          // eslint-disable-next-line no-new-func
          const result = new Function(op.code)();
          logMut('fix', `EVAL OK: ${op.code.slice(0, 60)}…`);
        } catch (e) {
          logMut('info', `EVAL error: ${e.message}`);
        }
        break;
      }
      case 'PATCH_SOURCE': {
        // Log source code fix suggestion + apply EVAL as hotfix immediately
        logMut('fix', `� SOURCE FIX SUGGESTED: ${op.file || 'unknown file'}`);
        // Also try to apply the fix immediately via EVAL if 'replace' is provided
        if (op.eval) {
          try { new Function(op.eval)(); logMut('fix', `Hotfix applied via EVAL`); }
          catch (e) { logMut('info', `Hotfix error: ${e.message}`); }
        }
        // The actual source code change should be committed by the developer
        console.log('[LG AI PATCH_SOURCE]', JSON.stringify({ file: op.file, find: op.find, replace: op.replace }));
        break;
      }
      default:
        logMut('info', `Unknown op: ${op.type}`);
    }
  }, [applyOrbFilter, logMut]);

  // ── Render ───────────────────────────────────────────────────────
  const providerDef = getProviderDef(cfgProvider);
  const modelOptions = [...providerDef.models, 'custom'];

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
        {isConfigured ? 'Tap the orb' : 'Tap to set up AI'}
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
            <div className="lg-orb-pill-actions">
              {ACTIONS.map(a => (
                <button
                  key={a}
                  className={`lg-orb-pill-action ${activeAction === a ? 'active' : ''}`}
                  onClick={() => {
                    setActiveAction(a === activeAction ? null : a);
                    goToPhase('chat');
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
            <button className="lg-orb-pill-close" onClick={() => goToPhase('orb')}>
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
              <div className="lg-orb-attachments">
                {attachments.map(a => (
                  <div key={a.id} className="lg-orb-att">
                    <img src={a.src} alt={a.name} />
                    <button className="lg-orb-att-rm" onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}>×</button>
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
                placeholder={activeAction === 'Edit self' ? 'Describe what to change about the UI…' : 'Ask AI to change the UI…'}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSend(); }
                  if (e.key === 'Escape') { goToPhase('pill'); }
                }}
              />
            </div>

            {/* Toolbar */}
            <div className="lg-orb-toolbar">
              <div className="lg-orb-tb-l">
                <button className="lg-orb-tool" onClick={() => { taRef.current.value = ''; goToPhase('pill'); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                <button className="lg-orb-tool" onClick={() => setSettingsOpen(true)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                </button>
                <span className="lg-orb-ctx-lbl">
                  {providerDef.name} · {cfgModel || 'no model'}
                </span>
              </div>
              <div className="lg-orb-tb-r">
                <button className="lg-orb-send" disabled={!taRef.current?.value?.trim()} onClick={handleSend}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Centered Setup Dialog (first-time) ── */}
      {showSetup && (
        <div
          className="lg-orb-setup-overlay"
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.50)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowSetup(false)}
        >
          <div
            className="lg-orb-setup-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(420px, 92vw)',
              background: 'var(--glass-frost)',
              backdropFilter: 'blur(32px) saturate(180%)',
              WebkitBackdropFilter: 'blur(32px) saturate(180%)',
              border: '1px solid var(--color-border)',
              borderRadius: '24px',
              boxShadow: '0 24px 80px var(--glass-cast-shadow), inset 0 1px 0 var(--glass-specular)',
              padding: '28px 24px',
              fontFamily: "'DM Sans',system-ui,sans-serif",
              color: 'var(--text-primary)',
            }}
          >
            {/* Title */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 600,
                letterSpacing: '-0.01em',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
                </svg>
                AI Assistant Setup
              </div>
              <button
                onClick={() => setShowSetup(false)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-secondary)',
                  cursor: 'pointer', padding: 4, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Provider tabs */}
            <div style={{
              display: 'flex', gap: 4, marginBottom: 16, padding: 3,
              background: 'rgba(255,255,255,0.04)', borderRadius: 12, flexWrap: 'wrap',
            }}>
              {Object.entries(getProviders()).map(([pid, p]) => {
                const active = pid === cfgProvider;
                const isCustom = !p.builtin;
                return (
                  <div key={pid} style={{ position: 'relative', flex: '1 0 auto' }}>
                    <button style={{
                      width: '100%', background: active ? 'rgba(255,255,255,0.10)' : 'none',
                      border: 'none', borderRadius: 9, padding: '6px 8px', cursor: 'pointer',
                      fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: active ? 600 : 400,
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }} onClick={() => {
                      setCfgProvider(pid);
                      setCfgModel(getProviders()[pid].models[0]);
                      setCustomModel('');
                    }}>
                      <span style={{ marginRight: 4 }}>{p.icon}</span>{p.name}
                    </button>
                    {isCustom && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveProvider(pid); }}
                        style={{
                          position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                          borderRadius: '50%', border: 'none', background: 'rgba(255,60,60,0.6)',
                          color: '#fff', fontSize: 10, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          lineHeight: 1, padding: 0, zIndex: 10,
                        }}
                        title={`Remove ${p.name}`}
                      >×</button>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => setShowAddProvider(v => !v)}
                style={{
                  flex: '0 0 auto', width: 32, height: 32,
                  border: '1px dashed var(--color-border)', borderRadius: 9,
                  background: 'transparent', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
                  fontSize: 14, fontFamily: "'DM Sans',sans-serif",
                }}
                title="Add custom LLM / API"
              >+</button>
            </div>

            {/* Add custom provider form */}
            {showAddProvider && (
              <div style={{
                marginBottom: 16, padding: '12px 14px', borderRadius: 12,
                border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.03)',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-disabled)', textTransform: 'uppercase' }}>Add Custom Provider</div>
                <input type="text" placeholder="Provider name (e.g. Local LLM)" value={newProviderName}
                  onChange={e => setNewProviderName(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', fontFamily: "'DM Sans',sans-serif", fontSize: 11, outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="text" placeholder="Icon (emoji, e.g. 🤖)" value={newProviderIcon} style={{ width: 50, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', fontSize: 11, outline: 'none', textAlign: 'center' }} onChange={e => setNewProviderIcon(e.target.value)} />
                  <input type="text" placeholder="API endpoint URL" value={newProviderURL} style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', fontFamily: "'DM Mono',monospace", fontSize: 11, outline: 'none' }} onChange={e => setNewProviderURL(e.target.value)} />
                </div>
                <input type="text" placeholder="Models (comma-separated, e.g. model-a, model-b)" value={newProviderModels}
                  onChange={e => setNewProviderModels(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', fontFamily: "'DM Mono',monospace", fontSize: 11, outline: 'none' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={newProviderNeedsKey} onChange={e => setNewProviderNeedsKey(e.target.checked)} />
                  Requires API key
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleAddCustomProvider} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none', background: 'var(--color-accent, #8B5CF6)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans',sans-serif" }}>Add Provider</button>
                  <button onClick={() => setShowAddProvider(false)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Model select */}
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Model</div>
            <select
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
                borderRadius: 10, padding: '8px 10px', color: 'var(--text-primary)',
                fontFamily: "'DM Sans',sans-serif", fontSize: 12, outline: 'none',
                marginBottom: 14, appearance: 'none', cursor: 'pointer',
              }}
              value={cfgModel}
              onChange={(e) => {
                setCfgModel(e.target.value);
                if (e.target.value === 'custom') setCustomModel('');
              }}
            >
              {providerDef.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value="custom">Custom model ID…</option>
            </select>

            {/* Custom model input */}
            {(cfgModel === 'custom' || !providerDef.models.includes(cfgModel)) && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Custom model ID</div>
                <input type="text" placeholder="e.g. llama-3.3-70b-versatile" value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
                    borderRadius: 10, padding: '8px 10px', color: 'var(--text-primary)',
                    fontFamily: "'DM Mono',monospace", fontSize: 11, outline: 'none',
                  }}
                />
              </div>
            )}

            {/* API Key */}
            {providerDef.needsKey && (
              <>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{providerDef.keyLabel}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 14 }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder={providerDef.keyPlaceholder}
                    value={cfgKey}
                    onChange={(e) => setCfgKey(e.target.value)}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
                      borderRadius: 10, padding: '8px 10px', color: 'var(--text-primary)',
                      fontFamily: "'DM Mono',monospace", fontSize: 11, outline: 'none',
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSetup(); }}
                  />
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4, opacity: 0.6 }}
                    onClick={() => setShowKey(v => !v)}>
                    {showKey ? '🙈' : '👁'}
                  </button>
                </div>
              </>
            )}

            {cfgProvider === 'ollama' && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Endpoint</div>
                <input type="text" placeholder="http://localhost:11434"
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
                    borderRadius: 10, padding: '8px 10px', color: 'var(--text-primary)',
                    fontFamily: "'DM Mono',monospace", fontSize: 11, outline: 'none',
                  }}
                />
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button style={{
                flex: 1, background: 'var(--color-accent, #8B5CF6)', color: '#fff',
                border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500,
              }} onClick={handleSaveSetup}>
                Save & Continue
              </button>
              <button style={{
                background: 'transparent', color: 'var(--text-secondary)',
                border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                fontFamily: "'DM Sans',sans-serif", fontSize: 13,
              }} onClick={() => setShowSetup(false)}>
                Later
              </button>
            </div>

            {/* Hint */}
            <div style={{
              marginTop: 14, fontSize: 11, color: 'var(--text-disabled)',
              textAlign: 'center', letterSpacing: '0.02em',
            }}>
              You can change these anytime in the settings cog
            </div>
          </div>
        </div>
      )}

      {/* ── In-orb Settings Panel (small floating) ── */}
      {settingsOpen && (
        <div
          className="lg-orb-settings-panel visible"
          style={{
            position: 'fixed', top: 60, right: 18, zIndex: 900,
            background: 'var(--glass-frost)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '1px solid var(--color-border)',
            borderRadius: 20, padding: '20px 18px', width: 310,
            boxShadow: '0 20px 60px var(--glass-cast-shadow), inset 0 1px 0 var(--glass-specular)',
            fontFamily: "'DM Sans',system-ui,sans-serif",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-disabled)', marginBottom: 14 }}>AI Provider</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, padding: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 12, flexWrap: 'wrap' }}>
            {Object.entries(getProviders()).map(([pid, p]) => {
              const active = pid === cfgProvider;
              const isCustom = !p.builtin;
              return (
                <div key={pid} style={{ position: 'relative', flex: '1 0 auto' }}>
                  <button style={{
                    width: '100%', background: active ? 'rgba(255,255,255,0.10)' : 'none',
                    border: 'none', borderRadius: 9, padding: '5px 6px', cursor: 'pointer',
                    fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: active ? 600 : 400,
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }} onClick={() => {
                    setCfgProvider(pid);
                    setCfgModel(getProviders()[pid].models[0]);
                    setCustomModel('');
                  }}>
                    <div style={{ fontSize: 13, marginBottom: 2 }}>{p.icon}</div>{p.name}
                  </button>
                  {isCustom && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveProvider(pid); }}
                      style={{
                        position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                        borderRadius: '50%', border: 'none', background: 'rgba(255,60,60,0.6)',
                        color: '#fff', fontSize: 10, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1, padding: 0, zIndex: 10,
                      }}
                      title={`Remove ${p.name}`}
                    >×</button>
                  )}
                </div>
              );
            })}
            <button
              onClick={() => { setSettingsOpen(false); setShowAddProvider(true); setShowSetup(true); }}
              style={{
                flex: '0 0 auto', width: 28, height: 28,
                border: '1px dashed var(--color-border)', borderRadius: 9,
                background: 'transparent', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
                fontSize: 13, fontFamily: "'DM Sans',sans-serif",
              }}
              title="Add custom LLM / API"
            >+</button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Model</div>
          <select
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
              borderRadius: 10, padding: '8px 10px', color: 'var(--text-primary)',
              fontFamily: "'DM Sans',sans-serif", fontSize: 12, outline: 'none',
              marginBottom: 14, appearance: 'none', cursor: 'pointer',
            }}
            value={cfgModel}
            onChange={(e) => {
              setCfgModel(e.target.value);
              if (e.target.value === 'custom') setCustomModel('');
            }}
          >
            {providerDef.models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
            <option value="custom">Custom model ID…</option>
          </select>

          {(cfgModel === 'custom' || !providerDef.models.includes(cfgModel)) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Custom model ID</div>
              <input type="text" placeholder="e.g. llama-3.3-70b-versatile" value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
                  borderRadius: 10, padding: '8px 10px', color: 'var(--text-primary)',
                  fontFamily: "'DM Mono',monospace", fontSize: 11, outline: 'none',
                }}
              />
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{providerDef.keyLabel}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 14 }}>
            <input
              type={showKey ? 'text' : 'password'}
              placeholder={providerDef.keyPlaceholder}
              value={cfgKey}
              onChange={(e) => setCfgKey(e.target.value)}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
                borderRadius: 10, padding: '8px 10px', color: 'var(--text-primary)',
                fontFamily: "'DM Mono',monospace", fontSize: 11, outline: 'none',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSettings(); if (e.key === 'Escape') setSettingsOpen(false); }}
            />
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4, opacity: 0.6 }}
              onClick={() => setShowKey(v => !v)}>
              {showKey ? '🙈' : '👁'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button style={{
              flex: 1, background: 'var(--color-accent, #8B5CF6)', color: '#fff',
              border: 'none', borderRadius: 10, padding: '9px 12px', cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 500,
            }} onClick={handleSaveSettings}>Save</button>
            <button style={{
              background: 'rgba(255,80,80,0.10)', color: 'rgba(255,100,100,0.75)',
              border: '1px solid rgba(255,80,80,0.18)', borderRadius: 10, padding: '9px 12px', cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif", fontSize: 12,
            }} onClick={handleClearKey}>Clear</button>
          </div>

          <div style={{
            fontSize: 11, color: cfgKey ? 'rgba(80,200,120,0.60)' : 'rgba(255,140,80,0.65)',
            lineHeight: 1.55, paddingTop: 10, borderTop: '1px solid var(--color-border)',
          }}>
            {cfgKey
              ? `✓ ${providerDef.name} · ${cfgModel || 'no model'}`
              : providerDef.needsKey ? `⚠ No API key set for ${providerDef.name}` : `${providerDef.name} · no key needed`
            }
          </div>
        </div>
      )}
    </>
  );
}