/**
 * LOOKING GLASS — AI Summarise Panel
 * Three AI-powered features in one component:
 *
 *   1. SummariseCard   — right-click a card → summarise its content
 *   2. ClusterInsights — select N cards → find connections between them
 *   3. OrganiseCanvas  — read all cards → return layout + tag suggestions
 *
 * All API calls go through the user's configured provider in localStorage
 * (set via the existing AIModal component). No keys stored server-side.
 *
 * INTEGRATION:
 *   In App.jsx handleContextAction, case 'summarise':
 *     setAISummarise({ item, mode: 'card' });
 *
 *   In App.jsx JSX:
 *     {aiSummarise && (
 *       <AISummarisePanel
 *         mode={aiSummarise.mode}
 *         item={aiSummarise.item}
 *         selectedItems={filteredItems.filter(i => selectedIds.has(i.id))}
 *         allItems={items}
 *         onClose={() => setAISummarise(null)}
 *         onApplyOrganisation={handleApplyOrganisation}
 *         onAddNote={addNote}
 *       />
 *     )}
 *
 *   In LiquidGlassSidebar, AI ORGANISE button:
 *     onClick={() => setAISummarise({ mode: 'organise' })}
 *
 *   In LiquidGlassSidebar, AI CLUSTER button (when selection > 1):
 *     onClick={() => setAISummarise({ mode: 'cluster' })}
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  Sparkle,
  X,
  Copy,
  ArrowsOut,
  Note,
  WarningCircle,
  CircleNotch,
} from '@phosphor-icons/react';

// ─────────────────────────────────────────────────────────────
// AI API CALL
// ─────────────────────────────────────────────────────────────

async function callAI(messages, { signal } = {}) {
  let config;
  try {
    const raw = localStorage.getItem('lg-ai-config') || '{}';
    const parsed = JSON.parse(raw);
    // Deobfuscate (matches AIModal's obfuscate)
    const deob = (enc) => atob(enc).split('').reverse().join('');
    config = {
      provider: parsed.provider || 'anthropic',
      model:    parsed.model    || 'claude-sonnet-4-5',
      key:      parsed.key ? deob(parsed.key) : '',
    };
  } catch {
    throw new Error('No AI provider configured. Open Settings → AI Assistant.');
  }

  if (!config.key) {
    throw new Error('No API key found. Open Settings → AI Assistant to configure.');
  }

  const endpoints = {
    openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions',   headers: { 'Authorization': `Bearer ${config.key}` } },
    openai:     { url: 'https://api.openai.com/v1/chat/completions',       headers: { 'Authorization': `Bearer ${config.key}` } },
    anthropic:  { url: 'https://api.anthropic.com/v1/messages',            headers: { 'x-api-key': config.key, 'anthropic-version': '2023-06-01' } },
    litellm:    { url: `${config.key.startsWith('http') ? config.key : 'http://localhost:4000'}/chat/completions`, headers: { 'Authorization': `Bearer ${config.key}` } },
  };

  const ep = endpoints[config.provider] || endpoints.openrouter;

  // Anthropic uses a different schema
  const isAnthropic = config.provider === 'anthropic';
  const body = isAnthropic
    ? { model: config.model, max_tokens: 1024, messages }
    : { model: config.model, max_tokens: 1024, messages };

  const resp = await fetch(ep.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...ep.headers },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => resp.statusText);
    throw new Error(`AI API error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  // Normalise response
  if (isAnthropic) {
    return data.content?.[0]?.text || '';
  }
  return data.choices?.[0]?.message?.content || '';
}

// ─────────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────

function buildSummarisePrompt(item) {
  const parts = [];
  if (item.content?.title)       parts.push(`Title: ${item.content.title}`);
  if (item.content?.url)         parts.push(`URL: ${item.content.url}`);
  if (item.content?.description) parts.push(`Description: ${item.content.description}`);
  if (item.content?.text) {
    const tmp = document.createElement('div');
    tmp.innerHTML = item.content.text;
    const plain = tmp.textContent?.substring(0, 1000) || '';
    if (plain) parts.push(`Content: ${plain}`);
  }

  return [
    {
      role: 'user',
      content: `Summarise this saved item in 2–3 concise sentences. Focus on why it matters, what it's about, and any key insight. Plain text only, no markdown.

${parts.join('\n')}`,
    },
  ];
}

function buildClusterPrompt(items) {
  const summaries = items.map((item, i) =>
    `${i + 1}. [${item.type}] ${item.content?.title || 'Untitled'}: ${item.content?.description || item.content?.text?.replace(/<[^>]+>/g, '').substring(0, 120) || '(no description)'}`
  );

  return [
    {
      role: 'user',
      content: `I have ${items.length} saved items on my canvas. Analyse them and identify:
1. What themes or topics connect them
2. Any surprising connections or patterns
3. A suggested overall "cluster" name for this group
4. 2–3 actionable insights or questions these items collectively raise

Items:
${summaries.join('\n')}

Respond in plain text, structured with clear sections. Be specific and insightful, not generic.`,
    },
  ];
}

function buildOrganisePrompt(items) {
  const summaries = items.slice(0, 60).map((item) =>
    `ID:${item.id.slice(0,8)} [${item.type}] "${item.content?.title || 'Untitled'}" tags:${(item.meta?.tags || []).join(',')||'none'}`
  );

  return [
    {
      role: 'user',
      content: `I have ${items.length} items on my visual canvas. Analyse them and return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "groups": [
    { "name": "Group Name", "item_ids": ["abc12345", ...], "suggested_color": "#hex" }
  ],
  "new_tags": [
    { "item_id": "abc12345", "tags": ["tag1", "tag2"] }
  ],
  "summary": "2-sentence description of what this canvas contains"
}

Canvas items:
${summaries.join('\n')}`,
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// AI SUMMARISE PANEL COMPONENT
// ─────────────────────────────────────────────────────────────

/**
 * Props:
 *   mode              {'card' | 'cluster' | 'organise'}
 *   item              {CardItem}         (card mode only)
 *   selectedItems     {CardItem[]}       (cluster mode)
 *   allItems          {CardItem[]}       (organise mode)
 *   onClose           {() => void}
 *   onApplyOrganisation {(groups, tags) => void}
 *   onAddNote         {(noteText) => void}
 */
