# 开放 API 说明文档

本项目基于 Deno Fresh 全栈架构，数据存储于 Deno KV。所有 API 均挂在 `/api/` 路径下，未对外开放 CORS，需同一站点调用。

## 通用约定

### 响应封装

所有端点统一返回 JSON 响应体：

```json
// 成功
{ "ok": true, "data": { ... }, "error": null }

// 失败
{ "ok": false, "data": null, "error": { "code": "NOT_FOUND", "message": "站点不存在" } }
```

成功默认 `HTTP 200`，创建类请求返回 `HTTP 201`。

### 错误码

| HTTP | code | 说明 |
| --- | --- | --- |
| 400 | BAD_REQUEST | 参数或字段校验失败 |
| 401 | UNAUTHORIZED | 未认证 / 凭证无效 / 已过期 |
| 403 | FORBIDDEN | 无权限（仅管理员可操作） |
| 404 | NOT_FOUND | 资源不存在 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

### 鉴权

除「公开只读」端点外，一律校验 JWT（有效期 7 天）：

```
Authorization: Bearer <token>
```

登录接口 `POST /api/auth/login` 返回 `token`。管理员角色（`role: admin`）才能执行导入与清空操作。

## 数据模型

| 类型 | 字段 |
| --- | --- |
| Station | `id`, `name`, `city`, `createdAt` |
| Route | `id`, `stationId`, `name`, `from`, `to`, `enabled`, `createdAt` |
| Schedule | `routeId`, `time`, `note`, `enabled` |
| User | `username`, `passwordHash`, `role` (admin / editor), `createdAt` |

线路名形如 `起点-终点`，`from` / `to` 由 `name` 按 `-` 拆分得出。

## 鉴权速查

| 路径 | 方法 | 鉴权 |
| --- | --- | --- |
| `/api/display/*` | GET | 公开 |
| `/api/auth/login` | POST | 公开 |
| `/api/stations` | GET | 公开 |
| `/api/stations/:id` | GET | 公开 |
| `/api/stations/:stationId/routes` | GET | 公开 |
| `/api/routes` | GET | 公开 |
| `/api/routes/:id` | GET | 公开 |
| `/api/routes/:id/schedules` | GET | 公开 |
| `/api/stats` | GET | JWT |
| `/api/backup/export` | GET | JWT |
| `/api/backup/import` | POST | JWT + admin |
| `/api/backup/clear` | DELETE | JWT + admin |
| 其余写操作 | POST / PUT / DELETE | JWT |

---

## 认证（auth）

### 登录 `POST /api/auth/login`

公开。

请求体：

```json
{ "username": "admin", "password": "admin123" }
```

成功返回：

```json
{ "token": "eyJ...", "user": { "username": "admin", "role": "admin" } }
```

错误：400（用户名或密码不能为空）、401（用户名或密码错误）。

### 当前用户 `GET /api/auth/me`

需 JWT。无参数，返回 `{ "username": string, "role": "admin" | "editor" }`。

### 修改密码 `PUT /api/auth/password`

需 JWT。

请求体：

```json
{ "currentPassword": "...", "newPassword": "..." }
```

校验：`newPassword` 至少 6 位，且不得与原密码相同。成功返回 `{ "username" }`。错误 400（校验不通过或原密码不正确）、404（用户不存在）。

---

## 站点（stations）

### 站点列表 `GET /api/stations`

公开。返回 `Station[]`，按名称排序。

### 新建站点 `POST /api/stations`

需 JWT。

```json
{ "name": "万载城北汽车站", "city": "万载" }
```

成功返回完整 `Station`（`id` 自动生成），HTTP 201。

### 站点详情 `GET /api/stations/:id`

公开。返回 `Station`。错误 404。

### 更新站点 `PUT /api/stations/:id`

需 JWT。部分更新：

```json
{ "name": "...", "city": "..." }   // 缺省字段保留原值
```

### 删除站点 `DELETE /api/stations/:id`

