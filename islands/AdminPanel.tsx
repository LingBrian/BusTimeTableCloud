import { useEffect, useState } from "preact/hooks";

/* ===== Types ===== */
interface User {
  username: string;
  role: "admin" | "editor";
}

interface Station {
  id: string;
  name: string;
  city: string;
  createdAt: number;
}

interface Route {
  id: string;
  stationId: string;
  name: string;
  from: string;
  to: string;
  enabled: boolean;
  createdAt: number;
}

interface Schedule {
  routeId: string;
  time: string;
  note: string;
  enabled: boolean;
}

type Tab = "dashboard" | "stations" | "routes" | "schedules";

/* ===== Helpers ===== */
async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<{ ok: boolean; data: T | null; error: { code: string; message: string } | null }> {
  const token = localStorage.getItem("admin_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = "Bearer " + token;
  try {
    const res = await fetch("/api" + path, { ...options, headers });
    return await res.json();
  } catch {
    return { ok: false, data: null, error: { code: "NETWORK_ERROR", message: "网络请求失败" } };
  }
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("zh-CN");
}

function displayRoute(r: string): string {
  return r.replace("-", " → ");
}

/* ===== 蓝牌时钟（签名） ===== */
function MastheadClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  const dateStr = now.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div class="a-mm-clock">
      <span class="a-mm-time">
        {h}<span class="blink">:</span>{m}<span class="blink">:</span>{s}
      </span>
      <span class="a-mm-date">{dateStr}</span>
    </div>
  );
}

