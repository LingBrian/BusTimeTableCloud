# BusTimeTable Cloud — 技术文档

基于 **Fresh + Preact + TypeScript + Deno KV**
的全栈班车时刻表管理与电子屏展示系统。

---

## 1. 项目概述

### 1.1 现有项目

当前项目为 Hono 基础架构 + 静态 HTML 前端：

```
BusTImeTable/
├── main.ts                       # Hono 服务入口
├── routes/                       # API 路由
├── middleware/                    # 认证、错误处理
├── static/
│   ├── index.html                # 电子屏页面
│   └── admin/index.html          # 管理后台
└── data/                         # 原始 JSON 数据
```

### 1.2 目标架构（Fresh 重构）

```
浏览器
  │
  ├── /display    Fresh Preact 页面（电子屏）
  ├── /admin      Fresh Preact 页面（管理后台）
  │
  └── Deno Deploy
        │
        ├── Fresh             全栈框架（路由 + SSR + Islands）
        │   ├── routes/       API 路由 + 页面路由
        │   ├── islands/      交互组件（客户端水合）
        │   └── components/   共享 UI 组件
        │
        └── Deno KV           全球边缘 KV 存储
```

**核心原则：**

- 全栈 Fresh 架构，页面使用 Preact/TSX 组件化开发
- API 路由使用 Fresh 内置的 API 路由模式
- 交互使用 Fresh Islands 架构（选择性水合，零 JS 开销）
- 数据存储使用 Deno KV，无需外部数据库
- TypeScript 全栈（前后端类型共享）

---

## 2. 技术栈

### 后端 / 全栈

| 技术           | 用途                               |
| -------------- | ---------------------------------- |
| Deno 2.x       | 运行时                             |
| **Fresh**      | 全栈 Web 框架（路由、SSR、中间件） |
| **Preact**     | 前端 UI 库（3KB，React 兼容 API）  |
| **TypeScript** | 全栈开发语言（前后端类型共享）     |
| Deno KV        | 数据库（Deploy 内置边缘 KV）       |
| JWT + PBKDF2   | 认证方案                           |

选择 Fresh 而非 Hono 的原因：

| 维度        | Hono           | Fresh                       |
| ----------- | -------------- | --------------------------- |
| 前端渲染    | 纯静态 HTML    | SSR + Islands（选择性水合） |
| 组件化      | 手动 HTML 拼串 | Preact TSX 组件             |
| 路由        | 手动定义       | 文件系统路由（自动）        |
| API + 页面  | 分离           | 同一框架内                  |
| 交互        | 手动 JS        | Islands 自动水合            |
| 类型安全    | 仅后端         | 前后端类型共享              |
| Deno Deploy | 支持           | 原生支持                    |

### 前端

| 技术   | 用途                                      |
| ------ | ----------------------------------------- |
| Preact | UI 组件库（TSX，类 React API）            |
| Fresh  | SSR + Islands + 文件路由                  |
| CSS    | 组件级 CSS（inline styles / CSS modules） |

不引入外部 UI 框架（如 Tailwind），保持轻量：

- 项目已有成熟的 CSS 设计系统（深蓝 + 琥珀色调）
- 组件数量有限（电子屏 + 管理后台）
- Zero 构建配置，Fresh 原生支持

---

## 3. 项目结构

