import { define } from "../../../../utils.ts";
import { getKv } from "../../../../lib/kv.ts";
import { okResponse, errorResponse } from "../../../../lib/auth.ts";
import type { Schedule } from "../../../../lib/schema.ts";

export const handler = define.handlers({
  PUT: async (_ctx) => {
    try {
      if (!_ctx.state.user) {
        return errorResponse(401, "UNAUTHORIZED", "未登录");
      }
      const { routeId, time } = _ctx.params;
      const kv = await getKv();
      const entry = await kv.get<Schedule>(["schedules", routeId, time]);
      if (!entry.value) {
        return errorResponse(404, "NOT_FOUND", "班次不存在");
      }

      const body = await _ctx.req.json();
      const updated: Schedule = {
        ...entry.value,
        time: body.time ?? entry.value.time,
        note: body.note !== undefined ? body.note : entry.value.note,
        enabled: body.enabled !== undefined ? body.enabled : entry.value.enabled,
      };

      // If time changed, delete old key and set new one
      if (body.time && body.time !== time) {
        const atomic = kv.atomic();
        atomic.delete(["schedules", routeId, time]);
        atomic.set(["schedules", routeId, body.time], updated);
        await atomic.commit();
      } else {
        await kv.set(["schedules", routeId, updated.time], updated);
      }

      return okResponse(updated);
    } catch (e) {
      console.error("PUT /api/schedules/:routeId/:time error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "更新班次失败");
    }
  },
  DELETE: async (_ctx) => {
    try {
      if (!_ctx.state.user) {
        return errorResponse(401, "UNAUTHORIZED", "未登录");
      }
      const { routeId, time } = _ctx.params;
      const kv = await getKv();
      const entry = await kv.get<Schedule>(["schedules", routeId, time]);
      if (!entry.value) {
        return errorResponse(404, "NOT_FOUND", "班次不存在");
      }

      await kv.delete(["schedules", routeId, time]);
      return okResponse(null, 200);
    } catch (e) {
      console.error("DELETE /api/schedules/:routeId/:time error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "删除班次失败");
    }
  },
});