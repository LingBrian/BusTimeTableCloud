import { getKv } from "../lib/kv.ts";
import type { Station, Route, Schedule, User } from "../lib/schema.ts";
import { hashPassword } from "../lib/auth.ts";

interface TimetableMeta {
  name: string;
  file: string;
  hubCity?: string;
}

interface ScheduleItem {
  route: string;
  time: string;
  note?: string;
}

function hashId(name: string): string {
  let h = 0;
  for (const ch of name) {
    h = ((h << 5) - h) + ch.charCodeAt(0);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function endpointA(r: string): string {
  const i = r.indexOf("-");
  return i === -1 ? r : r.slice(0, i);
}

function endpointB(r: string): string {
  const i = r.indexOf("-");
  return i === -1 ? "" : r.slice(i + 1);
}

async function seed() {
  const kv = await getKv();

  console.log("[seed] 读取 index.json...");
  const indexText = await Deno.readTextFile("static/data/index.json");
  const manifest: TimetableMeta[] = JSON.parse(indexText);

  if (!Array.isArray(manifest) || manifest.length === 0) {
    console.error("[seed] index.json 为空或格式错误");
    Deno.exit(1);
  }

  const now = Date.now();
  let stationCount = 0, routeCount = 0, scheduleCount = 0;

  for (const entry of manifest) {
    const stationName = entry.name;
    const stationId = hashId(stationName);
    const hubCity = entry.hubCity || stationName;

    console.log(`[seed] 处理站点: ${stationName} (${stationId})`);

    const station: Station = {
      id: stationId,
      name: stationName,
      city: hubCity,
      createdAt: now,
    };
    await kv.set(["stations", stationId], station);
    stationCount++;

    const filePath = `static/data/${entry.file}`;
    let schedulesData: ScheduleItem[];
    try {
      const text = await Deno.readTextFile(filePath);
      schedulesData = JSON.parse(text);
    } catch (e) {
      console.error(`[seed] 读取 ${filePath} 失败:`, e);
      continue;
    }

    if (!Array.isArray(schedulesData)) {
      console.error(`[seed] ${filePath} 格式错误`);
      continue;
    }

    const seenRoutes = new Set<string>();

    for (const item of schedulesData) {
      if (!item.route || !item.time) continue;

      const routeId = hashId(stationId + "-" + item.route);

      if (!seenRoutes.has(routeId)) {
        seenRoutes.add(routeId);
        const route: Route = {
          id: routeId,
          stationId,
          name: item.route,
          from: endpointA(item.route),
          to: endpointB(item.route),
          enabled: true,
          createdAt: now,
        };
        await kv.set(["routes", routeId], route);
        routeCount++;
      }

      const schedule: Schedule = {
        routeId,
        time: item.time,
        note: item.note || "",
        enabled: true,
      };
      await kv.set(["schedules", routeId, item.time], schedule);
      scheduleCount++;
    }
  }

  console.log("[seed] 创建管理员用户...");
  const passwordHash = await hashPassword("admin123");
  const admin: User = {
    username: "admin",
    passwordHash,
    role: "admin",
    createdAt: now,
  };
  await kv.set(["users", "admin"], admin);

  console.log(`[seed] 完成! 站点: ${stationCount}, 线路: ${routeCount}, 班次: ${scheduleCount}, 用户: 1`);
}

if (import.meta.main) {
  seed().catch((e) => {
    console.error("[seed] 失败:", e);
    Deno.exit(1);
  });
}