```
BusTimeTableCloud/
├── deno.json                     # Deno + Fresh 配置
├── main.ts                       # Fresh 入口
├── dev.ts                        # 开发服务器入口
├── fresh.gen.ts                  # Fresh 路由自动生成
│
├── routes/                       # Fresh 文件系统路由
│   ├── _app.tsx                  # 全局布局
│   ├── _middleware.ts            # 全局中间件（auth、error）
│   ├── index.tsx                 # 电子屏页面 /
│   ├── admin.tsx                 # 管理后台页面 /admin
│   │
│   └── api/                      # API 路由
│       ├── auth/
│       │   ├── login.ts          # POST /api/auth/login
│       │   └── me.ts             # GET /api/auth/me
│       ├── stations/
│       │   ├── index.ts          # GET/POST /api/stations
│       │   └── [id].ts           # GET/PUT/DELETE /api/stations/:id
│       ├── routes/
│       │   ├── [id].ts           # GET/PUT/DELETE /api/routes/:id
│       │   └── [id]/
│       │       └── schedules.ts  # GET/POST /api/routes/:id/schedules
│       ├── schedules/
│       │   └── [routeId]/
│       │       └── [time].ts     # PUT/DELETE /api/schedules/:routeId/:time
│       └── display/              # 公开展示接口
│           ├── stations.ts       # GET /api/display/stations
│           └── routes/
│               └── [id]/
│                   └── schedules.ts
│
├── islands/                      # Fresh Islands（交互组件）
│   ├── Clock.tsx                 # 实时时钟
│   ├── StationSelect.tsx         # 站点下拉
│   ├── RouteSelect.tsx           # 线路下拉
│   ├── ScheduleList.tsx          # 班次列表
│   ├── Countdown.tsx             # 下一班倒计时
│   ├── ShareButton.tsx           # 分享按钮
│   └── AdminPanel.tsx            # 管理后台面板
│
├── components/                   # 共享 UI 组件
│   ├── Masthead.tsx              # 蓝牌站钟
│   ├── Hero.tsx                  # 下一班英雄区
│   ├── Departures.tsx            # 发车时刻表
│   └── Layout.tsx                # 页面布局
│
├── lib/
│   ├── kv.ts                     # Deno KV 连接封装
│   ├── schema.ts                 # 类型定义（前后端共享）
│   └── auth.ts                   # JWT + PBKDF2 工具函数
│
├── scripts/
│   └── seed.ts                   # 初始化数据 + 从 JSON 迁移
│
├── static/
│   ├── favicon.ico
│   └── data/                     # 原始 JSON 数据
│
└── README.md
```

---

## 4. Deno KV 数据设计

（保持原有设计不变）

### 4.1 KV Key 命名规范

```
["stations", id]                   → 站点
["routes", id]                     → 线路
["schedules", routeId, time]       → 班次
["users", username]                → 用户
["settings", key]                  → 系统配置
```

### 4.2-4.6 类型定义

（保持原有 Station、Route、Schedule、User、Setting 类型不变）

---

## 5. API 设计

### 5.1 认证

```
POST   /api/auth/login          登录，返回 JWT
GET    /api/auth/me              当前用户信息
```

### 5.2 站点

```
GET    /api/stations             获取所有站点
GET    /api/stations/:id         获取单个站点
POST   /api/stations             新增站点（需认证）
PUT    /api/stations/:id         修改站点（需认证）
DELETE /api/stations/:id         删除站点（需认证）
```

### 5.3 线路

```
GET    /api/routes               获取所有线路
GET    /api/stations/:stationId/routes   获取站点下所有线路
GET    /api/routes/:id           获取单条线路
POST   /api/stations/:stationId/routes   新增线路（需认证）
PUT    /api/routes/:id           修改线路（需认证）
DELETE /api/routes/:id           删除线路（需认证）
```

### 5.4 班次

```
GET    /api/routes/:routeId/schedules         获取线路下所有班次
POST   /api/routes/:routeId/schedules         新增班次（需认证）
POST   /api/routes/:routeId/schedules/batch   批量导入班次（需认证）
PUT    /api/schedules/:routeId/:time          修改班次（需认证）
DELETE /api/schedules/:routeId/:time          删除班次（需认证）
```

### 5.5 前台展示接口（免认证）

```
GET    /api/display/stations                         站点列表
GET    /api/display/stations/:stationId/routes       站点下线路
GET    /api/display/routes/:routeId/schedules        线路下班次
```

### 5.6 统一响应格式

```json
{ "ok": true, "data": { ... }, "error": null }
{ "ok": false, "data": null, "error": { "code": "NOT_FOUND", "message": "站点不存在" } }
```

---

## 6. 前端设计（Fresh + Preact）

### 6.1 电子屏页面 (`/`)

使用 Preact 组件 + Islands 重构现有电子屏：

