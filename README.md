# 万载城北汽车站 · 班车时刻表

基于 Deno Fresh 全栈架构的班车时刻表云平台：面向旅客的电子屏查询页面 + 面向站务人员的管理后台，数据存储在 Deno KV（Deploy 内置边缘 KV），无需外部数据库。

## 技术栈

| 技术 | 用途 |
| --- | --- |
| Deno 2.x | 运行时 |
| Fresh 2.x | 全栈 Web 框架（文件系统路由、SSR、中间件） |
| Preact 10.x | 前端 UI 库 |
| TypeScript | 全栈语言，类型经 `lib/schema.ts` 前后端共享 |
| Deno KV | 数据存储 |
| JWT + PBKDF2(SHA-256) | 认证与密码哈希 |

## 数据模型（Deno KV）

| Key | 结构 | 说明 |
| --- | --- | --- |
| `stations` | `[id]` | 站点 |
| `routes` | `[id]` | 线路（`from`-`to` 两端点） |
| `schedules` | `[routeId, time]` | 班次 |
| `users` | `[username]` | 用户（admin / editor） |
| `settings` | `[key]` | 系统配置（预留） |

`static/data/index.json` 是时刻表清单：`{ name, file, hubCity }`，`scripts/seed.ts` 读取清单与对应 JSON，`hashId` 生成确定性 ID 后写入 KV，并初始化默认管理员（用户名 `admin`，密码 `admin123`，上线前必须修改）。

## 目录结构

```
.
├── main.ts                 # Fresh 入口（静态文件、日志中间件、文件系统路由）
├── deno.json               # tasks + imports（fresh / preact / vite）
├── client.ts               # 前端 CSS 入口（assets/styles.css）
├── vite.config.ts          # Vite + @fresh/plugin-vite
├── lib/
│   ├── kv.ts               # Deno KV 连接封装
│   ├── schema.ts           # 类型定义（前后端共享）
│   ├── auth.ts             # JWT 签发/校验、PBKDF2 哈希、统一响应体
│   ├── backup.ts           # 备份导入/导出/清空共享逻辑
│   ├── routeUtils.ts       # 线路端点解析 / 方向 key（与前/后端一致）
│   └── seo.ts              # SEO 常量（SEO_ORIGIN 等，域名单点维护）
├── routes/
│   ├── _app.tsx            # 全局布局 + 全局 SEO 默认 head
│   ├── _middleware.ts      # 鉴权中间件 + 深链参数 301（B5）
│   ├── index.tsx           # 电子屏首页（含站点索引区 + 逐页 head）
│   ├── admin.tsx           # 管理后台（noindex）
│   ├── s/
│   │   └── [stationId].tsx # 站点静态页（SSR，线路索引）
│   ├── r/
│   │   └── [routeId].tsx   # 线路静态页（SSR，全部班次 + 内链）
│   ├── sitemap.xml.ts      # 动态 sitemap（站点/线路聚合）
│   └── api/                # API 路由（见下）
├── islands/
│   ├── StationBoard.tsx    # 时刻表电子屏（站钟、下拉选择、下一班倒计时、30s 轮询、分享）
│   └── AdminPanel.tsx      # 管理面板（站点/线路/班次 CRUD + 批量导入 + 备份）
├── components/             # 共享 UI（Button）
├── static/
│   ├── favicon.ico
│   ├── logo.svg            # og:image / twitter:image
│   ├── admin.css
│   ├── seo-pages.css       # SEO 静态页样式（/s /r）
│   ├── robots.txt          # SEO：Allow /，Disallow /admin /api/
│   └── data/               # 原始时刻表 JSON + index.json
└── scripts/
    └── seed.ts             # 初始化数据 + 从 JSON 迁移
```

## 快速开始

需要 Deno 2.x：https://docs.deno.com/runtime/getting_started/installation

```bash
deno task dev     # 开发模式（Vite，端口 51999，HMR 热更新），首次会生成 _fresh/
deno task seed    # 初始化/迁移数据到 Deno KV
deno task check   # 类型检查
deno task lint    # 代码检查
deno task fmt     # 格式化
deno task build   # Vite 构建
deno task start   # 运行构建产物（deno serve _fresh/server.js）
```

## API 一览

统一响应体：`{ ok, data, error }`（成功 `data` 有值 / 失败 `error: { code, message }`）。

