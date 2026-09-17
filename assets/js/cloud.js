/* ============================================================
 * cloud.js —— 云盘层
 * 坚果云：WebDAV 真实 PUT/GET（前端直连）
 * 百度网盘：OAuth 授权码模式，换 Token 必须由后端完成，
 *           本文件仅提供“跳转授权”与明确提示，不做伪上传。
 * ============================================================ */
const Cloud = (() => {

  /* ---------- 坚果云 WebDAV ---------- */
  function authHeader() {
    const c = Store.getCloudConfig();
    return 'Basic ' + btoa(c.user + ':' + c.pwd);
  }

  async function davRequest(method, path, body) {
    const c = Store.getCloudConfig();
    const url = c.server.replace(/\/+$/, '') + '/' + (path || '');
    const headers = { 'Authorization': authHeader() };
    if (body !== undefined) headers['Content-Type'] = 'application/json; charset=utf-8';
    let res;
    try {
      res = await fetch(url, { method, headers, body: body !== undefined ? body : undefined });
    } catch (e) {
      throw new Error('网络请求被中断，很可能是浏览器跨域(CORS)拦截。请改用「加密备份」手动上传。');
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      if (txt.trim().startsWith('<')) {
        throw new Error('服务器返回了网页而不是数据（状态码 ' + res.status + '）。请检查服务器地址是否正确、WebDAV 是否已开启。');
      }
      throw new Error('请求失败，状态码 ' + res.status + '。请检查账号/应用专用密码是否正确。');
    }
    return res;
  }

  /* 测试连接：PROPFIND 根目录 */
  async function testJianguo() {
    await davRequest('PROPFIND', '');
    return true;
  }

  /* 上传全部：按 家庭名/data.json 分文件上传 */
  async function uploadJianguo() {
    const spaces = Store.getSpaces();
    for (const s of spaces) {
      const payload = JSON.stringify({
        kitchen: Store.getItems(s.id, 'kitchen'),
        wardrobe: Store.getItems(s.id, 'wardrobe')
      });
      await davRequest('PUT', encodeURIComponent(s.name) + '/data.json', payload);
    }
    // 更新本地备份元数据
    Store.setMeta({ version: Date.now(), timestamp: new Date().toISOString(), families: spaces.map(s => s.name) });
    return spaces.length;
  }

  /* 下载全部：遍历家庭目录拉回 data.json 并合并 */
  async function downloadJianguo() {
    const spaces = Store.getSpaces();
    let merged = 0;
    for (const s of spaces) {
      try {
        const res = await davRequest('GET', encodeURIComponent(s.name) + '/data.json');
        const text = await res.text();
        const data = JSON.parse(text);
        if (Array.isArray(data.kitchen)) {
          Store.importAll({ spaces: [s], kitchen: { [s.id]: data.kitchen }, wardrobe: { [s.id]: data.wardrobe || [] } }, 'merge');
          merged++;
        }
      } catch (e) {
        /* 该家庭云端无数据，跳过 */
      }
    }
    return merged;
  }

  /* ---------- 百度网盘 OAuth ---------- */
  function startBaiduAuth() {
    const c = Store.getCloudConfig();
    if (!c.appKey) throw new Error('请先填写百度网盘 AppKey！');
    const redir = encodeURIComponent(c.redirect || window.location.origin + '/callback');
    const scope = encodeURIComponent('basic netdisk');
    const url = 'https://openapi.baidu.com/oauth/2.0/authorize'
      + '?response_type=code&client_id=' + c.appKey
      + '&redirect_uri=' + redir + '&scope=' + scope + '&state=familykeeper';
    window.location.href = url;
  }

  /* 百度换 Token：必须由后端完成，前端仅提示 */
  function baiduNeedBackend() {
    return '百度网盘 OAuth 换 Token 必须走后端服务（Netlify Function / 云函数），'
      + '不能在前端用 SecretKey。请部署后端后再调用，或改用「加密备份」手动上传。';
  }

  return {
    testJianguo, uploadJianguo, downloadJianguo,
    startBaiduAuth, baiduNeedBackend
  };
})();

if (typeof window !== 'undefined') window.Cloud = Cloud;
