/**
 * LOOKING GLASS — Group Manager
 * Manages grouping/ungrouping of canvas items.
 */
export class GroupManager {
  constructor() {
    this.groups = new Map(); // group_id -> Set of child item ids
  }

  /**
   * Create a group from a set of items.
   * @param {Array} items - items to group
   * @param {string} name - group name
   * @returns {{ group: object, updates: Array }} group item + items to update
   */
  createGroup(items, name = 'Group') {
    if (!items.length) return null;

    const groupId = crypto.randomUUID();
    const ids = items.map(i => i.id);

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(item => {
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + (item.width || 320));
      maxY = Math.max(maxY, item.y + (item.height || 200));
    });

    const padding = 20;
    const group = {
      id: groupId,
      type: 'group',
      created_at: Date.now(),
      updated_at: Date.now(),
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
      rotation: 0,
      z_index: Math.max(...items.map(i => i.z_index || 0)) + 1,
      content: {
        title: name,
        description: '',
        url: null,
        image_url: null,
        text: null,
        file_path: null,
        embed_html: null,
      },
      meta: {
        source: 'group',
        tags: [],
        color: null,
        pinned: false,
        archived: false,
        group_id: null,
        child_count: items.length,
        collapsed: false,
      },
      style: { background: null, text_color: null, font_size: null, opacity: 1 },
      _childIds: ids,
    };

    // Update child items to reference group
    const updates = items.map(item => ({
      ...item,
      meta: { ...item.meta, group_id: groupId },
    }));

    this.groups.set(groupId, new Set(ids));
    return { group, updates };
  }

  /**
   * Ungroup items.
   * @param {string} groupId
   * @param {Array} allItems - all items in canvas
   * @returns {{ groupToRemove: string, updates: Array }} items to update + group to remove
   */
  ungroup(groupId, allItems) {
    const childIds = this.groups.get(groupId);
    if (!childIds) return null;

    const updates = allItems
      .filter(item => childIds.has(item.id))
      .map(item => ({
        ...item,
        meta: { ...item.meta, group_id: null },
      }));

    this.groups.delete(groupId);
    return { groupToRemove: groupId, updates };
  }

  /**
   * Toggle group collapsed state.
   */
  toggleCollapsed(groupItem) {
    const collapsed = !groupItem.meta?.collapsed;
    return {
      ...groupItem,
      meta: { ...groupItem.meta, collapsed },
      updated_at: Date.now(),
    };
  }

  /**
   * Get all child item IDs for a group.
   */
  getChildIds(groupId) {
    return this.groups.get(groupId) || new Set();
  }

  /**
   * Move all children of a group by delta.
   */
  moveGroupChildren(groupId, items, dx, dy) {
    const childIds = this.groups.get(groupId);
    if (!childIds) return items;

    return items.map(item => {
      if (childIds.has(item.id)) {
        return { ...item, x: item.x + dx, y: item.y + dy, updated_at: Date.now() };
      }
      return item;
    });
  }
}
