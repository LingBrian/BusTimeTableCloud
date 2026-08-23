import { Head } from "fresh/runtime";
import type { ComponentChildren } from "preact";

/**
 * 页面级 SEO head 统一出口（C4）：
 * 逐页覆盖 title / description / canonical / OG / Twitter，
 * 并透传 JSON-LD 结构数据。默认项（og:image、keywords、author、
 * theme-color、robots、og:type/site_name/locale、twitter:card）由
 * routes/_app.tsx 全局提供，本组件只需关心页面差异。
 */
export interface SeoProps {
  title: string;
  description: string;
  canonical: string;
  /** 结构数据：单个对象或对象数组（按 @context + 数组 -> @graph 处理） */
  jsonLd?: unknown | unknown[];
  extra?: ComponentChildren;
}

function stringifyLd(value: unknown): string {
  const v = value as { "@context"?: string } | { "@graph"?: unknown };
  if (Array.isArray(v)) {
    return JSON.stringify({ "@context": "https://schema.org", "@graph": v });
  }
  if (v && typeof v === "object" && !v["@context"]) {
    return JSON.stringify({ "@context": "https://schema.org", ...v });
  }
  return JSON.stringify(v);
}

export default function Seo({
  title,
  description,
  canonical,
  jsonLd,
  extra,
}: SeoProps) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} key="description" />
      <link rel="canonical" href={canonical} key="canonical" />
      <meta property="og:title" content={title} key="og:title" />
      <meta
        property="og:description"
        content={description}
        key="og:description"
      />
      <meta property="og:url" content={canonical} key="og:url" />
      <meta name="twitter:title" content={title} key="twitter:title" />
      <meta
        name="twitter:description"
        content={description}
        key="twitter:description"
      />
      {jsonLd !== undefined && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: stringifyLd(jsonLd) }}
        />
      )}
      {extra}
    </Head>
  );
}
