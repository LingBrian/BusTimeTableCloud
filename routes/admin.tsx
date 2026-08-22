import { define } from "../utils.ts";
import AdminPanel from "../islands/AdminPanel.tsx";

export default define.page(function Admin() {
  return (
    <>
      <link rel="stylesheet" href="/admin.css" />
      <div class="a-root">
        <AdminPanel />
      </div>
    </>
  );
});