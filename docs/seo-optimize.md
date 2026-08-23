# SEO 优化计划

> 项目：万载城北汽车站 · 班车时刻表（Fresh / Deno 全栈应用）
> 目标：提升站点在搜索引擎（百度、Google 等）中的可见性，让「站点名 + 班车时刻表」「站点名 + 线路名 + 班次」等搜索词可被收录与命中。

---

## 1. 现状分析

| 项目 | 现状 | 问题 |
| --- | --- | --- |
| 标题 title | `_app.tsx` 中硬编码「万载城北汽车站 · 班车时刻表」，运行期被 JS 动态改名 | 全站只有一个静态 title，无关键词策略 |
| meta description | 无 | 搜索引擎摘要缺失 |
| 内容渲染 | 首页为 SPA 形态：`index.tsx` 仅渲染 `<StationBoard/>`，数据由 `/api/display/*` 前端异步加载 | 纯 SPA 首页，爬虫（尤其百度爬虫）可能拿不到班次内容 |
| 结构化数据 | 无 JSON-LD | 无法生成富摘要（路线、班次、站点信息） |
| sitemap / robots | 无 | 收录路径不明确 |
| 深链页面 | 站点/线路依赖 URL 参数 `?station=xxx&route=xxx` | 每个线路没有独立可收录的 URL |
| canonical | 无 | 参数页易被判定为重复页面 |
| 图片 | favicon/logo 无 alt、无 og:image | 分享与搜索结果展示差 |
| 语义化 | 首页主体是 div，无 h1/h2 层级 | 标题权重未利用 |

---

## 2. 优化目标

1. 让首页在「站点名 + 班车时刻表」等品牌/核心词上被收录置顶。
2. 让每个站点、每条线路都有独立 URL 与静态可读内容（SSR 预渲染）。
3. 通过 JSON-LD（BusStation / 时刻表）提升搜索富摘要展示。
4. 补齐技术基础：robots.txt、sitemap.xml、canonical、OG/Twitter 标签。

---

## 3. 分阶段实施计划

### 阶段 A：技术基础（低风险，先行）

| # | 任务 | 说明 | 涉及文件 |
| --- | --- | --- | --- |
| A1 | 设置全局 SEO 头信息 | 在 `_app.tsx` 补 meta description、keywords、author、robots、theme-color | `routes/_app.tsx` |
| A2 | 新增 `robots.txt` | 允许爬虫，排除管理后台 `/admin` 与 `/api/*` | `static/robots.txt` |
| A3 | 新增 `sitemap.xml` | 列出全部可收录 URL | `static/sitemap.xml` 或动态生成 |
| A4 | 全站 canonical | 首页 `<link rel="canonical" href="https://<域名>/">`；参数页规范到对应静态路由 | `routes/_app.tsx` |
| A5 | 补 JSX 语义化 | 首页增加 h1（站点名）、h2（线路/班次区块），替代纯 div | `islands/StationBoard.tsx` |
| A6 | 图片 SEO | favicon 补 alt 场景，logo.svg 用于 og:image，所有 img 带 alt | `static/`、`_app.tsx` |
| A7 | 域名规范化 | 确认 http→https、www 与非 www 归一，统一 canonical | nginx/部署配置 |

### 阶段 B：可收录内容（核心，中等风险）｜已完成

| # | 任务 | 说明 | 涉及文件 |
| --- | --- | --- | --- |
| B1 | 站点静态路由 | 新增 `/s/[stationId]`：SSR 输出站点名 + 该站全部线路列表（静态 HTML） | `routes/s/[stationId].tsx`｜已完成 |
| B2 | 线路静态路由 | 新增 `/r/[routeId]`：SSR 输出线路名、始发站→到达站、全部班次时刻表（静态 HTML，供爬虫） | `routes/r/[routeId].tsx` |
| B3 | 复用服务器数据 | 直接在路由 handler 中读 KV（同 `scripts/seed.ts` 结构），不依赖前端 JS 渲染 | 复用 `lib/kv.ts` |
| B4 | 首页改为多站点聚合 | 首页仍渲染 `<StationBoard/>`，但追加 SSR 的站点直达链接区（利于首页收录内链） | `routes/index.tsx` |
| B5 | 深链对应 | 现有 `?station=&route=` 参数页可 301 到新静态路由 | `routes/_middleware.ts` |
| B6 | 内链建设 | 线路页互相链接（同站其他线路、对向班次），站点页链接到线路页 | `routes/s/...`、`routes/r/...` |

