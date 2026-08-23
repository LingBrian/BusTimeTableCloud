import { HttpError } from "fresh";
import { define } from "../../utils.ts";
import Seo from "../../components/Seo.tsx";
import { getKv } from "../../lib/kv.ts";
import type { Route, Schedule, Station } from "../../lib/schema.ts";
import { endpointA, endpointB, pairKey } from "../../lib/routeUtils.ts";
import {
  breadcrumbJsonLd,
  SEO_ORIGIN,
  SEO_SITE_NAME,
  websiteJsonLd,
} from "../../lib/seo.ts";

export default define.page(async (ctx) => {
  const { routeId } = ctx.params;
  const kv = await getKv();
  const route = await kv.get<Route>(["routes", routeId]);
  if (!route.value || !route.value.enabled) throw new HttpError(404);

  const station = await kv.get<Station>([
    "stations",
    route.value.stationId,
  ]);
  if (!station.value) throw new HttpError(404);

  const schedules: Schedule[] = [];
  for await (
    const entry of kv.list<Schedule>({ prefix: ["schedules", routeId] })
  ) {
    if (entry.value.enabled) schedules.push(entry.value);
  }
  schedules.sort((a, b) => a.time.localeCompare(b.time));

  const otherRoutes: Route[] = [];
  for await (const entry of kv.list<Route>({ prefix: ["routes"] })) {
    if (
      entry.value.stationId === route.value.stationId &&
      entry.value.id !== routeId && entry.value.enabled
    ) {
      otherRoutes.push(entry.value);
    }
  }

  const from = endpointA(route.value.name);
  const to = endpointB(route.value.name);
  const reverse = otherRoutes.find(
    (r) => r.id !== routeId && pairKey(r.name) === pairKey(route.value.name),
  );

  const title = `${from}到${to}班车时刻表 - ${from}发车班次`;
  const canonical = `${SEO_ORIGIN}/r/${route.value.id}`;
  const description = `${from}汽车站→${to}发车班次${schedules.length}班：${
    schedules.slice(0, 8).map((s) => s.time).join("、")
  }等。班次如有变动，以车站现场公告为准。`;

  // C2 + C3：BusTrip（每班一个）+ WebSite + BreadcrumbList
  const jsonLd = [
    websiteJsonLd(),
    breadcrumbJsonLd([
      { name: "首页", url: `${SEO_ORIGIN}/` },
      { name: station.value.name, url: `${SEO_ORIGIN}/s/${station.value.id}` },
      { name: `${from}到${to}` },
    ]),
    ...schedules.map((s) => ({
      "@type": "BusTrip",
      "@id": `${canonical}#${s.time}`,
      name: `${from}到${to}班车 ${s.time}`,
      url: canonical,
      origin: { "@type": "BusStation", name: `${from}汽车站` },
      destination: {
        "@type": "BusStation",
        name: to ? `${to}汽车站` : `${from}汽车站`,
      },
      departureTime: `${s.time}:00`,
    })),
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
          <a href={`/s/${route.value.stationId}`}>{station.value.name}</a>
          <span aria-hidden="true">/</span>
          <span>{from}到{to}</span>
        </nav>

        <main class="s-card">
          <h1>{from}到{to}班车时刻表</h1>
          <p class="s-meta">
            {from}汽车站发车　每日班次：{schedules.length} 班
          </p>

          <section aria-labelledby="sched-list">
            <h2 id="sched-list" class="s-sec">发车时刻</h2>
            {schedules.length === 0
              ? <p class="s-empty">该方向暂无班次信息。</p>
              : (
                <ul class="s-scheds">
                  {schedules.map((s) => (
                    <li key={s.time} class="s-sched">
                      <span class="s-time">{s.time}</span>
                      {s.note && <span class="s-note">{s.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
          </section>

          {reverse && (
            <section aria-labelledby="reverse">
              <h2 id="reverse" class="s-sec">对向班次</h2>
              <p class="s-reverse">
                <a href={`/r/${reverse.id}`}>
                  {endpointB(route.value.name)}到{endpointA(route.value.name)}
                  班车时刻表
                </a>
              </p>
            </section>
          )}

          {otherRoutes.length > 0 && (
            <section aria-labelledby="other-routes">
              <h2 id="other-routes" class="s-sec">
                {station.value.name}其他线路
              </h2>
              <ul class="s-routes">
                {otherRoutes.map((r) => (
                  <li key={r.id}>
                    <a class="s-route" href={`/r/${r.id}`}>
                      {r.name.replace("-", " → ")}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
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
