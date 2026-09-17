/* ============================================================
 * store.js —— 存储层（唯一数据入口）
 * 所有数据读写必须经过本文件，页面层不得直连 localStorage。
 * 键规则：hk_{spaceId}_{type}   例：hk_xxx_kitchen / hk_xxx_wardrobe
 * ============================================================ */
const Store = (() => {
  const PREFIX = 'hk_';
  const SPACES_KEY = 'hk_spaces';
  const META_KEY = 'hk_backup_meta';
  const CLOUD_KEY = 'hk_cloud_config';

  /* ---------- 底层 ---------- */
  function rawGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch (e) { console.warn('[Store] 读取失败', key, e); return null; }
  }
  function rawSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function rawDel(key) { localStorage.removeItem(key); }

  /* ---------- 家庭空间 ---------- */
  function getSpaces() { return rawGet(SPACES_KEY) || []; }
  function saveSpaces(list) { rawSet(SPACES_KEY, list); }

  function addSpace(name) {
    const id = 'sp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const list = getSpaces();
    if (list.some(s => s.name === name)) return null;
    const space = { id, name, createdAt: new Date().toISOString() };
    list.push(space);
    saveSpaces(list);
    return space;
  }
  function renameSpace(id, newName) {
    const list = getSpaces();
    const target = list.find(s => s.id === id);
    if (!target) return false;
    const oldName = target.name;
    target.name = newName;
    saveSpaces(list);
    // 同步所有该家庭物品的 spaceName
    ['kitchen', 'wardrobe'].forEach(type => {
      const items = rawGet(PREFIX + id + '_' + type) || [];
      items.forEach(it => { it.spaceName = newName; });
      rawSet(PREFIX + id + '_' + type, items);
    });
    return { oldName, newName: newName };
  }
  function deleteSpace(id) {
    const list = getSpaces().filter(s => s.id !== id);
    saveSpaces(list);
    // 级联清空该家庭所有数据（用标准 localStorage 枚举 API，兼容所有浏览器）
    const prefix = PREFIX + id + '_';
    const toDel = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toDel.push(k);
    }
    toDel.forEach(k => rawDel(k));
  }

  /* ---------- 物品 CRUD ---------- */
  function key(spaceId, type) { return PREFIX + spaceId + '_' + type; }

  function getItems(spaceId, type) { return rawGet(key(spaceId, type)) || []; }

  function addItem(spaceId, type, data) {
    const items = getItems(spaceId, type);
    const space = getSpaces().find(s => s.id === spaceId);
    const it = Object.assign({
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      spaceId, spaceName: space ? space.name : '',
      type, createdAt: new Date().toISOString()
    }, data);
    items.push(it);
    rawSet(key(spaceId, type), items);
    return it;
  }

  function updateItem(spaceId, type, itemId, data) {
    const items = getItems(spaceId, type);
    const idx = items.findIndex(it => it.id === itemId);
    if (idx < 0) return null;
    items[idx] = Object.assign({}, items[idx], data);
    rawSet(key(spaceId, type), items);
    return items[idx];
  }

  function deleteItem(spaceId, type, itemId) {
    const items = getItems(spaceId, type).filter(it => it.id !== itemId);
    rawSet(key(spaceId, type), items);
  }

  /* 跨家庭全局搜索：按名称/分类/标签模糊匹配 */
  function searchAll(keyword) {
    const kw = (keyword || '').trim().toLowerCase();
    if (!kw) return [];
    const result = [];
    getSpaces().forEach(space => {
      ['kitchen', 'wardrobe'].forEach(type => {
        getItems(space.id, type).forEach(it => {
          const hay = [it.name, it.category, it.tags, it.spaceName, it.brand]
            .filter(Boolean).join(' ').toLowerCase();
          if (hay.includes(kw)) result.push(it);
        });
      });
    });
    return result;
  }

  /* ---------- 备份元数据 ---------- */
  function getMeta() { return rawGet(META_KEY) || { version: 0, timestamp: 0 }; }
  function setMeta(m) { rawSet(META_KEY, m); }

  /* ---------- 云盘配置 ---------- */
  function getCloudConfig() { return rawGet(CLOUD_KEY) || { type: 'manual' }; }
  function setCloudConfig(c) { rawSet(CLOUD_KEY, c); }

  /* ---------- 整体导出/导入（按家庭隔离合并） ---------- */
  function exportAll() {
    const payload = { spaces: getSpaces(), kitchen: {}, wardrobe: {} };
    getSpaces().forEach(s => {
      payload.kitchen[s.id] = getItems(s.id, 'kitchen');
      payload.wardrobe[s.id] = getItems(s.id, 'wardrobe');
    });
    return payload;
  }
  function importAll(payload, mode) {
    if (!payload || !Array.isArray(payload.spaces)) return { merged: 0, skipped: 0 };
    let merged = 0, skipped = 0;
    payload.spaces.forEach(sp => {
      const exist = getSpaces().find(s => s.name === sp.name);
      const sid = exist ? exist.id : (sp.id || 'sp_' + Date.now());
      if (!exist) { saveSpaces(getSpaces().concat(Object.assign({}, sp, { id: sid }))); }
      ['kitchen', 'wardrobe'].forEach(type => {
        const arr = (payload[type] && payload[type][sp.id]) || [];
        const local = getItems(sid, type);
        arr.forEach(it => {
          if (local.some(x => x.id === it.id)) { skipped++; return; }
          local.push(Object.assign({}, it, { spaceId: sid, spaceName: exist ? exist.name : sp.name }));
          merged++;
        });
        rawSet(PREFIX + sid + '_' + type, local);
      });
    });
    return { merged, skipped };
  }

  return {
    getSpaces, addSpace, renameSpace, deleteSpace,
    getItems, addItem, updateItem, deleteItem, searchAll,
    getMeta, setMeta, getCloudConfig, setCloudConfig,
    exportAll, importAll
  };
})();

if (typeof window !== 'undefined') window.Store = Store;
