/* ============================================================
 * app.js —— 首页逻辑
 * 家庭空间 / 分类管理 / 添加物品 / 查找 / 云盘弹窗联动
 * ============================================================ */
const App = (() => {

  const CATEGORIES = ['🧂 调料', '🥬 蔬菜', '🥩 肉类', '🍚 主食', '🌾 干货', '🥤 饮品', '🌶️ 辛辣', '👕 上衣', '👖 裤子', '👗 裙子', '👟 鞋袜', '🧥 外套'];

  function init() {
    console.log('[家庭管家] 已启动，共', Store.getSpaces().length, '个家庭');
    renderSpaces();
    renderCategories();
    bindAddItem();
    bindCloudModal();
    bindImport();
  }

  /* ---------- 家庭空间 ---------- */
  function renderSpaces() {
    const box = document.getElementById('familySpaces');
    const spaces = Store.getSpaces();
    if (!spaces.length) { box.innerHTML = '<p class="empty">还没有家庭，先创建一个吧～</p>'; return; }
    box.innerHTML = spaces.map(s => `
      <div class="space-row">
        <span class="space-name">${escapeHTML(s.name)}</span>
        <div class="space-actions">
          <a class="btn btn-sm" href="kitchen.html?space=${s.id}&name=${encodeURIComponent(s.name)}">🍳 厨房</a>
          <a class="btn btn-sm" href="wardrobe.html?space=${s.id}&name=${encodeURIComponent(s.name)}">👔 衣橱</a>
          <button class="btn btn-sm" onclick="App.onRename('${s.id}')">重命名</button>
          <button class="btn btn-sm btn-danger" onclick="App.onDeleteSpace('${s.id}','${escapeHTML(s.name)}')">删除</button>
        </div>
      </div>`).join('');
  }

  function escapeHTML(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function onCreateSpace() {
    const name = document.getElementById('newSpaceName').value.trim();
    if (!name) { alert('请填写家庭名称'); return; }
    if (!Store.addSpace(name)) { alert('该家庭已存在'); return; }
    document.getElementById('newSpaceName').value = '';
    renderSpaces();
  }

  function onRename(id) {
    const name = prompt('输入新名称：');
    if (!name || !name.trim()) return;
    Store.renameSpace(id, name.trim());
    renderSpaces();
  }

  function onDeleteSpace(id, name) {
    if (!confirm(`确定删除「${name}」？该家庭下的厨房、衣橱数据将全部清空，且不可恢复！`)) return;
    const confirmName = prompt(`请输入家庭名称「${name}」以确认删除：`);
    if (confirmName !== name) { alert('名称不一致，已取消删除'); return; }
    Store.deleteSpace(id);
    renderSpaces();
  }

  /* ---------- 分类管理 ---------- */
  function renderCategories() {
    const box = document.getElementById('categoriesList');
    box.innerHTML = CATEGORIES.map((c, i) => `
      <span class="chip">${c}
        <button onclick="App.editCategory(${i})">改</button>
        <button onclick="App.delCategory(${i})">删</button>
      </span>`).join('');
    refreshCategorySelect();
  }

  function addCategory() {
    const name = prompt('新分类名称（可带 emoji，如 🍓 水果）：');
    if (!name || !name.trim()) return;
    CATEGORIES.push(name.trim());
    renderCategories();
  }

  function editCategory(i) {
    const name = prompt('修改为：', CATEGORIES[i]);
    if (name && name.trim()) { CATEGORIES[i] = name.trim(); renderCategories(); }
  }

  function delCategory(i) {
    if (!confirm(`删除分类「${CATEGORIES[i]}」？其下物品不会被删除，仅分类标签消失。`)) return;
    CATEGORIES.splice(i, 1);
    renderCategories();
  }

  function refreshCategorySelect() {
    const sel = document.getElementById('itemCategory');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = CATEGORIES.map(c => `<option>${c}</option>`).join('');
    sel.value = cur;
  }

  /* ---------- 添加物品（首页快速添加） ---------- */
  function bindAddItem() {
    const btn = document.getElementById('addItemBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const spaceId = document.getElementById('addItemSpace').value;
      const type = document.getElementById('addItemType').value;
      const name = document.getElementById('addItemName').value.trim();
      const category = document.getElementById('itemCategory').value;
      const tags = document.getElementById('addItemTags').value.trim();
      if (!name) { alert('请填写物品名称'); return; }
      Store.addItem(spaceId, type, { name, category, tags });
      document.getElementById('addItemName').value = '';
      document.getElementById('addItemTags').value = '';
      alert('✅ 已添加');
    });
  }

  /* ---------- 查找 ---------- */
  function onSearch() {
    const kw = document.getElementById('searchInput').value;
    const list = Store.searchAll(kw);
    const box = document.getElementById('searchResults');
    if (!kw) { box.innerHTML = ''; return; }
    if (!list.length) { box.innerHTML = '<p class="empty">没有找到匹配的物品</p>'; return; }
    box.innerHTML = list.map(it => `
      <div class="search-item">
        <strong>${escapeHTML(it.name)}</strong>
        <span class="cat">${it.category || ''}</span>
        <span class="from">[${it.spaceName || ''} · ${it.type === 'wardrobe' ? '衣橱' : '厨房'}]</span>
        <p class="tags">${escapeHTML(it.tags || '')}</p>
      </div>`).join('');
  }

  /* ---------- 云盘弹窗 ---------- */
  function bindCloudModal() {
    const prov = document.getElementById('cloudProvider');
    if (prov) prov.addEventListener('change', renderCloudFields);
    const saved = Store.getCloudConfig();
    if (saved.type) prov.value = saved.type;
    fillCloudForm(saved);
    renderCloudFields();
  }

  function openCloudModal() {
    document.getElementById('cloudModal').style.display = 'flex';
    renderCloudFields();
  }

  function closeCloudModal() { document.getElementById('cloudModal').style.display = 'none'; }

  function renderCloudFields() {
    const type = document.getElementById('cloudProvider').value;
    document.getElementById('jianguoFields').style.display = type === 'jianguo' ? 'block' : 'none';
    document.getElementById('baiduFields').style.display = type === 'baidu' ? 'block' : 'none';
  }

  function fillCloudForm(c) {
    if (c.server) document.getElementById('serverAddr').value = c.server;
    if (c.user) document.getElementById('cloudUser').value = c.user;
    if (c.appKey) document.getElementById('baiduAppKey').value = c.appKey;
    if (c.redirect) document.getElementById('baiduRedirect').value = c.redirect;
  }

  function saveCloudConfig() {
    const type = document.getElementById('cloudProvider').value;
    const cfg = { type };
    if (type === 'jianguo') {
      cfg.server = document.getElementById('serverAddr').value.trim();
      cfg.user = document.getElementById('cloudUser').value.trim();
      cfg.pwd = document.getElementById('cloudPwd').value;
      if (!cfg.server || !cfg.user || !cfg.pwd) { alert('请填写完整的坚果云信息'); return; }
    } else {
      cfg.appKey = document.getElementById('baiduAppKey').value.trim();
      cfg.redirect = document.getElementById('baiduRedirect').value.trim() || (window.location.origin + '/callback');
      if (!cfg.appKey) { alert('请填写百度网盘 AppKey'); return; }
    }
    Store.setCloudConfig(cfg);
    alert('✅ 配置已保存');
  }

  /* 测试连接 */
  async function testCloud() {
    const c = Store.getCloudConfig();
    if (c.type === 'jianguo') {
      try { await Cloud.testJianguo(); alert('🎉 坚果云连接成功！'); }
      catch (e) { alert('❌ ' + e.message); }
    } else {
      alert('ℹ️ ' + Cloud.baiduNeedBackend());
    }
  }

  /* 上传全部 */
  async function uploadCloud() {
    const c = Store.getCloudConfig();
    if (c.type === 'jianguo') {
      try { const n = await Cloud.uploadJianguo(); alert('🎉 已上传 ' + n + ' 个家庭的数据'); }
      catch (e) { alert('❌ ' + e.message); }
    } else {
      alert('ℹ️ ' + Cloud.baiduNeedBackend());
    }
  }

  /* 从云盘下载 */
  async function downloadCloud() {
    const c = Store.getCloudConfig();
    if (c.type === 'jianguo') {
      try { const n = await Cloud.downloadJianguo(); alert('🎉 已从云端恢复 ' + n + ' 个家庭的数据'); renderSpaces(); }
      catch (e) { alert('❌ ' + e.message); }
    } else {
      alert('ℹ️ 百度网盘下载同样需要后端服务。请改用「导入数据」手动恢复。');
    }
  }

  /* 百度授权跳转 */
  function startBaiduAuth() {
    try { Cloud.startBaiduAuth(); }
    catch (e) { alert('❌ ' + e.message); }
  }

  /* ---------- 加密备份 / 导入 ---------- */
  function exportData() {
    const payload = Store.exportAll();
    const pwd = prompt('请设置备份密码（导入时需要）：');
    if (!pwd) return;
    const json = JSON.stringify(payload);
    // 简易异或加密（密码学上非强加密，仅做“加密备份”语义；生产请换 Web Crypto API）
    let enc = '';
    for (let i = 0; i < json.length; i++) enc += String.fromCharCode(json.charCodeAt(i) ^ pwd.charCodeAt(i % pwd.length));
    const b64 = btoa(unescape(encodeURIComponent(enc)));
    const blob = new Blob([b64], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '家庭管家备份_' + new Date().toISOString().slice(0, 10) + '.enc.json';
    a.click(); URL.revokeObjectURL(url);
    // 同时导出元数据（用于版本比对）
    Store.setMeta({ version: Date.now(), timestamp: new Date().toISOString(), families: Store.getSpaces().map(s => s.name) });
    const metaBlob = new Blob([JSON.stringify(Store.getMeta(), null, 2)], { type: 'application/json' });
    const mUrl = URL.createObjectURL(metaBlob);
    const m = document.createElement('a');
    m.href = mUrl; m.download = 'backup_meta.json'; m.click(); URL.revokeObjectURL(mUrl);
    alert('✅ 已导出加密备份 + 元数据文件，请一并上传到网盘');
  }

  function bindImport() {
    const file = document.getElementById('importFile');
    if (file) file.addEventListener('change', e => doImport(e.target.files[0]));
  }

  function doImport(f) {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const b64 = e.target.result;
        const pwd = prompt('请输入备份时设置的密码：');
        let enc = unescape(decodeURIComponent(atob(b64)));
        let json = '';
        for (let i = 0; i < enc.length; i++) json += String.fromCharCode(enc.charCodeAt(i) ^ pwd.charCodeAt(i % pwd.length));
        const payload = JSON.parse(json);
        const r = Store.importAll(payload, 'merge');
        alert('✅ 导入完成：新增 ' + r.merged + ' 条，跳过 ' + r.skipped + ' 条重复');
        renderSpaces();
      } catch (err) {
        alert('❌ 导入失败：密码错误或文件损坏');
        console.error(err);
      }
    };
    reader.readAsText(f);
  }

  /* 检查云盘更新（手动选取 meta 文件比对版本） */
  function checkUpdate() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      const meta = JSON.parse(await f.text());
      const local = Store.getMeta();
      if (meta.version > local.version) {
        alert('📥 发现新备份！\n时间：' + meta.timestamp + '\n家庭：' + (meta.families || []).join('、') + '\n请下载对应的 .enc.json 并点「导入数据」');
      } else {
        alert('✅ 当前已是最新版本');
      }
    };
    input.click();
  }

  return {
    init, onCreateSpace, onRename, onDeleteSpace,
    addCategory, editCategory, delCategory,
    onSearch, openCloudModal, closeCloudModal,
    saveCloudConfig, testCloud, uploadCloud, downloadCloud, startBaiduAuth,
    exportData, checkUpdate
  };
})();

if (typeof window !== 'undefined') {
  window.App = App;
  document.addEventListener('DOMContentLoaded', App.init);
}
