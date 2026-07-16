/**
 * LOOKING GLASS — Cloud Sync Engine (Supabase)
 *
 * Local IndexedDB remains the SOURCE OF TRUTH. When a user is authenticated,
 * this engine mirrors local canvases + items to Supabase and pulls remote
 * changes back, reconciling via LAST-WRITE-WINS on `updated_at`
 * (higher timestamp wins; on a tie, the REMOTE copy wins — it is treated as
 * the more authoritative server state).
 *
 * Table contract (see supabase/migrations/0001_init.sql):
 *   canvases(id uuid PK, user_id uuid FK auth.users, name text,
 *            viewport jsonb, created_at bigint, updated_at bigint)
 *   items(id uuid PK, user_id uuid FK auth.users, canvas_id uuid FK canvases,
 *         type text, x double, y double, width double, height double,
 *         rotation double, z_index int, content jsonb, meta jsonb,
 *         style jsonb, created_at bigint, updated_at bigint)
 *
 * All client calls use the anon key; RLS (canvases_owner / items_owner) scopes
 * every row to auth.uid(). The service_role key is never imported here.
 *
 * Designed to be SAFE when unconfigured: if Supabase env vars are absent the
 * whole engine is a no-op (initSync/stopSync/push all early-return).
 */

import { getSupabaseClient } from './supabaseClient.js';
import { store as idb } from '../data/store.js';

const PUSH_DEBOUNCE_MS = 2000;
const PULL_INTERVAL_MS = 30000;

// Module-level sync state (singleton per page load).
let userId = null;
let pushTimer = null;
let pullInterval = null;
let running = false;
let inFlightPush = null;
let inFlightPull = null;
// Bumped whenever mutation-driven pushes are queued, so a stale debounce
// wait doesn't swallow a newer change.
let pushSeq = 0;
let currentSeq = 0;

function ts(record) {
  // updated_at is stored as epoch millis (bigint in Postgres).
  return Number(record?.updated_at || 0);
}

/**
 * Pull remote rows for the current user and merge into IndexedDB.
 * LAST-WRITE-WINS by updated_at (higher wins; tie → remote wins).
 *
 * @returns {Promise<{canvases:number, items:number}>} counts merged.
 */
export async function pull() {
  const supabase = getSupabaseClient();
  if (!supabase || !userId || !running) return { canvases: 0, items: 0 };
  if (inFlightPull) return inFlightPull; // de-dupe concurrent pulls

  inFlightPull = (async () => {
    try {
      const [{ data: remoteCanvases, error: cErr }, { data: remoteItems, error: iErr }] =
        await Promise.all([
          supabase
            .from('canvases')
            .select('id,user_id,name,viewport,created_at,updated_at')
            .eq('user_id', userId),
          supabase
            .from('items')
            .select(
              'id,user_id,canvas_id,type,x,y,width,height,rotation,z_index,content,meta,style,created_at,updated_at'
            )
            .eq('user_id', userId),
        ]);

      if (cErr) throw cErr;
      if (iErr) throw iErr;

      // ── Canvases ──
      const localCanvases = await idb.listCanvases();
      const localCanvasById = new Map(localCanvases.map((c) => [c.id, c]));
      let canvasMerged = 0;
      const seenCanvasIds = new Set();

      for (const rc of remoteCanvases || []) {
        seenCanvasIds.add(rc.id);
        const local = localCanvasById.get(rc.id);
        if (!local) {
          // New canvas from another device.
          await idb.putCanvas(rc);
          canvasMerged++;
        } else if (ts(rc) > ts(local)) {
          // Remote is newer.
          await idb.putCanvas(rc);
          canvasMerged++;
        } else if (ts(rc) === ts(local)) {
          // Tie → remote wins (adopt server copy verbatim).
          await idb.putCanvas(rc);
          canvasMerged++;
        }
        // else local is newer → keep local, will be pushed on next push().
      }

      // ── Items ──
      const localItems = await idb.listItems();
      const localItemById = new Map(localItems.map((i) => [i.id, i]));
      let itemMerged = 0;
      const seenItemIds = new Set();

      for (const ri of remoteItems || []) {
        seenItemIds.add(ri.id);
        const local = localItemById.get(ri.id);
        if (!local) {
          await idb.putItem(ri);
          itemMerged++;
        } else if (ts(ri) > ts(local)) {
          await idb.putItem(ri);
          itemMerged++;
        } else if (ts(ri) === ts(local)) {
          await idb.putItem(ri);
          itemMerged++;
        }
      }

      // After a pull, refresh the active canvas in memory if the store asks.
      const refresh = pendingRefresh;
      if (refresh) refresh();

      return { canvases: canvasMerged, items: itemMerged };
    } catch (err) {
      console.warn('[LG sync] pull failed:', err?.message || err);
      return { canvases: 0, items: 0, error: err };
    } finally {
      inFlightPull = null;
    }
  })();

  return inFlightPull;
}

