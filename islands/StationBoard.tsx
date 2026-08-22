import { useEffect, useMemo, useRef, useState } from "preact/hooks";

/* ===== Types ===== */
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
interface OptionItem {
  key: string;
  label: string;
}

/* ===== Display API ===== */
async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch("/api/display" + path, { cache: "no-store" });
    const body = await res.json();
    if (!body?.ok) return null;
    return body.data as T;
  } catch {
    return null;
  }
}

/* ===== Helpers ===== */
function parseTimeToMinutes(t: string): number {
  if (!t || typeof t !== "string") return -1;
  const parts = t.trim().split(":");
  if (parts.length !== 2) return -1;
  const h = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}
function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function displayRoute(r: string): string {
  if (!r) return "——";
  return r.replace("-", " → ");
}
function endpointA(r: string): string {
  const i = r.indexOf("-");
  return i === -1 ? r : r.slice(0, i);
}
function endpointB(r: string): string {
  const i = r.indexOf("-");
  return i === -1 ? "" : r.slice(i + 1);
}
function pairKey(r: string): string {
  const a = endpointA(r), b = endpointB(r);
  if (a === b) return a;
  return a < b ? a + "\0" + b : b + "\0" + a;
}
function directionOf(r: string, hub: string): "dep" | "ret" | "other" {
  if (r.indexOf(hub + "-") === 0) return "dep";
  if (r.lastIndexOf("-" + hub) === r.length - hub.length - 1) return "ret";
  return "other";
}

