import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  return (
    <html lang="zh">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, user-scalable=no"
        />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <title>万载城北汽车站 · 班车时刻表</title>
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});