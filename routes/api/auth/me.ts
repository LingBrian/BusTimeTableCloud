import { define } from "../../../utils.ts";
import { okResponse, errorResponse } from "../../../lib/auth.ts";

export const handler = define.handlers({
  GET: (ctx) => {
    const { user } = ctx.state;
    if (!user) {
      return errorResponse(401, "UNAUTHORIZED", "未登录");
    }
    return okResponse({
      username: user.username,
      role: user.role,
    });
  },
});