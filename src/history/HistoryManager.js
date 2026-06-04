/**
 * LOOKING GLASS — Undo/Redo History Manager
 * Command pattern for all canvas mutations.
 */

class Command {
  constructor(type) {
    this.type = type;
    this.timestamp = Date.now();
  }
}

export class AddItemCommand extends Command {
  constructor(item, canvasItems) {
    super('add');
    this.item = item;
    this.canvasItems = canvasItems;
  }
  execute() { this.canvasItems.push(this.item); }
  undo() { this.canvasItems.splice(this.canvasItems.findIndex(i => i.id === this.item.id), 1); }
}

export class DeleteItemCommand extends Command {
  constructor(item, canvasItems) {
    super('delete');
    this.item = item;
    this.canvasItems = canvasItems;
  }
  execute() { this.canvasItems.splice(this.canvasItems.findIndex(i => i.id === this.item.id), 1); }
  undo() { this.canvasItems.push(this.item); }
}

export class MoveItemCommand extends Command {
  constructor(itemId, oldX, oldY, newX, newY) {
    super('move');
    this.itemId = itemId;
    this.oldX = oldX;
    this.oldY = oldY;
    this.newX = newX;
    this.newY = newY;
  }
  undo() { return { x: this.oldX, y: this.oldY }; }
}

export class UpdateItemCommand extends Command {
  constructor(itemId, oldData, newData) {
    super('update');
    this.itemId = itemId;
    this.oldData = oldData;
    this.newData = newData;
  }
  undo() { return this.oldData; }
}

export class GroupCommand extends Command {
  constructor(group, childUpdates) {
    super('group');
    this.group = group;
    this.childUpdates = childUpdates;
    this.groupId = group.id;
  }
  undo() {
    return {
      groupToRemove: this.groupId,
      childIds: this.childUpdates.map(c => c.id),
    };
  }
}

export class HistoryManager {
  constructor(maxHistory = 100) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = maxHistory;
  }

  push(command) {
    this.undoStack.push(command);
    this.redoStack = [];
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }

  undo() {
    if (!this.canUndo()) return null;
    const cmd = this.undoStack.pop();
    const result = cmd.undo();
    this.redoStack.push(cmd);
    return { command: cmd, result };
  }

  redo() {
    if (!this.canRedo()) return null;
    const cmd = this.redoStack.pop();
    cmd.execute();
    this.undoStack.push(cmd);
    return { command: cmd, result: null };
  }

  getCounts() {
    return { undo: this.undoStack.length, redo: this.redoStack.length };
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
