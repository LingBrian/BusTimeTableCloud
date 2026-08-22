import { define } from "../../../../../utils.ts";
import { getKv } from "../../../../../lib/kv.ts";
import { okResponse, errorResponse } from "../../../../../lib/auth.ts";
import type { Station, Route } from "../../../../../lib/schema.ts";

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

      return okResponse(routes);
    } catch (e) {
      console.error("GET /api/display/stations/:stationId/routes error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "获取线路列表失败");
    }
  },
});