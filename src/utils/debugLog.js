/**
 * LOOKING GLASS — Debug Log
 * Captures all runtime errors (window errors, unhandled rejections, AI call failures,
 * mutation errors) into an in-memory log that can be viewed in the settings panel
 * and exported as a .md file for debugging.
 */

const MAX_LOG = 200;
let _entries = [];
let _listeners = [];

function notify() {
  _listeners.forEach(fn => fn(_entries));
}

/**
 * Add an entry to the debug log.
 * @param {'error'|'warn'|'info'} level
 * @param {string} source  - e.g. 'handleSend', 'applyOp', 'window_error'
 * @param {string} message
 * @param {object} [detail] - optional structured data (stack, state, etc.)
 */
export function addDebugEntry(level, source, message, detail) {
  const entry = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    time: new Date().toISOString(),
    level,
    source,
    message: String(message).slice(0, 2000),
    detail: detail || null,
  };
  _entries = [..._entries.slice(-(MAX_LOG - 1)), entry];
  notify();
  return entry;
}

/** Get all current entries (immutable snapshot). */
export function getDebugLog() {
  return _entries.slice();
}

/** Clear all entries. */
export function clearDebugLog() {
  _entries = [];
  notify();
}

/** Subscribe to log changes. Returns unsubscribe function. */
export function onDebugLogChange(fn) {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter(f => f !== fn);
  };
}

/**
 * Export the log as a Markdown string suitable for pasting to an AI assistant.
 */
export function exportDebugLogMD() {
  const lines = [];
  lines.push('# Looking Glass — Debug Log');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total entries: ${_entries.length}`);
  lines.push('');

  if (_entries.length === 0) {
    lines.push('_No errors captured yet._');
    lines.push('');
    lines.push('### How to capture errors');
    lines.push('1. Keep this panel open while reproducing the issue.');
    lines.push('2. All runtime errors (window errors, AI call failures, mutation errors) are automatically captured.');
    lines.push('3. Download this file and share it with the AI assistant for diagnosis.');
    lines.push('');
    return lines.join('\n');
  }

  // Group by source for readability
  const bySource = {};
  _entries.forEach(e => {
    if (!bySource[e.source]) bySource[e.source] = [];
    bySource[e.source].push(e);
  });

  Object.entries(bySource).forEach(([source, entries]) => {
    lines.push(`## ${source} (${entries.length})`);
    lines.push('');
    entries.forEach(e => {
      const icon = e.level === 'error' ? '🔴' : e.level === 'warn' ? '🟡' : '🔵';
      lines.push(`### ${icon} ${e.time}`);
      lines.push('');
      lines.push(`**Level:** ${e.level}`);
      lines.push(`**Message:** ${e.message}`);
      if (e.detail) {
        const detailStr = typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail, null, 2);
        lines.push('```json');
        lines.push(detailStr);
        lines.push('```');
      }
      lines.push('');
    });
  });

  lines.push('---');
  lines.push('_End of debug log_');
  return lines.join('\n');
}

/**
 * Download the debug log as a .md file.
 */
export function downloadDebugLog() {
  const md = exportDebugLogMD();
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `looking-glass-debug-${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy the debug log to clipboard as Markdown.
 */
export function copyDebugLog() {
  const md = exportDebugLogMD();
  navigator.clipboard.writeText(md).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = md;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ── Auto-install global error handlers ──────────────────────────────
let _initialised = false;

export function initDebugLog() {
  if (_initialised || typeof window === 'undefined') return;
  _initialised = true;

  window.addEventListener('error', (event) => {
    const isResourceError = !event.error && event.target && event.target !== window;
    if (isResourceError) return;
    addDebugEntry('error', 'window_error', event.message || 'Script error', {
      filename: event.filename,
      line: event.lineno,
      col: event.colno,
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    addDebugEntry('error', 'unhandled_rejection',
      reason?.message || (typeof reason === 'string' ? reason : 'Unhandled promise rejection'),
      { stack: reason?.stack, type: typeof reason }
    );
  });

  // Patch console.error to capture manual errors
  const origConsoleError = console.error;
  console.error = function (...args) {
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    addDebugEntry('error', 'console.error', msg.slice(0, 2000));
    origConsoleError.apply(console, args);
  };
}