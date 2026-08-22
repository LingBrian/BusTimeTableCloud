import { define } from "../../../../utils.ts";
import { getKv } from "../../../../lib/kv.ts";
import { okResponse, errorResponse } from "../../../../lib/auth.ts";
import type { Station, Route } from "../../../../lib/schema.ts";

function endpointA(r: string): string {
  const i = r.indexOf("-");
  return i === -1 ? r : r.slice(0, i);
}

function endpointB(r: string): string {
  const i = r.indexOf("-");
  return i === -1 ? "" : r.slice(i + 1);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const handler = define.handlers({
  GET: async (_ctx) => {
    try {
      const stationId = _ctx.params.stationId;
      const kv = await getKv();
      const station = await kv.get<Station>(["stations", stationId]);
      if (!station.value) {
        return errorResponse(404, "NOT_FOUND", "站点不存在");
      }

      const routes: Route[] = [];
      const iter = kv.list<Route>({ prefix: ["routes"] });
      for await (const entry of iter) {
        if (entry.value.stationId === stationId) {
          routes.push(entry.value);
        }
      }
      routes.sort((a, b) => a.name.localeCompare(b.name));
      return okResponse(routes);
    } catch (e) {
      console.error("GET /api/stations/:stationId/routes error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "获取线路列表失败");
    }
  },
  POST: async (_ctx) => {
    try {
      if (!_ctx.state.user) {
        return errorResponse(401, "UNAUTHORIZED", "未登录");
      }
      const stationId = _ctx.params.stationId;
      const kv = await getKv();
      const station = await kv.get<Station>(["stations", stationId]);
      if (!station.value) {
        return errorResponse(404, "NOT_FOUND", "站点不存在");
      }

      const body = await _ctx.req.json();
      const { name } = body;
      if (!name) {
        return errorResponse(400, "BAD_REQUEST", "线路名称不能为空");
      }

      const id = generateId();
      const route: Route = {
        id,
        stationId,
        name,
        from: endpointA(name),
        to: endpointB(name),
        enabled: true,
        createdAt: Date.now(),
      };

      await kv.set(["routes", id], route);
      return okResponse(route, 201);
    } catch (e) {
      console.error("POST /api/stations/:stationId/routes error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "创建线路失败");
    }
  },
});