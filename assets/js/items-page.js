/* ============================================================
 * items-page.js —— 厨房 / 衣橱 通用逻辑
 * 通过 pageType 区分：'kitchen' | 'wardrobe'
 * ============================================================ */
const ItemsPage = (() => {

  function init(pageType) {
    const params = new URLSearchParams(location.search);
    const spaceId = params.get('space');
    const spaceName = params.get('name');
    if (!spaceId) { alert('缺少家庭参数，将返回首页'); location.href = 'index.html'; return; }

    document.getElementById('spaceName').textContent = spaceName || '我的家庭';
    document.getElementById('pageTitle').textContent = pageType === 'wardrobe' ? '👔 衣橱穿搭' : '🍳 厨房物品';
    document.getElementById('addBtnText').textContent = pageType === 'wardrobe' ? '添加衣物' : '添加食材';

    render(pageType, spaceId);
    bindAdd(pageType, spaceId);
  }

  function render(pageType, spaceId) {
    const items = Store.getItems(spaceId, pageType);
    const box = document.getElementById('itemsList');
    if (!items.length) { box.innerHTML = '<p class="empty">还没有物品，点上方按钮添加吧～</p>'; return; }
    box.innerHTML = items.map(it => cardHTML(it, pageType)).join('');
  }

  function cardHTML(it, pageType) {
    const extra = pageType === 'wardrobe'
      ? `<span class="tag">${it.season || ''}</span><span class="tag">${it.size || ''}</span>`
      : '';
    const img = it.photo ? `<img src="${it.photo}" class="thumb" onclick="window.open('${it.photo}')">` : '';
    return `
      <div class="item-card">
        ${img}
        <div class="item-body">
          <strong>${escapeHTML(it.name)}</strong>
          <span class="cat">${it.category || ''}</span>
          ${extra}
          <p class="tags">${escapeHTML(it.tags || '')}</p>
        </div>
        <div class="item-actions">
          <button onclick="ItemsPage.onDelete('${it.type}','${it.spaceId}','${it.id}')">删除</button>
        </div>
      </div>`;
  }

  function escapeHTML(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function bindAdd(pageType, spaceId) {
    document.getElementById('addBtn').addEventListener('click', () => {
      const name = document.getElementById('itemName').value.trim();
      const category = document.getElementById('itemCategory').value.trim();
      const tags = document.getElementById('itemTags').value.trim();
      const file = document.getElementById('itemPhoto').files[0];
      if (!name) { alert('请填写名称'); return; }

      const onDone = (photo) => {
        Store.addItem(spaceId, pageType, {
          name, category, tags, photo,
          season: pageType === 'wardrobe' ? document.getElementById('itemSeason').value : '',
          size: pageType === 'wardrobe' ? document.getElementById('itemSize').value : ''
        });
        document.getElementById('itemName').value = '';
        document.getElementById('itemTags').value = '';
        document.getElementById('itemPhoto').value = '';
        render(pageType, spaceId);
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = e => onDone(e.target.result);
        reader.readAsDataURL(file);
      } else {
        onDone('');
      }
    });
  }

  function onDelete(type, spaceId, itemId) {
    if (!confirm('确认删除该物品？')) return;
    Store.deleteItem(spaceId, type, itemId);
    render(type, spaceId);
  }

  return { init, onDelete };
})();

if (typeof window !== 'undefined') window.ItemsPage = ItemsPage;