| 功能         | 组件 / Island       | 说明                     |
| ------------ | ------------------- | ------------------------ |
| 站钟         | `Clock.tsx` Island  | 每秒更新，客户端水合     |
| 站点选择     | `StationSelect.tsx` | 下拉框，API 加载         |
| 线路选择     | `RouteSelect.tsx`   | 下拉框，自动归并为线路对 |
| 下一班倒计时 | `Countdown.tsx`     | 每秒更新，红色脉冲闪烁   |
| 班次列表     | `ScheduleList.tsx`  | 按时间排序，已过置灰     |
| 分享按钮     | `ShareButton.tsx`   | 复制链接，显示反馈       |

岛屿策略：

- 静态部分（布局、标题、页脚）：直接服务端渲染，零 JS
- 动态部分（时钟、倒计时、下拉交互）：Islands，按需水合
- 数据加载：Islands 内调用 API 路由

### 6.2 管理后台 (`/admin`)

使用 Preact 组件构建管理界面：

- `AdminLogin.tsx` — 登录表单
- `AdminDashboard.tsx` — 站点/线路/班次统计
- `StationManager.tsx` — 站点 CRUD
- `RouteManager.tsx` — 线路 CRUD
- `ScheduleManager.tsx` — 班次 CRUD + 批量导入

所有管理操作通过 Fresh API 路由完成，JWT 存储在 localStorage。

---

## 7. 认证与安全

### 7.1 JWT 认证

- 使用 Fresh 中间件 `_middleware.ts` 统一处理
- Token 有效期 7 天
- 仅管理接口需要认证，展示接口免认证
- 密码使用 PBKDF2 + SHA-256 哈希

### 7.2 权限模型

| 角色   | 站点 | 线路 | 班次 | 用户管理 |
| ------ | ---- | ---- | ---- | -------- |
| admin  | CRUD | CRUD | CRUD | CRUD     |
| editor | 只读 | CRUD | CRUD | 无       |

---

## 8. Deno Deploy 部署

### 8.1 `deno.json` 配置

```json
{
  "tasks": {
    "start": "deno run -A main.ts",
    "dev": "deno run -A --watch main.ts dev",
    "seed": "deno run -A scripts/seed.ts",
    "fmt": "deno fmt",
    "lint": "deno lint",
    "check": "deno check main.ts"
  },
  "compilerOptions": {
    "jsx": "precompile",
    "jsxImportSource": "preact"
  },
  "imports": {
    "fresh/": "https://deno.land/x/fresh@1.6.8/",
    "preact/": "https://esm.sh/preact@10.22.0/",
    "preact/": "https://esm.sh/*preact@10.22.0/",
    "$fresh/": "https://deno.land/x/fresh@1.6.8/src/",
    "preact": "https://esm.sh/preact@10.22.0",
    "preact/": "https://esm.sh/preact@10.22.0/"
  }
}
```

### 8.2 部署步骤

