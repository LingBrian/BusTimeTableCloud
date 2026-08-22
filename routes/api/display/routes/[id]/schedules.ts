import { define } from "../../../../../utils.ts";
import { getKv } from "../../../../../lib/kv.ts";
import { okResponse, errorResponse } from "../../../../../lib/auth.ts";
import type { Route, Schedule } from "../../../../../lib/schema.ts";

export const handler = define.handlers({
  GET: async (_ctx) => {
    try {
      const routeId = _ctx.params.id;

      const kv = await getKv();
      const route = await kv.get<Route>(["routes", routeId]);
      if (!route.value) {
        return errorResponse(404, "NOT_FOUND", "线路不存在");
      }

      const schedules: Schedule[] = [];
      const iter = kv.list<Schedule>({ prefix: ["schedules", routeId] });
      for await (const entry of iter) {
        schedules.push(entry.value);
      }

      schedules.sort((a, b) => a.time.localeCompare(b.time));

      return okResponse({ route: route.value, schedules });
    } catch (e) {
      console.error("GET /api/display/routes/:routeId/schedules error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "获取班次列表失败");
    }
  },
});