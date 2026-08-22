import { define } from "../../../../../utils.ts";
import { getKv } from "../../../../../lib/kv.ts";
import { okResponse, errorResponse } from "../../../../../lib/auth.ts";
import type { Route, Schedule } from "../../../../../lib/schema.ts";

export const handler = define.handlers({
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
      const { schedules } = body;
      if (!Array.isArray(schedules) || schedules.length === 0) {
        return errorResponse(400, "BAD_REQUEST", "班次列表不能为空");
      }

      const atomic = kv.atomic();
      let count = 0;
      for (const item of schedules) {
        if (!item.time) continue;
        const schedule: Schedule = {
          routeId,
          time: item.time,
          note: item.note || "",
          enabled: item.enabled !== undefined ? item.enabled : true,
        };
        atomic.set(["schedules", routeId, item.time], schedule);
        count++;
      }

      await atomic.commit();
      return okResponse({ count }, 201);
    } catch (e) {
      console.error("POST /api/routes/:id/schedules/batch error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "批量导入失败");
    }
  },
});