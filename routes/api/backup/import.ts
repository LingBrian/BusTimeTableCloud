import { define } from "../../../utils.ts";
import { getKv } from "../../../lib/kv.ts";
import { okResponse, errorResponse } from "../../../lib/auth.ts";
import { clearTables, parseBackup, restoreTables } from "../../../lib/backup.ts";

export const handler = define.handlers({
  POST: async (_ctx) => {
    try {
      if (!_ctx.state.user) {
        return errorResponse(401, "UNAUTHORIZED", "未登录");
      }
      if (_ctx.state.user.role !== "admin") {
        return errorResponse(403, "FORBIDDEN", "仅管理员可导入数据");
      }
      const kv = await getKv();
      const raw = await _ctx.req.json();
      const data = parseBackup(raw);
      if (!data || (data.stations.length + data.routes.length + data.schedules.length) === 0) {
        return errorResponse(400, "BAD_REQUEST", "备份 JSON 格式不正确或内容为空");
      }

      await clearTables(kv);
      const counts = await restoreTables(kv, data);
      return okResponse(counts, 201);
    } catch (e) {
      console.error("POST /api/backup/import error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "导入失败");
    }
  },
});