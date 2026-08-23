import { define } from "../../../utils.ts";
import { getKv } from "../../../lib/kv.ts";
import {
  errorResponse,
  hashPassword,
  okResponse,
  verifyPassword,
} from "../../../lib/auth.ts";
import type { User } from "../../../lib/schema.ts";

export const handler = define.handlers({
  PUT: async (ctx) => {
    try {
      const { user } = ctx.state;
      if (!user) {
        return errorResponse(401, "UNAUTHORIZED", "未登录");
      }

      const body = await ctx.req.json();
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) {
        return errorResponse(400, "BAD_REQUEST", "原密码和新密码不能为空");
      }
      if (newPassword.length < 6) {
        return errorResponse(400, "BAD_REQUEST", "新密码至少 6 位");
      }
      if (newPassword === currentPassword) {
        return errorResponse(400, "BAD_REQUEST", "新密码不能与原密码相同");
      }

      const kv = await getKv();
      const userEntry = await kv.get<User>(["users", user.username]);
      if (!userEntry.value) {
        return errorResponse(404, "NOT_FOUND", "用户不存在");
      }

      const valid = await verifyPassword(
        currentPassword,
        userEntry.value.passwordHash,
      );
      if (!valid) {
        return errorResponse(400, "BAD_REQUEST", "原密码不正确");
      }

      const passwordHash = await hashPassword(newPassword);
      await kv.set(["users", user.username], {
        ...userEntry.value,
        passwordHash,
      });

      return okResponse({ username: user.username });
    } catch (e) {
      console.error("PUT /api/auth/password error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "修改密码失败");
    }
  },
});