/* ===== Dropdown Component ===== */
function Dropdown({
  label,
  options,
  selectedKey,
  onSelect,
  placeholder,
  disabled,
}: {
  label: string;
  options: OptionItem[];
  selectedKey?: string;
  onSelect: (key: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.key === selectedKey);
  const display = selected?.label || placeholder || "请选择";

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const sel = listRef.current.querySelector('[aria-selected="true"]') as HTMLElement;
    if (sel) sel.focus();
    else {
      const first = listRef.current.querySelector("li") as HTMLElement;
      if (first) first.focus();
    }
  }, [open]);

  function handleListKeyDown(e: KeyboardEvent) {
    const items = listRef.current?.querySelectorAll("li");
    if (!items?.length) return;
    const idx = Array.from(items).indexOf(document.activeElement as HTMLLIElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = items[Math.min(idx + 1, items.length - 1)] as HTMLLIElement;
      next?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = items[Math.max(idx - 1, 0)] as HTMLLIElement;
      prev?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const el = document.activeElement as HTMLElement;
      const key = el?.dataset?.key;
      if (key) { onSelect(key); setOpen(false); }
    } else if (e.key === "Escape") {
      setOpen(false);
      const btn = containerRef.current?.querySelector(".dd-head") as HTMLElement;
      btn?.focus();
    }
  }

  return (
    <div class="route-field">
      <span class="field-label">{label}</span>
      <div class={`dd ${open ? "open" : ""}`} ref={containerRef}>
        <button
          type="button"
          class="dd-head"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => { if (!disabled) setOpen(!open); }}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " " || e.key === "ArrowDown") && !disabled) {
              e.preventDefault();
              if (!open) setOpen(true);
            }
          }}
        >
          <span class="dd-value">{display}</span>
          <span class="dd-arrow" aria-hidden="true" />
        </button>
        {open && (
          <ul class="dd-list" role="listbox" ref={listRef} onKeyDown={handleListKeyDown}>
            {options.map((opt) => (
              <li
                key={opt.key}
                data-key={opt.key}
                role="option"
                aria-selected={opt.key === selectedKey}
                tabIndex={opt.key === selectedKey ? 0 : -1}
                onClick={() => { onSelect(opt.key); setOpen(false); }}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ===== Clock Display ===== */
function ClockDisplay() {
  const [parts, setParts] = useState({ h: "--", m: "--", s: "--" });
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    function tick() {
      const n = new Date();
      setParts({ h: pad(n.getHours()), m: pad(n.getMinutes()), s: pad(n.getSeconds()) });
      setDateStr(n.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div class="clock">
        {parts.h}<span class="colon">:</span>{parts.m}<span class="colon">:</span>{parts.s}
      </div>
      <div class="masthead-date">{dateStr}</div>
    </>
  );
}

/* ===== Hero Section ===== */
function HeroSection({ data, selectedSide }: { data: Schedule[]; selectedSide: string }) {
  const [now, setNow] = useState(new Date());
  const cdNumRef = useRef<HTMLSpanElement>(null);
  const lastCdTextRef = useRef("");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const nextDeparture = useMemo(() => {
    if (data.length === 0 || !selectedSide) return null;
    let next: Schedule | null = null;
    let minDiff = Infinity;
    for (const item of data) {
      const dm = parseTimeToMinutes(item.time);
      if (dm < 0) continue;
      let diff = dm - currentMinutes;
      if (diff < 0) diff += 1440;
      if (diff < minDiff) { minDiff = diff; next = item; }
    }
    return next;
  }, [data, currentMinutes, selectedSide]);

  const countdownMinutes = useMemo(() => {
    if (!nextDeparture) return -1;
    const dm = parseTimeToMinutes(nextDeparture.time);
    if (dm < 0) return -1;
    let diff = dm - currentMinutes;
    if (diff < 0) diff += 1440;
    return diff;
  }, [nextDeparture, currentMinutes]);

  const cdText = useMemo(() => {
    if (countdownMinutes < 0) return { num: "--", unit: "" };
    if (countdownMinutes < 1) return { num: "", unit: "即将发车", urgent: true };
    if (countdownMinutes < 60) return { num: String(countdownMinutes), unit: "分钟", urgent: false };
    const hours = Math.floor(countdownMinutes / 60);
    const mins = countdownMinutes % 60;
    return { num: String(hours), unit: "小时" + (mins > 0 ? mins + "分" : ""), urgent: false };
  }, [countdownMinutes]);

  if (cdText.num + cdText.unit !== lastCdTextRef.current) {
    lastCdTextRef.current = cdText.num + cdText.unit;
    if (cdNumRef.current) {
      cdNumRef.current.classList.remove("roll");
      void cdNumRef.current.offsetWidth;
      cdNumRef.current.classList.add("roll");
    }
  }

  const routeText = selectedSide ? displayRoute(selectedSide) : "——";
  const timeText = nextDeparture ? nextDeparture.time : "--:--";

  return (
    <div class="hero" aria-live="polite">
      <div class="hero-eyebrow"><span class="dot" />下一班</div>
      <div class="hero-route">{routeText}</div>
      <div class="hero-row">
        <div class="hero-cell">
          <span class="tag">发车时刻</span>
          <span class="time">{timeText}</span>
        </div>
        <div class="hero-cell">
          <span class="tag">距发车</span>
          <span class={`chip${cdText.urgent ? " urgent" : ""}`}>
            <span class="cd-num" ref={cdNumRef}>{cdText.num}</span>
            <span class="cd-unit">{cdText.unit}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ===== Main Island ===== */
export default function StationBoard() {
  /* ---- State ---- */
  const [stations, setStations] = useState<Station[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedStationId, setSelectedStationId] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [statusMsg, setStatusMsg] = useState("正在连接站务数据…");
  const [statusErr, setStatusErr] = useState(false);
  const [hubCity, setHubCity] = useState("");

  /* ---- Refs ---- */
  const selectedStationIdRef = useRef(selectedStationId);
  selectedStationIdRef.current = selectedStationId;
  const selectedRouteIdRef = useRef(selectedRouteId);
  selectedRouteIdRef.current = selectedRouteId;

  /* ---- Load stations ---- */
  useEffect(() => {
    apiGet<Station[]>("/stations")
      .then((data) => {
        if (!data || data.length === 0) {
          setStations([]);
          setStatusMsg("暂无可选站点，请联系管理员在后台新增");
          setStatusErr(true);
          return;
        }
        setStations(data);
        const params = new URLSearchParams(location.search);
        const initialStation = params.get("station") || "";
        const initialRoute = params.get("route") || "";
        const hasStation = data.some((s) => s.id === initialStation);
        setSelectedStationId(hasStation ? initialStation : data[0].id);
        initialRouteRef.current = initialRoute;
        setStatusMsg("已连接站务数据");
        setStatusErr(false);
      })
      .catch(() => {
        setStations([]);
        setStatusMsg("连接站务数据失败");
        setStatusErr(true);
      });
  }, []);

  const initialRouteRef = useRef("");

  /* ---- Load routes for selected station ---- */
  useEffect(() => {
    if (!selectedStationId) return;
    apiGet<Route[]>("/stations/" + selectedStationId + "/routes")
      .then((data) => {
        const list = data ? data.filter((r) => r.enabled) : [];
        setRoutes(list);
        setSelectedKey("");
        setSelectedRouteId("");
        const station = stations.find((s) => s.id === selectedStationId);
        setHubCity(station?.city || "");
        if (list.length === 0) {
          setStatusMsg("该站点暂无线路，请联系管理员在后台添加");
          setStatusErr(true);
          return;
        }
        setStatusMsg("已加载 " + list.length + " 条线路");
        setStatusErr(false);
      })
      .catch(() => {
        setRoutes([]);
        setStatusMsg("加载线路失败");
        setStatusErr(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStationId]);

  /* ---- Load schedules for selected route ---- */
  useEffect(() => {
    if (!selectedRouteId) return;
    apiGet<{ route: Route; schedules: Schedule[] }>(
      "/routes/" + selectedRouteId + "/schedules",
    )
      .then((resp) => {
        const list = resp?.schedules ? resp.schedules.filter((s) => s.enabled) : [];
        setSchedules(list);
      })
      .catch(() => setSchedules([]));
  }, [selectedRouteId]);

  /* ---- Route pairs (dep/ret merge) ---- */
  const routePairs = useMemo(() => {
    const map: Record<string, { a: Route; b: Route | null }> = {};
    for (const r of routes) {
      const k = pairKey(r.name);
      if (!map[k]) map[k] = { a: r, b: null };
      else if (r.id !== map[k].a.id) map[k].b = r;
    }
    return Object.keys(map).sort().map((k) => map[k]);
  }, [routes]);

  const currentPairByKey = useMemo(
    () => routePairs.find((p) => pairKey(p.a.name) === selectedKey) || null,
    [routePairs, selectedKey],
  );

  /* ---- Select route pair & preferred side ---- */
  function selectPair(key: string) {
    const pair = routePairs.find((p) => pairKey(p.a.name) === key);
    if (!pair) return;
    const hub = hubCity;
    const preferred = directionOf(pair.a.name, hub) === "dep"
      ? pair.a
      : (pair.b && directionOf(pair.b.name, hub) === "dep" ? pair.b : pair.a);
    setSelectedKey(key);
    setSelectedRouteId(preferred.id);
    syncUrl(selectedStationIdRef.current, preferred.id);
  }

  /* ---- Reverse direction ---- */
  function handleReverse() {
    if (!currentPairByKey?.b) return;
    const newSide = selectedRouteId === currentPairByKey.a.id
      ? currentPairByKey.b
      : currentPairByKey.a;
    setSelectedRouteId(newSide.id);
    syncUrl(selectedStationIdRef.current, newSide.id);
  }

  /* ---- URL sync ---- */
  function syncUrl(stationId?: string, routeId?: string) {
    const params = new URLSearchParams();
    const st = stationId !== undefined ? stationId : selectedStationIdRef.current;
    const rt = routeId !== undefined ? routeId : selectedRouteIdRef.current;
    if (st) params.set("station", st);
    if (rt) params.set("route", rt);
    const qs = params.toString();
    try { history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "")); } catch {}
  }

  function buildShareUrl(): string {
    const params = new URLSearchParams();
    if (selectedStationIdRef.current) params.set("station", selectedStationIdRef.current);
    if (selectedRouteIdRef.current) params.set("route", selectedRouteIdRef.current);
    const base = location.href.split("?")[0];
    return params.toString() ? base + "?" + params.toString() : base;
  }

  /* ---- Auto-select route from URL after data loads ---- */
  useEffect(() => {
    if (routes.length === 0 || !initialRouteRef.current || selectedKey) return;
    const target = routes.find((r) => r.id === initialRouteRef.current);
    if (target && target.enabled) {
      const k = pairKey(target.name);
      setSelectedKey(k);
      setSelectedRouteId(target.id);
    }
    initialRouteRef.current = "";
  }, [routes]);

  /* ---- 30s auto-refresh ---- */
  useEffect(() => {
    if (!selectedRouteId) return;
    const id = setInterval(() => {
      apiGet<{ route: Route; schedules: Schedule[] }>(
        "/routes/" + selectedRouteIdRef.current + "/schedules",
      )
        .then((resp) => {
          const list = resp?.schedules ? resp.schedules.filter((s) => s.enabled) : [];
          setSchedules(list);
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [selectedRouteId]);

  /* ---- Share ---- */
  function handleShare() {
    const text = buildShareUrl();
    function done() {
      const btn = document.querySelector(".btn-share")!;
      const orig = btn.textContent || "分享";
      btn.textContent = "已复制";
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
      done();
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  /* ---- Title ---- */
  useEffect(() => {
    const station = stations.find((s) => s.id === selectedStationId);
    document.title = station ? station.name + " · 班车时刻表" : "班车时刻表";
  }, [stations, selectedStationId]);

  /* ======== Render ======== */
  const selectedStation = stations.find((s) => s.id === selectedStationId);
  const stationName = selectedStation?.name || "班车时刻表";

  const stationOptions: OptionItem[] = stations.map((s) => ({
    key: s.id,
    label: s.name,
  }));
  const routeOptions: OptionItem[] = routePairs.map((p) => ({
    key: pairKey(p.a.name),
    label: endpointA(p.a.name) + " - " + endpointB(p.a.name),
  }));

  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const sortedSchedules = useMemo(
    () => [...schedules].sort(
      (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time),
    ),
    [schedules],
  );

  const nextDeparture = useMemo(() => {
    if (schedules.length === 0 || !selectedRouteId) return null;
    let next: Schedule | null = null;
    let minDiff = Infinity;
    for (const item of schedules) {
      const dm = parseTimeToMinutes(item.time);
      if (dm < 0) continue;
      let diff = dm - currentMinutes;
      if (diff < 0) diff += 1440;
      if (diff < minDiff) { minDiff = diff; next = item; }
    }
    return next;
  }, [schedules, currentMinutes, selectedRouteId]);

  const selectedSideName = routes.find((r) => r.id === selectedRouteId)?.name || "";

  return (
    <main class="station">
      {/* 蓝牌：站钟 */}
      <header class="masthead">
        <ClockDisplay />
      </header>

      {/* 电子信息屏 */}
      <section class="board">
        <Dropdown
          label="站点"
          options={stationOptions}
          selectedKey={selectedStationId}
          placeholder="正在加载站点…"
          disabled={stations.length === 0}
          onSelect={(key) => {
            setSelectedStationId(key);
            syncUrl(key, "");
          }}
        />

        <Dropdown
          label="线路"
          options={routeOptions}
          selectedKey={selectedKey}
          placeholder={routes.length === 0 ? "该站点暂无线路" : "请选择线路"}
          disabled={routePairs.length === 0}
          onSelect={(key) => selectPair(key)}
        />

        <div class="reverse-row">
          <button
            type="button"
            class="btn-reverse"
            disabled={!currentPairByKey?.b}
            title={currentPairByKey?.b ? displayRoute(currentPairByKey.b.name) : ""}
            onClick={handleReverse}
          >
            换方向
          </button>
        </div>

        <HeroSection data={sortedSchedules} selectedSide={selectedSideName} />

        <div class="departures">
          <div class="dep-head">
            <span>发车时刻</span>
            <span class="count">{sortedSchedules.length > 0 ? sortedSchedules.length + " 班" : ""}</span>
          </div>
          <div class="list">
            {sortedSchedules.length === 0
              ? (
                <div class="empty">
                  {selectedRouteId ? "该方向暂无班次" : "请选择线路"}
                </div>
              )
              : sortedSchedules.map((item, i) => {
                const dm = parseTimeToMinutes(item.time);
                const past = dm < currentMinutes ? " past" : "";
                const lit = nextDeparture && item.time === nextDeparture.time ? " lit" : "";
                return (
                  <div key={item.time + i} class={`row${past}${lit}`} style={`--i: ${i}`}>
                    <span class="time">{item.time}</span>
                    {item.note && <span class="note">{item.note}</span>}
                  </div>
                );
              })}
          </div>
        </div>

        <footer class="boardfoot">班次如有变动，以车站现场公告为准</footer>
      </section>

      {/* 数据栏 */}
      <section class="notice">
        <div class="notice-row">
          <button class="btn-share" onClick={handleShare}>分享</button>
          <span class={`file-status${statusErr ? " error" : ""}`}>{statusMsg}</span>
        </div>
      </section>
    </main>
  );
}