/**
 * LOOKING GLASS — Selection Manager v2
 * Card selection system with single/multi-select, drag selection box,
 * keyboard navigation, and theme-aware selection visuals.
 *
 * Single click: select one card.
 * Shift+click: range select (from last selected to clicked).
 * Ctrl/Cmd+click: toggle selection.
 * Click empty canvas: deselect all.
 * Drag selection box: select all cards within box.
 * Selected cards: border 1px solid rgba(255,255,255,0.35) dark / rgba(0,0,0,0.25) light.
 * Keyboard: Tab/Shift+Tab navigate, Arrow keys move (8px, 40px+Shift),
 *   Delete/Backspace delete, Escape deselect.
 */

import { CanvasEngine } from './CanvasEngine';

export interface SelectionTheme {
  borderColor: string;
}

const MOVE_STEP = 8;
const MOVE_STEP_SHIFT = 40;

const DARK_THEME: SelectionTheme = {
  borderColor: 'rgba(255, 255, 255, 0.35)',
};

const LIGHT_THEME: SelectionTheme = {
  borderColor: 'rgba(0, 0, 0, 0.25)',
};

export class SelectionManager {
  private engine: CanvasEngine;
  private container: HTMLElement | null = null;
  private world: HTMLElement | null = null;

  private selectedIds: Set<string> = new Set();
  private lastSelectedId: string | null = null;
  private cardElements: Map<string, HTMLElement> = new Map();

  // Drag selection box
  private isBoxSelecting = false;
  private boxStart = { x: 0, y: 0 };
  private boxEl: HTMLElement | null = null;

  // Theme
  private isDark = true;

  // Callbacks
  private onSelectionChange: ((ids: Set<string>) => void) | null = null;
  private onDelete: ((ids: Set<string>) => void) | null = null;
  private onMove: ((id: string, dx: number, dy: number) => void) | null = null;

  private boundOnPointerDown: (e: PointerEvent) => void;
  private boundOnPointerMove: (e: PointerEvent) => void;
  private boundOnPointerUp: (e: PointerEvent) => void;
  private boundOnKeyDown: (e: KeyboardEvent) => void;

  constructor(engine: CanvasEngine) {
    this.engine = engine;
    this.boundOnPointerDown = this.onPointerDown.bind(this);
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
  }

  init(
    container: HTMLElement,
    world: HTMLElement,
    opts?: {
      onSelectionChange?: (ids: Set<string>) => void;
      onDelete?: (ids: Set<string>) => void;
      onMove?: (id: string, dx: number, dy: number) => void;
      isDark?: boolean;
    }
  ) {
    this.container = container;
    this.world = world;
    this.onSelectionChange = opts?.onSelectionChange ?? null;
    this.onDelete = opts?.onDelete ?? null;
    this.onMove = opts?.onMove ?? null;
    this.isDark = opts?.isDark ?? true;

    container.addEventListener('pointerdown', this.boundOnPointerDown);
    window.addEventListener('pointermove', this.boundOnPointerMove);
    window.addEventListener('pointerup', this.boundOnPointerUp);
    window.addEventListener('keydown', this.boundOnKeyDown);
  }

  destroy() {
    if (!this.container) return;
    this.container.removeEventListener('pointerdown', this.boundOnPointerDown);
    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
    window.removeEventListener('keydown', this.boundOnKeyDown);
    this.removeSelectionBox();
  }

  // ── Card registry ────────────────────────────────────────

  registerCard(id: string, el: HTMLElement) {
    this.cardElements.set(id, el);
  }

  unregisterCard(id: string) {
    this.cardElements.delete(id);
    this.selectedIds.delete(id);
    if (this.lastSelectedId === id) this.lastSelectedId = null;
  }

  // ── Theme ────────────────────────────────────────────────

  setDarkMode(isDark: boolean) {
    this.isDark = isDark;
    this.updateSelectionVisuals();
  }

  private get theme(): SelectionTheme {
    return this.isDark ? DARK_THEME : LIGHT_THEME;
  }

  // ── Selection state ─────────────────────────────────────

