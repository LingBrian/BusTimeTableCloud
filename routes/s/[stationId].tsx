import { HttpError } from "fresh";
import { define } from "../../utils.ts";
import Seo from "../../components/Seo.tsx";
import { getKv } from "../../lib/kv.ts";
import type { Route, Station } from "../../lib/schema.ts";
import { displayRoute } from "../../lib/routeUtils.ts";
import {
  breadcrumbJsonLd,
  SEO_ORIGIN,
  SEO_SITE_NAME,
  websiteJsonLd,
} from "../../lib/seo.ts";

export default define.page(async (ctx) => {
  const { stationId } = ctx.params;
  const kv = await getKv();
  const station = await kv.get<Station>(["stations", stationId]);
  if (!station.value) throw new HttpError(404);

  const routes: Route[] = [];
  for await (const entry of kv.list<Route>({ prefix: ["routes"] })) {
    if (entry.value.stationId === stationId && entry.value.enabled) {
      routes.push(entry.value);
    }
  }
  routes.sort((a, b) => a.name.localeCompare(b.name, "zh"));

  const title =
    `${station.value.name}班车时刻表 - ${station.value.city}汽车站发车班次`;
  const canonical = `${SEO_ORIGIN}/s/${station.value.id}`;
  const description =
    `${station.value.name}（${station.value.city}）经营线路 ${routes.length} 条，全天发车班次查询。班次如有变动，以车站现场公告为准。`;

  // C1 + C3：BusStation / WebSite / BreadcrumbList
  const jsonLd = [
    websiteJsonLd(),
    breadcrumbJsonLd([
      { name: "首页", url: `${SEO_ORIGIN}/` },
      { name: station.value.name },
    ]),
    {
      "@type": "BusStation",
      "@id": canonical,
      name: station.value.name,
      url: canonical,
      address: {
        "@type": "PostalAddress",
        addressLocality: station.value.city,
        addressCountry: "CN",
      },
    },
  ];

  return (
    <div>
      <Seo
        title={title}
        description={description}
        canonical={canonical}
        jsonLd={jsonLd}
      />

      <link rel="stylesheet" href="/seo-pages.css" />
      <div class="s-page">
        <header class="s-mast">
          <a class="s-brand" href="/">{SEO_SITE_NAME}</a>
        </header>

        <nav class="s-crumb" aria-label="面包屑">
          <a href="/">首页</a>
          <span aria-hidden="true">/</span>
          <span>{station.value.name}</span>
        </nav>

        <main class="s-card">
          <h1>{station.value.name}班车时刻表</h1>
          <p class="s-meta">
            所在地：{station.value.city} · 运营线路：{routes.length} 条
          </p>

          <section aria-labelledby="route-list">
            <h2 id="route-list" class="s-sec">线路与发车班次</h2>
            {routes.length === 0
              ? <p class="s-empty">该站暂无运营线路，请联系车站确认。</p>
              : (
                <ul class="s-routes">
                  {routes.map((r) => (
                    <li key={r.id}>
                      <a class="s-route" href={`/r/${r.id}`}>
                        {displayRoute(r.name)}
                      </a>
                      <span class="s-route-note">查看班次</span>
                    </li>
                  ))}
                </ul>
              )}
          </section>
        </main>

        <footer class="s-foot">
          <p>
            各班次如有变动，以车站现场公告为准。需要实时倒计时与方向切换，可<a href="/">
              返回站台电子屏查询
            </a>。
          </p>
        </footer>
      </div>
    </div>
  );
});
