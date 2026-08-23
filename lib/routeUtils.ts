// 线路名称的两端点解析工具（与 seed.ts / StationBoard 逻辑保持一致）
export function endpointA(r: string): string {
  const i = r.indexOf("-");
  return i === -1 ? r : r.slice(0, i);
}

export function endpointB(r: string): string {
  const i = r.indexOf("-");
  return i === -1 ? "" : r.slice(i + 1);
}

export function displayRoute(r: string): string {
  if (!r) return "——";
  return r.replace("-", " → ");
}

// 线路对 key：A-B 与 B-A 归为同一线路
export function pairKey(r: string): string {
  const a = endpointA(r), b = endpointB(r);
  if (a === b) return a;
  return a < b ? a + "\0" + b : b + "\0" + a;
}
