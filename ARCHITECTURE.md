# 家庭管家 · 架构说明

## 1. 分层架构

```
页面层 (index/kitchen/wardrobe.html)
   │  只管界面，按钮全部走 window.App / window.ItemsPage
   ↓
逻辑层 (app.js / items-page.js)
   │  处理交互、弹窗联动、导入导出
   ↓
存储层 (store.js)  ← 所有数据读写唯一入口，隔离键规则在此
   │  Store.getItems(spaceId, type) / Store.searchAll() / Store.importAll()
   ↓
云盘层 (cloud.js)  ← 坚果云 WebDAV 真实 PUT/GET；百度 OAuth 仅跳转
```

> 页面**绝不直连 localStorage**，全走 `Store.xxx()`。未来换存储引擎（IndexedDB / 后端）只需改 store.js。

## 2. 数据隔离规则

- 键格式：`hk_{spaceId}_{type}`，例 `hk_sp_123_kitchen`
- 家庭列表：`hk_spaces`
- 备份元数据：`hk_backup_meta`
- 云盘配置：`hk_cloud_config`
- 重命名家庭时，自动同步该家庭所有物品的 `spaceName`
- 删除家庭走**双重确认**并**级联清空**其厨房/衣橱数据

## 3. 云盘同步方案

### 坚果云（WebDAV，前端直连）
- 保存配置 → 测试连接(PROPFIND) → 上传全部(PUT，按 `家庭名/data.json`) → 下载全部(GET)
- **前置**：坚果云设置开启 WebDAV + 生成应用专用密码
- **限制**：浏览器跨域(CORS)可能被拦截，若失败请改用加密备份手动上传

### 百度网盘（OAuth）
- 仅实现「跳转授权」入口
- 换 Token **必须走后端**（SecretKey 不可暴露前端）
- 后端方案：`netlify/functions/callback.js` 用授权码 + SecretKey 换 token
- 未部署后端时，提示用户使用「加密备份」手动上传

## 4. 加密备份（手动，兼容所有云盘）

1. 点「🔒 加密备份」→ 导出 `.enc.json`（异或加密）+ `backup_meta.json`
2. 手动上传两个文件到任意网盘
3. 换设备：下载 `.enc.json` → 点「📥 导入数据」→ 输密码恢复
4. 点「🔄 检查更新」→ 选取网盘里的 meta 文件 → 比对版本号与时间戳

## 5. PWA（可安装 App）

- `manifest.json` + `service-worker.js` + `assets/icons/icon.svg`
- 首次访问自动弹出「添加到主屏幕」横幅
- Service Worker 预缓存核心资源，支持离线查看
- **安装方式**：
  - Android Chrome：菜单 → 添加到主屏幕
  - iPhone Safari：分享 → 添加到主屏幕
  - 电脑 Chrome/Edge：地址栏安装图标 或 菜单 → 安装

## 6. 目录结构

```
home-keeper/
├── index.html                 # 首页
├── kitchen.html               # 厨房
├── wardrobe.html              # 衣橱
├── manifest.json              # PWA 清单
├── service-worker.js          # 离线缓存
├── netlify.toml               # Netlify 配置 + 重定向
├── ARCHITECTURE.md            # 本文件
├── README.md                  # 使用说明
└── assets/
    ├── css/style.css          # 手机优先样式
    ├── icons/icon.svg         # App 图标
    └── js/
        ├── store.js           # 存储层
        ├── cloud.js           # 云盘层
        ├── app.js             # 首页逻辑
        └── items-page.js      # 厨房/衣橱通用逻辑
```

## 7. 新增模块（如记账 bills）

1. 复制 `kitchen.html` → `bills.html`，改 `ItemsPage.init('bills')`
2. 数据自动落到 `hk_{spaceId}_bills`，隔离免费获得
3. 如需新字段，在 `items-page.js` 的 `addItem` 处扩展