**公开只读（免认证）**

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/display/stations` | 站点列表 |
| GET | `/api/display/stations/:stationId/routes` | 站点下启用的线路 |
| GET | `/api/display/routes/:routeId/schedules` | 线路与全部班次（按时间排序） |
| POST | `/api/auth/login` | 登录，返回 JWT |

**管理（需 `Authorization: Bearer <token>`）**

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET/POST | `/api/stations` | 站点列表 / 新建 |
| GET/PUT/DELETE | `/api/stations/:id` | 站点详情/更新/删除 |
| GET/POST | `/api/stations/:stationId/routes` | 站点线路列表 / 新建 |
| GET/PUT/DELETE | `/api/routes/:id` | 线路详情/更新/删除 |
| GET/POST | `/api/routes/:routeId/schedules` | 班次列表 / 新建 |
| POST | `/api/routes/:routeId/schedules/batch` | 批量导入 |
| PUT/DELETE | `/api/schedules/:routeId/:time` | 修改 / 删除班次 |
| GET | `/api/backup/export` | 导出全部站点/线路/班次为 JSON |
| POST | `/api/backup/import` | 导入 JSON 并覆盖数据（仅管理员） |
| DELETE | `/api/backup/clear` | 一键清空站点/线路/班次（仅管理员） |
| GET | `/api/auth/me` | 当前登录用户 |
| GET | `/api/stats` | 站点/线路/班次计数 |

中间件规则：`/api/display/*`、`/api/auth/login` 与 GET 的站点/线路/班次读取为公开；其余 `/api/*` 一律校验 JWT（有效期 7 天）。

## 电子屏核心交互

- 站点 / 线路两级下拉（自定义 listbox，支持键盘导航）
- 线路对合并展示：`A-B` 与 `B-A` 归为同一线路，「换方向」切换
- 下一班倒计时英雄区（实时每秒刷新，滚动翻牌动效）
- 班次列表 30 秒自动轮询
- 分享：复制带 `?station=&route=` 参数的深链，页面据此自动定位
- 路由在状态变化时同步 URL（`history.replaceState`）

## SEO（阶段 A、B、C 已完成）

**阶段 A · 技术基础**

- `routes/_app.tsx`：全局 head 默认 `meta description / keywords / author / robots / theme-color`、Open Graph 与 Twitter Card（`og:image` `/logo.svg`）；全局默认均带 `key`，页面用 `Head` 就近覆盖
- `static/robots.txt`：允许收录展示页，明确排除 `/admin` 与 `/api/`
- `islands/StationBoard.tsx` + `assets/styles.css`：语义化标题层级（`h1` 站点名、`h2` 选择区/下一班/发车时刻），视觉不变
- `lib/seo.ts`：`SEO_ORIGIN` 域名常量单点维护

**阶段 B · 可收录内容**

- `routes/s/[stationId].tsx`：`/s/{stationId}` 站点静态页（SSR 读 KV，无前端依赖）——站点名 + 全部线路索引，含面包屑与逐页 `title / description / canonical / OG`
- `routes/r/[routeId].tsx`：`/r/{routeId}` 线路静态页——线路名、全部发车班次、对向班次、本站其他线路内链
- `routes/index.tsx`：首页追加 SSR 站点直达索引区（利于首页内链收录）
- `routes/_middleware.ts`：`?station=`/`?route=` 深链参数页统一 301 → `/s/` `/r/`（route 优先）
- `routes/sitemap.xml.ts`：动态生成 sitemap，聚合 `/`、全部 `/s/`、全部 `/r/`（enabled）
- `routes/admin.tsx`：`noindex, nofollow`
- `lib/routeUtils.ts`：线路端点解析（种子脚本 / 电子屏 / 静态页三处共用同一套逻辑）

**阶段 C · 结构化数据**

- `components/Seo.tsx`：页面级 head 统一出口（title / description / canonical / OG / twitter，透传 JSON-LD），供 `index`、`s/*`、`r/*` 复用
- JSON-LD（`<script type="application/ld+json">`）：
  - 站点页 `/s/`：`WebSite` + `BreadcrumbList` + `BusStation`（名称、city、URL、地址国家）—— `lib/seo.ts` 提供 `websiteJsonLd` / `breadcrumbJsonLd` 助手
  - 线路页 `/r/`：`WebSite` + `BreadcrumbList`（首页 / 站点 / 线路）+ `BusTrip`（每条班次一个，含 `origin`/`destination` 汽车站与 `departureTime`）

### 部署配置要点

- 正式环境设置 `SEO_ORIGIN=<https 正式域名>`（环境变量），同时替换 `static/robots.txt` 中的占位 Sitemap 域名
- 域名规范化（A7）：在反向代理 / Deno Deploy 路由层统一 `https` 跳转与 `www` 与非 `www` 归一
- 设置 `JWT_SECRET`，并在初始化后修改默认管理员密码

### 路线图

- 阶段 A 技术基础：已完成
- 阶段 B 可收录内容：已完成（站点/线路静态页、深链 301、动态 sitemap、内链）
- 阶段 C 结构化数据：已完成（BusStation / BusTrip / BreadcrumbList / WebSite JSON-LD + 公共 `Seo` 组件）
- 阶段 D 验证与持续优化：站内搜索收录监控、SSR 缓存

详见 `docs/seo-optimize.md` 与 `docs/seo-optimize.html`。

## 开源协议

本项目基于 [MIT 许可](LICENSE) 开源，Copyright (c) 2026 LingBrian。