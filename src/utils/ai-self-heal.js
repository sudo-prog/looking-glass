/**
 * ai-self-heal.js - Self-healing AI capability for Looking Glass
 * 
 * Gives the AI the ability to:
 * 1. Inspect the live DOM (what elements/classes exist)
 * 2. Execute JavaScript fixes in the page
 * 3. Report what it found and fixed
 */

export function buildDomSnapshot(maxDepth = 4) {
  const results = [];
  
  const walk = (el, depth) => {
    if (depth > maxDepth) return;
    if (!el || el.nodeType !== 1) return;
    
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    if (!tag || tag === 'script' || tag === 'style' || tag === 'meta' || tag === 'link') return;
    
    const className = el.getAttribute('class') || '';
    const classes = className ? className.split(/\s+/).filter(c => c.length > 1 && c.length < 40) : [];
    const id = el.id || undefined;
    const text = el.children.length === 0 ? (el.textContent || '').trim().slice(0, 80) : undefined;
    
    let visible = true;
    try {
      const style = window.getComputedStyle(el);
      visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    } catch (_) { /* ignore */ }
    
    if (id || classes.length > 0) {
      results.push({ tag, id, classes: classes.length > 0 ? classes : undefined, text, visible });
    }
    
    for (let i = 0; i < el.children.length; i++) {
      walk(el.children[i], depth + 1);
    }
  };
  
  walk(document.body, 0);
  return results;
}

export function executeSelfHealOp(op) {
  const log = op.log || (() => {});
  
  try {
    switch (op.type) {
      case 'DOM_SNAPSHOT': {
        const snapshot = buildDomSnapshot();
        return { ok: true, result: 'Found ' + snapshot.length + ' elements with id/class', snapshot };
      }
      
      case 'EVAL': {
        if (!op.code) return { ok: false, result: 'No code provided' };
        // eslint-disable-next-line no-new-func
        const fn = new Function(op.code);
        const evalResult = fn();
        const resultStr = evalResult !== undefined ? String(evalResult) : 'executed';
        log('EVAL result: ' + resultStr);
        return { ok: true, result: 'EVAL OK: ' + resultStr };
      }
      
      case 'FIX_NOTIFICATIONS': {
        const selectors = op.selector 
          ? [op.selector] 
          : [
              '[class*="notification"]', '[class*="toast"]', '[class*="alert"]',
              '[role="alert"]', '[role="status"]', '[class*="snackbar"]',
              '.lg-orb-log-e', '.lg-orb-toast',
            ];
        let removed = 0;
        for (const sel of selectors) {
          try {
            document.querySelectorAll(sel).forEach((el) => {
              const style = window.getComputedStyle(el);
              if (style.position === 'fixed' || style.position === 'absolute') {
                el.remove();
                removed++;
              }
            });
          } catch (_) { /* skip invalid selectors */ }
        }
        log('Removed ' + removed + ' stuck notifications');
        return { ok: true, result: 'Removed ' + removed + ' stuck notification elements' };
      }
      
      case 'CLEAR_STALE': {
        const sel = op.selector || '[class*="notification"], [class*="toast"]';
        let removed = 0;
        try {
          document.querySelectorAll(sel).forEach((el) => {
            el.remove();
            removed++;
          });
        } catch (_) { /* skip */ }
        log('Cleared ' + removed + ' elements matching: ' + sel);
        return { ok: true, result: 'Cleared ' + removed + ' elements matching "' + sel + '"' };
      }
      
      default:
        return { ok: false, result: 'Unknown op type: ' + (op.type) };
    }
  } catch (e) {
    return { ok: false, result: 'Error: ' + e.message };
  }
}

export function getSelfHealSystemPrompt() {
  return [
    '',
    '━━━ SELF-HEAL CAPABILITY ━━━',
    'You can fix ANY issue in this app using these operations:',
    '',
    'EVAL - run JavaScript to fix logic/state/DOM issues:',
    '  {"type":"EVAL","code":"document.querySelectorAll(\'.stale\').forEach(el=>el.remove())"}',
    '',
    'DOM_SNAPSHOT - get all elements with their classes/ids:',
    '  {"type":"DOM_SNAPSHOT"}',
    '',
    'FIX_NOTIFICATIONS - auto-dismiss stuck toasts/alerts:',
    '  {"type":"FIX_NOTIFICATIONS"}',
    '  {"type":"FIX_NOTIFICATIONS", "selector":".my-custom-toast"}',
    '',
    'CLEAR_STALE - remove elements matching a CSS selector:',
    '  {"type":"CLEAR_STALE","selector":".error-banner"}',
    '',
    'RULES:',
    '- Always run DOM_SNAPSHOT first to see what exists.',
    '- Use EVAL for logic fixes (state, timers, event handlers).',
    '- Use FIX_NOTIFICATIONS for stuck UI.',
    '- NEVER guess selectors - check DOM_SNAPSHOT output first.',
    ''
  ].join('\n');
}

export function autoFixIssue(issueDescription, log) {
  const lower = issueDescription.toLowerCase();
  
  if (lower.includes('notification') || lower.includes('toast') || lower.includes('stuck') || lower.includes('won') || lower.includes('dismiss')) {
    log('Detected notification/toast issue, running FIX_NOTIFICATIONS...');
    const result = executeSelfHealOp({ type: 'FIX_NOTIFICATIONS', log });
    return result.result;
  }
  
  if (lower.includes('error') || lower.includes('broken') || lower.includes('not working')) {
    log('Taking DOM snapshot for diagnosis...');
    const snapshot = buildDomSnapshot();
    const errorElements = snapshot.filter(el => 
      el.text && /error|fail|warning|invalid/.test(el.text.toLowerCase())
    );
    if (errorElements.length > 0) {
      return 'Found issues: ' + errorElements.slice(0, 3).map(e => e.tag + '#' + (e.id || '') + '.' + (e.classes ? e.classes[0] : '') + ': "' + e.text + '"').join('; ');
    }
    return 'DOM snapshot: ' + snapshot.length + ' elements. No obvious errors.';
  }
  
  return 'Issue noted. Run DOM_SNAPSHOT then EVAL to fix.';
}

export default { buildDomSnapshot, executeSelfHealOp, getSelfHealSystemPrompt, autoFixIssue };