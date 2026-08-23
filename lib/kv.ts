let kvInstance: Deno.Kv | null = null;

export async function getKv(): Promise<Deno.Kv> {
  if (!kvInstance) {
    const url = Deno.env.get("DENO_KV_URL");
    kvInstance = url ? await Deno.openKv(url) : await Deno.openKv();
  }
  return kvInstance;
}