### 阶段 C：结构化数据（中等风险）｜已完成

| # | 任务 | 说明 | 涉及文件 |
| --- | --- | --- | --- |
| C1 | JSON-LD: 站点 | `<script type="application/ld+json">` 描述 `BusStation`（名称、city、URL） | `routes/s/[stationId].tsx` |
| C2 | JSON-LD: 线路时刻表 | 结构化描述每条线路、每班发车时间（`BusTrip` / `OpeningHoursSpecification`） | `routes/r/[routeId].tsx` |
| C3 | JSON-LD: WebSite/面包屑 | 站点页/线路页加 `BreadcrumbList` 与 `WebSite` 标记 | 同上 |
| C4 | og / twitter | 线路页与站点页添加 Open Graph（og:title、og:description、og:url、og:image）与 Twitter Card | 提取公共组件 `components/Seo.tsx`｜已完成 |

### 阶段 D：验证与持续优化

| # | 任务 | 说明 | 涉及文件 |
| --- | --- | --- | --- |
| D1 | 抓取验证 | 用浏览器直接看 SSR 页面 HTML，确认无 JS 也能读到关键内容 | — |
| D2 | 工具检测 | Google Search Console / 百度搜索资源平台添加站点，验证 sitemap、robots | 外部工具 |
| D3 | 性能优化 | SSR 页面开启缓存（KV 数据签名/时间戳），保证响应速度；静态资源 gzip | `routes/*` |
| D4 | 监控 | 通过 `/api/stats` 观察收录与流量；定期更新时刻表文件后重新 seed | — |

---

## 4. 关键词策略

| 类型 | 示例词 | 布局 |
| --- | --- | --- |
| 品牌词 | 万载城北汽车站、万载城北汽车站时刻表 | title、h1、JSON-LD |
| 通用核心词 | 万载 班车时刻表、万载 汽车站 | title、meta、站点页 |
| 长尾线路词 | 万载 到 南昌 班车、万载—南昌 发车时间 | 线路页 title/h1 |
| 服务词 | 万载客车发车时刻、万载长途班次 | 首页文案区（可选） |

title 模板建议：

- 首页：`万载城北汽车站班车时刻表 - 万载汽车站全天发车班次`
- 站点页：`{站点名}班车时刻表 - {城市}汽车站发车班次`
- 线路页：`{始发站}到{到达站}班车时刻表 - {始发站}发车班次`

---

## 5. URL 规划

```
/                    首页（多站点聚合 + 站钟看板）
/s/{stationId}       站点页（SSR 静态可读）
/r/{routeId}         线路页（SSR 静态可读，含全部班次）
/api/*               保持现有，仅供数据
/admin               保持管理后台（robots 阻止收录）
```

现有 `?station=&route=` 深链统一 301 → 对应 `/s/` `/r/` 页面。

---

## 6. 风险与对策

| 风险 | 对策 |
| --- | --- |
| 引入 SSR 路由改变现有交互 | 新路由只做静态可读页面，不替换 `<StationBoard/>` 看板交互 |
| 时刻表更新后静态页过期 | 路由 handler 实时读 KV（每次请求最新），不做持久化 HTML |
| 版本升级/重构风险 | 小步实施、每阶段验证；新文件尽量复用 `lib/kv.ts`、`lib/schema.ts` |
| 重复内容 | canonical + 参数页归一，避免同一线路多 URL 重复 |

---

## 7. 优先级建议

1. **先做阶段 A**：成本低、立即可见（robots、sitemap、meta、canonical）。
2. **再做阶段 B**：提供可收录的静态内容，是本次最核心价值。
3. **随后阶段 C**：结构化数据增强展示。
4. **持续阶段 D**：验证、监控、迭代。

---

## 8. 验收清单

- [ ] robots.txt / sitemap.xml 可访问且内容正确
- [ ] 首页、站点页、线路页均有独立 title 与 meta description
- [ ] 每个站点/线路有独立 URL，`curl` 无 JS 可读出班次内容
- [ ] 含 JSON-LD 与 OG/Twitter 标签
- [ ] 参数深链 301 到静态路由
- [ ] `/admin` 与 `/api/*` 不出现在 sitemap、robots 明确排除
- [ ] 无重复 canonical 冲突