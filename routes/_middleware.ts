import { define } from "../utils.ts";
import { errorResponse } from "../lib/auth.ts";
import { type JwtPayload, verifyToken } from "../lib/auth.ts";

export const handler = define.middleware(async (ctx) => {
  try {
    const url = new URL(ctx.req.url);
    const path = url.pathname;

    const method = ctx.req.method;

    // B5：深链参数页 301 → 静态可收录路由（route 优先，其次 station）
    // 主页 "/" 除外：分享链接带参数应停留在主页电子屏，由看板自行恢复站点/线路/方向
    if (
      method === "GET" && path !== "/" && !path.startsWith("/api/") &&
      path !== "/admin"
    ) {
      const routeParam = url.searchParams.get("route");
      const stationParam = url.searchParams.get("station");
      if (routeParam) {
        return new Response(null, {
          status: 301,
          headers: {
            Location: `/r/${encodeURIComponent(routeParam)}`,
            "Cache-Control": "no-store",
          },
        });
      }
      if (stationParam) {
        return new Response(null, {
          status: 301,
          headers: {
            Location: `/s/${encodeURIComponent(stationParam)}`,
            "Cache-Control": "no-store",
          },
        });
      }
    }

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

    if (
      path.startsWith("/api/display/") || path.startsWith("/api/auth/login") ||
      isPublicRead
    ) {
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
