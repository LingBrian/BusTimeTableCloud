import { define } from "../../../utils.ts";
import { getKv } from "../../../lib/kv.ts";
import { okResponse, errorResponse } from "../../../lib/auth.ts";
import type { Station } from "../../../lib/schema.ts";

export const handler = define.handlers({
  GET: async () => {
    try {
      const kv = await getKv();
      const stations: Station[] = [];
      const iter = kv.list<string>({ prefix: ["stations"] });
      for await (const entry of iter) {
        stations.push(entry.value as unknown as Station);
      }
      return okResponse(stations);
    } catch (e) {
      console.error("GET /api/display/stations error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "获取站点列表失败");
    }
  },
});