需 JWT。返回 `data: null`。注意：**不级联删除**该站点下的线路与班次。

### 站点线路列表 `GET /api/stations/:stationId/routes`

公开。返回 `Route[]`。

### 站点下新建线路 `POST /api/stations/:stationId/routes`

需 JWT。

```json
{ "name": "万载-宜春" }
```

`from` / `to` 自动从名称拆分，`enabled: true`。成功返回 `Route`，HTTP 201。错误 404（站点不存在）、400（线路名称不能为空）。

---

## 线路（routes）

### 线路列表 `GET /api/routes`

公开。返回 `Route[]`，按名称排序。

### 线路详情 `GET /api/routes/:id`

公开。返回 `Route`。错误 404。

### 更新线路 `PUT /api/routes/:id`

需 JWT。部分更新：

```json
{ "name": "万载-南昌", "enabled": true }
```

名称变更时自动重新拆分 `from` / `to`。

### 删除线路 `DELETE /api/routes/:id`

需 JWT。返回 `data: null`。注意：**不级联删除**该线路下的班次。

### 班次列表 `GET /api/routes/:id/schedules`

公开。返回 `Schedule[]`，按时间排序。

### 新建班次 `POST /api/routes/:id/schedules`

需 JWT。

```json
{ "time": "08:00", "note": "途经宜春" }
```

`note` 可省略。**同一时间再次提交会覆盖原记录**。成功返回 `Schedule`，HTTP 201。

### 批量导入班次 `POST /api/routes/:id/schedules/batch`

需 JWT。

```json
{
  "schedules": [
    { "time": "08:00", "note": "" },
    { "time": "09:30", "note": "隔日班", "enabled": true }
  ]
}
```

单次事务批量写入，`time` 缺失的条目被跳过。成功返回 `{ "count": number }`（实际写入条数），HTTP 201。

---

## 班次（schedules）

### 更新班次 `PUT /api/schedules/:routeId/:time`

需 JWT。部分更新：

```json
{ "time": "07:30", "note": "...", "enabled": true }
```

`time` 变更时自动迁移键。错误 404（班次不存在）。

### 删除班次 `DELETE /api/schedules/:routeId/:time`

需 JWT。返回 `data: null`。错误 404。

---

## 统计（stats）

### `GET /api/stats`

需 JWT。返回：

```json
{ "stations": 12, "routes": 48, "schedules": 360 }
```

---

## 备份（backup）

### 导出全部数据 `GET /api/backup/export`

需 JWT（不限角色）。下载/读取完整备份：

```json
{
  "version": 1,
  "exportedAt": "2026-08-24T09:00:00.000Z",
  "stations": [ ... ],
  "routes": [ ... ],
  "schedules": [ ... ]
}
```

### 导入并覆盖 `POST /api/backup/import`

需 JWT + admin。

请求体结构与导出一致。流程：解析校验 → 清空站点/线路/班次三表 → 重新写入。成功返回：

```json
{ "stations": 4, "routes": 20, "schedules": 180 }
```

HTTP 201。错误 400（JSON 格式不正确或内容全空）、403（仅管理员可导入）。

### 一键清空数据 `DELETE /api/backup/clear`

需 JWT + admin。删除全部站点、线路、班次（保留 `users` 与 `settings`）。成功返回各表删除条数：

```json
{ "stations": 4, "routes": 20, "schedules": 180 }
```

错误 403（仅管理员可清空）。

---

## 公开展示（display）

面向电子屏与旅客端，全部公开免鉴权。

### 站点列表 `GET /api/display/stations`

返回 `Station[]`（含已启用站点，来源遍历）。

### 站点线路列表 `GET /api/display/stations/:stationId/routes`

返回该站点全部线路 `Route[]`。错误 404（站点不存在）。

### 线路与班次 `GET /api/display/routes/:routeId/schedules`

返回：

```json
{ "route": { ... }, "schedules": [ ... ] }
```

`schedules` 按时间排序。错误 404（线路不存在）。