1. 推送代码到 GitHub
2. 在 [dash.deno.com](https://dash.deno.com) 创建项目，关联仓库
3. Deno Deploy 自动检测 Fresh 项目并构建
4. 首次部署后执行 `deno task seed` 初始化数据
5. Deno KV 自动启用（无需 `--unstable-kv`）

---

## 9. 数据迁移

### 9.1 从 JSON 迁移到 KV

`scripts/seed.ts` 读取 `static/data/*.json`，写入 Deno KV：

- 创建站点 → `["stations", id]`
- 按线路分组 → `["routes", id]`
- 写入班次 → `["schedules", routeId, time]`
- 创建初始管理员 → `["users", "admin"]`

### 9.2 创建初始管理员

```ts
// 同 Hono 版本，PBKDF2 哈希
const passwordHash = await hashPassword("admin123");
await kv.set(["users", "admin"], {
  username: "admin",
  passwordHash,
  role: "admin",
  createdAt: Date.now(),
});
```

---

## 10. 本地开发

```bash
deno task dev      # 启动开发服务器
deno task seed     # 初始化数据
deno task fmt      # 格式化
deno task lint     # 检查
deno task check    # 类型检查
```

---

## 11. 性能设计

- Fresh SSR 首次加载即显示内容，无需等待 JS 加载
- Islands 按需水合，交互组件才下载 JS
- Deno KV 全球边缘读取
- 前端 30 秒轮询刷新
- 静态文件由 Deploy CDN 缓存

---

## 12. 分阶段任务

### 阶段 0：Fresh 项目初始化

**目标：** 搭建 Fresh 项目骨架，API 路由就绪。

| #   | 任务                | 说明                                            |
| --- | ------------------- | ----------------------------------------------- |
| 0.1 | 初始化 Fresh 项目   | `deno run -A https://deno.land/x/fresh/init.ts` |
| 0.2 | 配置 deno.json      | Fresh + Preact 依赖、tasks                      |
| 0.3 | 创建 lib/kv.ts      | KV 连接封装                                     |
| 0.4 | 创建 lib/schema.ts  | 类型定义                                        |
| 0.5 | 创建 lib/auth.ts    | JWT + PBKDF2 工具函数                           |
| 0.6 | 创建 _middleware.ts | 认证 + 错误处理中间件                           |
| 0.7 | 创建 API 路由骨架   | 所有 API 路由返回 501                           |

**验收：** `deno task dev` 启动后访问 `localhost:8000` 有响应。

---

### 阶段 1：数据层 + 展示 API

| #   | 任务           | 说明                                                |
| --- | -------------- | --------------------------------------------------- |
| 1.1 | 编写 seed.ts   | 从 JSON 迁移到 KV                                   |
| 1.2 | 实现展示 API   | display/stations、display/routes、display/schedules |
| 1.3 | 实现电子屏页面 | Preact 组件 + Islands                               |
| 1.4 | 实现分享功能   | 复制链接 + URL 参数                                 |
| 1.5 | 实现自动刷新   | 30 秒轮询                                           |

---

### 阶段 2：管理后台

| #   | 任务              | 说明                                   |
| --- | ----------------- | -------------------------------------- |
| 2.1 | 实现登录 API      | POST /api/auth/login、GET /api/auth/me |
| 2.2 | 实现站点 CRUD API | GET/POST/PUT/DELETE /api/stations      |
| 2.3 | 实现线路 CRUD API | GET/POST/PUT/DELETE /api/routes        |
| 2.4 | 实现班次 CRUD API | GET/POST/PUT/DELETE /api/schedules     |
| 2.5 | 实现批量导入 API  | POST /api/routes/:id/schedules/batch   |
| 2.6 | 实现管理后台页面  | Preact 管理面板组件                    |
| 2.7 | 联调验证          | 所有 CRUD 可正常执行                   |

---

### 阶段 3：部署上线

| #   | 任务             | 说明                  |
| --- | ---------------- | --------------------- |
| 3.1 | 推送 GitHub      | 代码推送到仓库        |
| 3.2 | 创建 Deploy 项目 | Deno Deploy 关联仓库  |
| 3.3 | 执行 seed 脚本   | 初始化数据            |
| 3.4 | 验证线上功能     | 电子屏 + 管理后台正常 |
| 3.5 | 绑定域名         | 可选                  |

---

### 阶段 4：优化与完善

| #   | 任务            | 说明                    |
| --- | --------------- | ----------------------- |
| 4.1 | 添加 rate-limit | API 限流                |
| 4.2 | 添加操作日志    | KV 记录管理员操作       |
| 4.3 | 电子屏 PWA      | Service Worker 离线缓存 |
| 4.4 | 管理后台响应式  | 适配手机/平板           |
| 4.5 | 数据导出        | JSON 导出               |
| 4.6 | 错误监控        | Sentry 或自建上报       |

---

### 阶段 5（远期可选）

WebSocket 实时推送、微信小程序、LED 屏适配、数据统计。

---

## 13. 验收标准

- [ ] 电子屏页面正常显示，数据从 KV 加载
- [ ] 实时时钟 + 下一班倒计时功能正常
- [ ] 线路切换 + 方向切换正常
- [ ] 管理后台可登录
- [ ] 站点/线路/班次 CRUD 正常
- [ ] Deno Deploy 可访问
- [ ] 无需外部数据库
- [ ] 冷启动 < 50ms
- [ ] API 响应 < 100ms
- [ ] HTTPS 自动启用