export function AISummarisePanel({
  mode = 'card',
  item,
  selectedItems = [],
  allItems = [],
  onClose,
  onApplyOrganisation,
  onAddNote,
}) {
  const [status,  setStatus]  = useState('idle'); // idle | loading | done | error
  const [result,  setResult]  = useState('');
  const [parsed,  setParsed]  = useState(null);  // for organise mode
  const [copied,  setCopied]  = useState(false);

  const abortRef = useRef(null);

  const titles = {
    card:     item?.content?.title || 'Card',
    cluster:  `${selectedItems.length} Selected Cards`,
    organise: `All ${allItems.length} Cards`,
  };

  const icons = {
    card:     '◎',
    cluster:  '◈',
    organise: '⊛',
  };

  // ── Run AI on mount ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const ctrl    = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      setStatus('loading');
      try {
        let messages;
        if (mode === 'card')     messages = buildSummarisePrompt(item);
        if (mode === 'cluster')  messages = buildClusterPrompt(selectedItems);
        if (mode === 'organise') messages = buildOrganisePrompt(allItems);

        const text = await callAI(messages, { signal: ctrl.signal });
        if (cancelled) return;

        if (mode === 'organise') {
          try {
            const clean = text.replace(/```json|```/g, '').trim();
            const json  = JSON.parse(clean);
            setParsed(json);
            setResult(json.summary || text);
          } catch {
            setResult(text);
          }
        } else {
          setResult(text);
        }
        setStatus('done');
      } catch (err) {
        if (cancelled) return;
        setResult(err.message || 'Unknown error');
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [result]);

  const handleDropToCanvas = useCallback(() => {
    if (!result) return;
    const label = mode === 'card' ? `AI Summary: ${item?.content?.title || 'Card'}` : `AI ${mode === 'cluster' ? 'Cluster' : 'Canvas'} Insight`;
    onAddNote?.(`**${label}**\n\n${result}`);
    onClose();
  }, [result, mode, item, onAddNote, onClose]);

  const handleApply = useCallback(() => {
    if (parsed) {
      onApplyOrganisation?.(parsed.groups || [], parsed.new_tags || []);
    }
    onClose();
  }, [parsed, onApplyOrganisation, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 'calc(var(--z-modal) - 1)',
          background: 'rgba(0,0,0,0.30)',
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label={`AI: ${titles[mode]}`}
        aria-modal="true"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: 'min(420px, calc(100vw - 48px))',
          maxHeight: '70vh',
          zIndex: 'var(--z-modal)',
          borderRadius: '16px',
          background: 'rgba(14,14,14,0.97)',
          backdropFilter: 'blur(40px) saturate(120%)',
          WebkitBackdropFilter: 'blur(40px) saturate(120%)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.10), 0 24px 64px rgba(0,0,0,0.80)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'ai-slide 0.22s cubic-bezier(0.34,1.2,0.64,1) both',
        }}
      >
        <style>{`
          @keyframes ai-slide {
            from { opacity: 0; transform: translateY(16px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0)    scale(1); }
          }
        `}</style>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <Sparkle size={14} weight="regular" style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-disabled)', marginBottom: '2px' }}>
              AI {mode === 'card' ? 'SUMMARY' : mode === 'cluster' ? 'CLUSTER INSIGHTS' : 'CANVAS ORGANISER'}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {icons[mode]} {titles[mode]}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '6px', flexShrink: 0 }}
            aria-label="Close"
          >
            <X size={14} weight="regular" />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {status === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
              <CircleNotch size={16} weight="regular" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}>
                {mode === 'organise' ? 'Analysing canvas…' : 'Thinking…'}
              </span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {status === 'error' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <WarningCircle size={16} weight="regular" style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-accent)', lineHeight: 1.5 }}>
                {result}
              </span>
            </div>
          )}

          {status === 'done' && (
            <>
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.65, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {result}
              </p>

              {/* Organise mode: show proposed groups */}
              {mode === 'organise' && parsed?.groups && parsed.groups.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', letterSpacing: '0.12em', color: 'var(--text-disabled)', marginBottom: '8px', textTransform: 'uppercase' }}>
                    PROPOSED GROUPS ({parsed.groups.length})
                  </div>
                  {parsed.groups.map((group, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        marginBottom: '4px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div
                        style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: group.suggested_color || 'var(--text-secondary)',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>
                        {group.name}
                      </span>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', color: 'var(--text-disabled)' }}>
                        {group.item_ids?.length || 0} cards
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {status === 'done' && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 16px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              flexShrink: 0,
            }}
          >
            <button
              onClick={handleCopy}
              style={footerBtn}
              title="Copy to clipboard"
            >
              <Copy size={12} weight="regular" />
              {copied ? 'COPIED' : 'COPY'}
            </button>

            <button
              onClick={handleDropToCanvas}
              style={footerBtn}
              title="Drop as note card on canvas"
            >
              <Note size={12} weight="regular" />
              DROP TO CANVAS
            </button>

            {mode === 'organise' && parsed && (
              <button
                onClick={handleApply}
                style={{ ...footerBtn, background: 'rgba(255,255,255,0.10)', color: 'var(--text-primary)', flex: 1 }}
                title="Apply organisation to canvas"
              >
                <ArrowsOut size={12} weight="regular" />
                APPLY
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const footerBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  height: '30px',
  padding: '0 12px',
  borderRadius: '7px',
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-ui)',
  fontSize: '9px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'background 0.12s ease, color 0.12s ease',
};

export default AISummarisePanel;
