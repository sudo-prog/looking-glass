/**
 * LOOKING GLASS — History Manager v2
 * Undo/redo command pattern with 100-operation stack.
 * Memory efficient: stores deltas, not full state snapshots.
 *
 * Supported operations: move, create, delete, resize, group.
 * Keyboard: Ctrl+Z undo, Ctrl+Shift+Z / Ctrl+Y redo.
 */

export interface CardData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  content: Record<string, unknown>;
  meta?: Record<string, unknown>;
  style?: Record<string, unknown>;
}

// ── Command interface ──────────────────────────────────────

export interface Command {
  type: string;
  timestamp: number;
  execute(): void;
  undo(): void;
  /** Human-readable description for debugging. */
  describe(): string;
}

// ── Move Command ───────────────────────────────────────────

export class MoveCommand implements Command {
  type = 'move';
  timestamp = Date.now();

  private itemId: string;
  private oldX: number;
  private oldY: number;
  private newX: number;
  private newY: number;
  private applyPosition: (id: string, x: number, y: number) => void;

  constructor(
    itemId: string,
    oldX: number, oldY: number,
    newX: number, newY: number,
    applyPosition: (id: string, x: number, y: number) => void
  ) {
    this.itemId = itemId;
    this.oldX = oldX;
    this.oldY = oldY;
    this.newX = newX;
    this.newY = newY;
    this.applyPosition = applyPosition;
  }

  execute() {
    this.applyPosition(this.itemId, this.newX, this.newY);
  }

  undo() {
    this.applyPosition(this.itemId, this.oldX, this.oldY);
  }

  describe() {
    return `move ${this.itemId} (${this.oldX},${this.oldY}) → (${this.newX},${this.newY})`;
  }
}

// ── Create Command ─────────────────────────────────────────

export class CreateCommand implements Command {
  type = 'create';
  timestamp = Date.now();

  private item: CardData;
  private removeItem: (id: string) => void;
  private addItem: (item: CardData) => void;

  constructor(
    item: CardData,
    addItem: (item: CardData) => void,
    removeItem: (id: string) => void
  ) {
    this.item = item;
    this.addItem = addItem;
    this.removeItem = removeItem;
  }

  execute() {
    this.addItem(this.item);
  }

  undo() {
    this.removeItem(this.item.id);
  }

  describe() {
    return `create ${this.item.type} ${this.item.id}`;
  }
}

// ── Delete Command ─────────────────────────────────────────

export class DeleteCommand implements Command {
  type = 'delete';
  timestamp = Date.now();

  private item: CardData;
  private addItem: (item: CardData) => void;
  private removeItem: (id: string) => void;

  constructor(
    item: CardData,
    addItem: (item: CardData) => void,
    removeItem: (id: string) => void
  ) {
    this.item = { ...item };
    this.addItem = addItem;
    this.removeItem = removeItem;
  }

  execute() {
    this.removeItem(this.item.id);
  }

  undo() {
    this.addItem(this.item);
  }

  describe() {
    return `delete ${this.item.type} ${this.item.id}`;
  }
}

// ── Resize Command ─────────────────────────────────────────

export class ResizeCommand implements Command {
  type = 'resize';
  timestamp = Date.now();

  private itemId: string;
  private oldWidth: number;
  private oldHeight: number;
  private newWidth: number;
  private newHeight: number;
  private applySize: (id: string, w: number, h: number) => void;

  constructor(
    itemId: string,
    oldWidth: number, oldHeight: number,
    newWidth: number, newHeight: number,
    applySize: (id: string, w: number, h: number) => void
  ) {
    this.itemId = itemId;
    this.oldWidth = oldWidth;
    this.oldHeight = oldHeight;
    this.newWidth = newWidth;
    this.newHeight = newHeight;
    this.applySize = applySize;
  }

  execute() {
    this.applySize(this.itemId, this.newWidth, this.newHeight);
  }

  undo() {
    this.applySize(this.itemId, this.oldWidth, this.oldHeight);
  }

