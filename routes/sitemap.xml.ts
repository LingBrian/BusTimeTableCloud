import { define } from "../utils.ts";
import { getKv } from "../lib/kv.ts";
import type { Route, Station } from "../lib/schema.ts";
import { SEO_ORIGIN } from "../lib/seo.ts";

export const handler = define.handlers({
  GET: async () => {
    try {
      const kv = await getKv();
      const stations: Station[] = [];
      for await (const entry of kv.list<Station>({ prefix: ["stations"] })) {
        stations.push(entry.value);
      }
      const routes: Route[] = [];
      for await (const entry of kv.list<Route>({ prefix: ["routes"] })) {
        if (entry.value.enabled) routes.push(entry.value);
      }

      const today = new Date().toISOString().slice(0, 10);
      const lines: string[] = [];
      lines.push(
        `  <url>\n    <loc>${SEO_ORIGIN}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`,
      );
      for (const s of stations) {
        lines.push(
          `  <url>\n    <loc>${SEO_ORIGIN}/s/${s.id}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>`,
        );
      }
      for (const r of routes) {
        lines.push(
          `  <url>\n    <loc>${SEO_ORIGIN}/r/${r.id}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
        );
      }

      const xml = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
        lines.join("\n"),
        `</urlset>`,
      ].join("\n");

      return new Response(xml, {
        headers: { "Content-Type": "application/xml; charset=utf-8" },
      });
    } catch (e) {
      console.error("GET /sitemap.xml error:", e);
      return new Response("Failed to generate sitemap", { status: 500 });
    }
  },
});
