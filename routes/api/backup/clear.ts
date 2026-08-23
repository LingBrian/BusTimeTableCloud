import { define } from "../../../utils.ts";
import { getKv } from "../../../lib/kv.ts";
import { okResponse, errorResponse } from "../../../lib/auth.ts";
import { clearTables } from "../../../lib/backup.ts";

export const handler = define.handlers({
  DELETE: async (_ctx) => {
    try {
      if (!_ctx.state.user) {
        return errorResponse(401, "UNAUTHORIZED", "未登录");
      }
      if (_ctx.state.user.role !== "admin") {
        return errorResponse(403, "FORBIDDEN", "仅管理员可清空数据");
      }
      const kv = await getKv();
      const counts = await clearTables(kv);
      return okResponse(counts);
    } catch (e) {
      console.error("DELETE /api/backup/clear error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "清空数据失败");
    }
  },
});