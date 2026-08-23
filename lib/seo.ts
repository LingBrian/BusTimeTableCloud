// 站点 SEO 常量：统一在此维护，避免多处硬编码。
// A7 域名规范化：生产部署时设置环境变量 SEO_ORIGIN（https + www 归一的正式域名），
// 或在反向代理（nginx/Deno Deploy 路由）层统一 https 跳转与 www 重定向，
// 并保持 static/robots.txt、static/sitemap.xml 中的 Sitemap 域名与之一致。

export const SEO_ORIGIN = (
  Deno.env.get("SEO_ORIGIN") ??
    "https://bustimetable-wanzai.example.com"
).replace(/\/+$/, "");

export const SEO_SITE_NAME = "万载城北汽车站班车时刻表";

export const SEO_DESCRIPTION =
  "万载城北汽车站班车时刻表，站内各线路全天发车班次与方向实时查询。班次如有变动，以车站现场公告为准。";

export const SEO_KEYWORDS =
  "万载, 班车时刻表, 万载城北汽车站, 万载汽车站, 万载客车发车时刻, 万载长途班次";

/* ===== JSON-LD 结构数据助手（阶段 C） ===== */

/** WebSite 标记 */
export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${SEO_ORIGIN}/#website`,
    name: SEO_SITE_NAME,
    url: `${SEO_ORIGIN}/`,
    "inLanguage": "zh-CN",
  };
}

export interface CrumbItem {
  name: string;
  /** 绝对地址；叶子节点可不填 */
  url?: string;
}

/** BreadcrumbList 面包屑标记 */
export function breadcrumbJsonLd(items: CrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${SEO_ORIGIN}/#breadcrumb`,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: it.url } : {}),
    })),
  };
}
