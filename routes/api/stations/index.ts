import { define } from "../../../utils.ts";
import { getKv } from "../../../lib/kv.ts";
import { okResponse, errorResponse } from "../../../lib/auth.ts";
import type { Station } from "../../../lib/schema.ts";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const handler = define.handlers({
  GET: async () => {
    try {
      const kv = await getKv();
      const stations: Station[] = [];
      const iter = kv.list<Station>({ prefix: ["stations"] });
      for await (const entry of iter) {
        stations.push(entry.value);
      }
      stations.sort((a, b) => a.name.localeCompare(b.name));
      return okResponse(stations);
    } catch (e) {
      console.error("GET /api/stations error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "获取站点列表失败");
    }
  },
  POST: async (ctx) => {
    try {
      if (!ctx.state.user) {
        return errorResponse(401, "UNAUTHORIZED", "未登录");
      }
      const body = await ctx.req.json();
      const { name, city } = body;
      if (!name || !city) {
        return errorResponse(400, "BAD_REQUEST", "站点名称和城市不能为空");
      }

      const id = generateId();
      const station: Station = {
        id,
        name,
        city,
        createdAt: Date.now(),
      };

      const kv = await getKv();
      await kv.set(["stations", id], station);
      return okResponse(station, 201);
    } catch (e) {
      console.error("POST /api/stations error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "创建站点失败");
    }
  },
});