/* ===== 主岛 ===== */
export default function AdminPanel() {
  /* ---- Auth ---- */
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  /* ---- 导航与数据 ---- */
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [stations, setStations] = useState<Station[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [stats, setStats] = useState({ stations: 0, routes: 0, schedules: 0 });

  /* ---- 筛选与编辑态 ---- */
  const [filterStationId, setFilterStationId] = useState("");
  const [filterRouteId, setFilterRouteId] = useState("");
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [batchJson, setBatchJson] = useState("");
  const [batchResult, setBatchResult] = useState("");
  const [batchIsErr, setBatchIsErr] = useState(false);

  /* ---- 挂载：检查登录 ---- */
  useEffect(() => {
    document.title = "万载城北汽车站 · 站务管理";
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setAuthLoading(false);
      return;
    }
    apiFetch<User>("/auth/me")
      .then((res) => {
        if (res.ok && res.data) {
          setUser(res.data);
        } else {
          localStorage.removeItem("admin_token");
        }
      })
      .finally(() => setAuthLoading(false));
  }, []);

  /* ---- 登录后加载字典 ---- */
  useEffect(() => {
    if (!user) return;
    loadStations();
    loadRoutes();
    loadStats();
  }, [user]);

  useEffect(() => {
    if (!filterRouteId) {
      setSchedules([]);
      return;
    }
    loadSchedules(filterRouteId);
  }, [filterRouteId]);

  /* ---- 数据加载 ---- */
  async function loadStations() {
    const res = await apiFetch<Station[]>("/stations");
    if (res.ok && res.data) setStations(res.data);
  }

  async function loadRoutes() {
    const res = await apiFetch<Route[]>("/routes");
    if (res.ok && res.data) setRoutes(res.data);
  }

  async function loadSchedules(routeId: string) {
    const res = await apiFetch<Schedule[]>("/routes/" + routeId + "/schedules");
    if (res.ok && res.data) setSchedules(res.data);
  }

  async function loadStats() {
    const res = await apiFetch<{ stations: number; routes: number; schedules: number }>("/stats");
    if (res.ok && res.data) setStats(res.data);
  }

  /* ---- 登录 / 退出 ---- */
  async function handleLogin(e: Event) {
    e.preventDefault();
    setLoginError("");
    const res = await apiFetch<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: loginUsername, password: loginPassword }),
    });
    if (res.ok && res.data) {
      localStorage.setItem("admin_token", res.data.token);
      setUser(res.data.user);
      setLoginUsername("");
      setLoginPassword("");
    } else {
      setLoginError("用户名或密码不对，请重试");
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    setUser(null);
    setActiveTab("dashboard");
    setFilterStationId("");
    setFilterRouteId("");
  }

  /* ---- 站点 CRUD ---- */
  async function handleCreateStation(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const res = await apiFetch<Station>("/stations", {
      method: "POST",
      body: JSON.stringify({ name: data.get("name"), city: data.get("city") }),
    });
    if (res.ok) {
      form.reset();
      loadStations();
    }
  }

  async function handleUpdateStation(e: Event) {
    e.preventDefault();
    if (!editingStation) return;
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const res = await apiFetch<Station>("/stations/" + editingStation.id, {
      method: "PUT",
      body: JSON.stringify({ name: data.get("name"), city: data.get("city") }),
    });
    if (res.ok) {
      setEditingStation(null);
      loadStations();
    }
  }

  async function handleDeleteStation(id: string) {
    if (!confirm("确定删除这个站点？其线路与班次不会被删除。")) return;
    const res = await apiFetch("/stations/" + id, { method: "DELETE" });
    if (res.ok) loadStations();
  }

  /* ---- 线路 CRUD ---- */
  async function handleCreateRoute(e: Event) {
    e.preventDefault();
    if (!filterStationId) return;
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const res = await apiFetch<Route>("/stations/" + filterStationId + "/routes", {
      method: "POST",
      body: JSON.stringify({ name: data.get("name") }),
    });
    if (res.ok) {
      form.reset();
      loadRoutes();
    }
  }

  async function handleUpdateRoute(e: Event) {
    e.preventDefault();
    if (!editingRoute) return;
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const res = await apiFetch<Route>("/routes/" + editingRoute.id, {
      method: "PUT",
      body: JSON.stringify({
        name: data.get("name"),
        enabled: data.get("enabled") === "on",
      }),
    });
    if (res.ok) {
      setEditingRoute(null);
      loadRoutes();
    }
  }

  async function handleDeleteRoute(id: string) {
    if (!confirm("确定删除这条线路？其班次也会一并删除。")) return;
    const res = await apiFetch("/routes/" + id, { method: "DELETE" });
    if (res.ok) {
      if (filterRouteId === id) setFilterRouteId("");
      loadRoutes();
    }
  }

  /* ---- 班次 CRUD ---- */
  async function handleCreateSchedule(e: Event) {
    e.preventDefault();
    if (!filterRouteId) return;
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const res = await apiFetch<Schedule>("/routes/" + filterRouteId + "/schedules", {
      method: "POST",
      body: JSON.stringify({ time: data.get("time"), note: data.get("note") }),
    });
    if (res.ok) {
      form.reset();
      loadSchedules(filterRouteId);
    }
  }

  async function handleUpdateSchedule(e: Event) {
    e.preventDefault();
    if (!editingSchedule || !filterRouteId) return;
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const res = await apiFetch<Schedule>(
      "/schedules/" + filterRouteId + "/" + encodeURIComponent(editingSchedule.time),
      {
        method: "PUT",
        body: JSON.stringify({
          time: data.get("time"),
          note: data.get("note"),
          enabled: data.get("enabled") === "on",
        }),
      },
    );
    if (res.ok) {
      setEditingSchedule(null);
      loadSchedules(filterRouteId);
    }
  }

  async function handleDeleteSchedule(routeId: string, time: string) {
    if (!confirm("确定删除这个班次？")) return;
    const res = await apiFetch("/schedules/" + routeId + "/" + encodeURIComponent(time), {
      method: "DELETE",
    });
    if (res.ok) loadSchedules(routeId);
  }

  /* ---- 批量导入 ---- */
  async function handleBatch(e: Event) {
    e.preventDefault();
    if (!filterRouteId || !batchJson.trim()) return;
    setBatchResult("");
    setBatchIsErr(false);
    try {
      const schedules = JSON.parse(batchJson);
      if (!Array.isArray(schedules)) throw new Error("");
      const res = await apiFetch<{ count: number }>(
        "/routes/" + filterRouteId + "/schedules/batch",
        { method: "POST", body: JSON.stringify({ schedules }) },
      );
      if (res.ok && res.data) {
        setBatchResult("已导入 " + res.data.count + " 条班次");
        setBatchJson("");
        loadSchedules(filterRouteId);
      } else {
        setBatchResult(res.error?.message || "导入失败");
        setBatchIsErr(true);
      }
    } catch {
      setBatchResult("格式不对：请粘贴班次 JSON 数组");
      setBatchIsErr(true);
    }
  }

  /* ===== 渲染 ===== */
  if (authLoading) {
    return (
      <div class="a-loading">
        <div class="a-spinner" />
        <span>正在打开站务桌面…</span>
      </div>
    );
  }

  /* ---- 登录页 ---- */
  if (!user) {
    return (
      <div class="a-login-wrap">
        <div class="a-login">
          <div class="a-login-head">
            <span class="a-mm-seal">站</span>
            <div>
              <div class="t">站务登录</div>
              <div class="s">万载城北汽车站 · 管理后台</div>
            </div>
          </div>
          <form onSubmit={handleLogin}>
            <div class="a-field">
              <label for="a-login-user">用户名</label>
              <input
                id="a-login-user"
                type="text"
                value={loginUsername}
                onInput={(e) => setLoginUsername((e.target as HTMLInputElement).value)}
                required
                autocomplete="username"
              />
            </div>
            <div class="a-field">
              <label for="a-login-pass">密码</label>
              <input
                id="a-login-pass"
                type="password"
                value={loginPassword}
                onInput={(e) => setLoginPassword((e.target as HTMLInputElement).value)}
                required
                autocomplete="current-password"
              />
            </div>
            {loginError && <div class="a-login-error">{loginError}</div>}
            <button type="submit" class="a-btn-login">登 录</button>
          </form>
        </div>
      </div>
    );
  }

  /* ---- 站务桌面 ---- */
  const filteredRoutes = routes.filter((r) => !filterStationId || r.stationId === filterStationId);
  const selectedStation = stations.find((s) => s.id === filterStationId);
  const selectedRoute = routes.find((r) => r.id === filterRouteId);

  const navs: { key: Tab; label: string }[] = [
    { key: "dashboard", label: "仪表盘" },
    { key: "stations", label: "站点" },
    { key: "routes", label: "线路" },
    { key: "schedules", label: "班次" },
  ];

  return (
    <>
      <header class="a-masthead">
        <div class="a-mm-brand">
          <span class="a-mm-seal">站</span>
          <div>
            <div class="a-mm-title">万载城北汽车站 · 站务管理</div>
            <div class="a-mm-sub">管理后台</div>
          </div>
        </div>
        <MastheadClock />
      </header>

      <div class="a-body">
        {/* 左侧站牌目录 */}
        <aside class="a-index">
          <div class="a-admin">
            <div class="who">{user.username}</div>
            <span class="tag">{user.role === "admin" ? "管理员" : "编辑员"}</span>
          </div>
          <ul class="a-nav">
            {navs.map((n) => (
              <li key={n.key}>
                <button
                  class={"a-navitem" + (activeTab === n.key ? " active" : "")}
                  onClick={() => setActiveTab(n.key)}
                >
                  {n.label}
                </button>
              </li>
            ))}
          </ul>
          <button class="a-navitem a-logout" onClick={handleLogout}>退出登录</button>
        </aside>

        {/* 台账主区 */}
        <main class="a-main">
          {/* 仪表盘 */}
          {activeTab === "dashboard" && (
            <div class="a-panel">
              <div class="a-eyebrow">总 览</div>
              <h2 class="a-title">出车概况</h2>
              <div class="a-stats">
                <div class="a-stat">
                  <span class="num">{stats.stations}</span>
                  <span class="lbl">站 点</span>
                </div>
                <div class="a-stat">
                  <span class="num">{stats.routes}</span>
                  <span class="lbl">线 路</span>
                </div>
                <div class="a-stat">
                  <span class="num">{stats.schedules}</span>
                  <span class="lbl">班 次</span>
                </div>
              </div>
              <div class="a-hint">
                维护顺序：<b>站点</b> → 在站点下<b>添加线路</b> → 在线路下<b>排班次</b>。
                左侧切换进入对应台账。
              </div>
            </div>
          )}

          {/* 站点台账 */}
          {activeTab === "stations" && (
            <div class="a-panel">
              <div class="a-eyebrow">站 点 台 账</div>
              <h2 class="a-title">车站管理</h2>

              <form class="a-form" onSubmit={handleCreateStation}>
                <input class="a-input" name="name" placeholder="站点名称" required />
                <input class="a-input" name="city" placeholder="所在城市" required />
                <button type="submit" class="a-btn a-btn-primary">添加站点</button>
              </form>

              <div class="a-table-wrap">
                <table class="a-table">
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th>城市</th>
                      <th>创建时间</th>
                      <th class="a-th-ops">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stations.length === 0 && (
                      <tr><td colspan="4" class="a-empty">还没有站点，先在上方添加一个。</td></tr>
                    )}
                    {stations.map((s) => (
                      <tr key={s.id}>
                        {editingStation?.id === s.id ? (
                          <td colspan="4" class="a-edit-row">
                            <form class="a-form" onSubmit={handleUpdateStation}>
                              <input class="a-input" name="name" value={editingStation.name}
                                onInput={(e) => setEditingStation({ ...editingStation, name: (e.target as HTMLInputElement).value })} required />
                              <input class="a-input" name="city" value={editingStation.city}
                                onInput={(e) => setEditingStation({ ...editingStation, city: (e.target as HTMLInputElement).value })} required />
                              <button type="submit" class="a-btn a-btn-primary">保存</button>
                              <button type="button" class="a-btn a-btn-ghost" onClick={() => setEditingStation(null)}>取消</button>
                            </form>
                          </td>
                        ) : (
                          <>
                            <td><b>{s.name}</b></td>
                            <td>{s.city}</td>
                            <td class="a-muted">{formatTime(s.createdAt)}</td>
                            <td class="a-th-ops">
                              <span class="a-ops">
                                <button class="a-btn a-btn-sm" onClick={() => setEditingStation(s)}>编辑</button>
                                <button class="a-btn a-btn-sm danger" onClick={() => handleDeleteStation(s.id)}>删除</button>
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 线路台账 */}
          {activeTab === "routes" && (
            <div class="a-panel">
              <div class="a-eyebrow">线 路 台 账</div>
              <h2 class="a-title">线路管理</h2>

              <div class="a-filters">
                <select class="a-select" value={filterStationId}
                  onChange={(e) => {
                    setFilterStationId((e.target as HTMLSelectElement).value);
                    setFilterRouteId("");
                  }}
                >
                  <option value="">全部站点</option>
                  {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {filterStationId && (
                <form class="a-form" onSubmit={handleCreateRoute}>
                  <input class="a-input" name="name" placeholder="线路名称，如 万载-宜春" required />
                  <button type="submit" class="a-btn a-btn-primary">添加线路</button>
                </form>
              )}

              <div class="a-table-wrap">
                <table class="a-table">
                  <thead>
                    <tr>
                      <th>线路</th>
                      <th>起点</th>
                      <th>终点</th>
                      <th>状态</th>
                      <th>创建时间</th>
                      <th class="a-th-ops">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoutes.length === 0 && (
                      <tr><td colspan="6" class="a-empty">
                        {filterStationId ? "这个站点还没有线路，在上方添加一条。" : "请先选择站点。"}
                      </td></tr>
                    )}
                    {filteredRoutes.map((r) => (
                      <tr key={r.id}>
                        {editingRoute?.id === r.id ? (
                          <td colspan="6" class="a-edit-row">
                            <form class="a-form" onSubmit={handleUpdateRoute}>
                              <input class="a-input" name="name" value={editingRoute.name}
                                onInput={(e) => setEditingRoute({ ...editingRoute, name: (e.target as HTMLInputElement).value })} required />
                              <label class="a-check">
                                <input type="checkbox" name="enabled" checked={editingRoute.enabled}
                                  onChange={(e) => setEditingRoute({ ...editingRoute, enabled: (e.target as HTMLInputElement).checked })} />
                                启用
                              </label>
                              <button type="submit" class="a-btn a-btn-primary">保存</button>
                              <button type="button" class="a-btn a-btn-ghost" onClick={() => setEditingRoute(null)}>取消</button>
                            </form>
                          </td>
                        ) : (
                          <>
                            <td class="a-route">{displayRoute(r.name)}</td>
                            <td>{r.from}</td>
                            <td>{r.to}</td>
                            <td><span class={"a-badge " + (r.enabled ? "on" : "off")}>{r.enabled ? "启用" : "停用"}</span></td>
                            <td class="a-muted">{formatTime(r.createdAt)}</td>
                            <td class="a-th-ops">
                              <span class="a-ops">
                                <button class="a-btn a-btn-sm" onClick={() => setEditingRoute(r)}>编辑</button>
                                <button class="a-btn a-btn-sm danger" onClick={() => handleDeleteRoute(r.id)}>删除</button>
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 班次台账 */}
          {activeTab === "schedules" && (
            <div class="a-panel">
              <div class="a-eyebrow">班 次 台 账</div>
              <h2 class="a-title">班次管理</h2>

              <div class="a-filters">
                <select class="a-select" value={filterStationId}
                  onChange={(e) => {
                    setFilterStationId((e.target as HTMLSelectElement).value);
                    setFilterRouteId("");
                  }}
                >
                  <option value="">全部站点</option>
                  {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select class="a-select" value={filterRouteId}
                  onChange={(e) => setFilterRouteId((e.target as HTMLSelectElement).value)}
                  disabled={!filterStationId}
                >
                  <option value="">选择线路</option>
                  {filteredRoutes.map((r) => <option key={r.id} value={r.id}>{displayRoute(r.name)}</option>)}
                </select>
              </div>

              {filterRouteId && (
                <>
                  <form class="a-form" onSubmit={handleCreateSchedule}>
                    <input class="a-input mono-time" name="time" placeholder="发车时间 HH:MM" pattern="[0-9]{2}:[0-9]{2}" required />
                    <input class="a-input" name="note" placeholder="备注（可选）" />
                    <button type="submit" class="a-btn a-btn-primary">添加班次</button>
                  </form>

                  <details class="a-batch">
                    <summary>批量导入班次</summary>
                    <form onSubmit={handleBatch}>
                      <textarea
                        class="a-textarea"
                        value={batchJson}
                        onInput={(e) => setBatchJson((e.target as HTMLTextAreaElement).value)}
                        placeholder='[ { "time": "08:00", "note": "" }, { "time": "09:30", "note": "途经宜春" } ]'
                        rows={6}
                      />
                      <button type="submit" class="a-btn a-btn-primary">导入</button>
                    </form>
                    {batchResult && (
                      <div class={"a-batch-result" + (batchIsErr ? " err" : "")}>{batchResult}</div>
                    )}
                  </details>

                  <div class="a-table-wrap">
                    <table class="a-table">
                      <thead>
                        <tr>
                          <th>发车时间</th>
                          <th>备注</th>
                          <th>状态</th>
                          <th class="a-th-ops">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedules.length === 0 && (
                          <tr><td colspan="4" class="a-empty">这条线路还没有班次，在上方添加或批量导入。</td></tr>
                        )}
                        {schedules.map((s) => (
                          <tr key={s.time}>
                            {editingSchedule?.routeId === s.routeId && editingSchedule?.time === s.time ? (
                              <td colspan="4" class="a-edit-row">
                                <form class="a-form" onSubmit={handleUpdateSchedule}>
                                  <input class="a-input mono-time" name="time" value={editingSchedule.time}
                                    onInput={(e) => setEditingSchedule({ ...editingSchedule, time: (e.target as HTMLInputElement).value })}
                                    pattern="[0-9]{2}:[0-9]{2}" required />
                                  <input class="a-input" name="note" value={editingSchedule.note}
                                    onInput={(e) => setEditingSchedule({ ...editingSchedule, note: (e.target as HTMLInputElement).value })} />
                                  <label class="a-check">
                                    <input type="checkbox" name="enabled" checked={editingSchedule.enabled}
                                      onChange={(e) => setEditingSchedule({ ...editingSchedule, enabled: (e.target as HTMLInputElement).checked })} />
                                    启用
                                  </label>
                                  <button type="submit" class="a-btn a-btn-primary">保存</button>
                                  <button type="button" class="a-btn a-btn-ghost" onClick={() => setEditingSchedule(null)}>取消</button>
                                </form>
                              </td>
                            ) : (
                              <>
                                <td class="a-time">{s.time}</td>
                                <td class="a-muted">{s.note || "—"}</td>
                                <td><span class={"a-badge " + (s.enabled ? "on" : "off")}>{s.enabled ? "启用" : "停用"}</span></td>
                                <td class="a-th-ops">
                                  <span class="a-ops">
                                    <button class="a-btn a-btn-sm" onClick={() => setEditingSchedule(s)}>编辑</button>
                                    <button class="a-btn a-btn-sm danger" onClick={() => handleDeleteSchedule(s.routeId, s.time)}>删除</button>
                                  </span>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {!filterRouteId && (
                <div class="a-hint">先在上方选择<b>站点</b>和<b>线路</b>，再维护这条线路的班次。</div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}