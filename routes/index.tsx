import { define } from "../utils.ts";
import { Head } from "fresh/runtime";
import { getKv } from "../lib/kv.ts";
import type { Station } from "../lib/schema.ts";
import StationBoard from "../islands/StationBoard.tsx";

export default define.page(async () => {
  const kv = await getKv();
  const stations: Station[] = [];
  for await (const entry of kv.list<Station>({ prefix: ["stations"] })) {
    stations.push(entry.value);
  }
  stations.sort((a, b) => a.name.localeCompare(b.name, "zh"));

  return (
    <>
      <Head>
        <title>万载城北汽车站班车时刻表 - 万载汽车站全天发车班次</title>
      </Head>
      <StationBoard>
        {stations.length > 0 && (
          <section class="agg" aria-labelledby="agg-title">
            <header class="agg-head">
              <h2 id="agg-title">车站线路索引</h2>
              <span class="agg-count">{stations.length} 站</span>
            </header>
            <ul class="agg-list">
              {stations.map((s) => (
                <li key={s.id}>
                  <a href={`/s/${s.id}`}>{s.name}班车时刻表</a>
                  <span class="agg-city">{s.city}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </StationBoard>
    </>
  );
});
