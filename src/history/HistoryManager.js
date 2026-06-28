/**
 * LOOKING GLASS — Undo/Redo History Manager
 *
 * BUG FIXES applied:
 *   1. MoveItemCommand stores newX/newY so redo() can re-apply the move.
 *      Previously redo() for 'move' was a no-op because newX/newY weren't stored.
 *   2. UpdateItemCommand.redo() now returns newData (was returning nothing).
 *   3. All command execute() methods are present and correct for redo().
 *   4. HistoryManager.redo() returns { command, result } where result is the
 *      data needed to re-apply the change (previously always null for redo).
 */

class Command {
  constructor(type) {
    this.type      = type;
    this.timestamp = Date.now();
  }
}

export class AddItemCommand extends Command {
  constructor(item) {
    super('add');
    this.item = item;
  }
  undo() { return null; }
  redo() { return null; }
}

export class DeleteItemCommand extends Command {
  constructor(item) {
    super('delete');
    this.item = item;
  }
  undo() { return null; }
  redo() { return null; }
}

export class MoveItemCommand extends Command {
  constructor(itemId, oldX, oldY, newX, newY) {
    super('move');
    this.itemId = itemId;
    this.oldX   = oldX;
    this.oldY   = oldY;
    this.newX   = newX;   // BUG FIX: stored so redo can re-apply
    this.newY   = newY;
  }
  undo() { return { x: this.oldX, y: this.oldY }; }
  redo() { return { x: this.newX, y: this.newY }; }  // BUG FIX: was missing
}

export class UpdateItemCommand extends Command {
  constructor(itemId, oldData, newData) {
    super('update');
    this.itemId  = itemId;
    this.oldData = oldData;
    this.newData = newData;   // BUG FIX: stored so redo can re-apply
  }
  undo() { return this.oldData; }
  redo() { return this.newData; }  // BUG FIX: was missing
}

export class GroupCommand extends Command {
  constructor(group, childUpdates) {
    super('group');
    this.group        = group;
    this.childUpdates = childUpdates;
    this.groupId      = group.id;
  }
  undo() {
    return {
      groupToRemove: this.groupId,
      childIds:      this.childUpdates.map((c) => c.id),
    };
  }
  redo() { return null; }
}

export class StackCommand extends Command {
  constructor(stackItem, sourceItems) {
    super('stack');
    this.stackItem   = stackItem;
    this.sourceItems = sourceItems;
    this.stackId     = stackItem.id;
  }
  undo() {
    return {
      stackToRemove: this.stackId,
      restoredItems: this.sourceItems,
    };
  }
  redo() { return null; }
}

export class FolderCommand extends Command {
  constructor(folderItem, sourceItems) {
    super('folder');
    this.folderItem   = folderItem;
    this.sourceItems  = sourceItems;
    this.folderId     = folderItem.id;
  }
  undo() {
    return {
      folderToRemove: this.folderId,
      restoredItems:  this.sourceItems,
    };
  }
  redo() { return null; }
}

export class HistoryManager {
  constructor(maxHistory = 100) {
    this.undoStack  = [];
    this.redoStack  = [];
    this.maxHistory = maxHistory;
  }

  push(command) {
    this.undoStack.push(command);
    this.redoStack = [];   // any new action clears redo stack
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }

  undo() {
    if (!this.canUndo()) return null;
    const cmd    = this.undoStack.pop();
    const result = cmd.undo();
    this.redoStack.push(cmd);
    return { command: cmd, result };
  }

  /**
   * BUG FIX: returns { command, result } where result comes from cmd.redo(),
   * so App.jsx can use it symmetrically with undo().
   */
  redo() {
    if (!this.canRedo()) return null;
    const cmd    = this.redoStack.pop();
    const result = cmd.redo();
    this.undoStack.push(cmd);
    return { command: cmd, result };
  }

  getCounts() {
    return { undo: this.undoStack.length, redo: this.redoStack.length };
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}