  getSelectedIds(): Set<string> {
    return new Set(this.selectedIds);
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  private selectOnly(id: string) {
    this.clearSelection();
    this.selectedIds.add(id);
    this.lastSelectedId = id;
    this.updateSelectionVisuals();
    this.notify();
  }

  private toggleSelection(id: string) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
      this.lastSelectedId = id;
    }
    this.updateSelectionVisuals();
    this.notify();
  }

  private rangeSelect(id: string) {
    if (!this.lastSelectedId) {
      this.selectOnly(id);
      return;
    }

    // Get all card IDs in DOM order
    const allIds = Array.from(this.cardElements.keys());
    const lastIdx = allIds.indexOf(this.lastSelectedId);
    const currentIdx = allIds.indexOf(id);

    if (lastIdx === -1 || currentIdx === -1) {
      this.selectOnly(id);
      return;
    }

    const start = Math.min(lastIdx, currentIdx);
    const end = Math.max(lastIdx, currentIdx);

    for (let i = start; i <= end; i++) {
      this.selectedIds.add(allIds[i]);
    }
    this.lastSelectedId = id;
    this.updateSelectionVisuals();
    this.notify();
  }

  clearSelection() {
    this.selectedIds.clear();
    this.lastSelectedId = null;
    this.updateSelectionVisuals();
    this.notify();
  }

  private notify() {
    this.onSelectionChange?.(this.getSelectedIds());
  }

  // ── Visuals ──────────────────────────────────────────────

  private updateSelectionVisuals() {
    const border = this.theme.borderColor;

    this.cardElements.forEach((el, id) => {
      if (this.selectedIds.has(id)) {
        el.classList.add('selected');
        el.style.border = `1px solid ${border}`;
        el.style.borderRadius = '12px';
      } else {
        el.classList.remove('selected');
        el.style.border = '';
        el.style.borderRadius = '';
      }
    });
  }

  // ── Pointer handling ─────────────────────────────────────

  private onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    const card = target.closest('[data-card-id]') as HTMLElement | null;

    if (card) {
      const cardId = card.dataset.cardId!;

      if (e.shiftKey) {
        e.stopPropagation();
        this.rangeSelect(cardId);
      } else if (e.ctrlKey || e.metaKey) {
        e.stopPropagation();
        this.toggleSelection(cardId);
      } else {
        if (!this.selectedIds.has(cardId)) {
          this.selectOnly(cardId);
        }
        // If already selected, don't clear — let drag handle it
      }
    } else {
      // Click on empty canvas — start box selection or deselect
      if (target === this.container || target === this.world) {
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
          this.clearSelection();
        }
        // Start drag selection box
        this.startBoxSelect(e);
      }
    }
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.isBoxSelecting) return;
    this.updateBoxSelect(e);
  }

  private onPointerUp(e: PointerEvent) {
    if (this.isBoxSelecting) {
      this.finishBoxSelect();
    }
  }

  // ── Drag selection box ───────────────────────────────────

  private startBoxSelect(e: PointerEvent) {
    this.isBoxSelecting = true;
    this.boxStart = { x: e.clientX, y: e.clientY };

    this.boxEl = document.createElement('div');
    this.boxEl.style.cssText = `
      position: fixed;
      border: 1px solid rgba(255,255,255,0.35);
      background: rgba(255,255,255,0.05);
      pointer-events: none;
      z-index: 99998;
    `;
    document.body.appendChild(this.boxEl);
  }

  private updateBoxSelect(e: PointerEvent) {
    if (!this.boxEl) return;

    const x = Math.min(this.boxStart.x, e.clientX);
    const y = Math.min(this.boxStart.y, e.clientY);
    const w = Math.abs(e.clientX - this.boxStart.x);
    const h = Math.abs(e.clientY - this.boxStart.y);

    this.boxEl.style.left = `${x}px`;
    this.boxEl.style.top = `${y}px`;
    this.boxEl.style.width = `${w}px`;
    this.boxEl.style.height = `${h}px`;
  }

  private finishBoxSelect() {
    if (!this.boxEl) return;

    const boxRect = this.boxEl.getBoundingClientRect();
    this.removeSelectionBox();

    // Find all cards within the selection box
    let anySelected = false;
    this.cardElements.forEach((el, id) => {
      const cardRect = el.getBoundingClientRect();
      if (this.rectsOverlap(boxRect, cardRect)) {
        this.selectedIds.add(id);
        anySelected = true;
      }
    });

    if (anySelected) {
      this.lastSelectedId = Array.from(this.selectedIds).pop() ?? null;
    }

    this.updateSelectionVisuals();
    this.notify();
  }

  private removeSelectionBox() {
    this.isBoxSelecting = false;
    if (this.boxEl) {
      this.boxEl.remove();
      this.boxEl = null;
    }
  }

  private rectsOverlap(
    a: DOMRect,
    b: DOMRect
  ): boolean {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  // ── Keyboard ─────────────────────────────────────────────

  private onKeyDown(e: KeyboardEvent) {
    // Don't handle if user is typing in an input
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    )
      return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.clearSelection();
        break;

      case 'Delete':
      case 'Backspace':
        if (this.selectedIds.size > 0) {
          e.preventDefault();
          this.onDelete?.(this.getSelectedIds());
        }
        break;

      case 'Tab':
        e.preventDefault();
        this.navigateSelection(e.shiftKey);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.moveSelected(0, e.shiftKey ? -MOVE_STEP_SHIFT : -MOVE_STEP);
        break;

      case 'ArrowDown':
        e.preventDefault();
        this.moveSelected(0, e.shiftKey ? MOVE_STEP_SHIFT : MOVE_STEP);
        break;

      case 'ArrowLeft':
        e.preventDefault();
        this.moveSelected(e.shiftKey ? -MOVE_STEP_SHIFT : -MOVE_STEP, 0);
        break;

      case 'ArrowRight':
        e.preventDefault();
        this.moveSelected(e.shiftKey ? MOVE_STEP_SHIFT : MOVE_STEP, 0);
        break;
    }
  }

  /** Tab/Shift+Tab: navigate selection to next/previous card. */
  private navigateSelection(reverse: boolean) {
    const allIds = Array.from(this.cardElements.keys());
    if (allIds.length === 0) return;

    if (this.selectedIds.size === 0) {
      this.selectOnly(reverse ? allIds[allIds.length - 1] : allIds[0]);
      return;
    }

    const currentId = this.lastSelectedId ?? Array.from(this.selectedIds)[0];
    const currentIdx = allIds.indexOf(currentId);
    if (currentIdx === -1) {
      this.selectOnly(reverse ? allIds[allIds.length - 1] : allIds[0]);
      return;
    }

    const nextIdx = reverse
      ? (currentIdx - 1 + allIds.length) % allIds.length
      : (currentIdx + 1) % allIds.length;

    this.selectOnly(allIds[nextIdx]);
  }

  /** Arrow keys: move selected card(s). */
  private moveSelected(dx: number, dy: number) {
    if (this.selectedIds.size === 0) return;

    this.selectedIds.forEach((id) => {
      this.onMove?.(id, dx, dy);
    });
  }
}
