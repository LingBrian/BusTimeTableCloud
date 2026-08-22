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

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const handler = define.handlers({
  GET: async () => {
    try {
      const kv = await getKv();
      const routes: Route[] = [];
      const iter = kv.list<Route>({ prefix: ["routes"] });
      for await (const entry of iter) {
        routes.push(entry.value);
      }
      routes.sort((a, b) => a.name.localeCompare(b.name));
      return okResponse(routes);
    } catch (e) {
      console.error("GET /api/routes error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "获取线路列表失败");
    }
  },
});