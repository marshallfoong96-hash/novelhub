/**
 * Cloudflare Pages Function — POST /api/upload-cover
 * Puts WebP bytes into R2. Requires logged-in Supabase user (Bearer access_token).
 *
 * Dashboard: Pages → Settings → Functions → R2 bucket binding → name: COVERS
 * Vars: PUBLIC_ASSETS_BASE, SUPABASE_URL, SUPABASE_ANON_KEY (same as Vite public anon key)
 */

const MAX_BYTES = 6 * 1024 * 1024;

function safeObjectKey(raw) {
  const s = String(raw || "").trim();
  if (!s || s.length > 180) return null;
  if (!/^[a-zA-Z0-9/_-]+\.webp$/i.test(s)) return null;
  if (s.includes("..") || s.startsWith("/")) return null;
  return s;
}

async function validateSupabaseUser(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return { ok: false, status: 401, error: "Missing session" };
  const url = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const anon = String(env.SUPABASE_ANON_KEY || "");
  if (!url || !anon) return { ok: false, status: 500, error: "Server missing Supabase config" };

  const r = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: auth,
      apikey: anon,
    },
  });
  if (!r.ok) return { ok: false, status: 401, error: "Invalid or expired session" };
  return { ok: true };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const session = await validateSupabaseUser(request, env);
  if (!session.ok) {
    return Response.json({ error: session.error }, { status: session.status });
  }

  const bucket = env.COVERS;
  if (!bucket || typeof bucket.put !== "function") {
    return Response.json(
      { error: "R2 binding COVERS missing — add in Pages → Settings → Functions" },
      { status: 500 }
    );
  }

  const publicBase = String(env.PUBLIC_ASSETS_BASE || "").replace(/\/$/, "");
  if (!publicBase) {
    return Response.json({ error: "PUBLIC_ASSETS_BASE not set" }, { status: 500 });
  }

  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > MAX_BYTES) {
    return Response.json({ error: "File too large (max 6MB)" }, { status: 413 });
  }

  const suggested = request.headers.get("X-Upload-Path") || "";
  const key = safeObjectKey(suggested) || `covers/up-${Date.now()}.webp`;

  const buf = await request.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    return Response.json({ error: "Body too large" }, { status: 413 });
  }

  await bucket.put(key, buf, {
    httpMetadata: {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  const url = `${publicBase}/${key}`;
  return Response.json({ url, key });
}
