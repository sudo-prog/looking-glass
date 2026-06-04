/**
 * LOOKING GLASS — Undo/Redo History Manager
 * Command pattern for all canvas mutations.
 */

// ── Command Base Class ──────────────────────
class Command {
  constructor(type) {
    this.type = type;
    this.timestamp = Date.now();
  }
  execute() { throw new Error('execute() not implemented'); }
  undo() { throw new Error('undo() not implemented'); }
}

// ── Add Item ────────────────────────────────
export class AddItemCommand extends Command {
  constructor(item, canvas) {
    super('add');
    this.item = item;
    this.canvas = canvas;
  }

  execute() {
    this.canvas.items.push(this.item);
  }

  undo() {
    this.canvas.items = this.canvas.items.filter(i => i.id !== this.item.id);
  }
}

// ── Delete Item ─────────────────────────────
export class DeleteItemCommand extends Command {
  constructor(item, canvas) {
    super('delete');
    this.item = item;
    this.canvas = canvas;
  }

  execute() {
    this.canvas.items = this.canvas.items.filter(i => i.id !== this.item.id);
  }

  undo() {
    this.canvas.items.push(this.item);
  }
}

// ── Move Item ───────────────────────────────
export class MoveItemCommand extends Command {
  constructor(itemId, oldX, oldY, newX, newY) {
    super('move');
    this.itemId = itemId;
    this.oldX = oldX;
    this.oldY = oldY;
    this.newX = newX;
    this.newY = newY;
  }

  execute() {
    // Applied by caller; stored for undo
  }

  undo() {
    // Returns the old position
    return { x: this.oldX, y: this.oldY };
  }
}

// ── Update Item ─────────────────────────────
export class UpdateItemCommand extends Command {
  constructor(itemId, oldData, newData) {
    super('update');
    this.itemId = itemId;
    this.oldData = oldData;
    this.newData = newData;
  }

  execute() {}

  undo() {
    return this.oldData;
  }
}

// ── Group ───────────────────────────────────
export class GroupCommand extends Command {
  constructor(group, childUpdates) {
    super('group');
    this.group = group;
    this.childUpdates = childUpdates;
    this.groupId = group.id;
  }

  execute() {}

  undo() {
    return {
      groupToRemove: this.groupId,
      childIds: this.childUpdates.map(c => c.id),
    };
  }
}

// ── Ungroup ─────────────────────────────────
export class UngroupCommand extends Command {
  constructor(group, childUpdates) {
    super('ungroup');
    this.group = group;
    this.childUpdates = childUpdates;
  }

  execute() {}

  undo() {
    return {
      groupToRestore: this.group,
      childUpdates: this.childUpdates,
    };
  }
}

// ── History Manager ─────────────────────────
export class HistoryManager {
  constructor(maxHistory = 100) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = maxHistory;
  }

  /**
   * Push a command after it has been executed.
   */
  push(command) {
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo on new action
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  /**
   * Can undo?
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Can redo?
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Undo the last command.
   * @returns {object|null} undo result with type and data
   */
  undo() {
    if (!this.canUndo()) return null;
    const cmd = this.undoStack.pop();
    const result = cmd.undo();
    this.redoStack.push(cmd);
    return { command: cmd, result };
  }

  /**
   * Redo the last undone command.
   * @returns {object|null} redo result
   */
  redo() {
    if (!this.canRedo()) return null;
    const cmd = this.redoStack.pop();
    cmd.execute();
    this.undoStack.push(cmd);
    return { command: cmd, result: null };
  }

  /**
   * Get counts for UI.
   */
  getCounts() {
    return {
      undo: this.undoStack.length,
      redo: this.redoStack.length,
    };
  }

  /**
   * Clear all history.
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

export { Command };