/**
 * Push local canvases + items that are newer than the remote copy.
 * Upserts by id. user_id is stamped from the authenticated user.
 *
 * To keep `content`/`meta`/`style`/viewport JSON intact we JSON-stringify
 * them; the Postgres columns are jsonb and accept JSON text.
 */
export async function push() {
  const supabase = getSupabaseClient();
  if (!supabase || !userId || !running) return { canvases: 0, items: 0 };
  if (inFlightPush) return inFlightPush;

  inFlightPush = (async () => {
    try {
      const localCanvases = await idb.listCanvases();
      const localItems = await idb.listItems();

      const canvasRows = localCanvases.map((c) => ({
        id: c.id,
        user_id: userId,
        name: c.name ?? 'My Canvas',
        viewport: JSON.stringify(c.viewport ?? { x: 0, y: 0, scale: 1 }),
        created_at: Number(c.created_at) || Date.now(),
        updated_at: Number(c.updated_at) || Date.now(),
      }));

      const itemRows = localItems.map((i) => ({
        id: i.id,
        user_id: userId,
        canvas_id: i.canvas_id,
        type: i.type,
        x: Number(i.x) || 0,
        y: Number(i.y) || 0,
        width: i.width == null ? null : Number(i.width),
        height: i.height == null ? null : Number(i.height),
        rotation: Number(i.rotation) || 0,
        z_index: Number(i.z_index) || 0,
        content: JSON.stringify(i.content ?? {}),
        meta: JSON.stringify(i.meta ?? {}),
        style: JSON.stringify(i.style ?? {}),
        created_at: Number(i.created_at) || Date.now(),
        updated_at: Number(i.updated_at) || Date.now(),
      }));

      const results = {};

      if (canvasRows.length) {
        const { error } = await supabase.from('canvases').upsert(canvasRows, { onConflict: 'id' });
        if (error) throw error;
        results.canvases = canvasRows.length;
      }
      if (itemRows.length) {
        const { error } = await supabase.from('items').upsert(itemRows, { onConflict: 'id' });
        if (error) throw error;
        results.items = itemRows.length;
      }

      return results;
    } catch (err) {
      console.warn('[LG sync] push failed:', err?.message || err);
      return { canvases: 0, items: 0, error: err };
    } finally {
      inFlightPush = null;
    }
  })();

  return inFlightPush;
}

/** Debounced push — call on every local mutation while authenticated. */
export function schedulePush() {
  const supabase = getSupabaseClient();
  if (!supabase || !userId || !running) return;
  pushSeq += 1;
  const mySeq = pushSeq;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    currentSeq = mySeq;
    await push();
    // If more changes arrived during the push, schedule another flush.
    if (pushSeq !== currentSeq) schedulePush();
  }, PUSH_DEBOUNCE_MS);
}

/** A callback the store can register to refresh in-memory state after pull. */
let pendingRefresh = null;
export function setSyncRefresh(fn) {
  pendingRefresh = typeof fn === 'function' ? fn : null;
}

/**
 * Begin syncing for the given authenticated user.
 * Starts an interval pull and performs an immediate pull to hydrate.
 */
export function initSync(user) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.info('[LG sync] Supabase not configured — cloud sync disabled.');
    return false;
  }
  if (!user?.id) {
    console.warn('[LG sync] initSync called without a user id.');
    return false;
  }

  userId = user.id;
  running = true;

  // Immediate hydration pull.
  pull();

  // Periodic pull while authenticated.
  if (pullInterval) clearInterval(pullInterval);
  pullInterval = setInterval(() => {
    pull();
  }, PULL_INTERVAL_MS);

  return true;
}

/** Stop syncing — clears timers and drops the user context. */
export function stopSync() {
  running = false;
  userId = null;
  if (pullInterval) {
    clearInterval(pullInterval);
    pullInterval = null;
  }
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  pushSeq = 0;
  currentSeq = 0;
}

export const SYNC_CONFIG = { PUSH_DEBOUNCE_MS, PULL_INTERVAL_MS };
