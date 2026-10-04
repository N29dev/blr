const TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_CREATOR_URL = "https://open.tiktokapis.com/v2/post/publish/creator_info/query/";
const TIKTOK_INIT_URL = "https://open.tiktokapis.com/v2/post/publish/video/init/";
const TIKTOK_STATUS_URL = "https://open.tiktokapis.com/v2/post/publish/status/fetch/";
const TIKTOK_REVOKE_URL = "https://open.tiktokapis.com/v2/oauth/revoke/";

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (!url.pathname.startsWith("/api/tiktok/")) {
        return new Response("Not found", { status: 404 });
      }

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204 });
      }

      if (url.pathname === "/api/tiktok/oauth/start" && request.method === "GET") {
        return startOAuth(env);
      }

      if (url.pathname === "/api/tiktok/oauth/callback" && request.method === "GET") {
        return finishOAuth(request, env);
      }

      if (url.pathname === "/api/tiktok/session" && request.method === "GET") {
        return sessionInfo(request, env);
      }

      if (url.pathname === "/api/tiktok/creator" && request.method === "POST") {
        return creatorInfo(request, env);
      }

      if (url.pathname === "/api/tiktok/publish/init" && request.method === "POST") {
        return initPublish(request, env);
      }

      if (url.pathname === "/api/tiktok/upload" && request.method === "PUT") {
        return proxyUpload(request, env);
      }

      if (url.pathname === "/api/tiktok/publish/status" && request.method === "POST") {
        return publishStatus(request, env);
      }

      if (url.pathname === "/api/tiktok/disconnect" && request.method === "POST") {
        return disconnect(request, env);
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  }
};

function requireEnv(env) {
  const required = [
    "TIKTOK_CLIENT_KEY",
    "TIKTOK_CLIENT_SECRET",
    "TIKTOK_REDIRECT_URI",
    "SESSION_SECRET",
    "SITE_URL"
  ];
  const missing = required.filter(key => !env[key]);
  if (missing.length) {
    throw new Error("Missing Worker secrets/vars: " + missing.join(", "));
  }
}

function startOAuth(env) {
  requireEnv(env);

  const state = randomToken(32);
  const auth = new URL(TIKTOK_AUTHORIZE_URL);
  auth.searchParams.set("client_key", env.TIKTOK_CLIENT_KEY);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "user.info.basic,video.publish");
  auth.searchParams.set("redirect_uri", env.TIKTOK_REDIRECT_URI);
  auth.searchParams.set("state", state);

  const headers = new Headers({ Location: auth.toString() });
  headers.append("Set-Cookie", cookie("tt_oauth_state", state, 600));
  return new Response(null, { status: 302, headers });
}

async function finishOAuth(request, env) {
  requireEnv(env);

  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    const description = url.searchParams.get("error_description") || error;
    return redirectBack(env, "error", description);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  if (!code || !state || !cookies.tt_oauth_state || state !== cookies.tt_oauth_state) {
    return redirectBack(env, "error", "TikTok OAuth state check failed.");
  }

  const form = new URLSearchParams({
    client_key: env.TIKTOK_CLIENT_KEY,
    client_secret: env.TIKTOK_CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: env.TIKTOK_REDIRECT_URI
  });

  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });

  const data = await response.json();
  if (!response.ok || !data.access_token || !data.refresh_token) {
    return redirectBack(env, "error", data.error_description || data.error || "TikTok token exchange failed.");
  }

  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + Number(data.expires_in || 86400) * 1000,
    refresh_expires_at: Date.now() + Number(data.refresh_expires_in || 31536000) * 1000,
    open_id: data.open_id || "",
    scope: data.scope || ""
  };

  const sealed = await seal(session, env.SESSION_SECRET);
  const headers = new Headers({ Location: env.SITE_URL + "/?tiktok=connected#tiktok-publisher" });
  headers.append("Set-Cookie", cookie("tt_session", sealed, Math.min(Number(data.refresh_expires_in || 31536000), 31536000)));
  headers.append("Set-Cookie", clearCookie("tt_oauth_state"));
  return new Response(null, { status: 302, headers });
}

