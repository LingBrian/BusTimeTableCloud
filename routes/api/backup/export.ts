import { define } from "../../../utils.ts";
import { getKv } from "../../../lib/kv.ts";
import { okResponse, errorResponse } from "../../../lib/auth.ts";
import { exportAll } from "../../../lib/backup.ts";

export const handler = define.handlers({
  GET: async () => {
    try {
      const kv = await getKv();
      const data = await exportAll(kv);
      return okResponse(data);
    } catch (e) {
      console.error("GET /api/backup/export error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "导出失败");
    }
  },
});