import type { User } from "./schema.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET") ??
  "dev-secret-change-in-production";

function getJwtSecretKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function base64UrlEncode(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function createToken(
  payload: Record<string, unknown>,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const headerEncoded = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header)).buffer,
  );
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, exp: now + 7 * 24 * 3600, iat: now };
  const payloadEncoded = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(fullPayload)).buffer,
  );
  const key = await getJwtSecretKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${headerEncoded}.${payloadEncoded}`),
  );
  const signatureEncoded = base64UrlEncode(signature);
  return `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`;
}

export async function verifyToken<T = Record<string, unknown>>(
  token: string,
): Promise<T | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
  try {
    const key = await getJwtSecretKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signatureEncoded).buffer as ArrayBuffer,
      new TextEncoder().encode(`${headerEncoded}.${payloadEncoded}`)
        .buffer as ArrayBuffer,
    );
    if (!valid) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadEncoded)),
    );
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload as T;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hashHex = Array.from(new Uint8Array(bits)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  const computed = Array.from(new Uint8Array(bits)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  return computed === hashHex;
}

export type JwtPayload = {
  username: string;
  role: User["role"];
  exp: number;
  iat: number;
};

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function okResponse<T>(data: T, status = 200): Response {
  return jsonResponse({ ok: true, data, error: null }, status);
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return jsonResponse(
    { ok: false, data: null, error: { code, message } },
    status,
  );
}
