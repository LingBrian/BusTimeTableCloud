import { define } from "../utils.ts";
import { Head } from "fresh/runtime";
import AdminPanel from "../islands/AdminPanel.tsx";

export default define.page(function Admin() {
  return (
    <>
      <Head>
        <title>万载城北汽车站 · 站务管理</title>
        <meta name="robots" content="noindex, nofollow" key="robots" />
      </Head>
      <link rel="stylesheet" href="/admin.css" />
      <div class="a-root">
        <AdminPanel />
      </div>
    </>
  );
});