async function sessionInfo(request, env) {
  requireEnv(env);
  const result = await getValidSession(request, env, false);
  if (!result.session) return json({ connected: false });

  return json({
    connected: true,
    scope: result.session.scope || "",
    refresh_expires_at: result.session.refresh_expires_at || null
  }, 200, result.setCookie);
}

async function creatorInfo(request, env) {
  requireEnv(env);
  const auth = await getValidSession(request, env, true);
  if (!auth.session) return json({ error: "TikTok is not connected." }, 401);

  const response = await tiktokJson(TIKTOK_CREATOR_URL, auth.session.access_token, {});
  return json(response.data, response.status, auth.setCookie);
}

async function initPublish(request, env) {
  requireEnv(env);
  const auth = await getValidSession(request, env, true);
  if (!auth.session) return json({ error: "TikTok is not connected." }, 401);

  const body = await request.json();
  const size = Number(body.video_size || 0);
  const chunkSize = Number(body.chunk_size || 0);
  const totalChunks = Number(body.total_chunk_count || 0);
  const privacy = String(body.privacy_level || "SELF_ONLY");
  const title = String(body.title || "").slice(0, 2200);

  if (!Number.isInteger(size) || size <= 0 || size > 4_000_000_000) {
    return json({ error: "Invalid video size." }, 400);
  }

  if (!Number.isInteger(chunkSize) || chunkSize <= 0 || !Number.isInteger(totalChunks) || totalChunks <= 0) {
    return json({ error: "Invalid chunk settings." }, 400);
  }

  const payload = {
    post_info: {
      title,
      privacy_level: privacy,
      disable_comment: Boolean(body.disable_comment),
      disable_duet: Boolean(body.disable_duet),
      disable_stitch: Boolean(body.disable_stitch),
      brand_content_toggle: Boolean(body.brand_content_toggle),
      brand_organic_toggle: Boolean(body.brand_organic_toggle),
      is_aigc: Boolean(body.is_aigc)
    },
    source_info: {
      source: "FILE_UPLOAD",
      video_size: size,
      chunk_size: chunkSize,
      total_chunk_count: totalChunks
    }
  };

  const response = await tiktokJson(TIKTOK_INIT_URL, auth.session.access_token, payload);
  return json(response.data, response.status, auth.setCookie);
}

async function proxyUpload(request, env) {
  requireEnv(env);
  const auth = await getValidSession(request, env, true);
  if (!auth.session) return json({ error: "TikTok is not connected." }, 401);

  const uploadUrl = request.headers.get("X-TikTok-Upload-URL");
  const contentRange = request.headers.get("Content-Range");
  const contentType = request.headers.get("Content-Type") || "video/mp4";

  if (!uploadUrl || !contentRange || !/^https:\/\/[^/]*tiktokapis\.com\//i.test(uploadUrl)) {
    return json({ error: "Invalid TikTok upload request." }, 400);
  }

  const forwarded = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Range": contentRange
    },
    body: request.body
  });

  const text = await forwarded.text();
  const headers = new Headers();
  const uploadedRange = forwarded.headers.get("Content-Range");
  if (uploadedRange) headers.set("Content-Range", uploadedRange);
  if (auth.setCookie) headers.append("Set-Cookie", auth.setCookie);

  return new Response(text, {
    status: forwarded.status,
    headers
  });
}

async function publishStatus(request, env) {
  requireEnv(env);
  const auth = await getValidSession(request, env, true);
  if (!auth.session) return json({ error: "TikTok is not connected." }, 401);

  const body = await request.json();
  const publishId = String(body.publish_id || "");
  if (!publishId) return json({ error: "Missing publish_id." }, 400);

  const response = await tiktokJson(TIKTOK_STATUS_URL, auth.session.access_token, {
    publish_id: publishId
  });
  return json(response.data, response.status, auth.setCookie);
}

