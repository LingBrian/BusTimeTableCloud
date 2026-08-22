import { define } from "../../../utils.ts";
import { getKv } from "../../../lib/kv.ts";
import { okResponse, errorResponse } from "../../../lib/auth.ts";
import type { Station } from "../../../lib/schema.ts";

export const handler = define.handlers({
  GET: async (_ctx) => {
    try {
      const id = _ctx.params.id;
      const kv = await getKv();
      const entry = await kv.get<Station>(["stations", id]);
      if (!entry.value) {
        return errorResponse(404, "NOT_FOUND", "站点不存在");
      }
      return okResponse(entry.value);
    } catch (e) {
      console.error("GET /api/stations/:id error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "获取站点失败");
    }
  },
  PUT: async (_ctx) => {
    try {
      if (!_ctx.state.user) {
        return errorResponse(401, "UNAUTHORIZED", "未登录");
      }
      const id = _ctx.params.id;
      const kv = await getKv();
      const entry = await kv.get<Station>(["stations", id]);
      if (!entry.value) {
        return errorResponse(404, "NOT_FOUND", "站点不存在");
      }

      const body = await _ctx.req.json();
      const { name, city } = body;
      const updated: Station = {
        ...entry.value,
        name: name ?? entry.value.name,
        city: city ?? entry.value.city,
      };

      await kv.set(["stations", id], updated);
      return okResponse(updated);
    } catch (e) {
      console.error("PUT /api/stations/:id error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "更新站点失败");
    }
  },
  DELETE: async (_ctx) => {
    try {
      if (!_ctx.state.user) {
        return errorResponse(401, "UNAUTHORIZED", "未登录");
      }
      const id = _ctx.params.id;
      const kv = await getKv();
      const entry = await kv.get<Station>(["stations", id]);
      if (!entry.value) {
        return errorResponse(404, "NOT_FOUND", "站点不存在");
      }

      await kv.delete(["stations", id]);
      return okResponse(null, 200);
    } catch (e) {
      console.error("DELETE /api/stations/:id error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "删除站点失败");
    }
  },
});