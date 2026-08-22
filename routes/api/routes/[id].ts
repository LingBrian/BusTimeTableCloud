import { define } from "../../../utils.ts";
import { getKv } from "../../../lib/kv.ts";
import { okResponse, errorResponse } from "../../../lib/auth.ts";
import type { Route } from "../../../lib/schema.ts";

function endpointA(r: string): string {
  const i = r.indexOf("-");
  return i === -1 ? r : r.slice(0, i);
}

function endpointB(r: string): string {
  const i = r.indexOf("-");
  return i === -1 ? "" : r.slice(i + 1);
}

export const handler = define.handlers({
  GET: async (_ctx) => {
    try {
      const id = _ctx.params.id;
      const kv = await getKv();
      const entry = await kv.get<Route>(["routes", id]);
      if (!entry.value) {
        return errorResponse(404, "NOT_FOUND", "线路不存在");
      }
      return okResponse(entry.value);
    } catch (e) {
      console.error("GET /api/routes/:id error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "获取线路失败");
    }
  },
  PUT: async (_ctx) => {
    try {
      if (!_ctx.state.user) {
        return errorResponse(401, "UNAUTHORIZED", "未登录");
      }
      const id = _ctx.params.id;
      const kv = await getKv();
      const entry = await kv.get<Route>(["routes", id]);
      if (!entry.value) {
        return errorResponse(404, "NOT_FOUND", "线路不存在");
      }

      const body = await _ctx.req.json();
      const { name, enabled } = body;
      const updated: Route = {
        ...entry.value,
        name: name ?? entry.value.name,
        from: name ? endpointA(name) : entry.value.from,
        to: name ? endpointB(name) : entry.value.to,
        enabled: enabled !== undefined ? enabled : entry.value.enabled,
      };

      await kv.set(["routes", id], updated);
      return okResponse(updated);
    } catch (e) {
      console.error("PUT /api/routes/:id error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "更新线路失败");
    }
  },
  DELETE: async (_ctx) => {
    try {
      if (!_ctx.state.user) {
        return errorResponse(401, "UNAUTHORIZED", "未登录");
      }
      const id = _ctx.params.id;
      const kv = await getKv();
      const entry = await kv.get<Route>(["routes", id]);
      if (!entry.value) {
        return errorResponse(404, "NOT_FOUND", "线路不存在");
      }

      await kv.delete(["routes", id]);
      return okResponse(null, 200);
    } catch (e) {
      console.error("DELETE /api/routes/:id error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "删除线路失败");
    }
  },
});