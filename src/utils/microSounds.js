/**
 * LOOKING GLASS — Micro-sounds (Phase 4)
 * Subtle audio feedback for card create / delete / drop.
 *
 * Design constraints:
 *  - NO external assets. Every sound is a short Web Audio API oscillator blip.
 *  - Latency budget <5ms of main-thread work. Nothing here touches React,
 *    IndexedDB or the DOM; the whole play path is a handful of AudioNode
 *    allocations and returns immediately.
 *  - OPT-IN. Disabled by default (see SOUND_DEFAULTS.enabled = false); the
 *    user turns it on from Settings → Theme → MICRO-SOUNDS.
 *  - Silent + inert when Web Audio is unavailable (SSR, old browsers, tests).
 *    Every entry point is wrapped so a sound can never break an action.
 */
import { addDebugEntry } from './debugLog.js';

const STORAGE_KEY = 'lg-micro-sounds';

export const SOUND_DEFAULTS = {
  enabled: false,   // opt-in — never surprises the user with audio
  volume: 0.18,     // deliberately quiet; these are UI ticks, not music
};

/**
 * Named blips. Each is a list of oscillator voices scheduled back-to-back.
 * `f0`/`f1` are start/end frequencies in Hz (f0 === f1 = steady tone),
 * `dur` in seconds, `delay` offsets a voice within the blip.
 */
export const SOUNDS = {
  // Card created — small rising two-note "pip"
  create: [
    { type: 'sine',     f0: 880,  f1: 1180, dur: 0.045, delay: 0,    gain: 1.0 },
    { type: 'sine',     f0: 1320, f1: 1320, dur: 0.040, delay: 0.035, gain: 0.7 },
  ],
  // Card deleted — soft falling two-note "thunk"
  delete: [
    { type: 'triangle', f0: 520, f1: 380,  dur: 0.055, delay: 0,    gain: 0.9 },
    { type: 'sine',     f0: 240, f1: 190,  dur: 0.050, delay: 0.030, gain: 0.6 },
  ],
  // Card dropped — short low "thock", single voice
  drop: [
    { type: 'sine',     f0: 300,  f1: 210,  dur: 0.038, delay: 0,    gain: 0.85 },
  ],
};

// ── Config persistence ────────────────────────────────────────────

export function loadSoundConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...SOUND_DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...SOUND_DEFAULTS, ...parsed };
  } catch {
    return { ...SOUND_DEFAULTS };
  }
}

export function saveSoundConfig(config) {
  const merged = { ...SOUND_DEFAULTS, ...config };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* private mode / quota — in-memory setting still applies this session */
  }
  return merged;
}

export function isSoundEnabled() {
  return loadSoundConfig().enabled === true;
}

// ── Audio engine ──────────────────────────────────────────────────

let ctx = null;                 // lazily created on first play (a user gesture)
const lastPlayedAt = new Map(); // per-sound rate limiting

// Per-sound minimum gap. Bulk operations (delete a 5-card selection, create a
// stack's worth of pages) fire the store action once per card; a 24ms global
// gate would still let a machine-gun of blips through. These windows collapse
// a burst into a single audible tick, which is also what a human would hear.
const MIN_INTERVAL_MS = { create: 90, delete: 260, drop: 90 };
const DEFAULT_MIN_INTERVAL_MS = 90;

/**
 * Create (or resume) the AudioContext ahead of time.
 *
 * `new AudioContext()` costs ~10-15ms — real main-thread work that would land
 * inside whichever interaction happened to be first. Calling this when the user
 * flips the toggle on moves that cost to the settings screen, so every card
 * create/drop/delete afterwards stays under the 5ms budget.
 * `latencyHint: 'interactive'` asks the audio thread for the smallest buffer it
 * can honour, which is what makes the blip feel attached to the click.
 */
export function warmAudio() {
  try {
    const audio = getContext();
    if (!audio) return false;
    if (audio.state === 'suspended' && typeof audio.resume === 'function') {
      audio.resume().catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

function getContext() {
  if (ctx) return ctx;
  const Ctor = typeof window !== 'undefined'
    ? (window.AudioContext || window.webkitAudioContext)
    : null;
  if (!Ctor) return null;
  try {
    ctx = new Ctor({ latencyHint: 'interactive' });
  } catch {
    try { ctx = new Ctor(); } catch { ctx = null; }
  }
  return ctx;
}

/**
 * Play a named blip. Never throws, never blocks.
 * @param {'create'|'delete'|'drop'} name
 */
export function playSound(name) {
  try {
    const config = loadSoundConfig();
    if (!config.enabled) return false;

    const voices = SOUNDS[name];
    if (!voices) return false;

    const now = Date.now();
    const minGap = MIN_INTERVAL_MS[name] ?? DEFAULT_MIN_INTERVAL_MS;
    if (now - (lastPlayedAt.get(name) ?? 0) < minGap) return false;
    lastPlayedAt.set(name, now);

    const audio = getContext();
    if (!audio) return false;
    // Autoplay policy: a suspended context is resumed on the gesture that
    // triggered the sound. resume() is async and never blocks this path.
    if (audio.state === 'suspended' && typeof audio.resume === 'function') {
      audio.resume().catch(() => {});
    }

    const vol = Math.max(0, Math.min(1, Number(config.volume) || 0));
    if (vol === 0) return false;

    const base = audio.currentTime;
    for (const v of voices) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const t0 = base + (v.delay || 0);
      const t1 = t0 + v.dur;

      osc.type = v.type;
      osc.frequency.setValueAtTime(v.f0, t0);
      if (v.f1 !== v.f0) osc.frequency.exponentialRampToValueAtTime(v.f1, t1);

      // Fast attack, exponential decay — a percussive tick, no click artefacts.
      const peak = Math.max(0.0001, vol * (v.gain ?? 1));
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t1);

      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(t0);
      osc.stop(t1 + 0.005);
      // Nodes are GC'd once stopped; disconnect defensively on ended.
      osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch {} };
    }
    return true;
  } catch (err) {
    addDebugEntry('warn', 'microSounds', `playSound(${name}) failed`, { error: String(err?.message || err) });
    return false;
  }
}

/** Test hook — lets a Settings preview bypass the rate limiter. */
export function previewSound(name) {
  lastPlayedAt.delete(name);
  return playSound(name);
}
