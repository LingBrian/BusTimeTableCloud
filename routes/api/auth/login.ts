import { define } from "../../../utils.ts";
import { getKv } from "../../../lib/kv.ts";
import { okResponse, errorResponse, createToken, verifyPassword } from "../../../lib/auth.ts";
import type { User } from "../../../lib/schema.ts";

export const handler = define.handlers({
  POST: async (ctx) => {
    try {
      const body = await ctx.req.json();
      const { username, password } = body;
      if (!username || !password) {
        return errorResponse(400, "BAD_REQUEST", "用户名和密码不能为空");
      }

      const kv = await getKv();
      const userEntry = await kv.get<User>(["users", username]);
      if (!userEntry.value) {
        return errorResponse(401, "UNAUTHORIZED", "用户名或密码错误");
      }

      const valid = await verifyPassword(password, userEntry.value.passwordHash);
      if (!valid) {
        return errorResponse(401, "UNAUTHORIZED", "用户名或密码错误");
      }

      const token = await createToken({
        username: userEntry.value.username,
        role: userEntry.value.role,
      });

      return okResponse({
        token,
        user: {
          username: userEntry.value.username,
          role: userEntry.value.role,
        },
      });
    } catch (e) {
      console.error("POST /api/auth/login error:", e);
      return errorResponse(500, "INTERNAL_ERROR", "登录失败");
    }
  },
});