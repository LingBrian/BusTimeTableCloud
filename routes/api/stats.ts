import { define } from "../../utils.ts";
import { getKv } from "../../lib/kv.ts";
import { okResponse, errorResponse } from "../../lib/auth.ts";

export const handler = define.handlers({
  GET: async () => {
    try {
      const kv = await getKv();
      let stations = 0;
      let routes = 0;
      let schedules = 0;
      for await (const _ of kv.list({ prefix: ["stations"] })) stations++;
      for await (const _ of kv.list({ prefix: ["routes"] })) routes++;
      for await (const _ of kv.list({ prefix: ["schedules"] })) schedules++;
      return okResponse({ stations, routes, schedules });
    } catch (e) {
      console.error("GET /api/stats error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "获取统计数据失败");
    }
  },
});