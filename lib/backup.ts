import type { Station, Route, Schedule } from "./schema.ts";

export interface BackupData {
  version: number;
  exportedAt: string;
  stations: Station[];
  routes: Route[];
  schedules: Schedule[];
}

const OP_LIMIT = 900;

async function listPrefix<T>(
  kv: Deno.Kv,
  prefix: string[],
): Promise<T[]> {
  const out: T[] = [];
  for await (const entry of kv.list<T>({ prefix })) {
    out.push(entry.value);
  }
  return out;
}

async function clearPrefix(kv: Deno.Kv, prefix: string[]): Promise<number> {
  const keys: Deno.KvKey[] = [];
  for await (const entry of kv.list({ prefix })) {
    keys.push(entry.key);
  }
  let count = 0;
  for (let i = 0; i < keys.length; i += OP_LIMIT) {
    const chunk = keys.slice(i, i + OP_LIMIT);
    const atomic = kv.atomic();
    for (const key of chunk) atomic.delete(key);
    const res = await atomic.commit();
    if (!res.ok) throw new Error("clearPrefix atomic commit failed");
    count += chunk.length;
  }
  return count;
}

async function commitEntries(
  kv: Deno.Kv,
  entries: { key: Deno.KvKey; value: unknown }[],
): Promise<number> {
  let count = 0;
  for (let i = 0; i < entries.length; i += OP_LIMIT) {
    const chunk = entries.slice(i, i + OP_LIMIT);
    const atomic = kv.atomic();
    for (const { key, value } of chunk) atomic.set(key, value as Deno.KvValue);
    const res = await atomic.commit();
    if (!res.ok) throw new Error("commitEntries atomic commit failed");
    count += chunk.length;
  }
  return count;
}

function endpointA(r: string): string {
  const i = r.indexOf("-");
  return i === -1 ? r : r.slice(0, i);
}

function endpointB(r: string): string {
  const i = r.indexOf("-");
  return i === -1 ? "" : r.slice(i + 1);
}

export async function exportAll(kv: Deno.Kv): Promise<BackupData> {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    stations: await listPrefix<Station>(kv, ["stations"]),
    routes: await listPrefix<Route>(kv, ["routes"]),
    schedules: await listPrefix<Schedule>(kv, ["schedules"]),
  };
}

export async function clearTables(
  kv: Deno.Kv,
): Promise<{ stations: number; routes: number; schedules: number }> {
  return {
    stations: await clearPrefix(kv, ["stations"]),
    routes: await clearPrefix(kv, ["routes"]),
    schedules: await clearPrefix(kv, ["schedules"]),
  };
}

export function parseBackup(raw: unknown): BackupData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.stations)) return null;
  if (!Array.isArray(obj.routes)) return null;
  if (!Array.isArray(obj.schedules)) return null;

  const now = Date.now();
  const stations: Station[] = [];
  const routes: Route[] = [];
  const schedules: Schedule[] = [];

  for (const item of obj.stations as unknown[]) {
    if (typeof item !== "object" || item === null) continue;
    const s = item as Record<string, unknown>;
    if (typeof s.id !== "string" || !s.id) continue;
    stations.push({
      id: s.id,
      name: typeof s.name === "string" ? s.name : s.id,
      city: typeof s.city === "string" ? s.city : "",
      createdAt: typeof s.createdAt === "number" ? s.createdAt : now,
    });
  }

  for (const item of obj.routes as unknown[]) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== "string" || !r.id) continue;
    if (typeof r.stationId !== "string" || !r.stationId) continue;
    const name = typeof r.name === "string" ? r.name : "";
    if (!name) continue;
    routes.push({
      id: r.id,
      stationId: r.stationId,
      name,
      from: typeof r.from === "string" ? r.from : endpointA(name),
      to: typeof r.to === "string" ? r.to : endpointB(name),
      enabled: typeof r.enabled === "boolean" ? r.enabled : true,
      createdAt: typeof r.createdAt === "number" ? r.createdAt : now,
    });
  }

  for (const item of obj.schedules as unknown[]) {
    if (typeof item !== "object" || item === null) continue;
    const s = item as Record<string, unknown>;
    if (typeof s.routeId !== "string" || !s.routeId) continue;
    if (typeof s.time !== "string" || !s.time) continue;
    schedules.push({
      routeId: s.routeId,
      time: s.time,
      note: typeof s.note === "string" ? s.note : "",
      enabled: typeof s.enabled === "boolean" ? s.enabled : true,
    });
  }

  return { version: 1, exportedAt: new Date().toISOString(), stations, routes, schedules };
}

export async function restoreTables(
  kv: Deno.Kv,
  data: BackupData,
): Promise<{ stations: number; routes: number; schedules: number }> {
  const stationEntries = data.stations.map((s) => ({
    key: ["stations", s.id],
    value: s,
  }));
  const routeEntries = data.routes.map((r) => ({
    key: ["routes", r.id],
    value: r,
  }));
  const scheduleEntries = data.schedules.map((s) => ({
    key: ["schedules", s.routeId, s.time],
    value: s,
  }));

  return {
    stations: await commitEntries(kv, stationEntries),
    routes: await commitEntries(kv, routeEntries),
    schedules: await commitEntries(kv, scheduleEntries),
  };
}