import { define } from "../utils.ts";
import {
  SEO_DESCRIPTION,
  SEO_KEYWORDS,
  SEO_ORIGIN,
  SEO_SITE_NAME,
} from "../lib/seo.ts";

export default define.page(function App({ Component }) {
  const canonical = SEO_ORIGIN + "/";
  return (
    <html lang="zh">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, user-scalable=no"
        />
        <meta name="description" content={SEO_DESCRIPTION} key="description" />
        <meta name="keywords" content={SEO_KEYWORDS} />
        <meta name="author" content="万载城北汽车站 · 站务信息化室" />
        <meta name="robots" content="index, follow" key="robots" />
        <meta name="theme-color" content="#0c3c8f" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="canonical" href={canonical} key="canonical" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SEO_SITE_NAME} />
        <meta
          property="og:title"
          content="万载城北汽车站班车时刻表 - 万载汽车站全天发车班次"
          key="og:title"
        />
        <meta
          property="og:description"
          content={SEO_DESCRIPTION}
          key="og:description"
        />
        <meta property="og:url" content={canonical} key="og:url" />
        <meta property="og:image" content={SEO_ORIGIN + "/logo.svg"} />
        <meta property="og:locale" content="zh_CN" />
        <meta name="twitter:card" content="summary" />
        <meta
          name="twitter:title"
          content="万载城北汽车站班车时刻表 - 万载汽车站全天发车班次"
          key="twitter:title"
        />
        <meta
          name="twitter:description"
          content={SEO_DESCRIPTION}
          key="twitter:description"
        />
        <meta name="twitter:image" content={SEO_ORIGIN + "/logo.svg"} />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});