async function disconnect(request, env) {
  requireEnv(env);
  const auth = await getValidSession(request, env, false);

  if (auth.session?.access_token) {
    const form = new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_KEY,
      client_secret: env.TIKTOK_CLIENT_SECRET,
      token: auth.session.access_token
    });

    await fetch(TIKTOK_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form
    }).catch(() => {});
  }

  return json({ connected: false }, 200, clearCookie("tt_session"));
}

async function getValidSession(request, env, refreshIfNeeded) {
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  if (!cookies.tt_session) return { session: null, setCookie: null };

  let session;
  try {
    session = await unseal(cookies.tt_session, env.SESSION_SECRET);
  } catch {
    return { session: null, setCookie: clearCookie("tt_session") };
  }

  if (!session?.refresh_token) {
    return { session: null, setCookie: clearCookie("tt_session") };
  }

  if (session.refresh_expires_at && Date.now() >= session.refresh_expires_at) {
    return { session: null, setCookie: clearCookie("tt_session") };
  }

  if (!refreshIfNeeded || Date.now() < Number(session.expires_at || 0) - 60_000) {
    return { session, setCookie: null };
  }

  const form = new URLSearchParams({
    client_key: env.TIKTOK_CLIENT_KEY,
    client_secret: env.TIKTOK_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: session.refresh_token
  });

  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });
  const data = await response.json();

  if (!response.ok || !data.access_token || !data.refresh_token) {
    return { session: null, setCookie: clearCookie("tt_session") };
  }

  session = {
    ...session,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + Number(data.expires_in || 86400) * 1000,
    refresh_expires_at: Date.now() + Number(data.refresh_expires_in || 31536000) * 1000,
    open_id: data.open_id || session.open_id || "",
    scope: data.scope || session.scope || ""
  };

  const sealed = await seal(session, env.SESSION_SECRET);
  return {
    session,
    setCookie: cookie("tt_session", sealed, Math.min(Number(data.refresh_expires_in || 31536000), 31536000))
  };
}

async function tiktokJson(url, accessToken, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.json();
  const apiError = raw?.error;
  if (!response.ok || (apiError && apiError.code && apiError.code !== "ok")) {
    return {
      status: response.status || 400,
      data: {
        error: apiError?.message || apiError?.code || "TikTok API request failed.",
        code: apiError?.code || "unknown_error",
        log_id: apiError?.log_id || null
      }
    };
  }

  return { status: 200, data: raw.data || {} };
}

function redirectBack(env, status, message) {
  const target = new URL(env.SITE_URL + "/");
  target.searchParams.set("tiktok", status);
  if (message) target.searchParams.set("message", String(message).slice(0, 300));
  target.hash = "tiktok-publisher";
  return Response.redirect(target.toString(), 302);
}

function json(data, status = 200, setCookie = null) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=UTF-8",
    "Cache-Control": "no-store"
  });
  if (setCookie) headers.append("Set-Cookie", setCookie);
  return new Response(JSON.stringify(data), { status, headers });
}

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/api/tiktok/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearCookie(name) {
  return `${name}=; Path=/api/tiktok/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

function randomToken(bytes) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return base64url(data);
}

async function sessionKey(secret) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret)
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function seal(value, secret) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await sessionKey(secret);
  const plain = new TextEncoder().encode(JSON.stringify(value));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  const joined = new Uint8Array(iv.length + cipher.length);
  joined.set(iv, 0);
  joined.set(cipher, iv.length);
  return base64url(joined);
}

async function unseal(value, secret) {
  const joined = fromBase64url(value);
  const iv = joined.slice(0, 12);
  const cipher = joined.slice(12);
  const key = await sessionKey(secret);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(plain));
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64url(value) {
  let input = value.replace(/-/g, "+").replace(/_/g, "/");
  while (input.length % 4) input += "=";
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
