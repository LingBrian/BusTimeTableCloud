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
      return okResponse(schedules);
    } catch (e) {
      console.error("GET /api/routes/:id/schedules error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "获取班次列表失败");
    }
  },
  POST: async (_ctx) => {
    try {
      if (!_ctx.state.user) {
        return errorResponse(401, "UNAUTHORIZED", "未登录");
      }
      const routeId = _ctx.params.id;
      const kv = await getKv();
      const route = await kv.get<Route>(["routes", routeId]);
      if (!route.value) {
        return errorResponse(404, "NOT_FOUND", "线路不存在");
      }

      const body = await _ctx.req.json();
      const { time, note } = body;
      if (!time) {
        return errorResponse(400, "BAD_REQUEST", "发车时间不能为空");
      }

      const schedule: Schedule = {
        routeId,
        time,
        note: note || "",
        enabled: true,
      };

      await kv.set(["schedules", routeId, time], schedule);
      return okResponse(schedule, 201);
    } catch (e) {
      console.error("POST /api/routes/:id/schedules error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "创建班次失败");
    }
  },
});