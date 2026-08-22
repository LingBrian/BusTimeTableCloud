import { define } from "../utils.ts";
import { errorResponse } from "../lib/auth.ts";
import { type JwtPayload, verifyToken } from "../lib/auth.ts";

export const handler = define.middleware(async (ctx) => {
  try {
    const url = new URL(ctx.req.url);
    const path = url.pathname;

    const method = ctx.req.method;

    // Public read-only endpoints (GET only, no auth required)
    const publicReadPatterns = [
      "/api/display/",
      "/api/auth/login",
      "/api/stations",
      "/api/routes",
      "/api/schedules",
    ];
    const isPublicRead = method === "GET" &&
      publicReadPatterns.some((p) => path.startsWith(p));

    if (path.startsWith("/api/display/") || path.startsWith("/api/auth/login") || isPublicRead) {
      ctx.state.user = null;
      return await ctx.next();
    }

    // All write operations and /api/auth/me require JWT
    if (path.startsWith("/api/")) {
      const authHeader = ctx.req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return errorResponse(401, "UNAUTHORIZED", "未提供认证令牌");
      }
      const token = authHeader.slice(7);
      const payload = await verifyToken<JwtPayload>(token);
      if (!payload) {
        return errorResponse(401, "UNAUTHORIZED", "认证令牌无效或已过期");
      }
      ctx.state.user = payload;
    }

    return await ctx.next();
  } catch (err) {
    console.error("Middleware error:", err);
    const status = err instanceof Error && "status" in err
      ? (err as unknown as { status: number }).status
      : 500;
    return errorResponse(status, "INTERNAL_ERROR", "服务器内部错误");
  }
});