  describe() {
    return `resize ${this.itemId} ${this.oldWidth}×${this.oldHeight} → ${this.newWidth}×${this.newHeight}`;
  }
}

// ── Group Command ──────────────────────────────────────────

export class GroupCommand implements Command {
  type = 'group';
  timestamp = Date.now();

  private groupId: string;
  private childIds: string[];
  private createGroup: (groupId: string, childIds: string[]) => void;
  private dissolveGroup: (groupId: string) => void;

  constructor(
    groupId: string,
    childIds: string[],
    createGroup: (groupId: string, childIds: string[]) => void,
    dissolveGroup: (groupId: string) => void
  ) {
    this.groupId = groupId;
    this.childIds = [...childIds];
    this.createGroup = createGroup;
    this.dissolveGroup = dissolveGroup;
  }

  execute() {
    this.createGroup(this.groupId, this.childIds);
  }

  undo() {
    this.dissolveGroup(this.groupId);
  }

  describe() {
    return `group ${this.groupId} [${this.childIds.join(',')}]`;
  }
}

// ── Ungroup Command ────────────────────────────────────────

export class UngroupCommand implements Command {
  type = 'ungroup';
  timestamp = Date.now();

  private groupId: string;
  private childIds: string[];
  private createGroup: (groupId: string, childIds: string[]) => void;
  private dissolveGroup: (groupId: string) => void;

  constructor(
    groupId: string,
    childIds: string[],
    createGroup: (groupId: string, childIds: string[]) => void,
    dissolveGroup: (groupId: string) => void
  ) {
    this.groupId = groupId;
    this.childIds = [...childIds];
    this.createGroup = createGroup;
    this.dissolveGroup = dissolveGroup;
  }

  execute() {
    this.dissolveGroup(this.groupId);
  }

  undo() {
    this.createGroup(this.groupId, this.childIds);
  }

  describe() {
    return `ungroup ${this.groupId}`;
  }
}

// ── History Manager ────────────────────────────────────────

const DEFAULT_MAX_HISTORY = 100;

export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistory: number;
  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private onChange: ((counts: { undo: number; redo: number }) => void) | null = null;

  constructor(maxHistory = DEFAULT_MAX_HISTORY) {
    this.maxHistory = maxHistory;
    this.boundOnKeyDown = this.onKeyDown.bind(this);
  }

  /** Attach keyboard listener for undo/redo shortcuts. */
  attachKeyboardListener(target: HTMLElement | Window = window) {
    target.addEventListener('keydown', this.boundOnKeyDown);
  }

  detachKeyboardListener(target: HTMLElement | Window = window) {
    target.removeEventListener('keydown', this.boundOnKeyDown);
  }

  setOnChange(cb: ((counts: { undo: number; redo: number }) => void) | null) {
    this.onChange = cb;
  }

  // ── Command execution ───────────────────────────────────

  /** Execute a command and push it onto the undo stack. */
  execute(command: Command) {
    command.execute();
    this.push(command);
  }

  /** Push a command onto the undo stack without executing. */
  push(command: Command) {
    this.undoStack.push(command);
    this.redoStack = [];
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.notify();
  }

  // ── Undo / Redo ─────────────────────────────────────────

  undo(): Command | null {
    if (this.undoStack.length === 0) return null;
    const cmd = this.undoStack.pop()!;
    cmd.undo();
    this.redoStack.push(cmd);
    this.notify();
    return cmd;
  }

  redo(): Command | null {
    if (this.redoStack.length === 0) return null;
    const cmd = this.redoStack.pop()!;
    cmd.execute();
    this.undoStack.push(cmd);
    this.notify();
    return cmd;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getCounts() {
    return { undo: this.undoStack.length, redo: this.redoStack.length };
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  // ── Keyboard shortcuts ──────────────────────────────────

  private onKeyDown(e: KeyboardEvent) {
    const isMod = e.ctrlKey || e.metaKey;

    if (isMod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    } else if (isMod && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      this.redo();
    } else if (isMod && e.key === 'y') {
      e.preventDefault();
      this.redo();
    }
  }

  private notify() {
    this.onChange?.(this.getCounts());
  }
}
