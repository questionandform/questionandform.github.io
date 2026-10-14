/* QF delayed-answer gateway. No AI API calls and no email sending.
   Visitor input is data only. It never selects a repository, file path, tool, or command. */
const AGENTS = Object.freeze({
  THINK: { source: "learnwithlev.com", origin: "https://learnwithlev.com" },
  SHAPE: { source: "3dddesign.com", origin: "https://3dddesign.com" },
  MAKE: { source: "themakerhome.com", origin: "https://themakerhome.com" }
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{64}$/i;
const MAX_BYTES = 16000;
const encoder = new TextEncoder();
const publicError = (code, status) => Object.assign(new Error(code), { status });

function corsOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (Object.values(AGENTS).some(a => a.origin === origin)) return origin;
  if (env.ALLOW_LOCAL_TESTING === "true" && origin === env.LOCAL_ORIGIN && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || "")) return origin;
  return null;
}
function reply(data, status, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, private",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin"
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(data), { status, headers });
}
async function sha256(value) {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function readJson(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("Content-Type") || "")) throw publicError("json_required", 415);
  if (Number(request.headers.get("Content-Length") || 0) > MAX_BYTES) throw publicError("request_too_large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw publicError("invalid_request", 400);
  let size = 0;
  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw publicError("request_too_large", 413); }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) { body.set(chunk, position); position += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)); }
  catch { throw publicError("invalid_json", 400); }
}
function validateSubmission(value, origin, env) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw publicError("invalid_request", 400);
  const allowed = ["request_id", "agent", "source_site", "question", "email", "website"];
  if (Object.keys(value).some(k => !allowed.includes(k))) throw publicError("invalid_fields", 400);
  if (value.website) throw publicError("invalid_request", 400);
  const agent = Object.hasOwn(AGENTS, value.agent) ? AGENTS[value.agent] : null;
  if (!agent || value.source_site !== agent.source) throw publicError("invalid_agent", 400);
  const local = env.ALLOW_LOCAL_TESTING === "true" && origin === env.LOCAL_ORIGIN;
  if (!local && origin !== agent.origin) throw publicError("source_mismatch", 403);
  if (typeof value.question !== "string" || value.question.trim().length < 10 || value.question.length > 6000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value.question)) throw publicError("invalid_question", 400);
  if (typeof value.request_id !== "string" || !UUID.test(value.request_id)) throw publicError("invalid_request_id", 400);
  if (value.email !== undefined && typeof value.email !== "string") throw publicError("invalid_email", 400);
  const email = (value.email || "").trim();
  if (email && (env.EMAIL_COLLECTION_ENABLED !== "true" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n]/.test(email))) throw publicError("email_unavailable_or_invalid", 400);
  return { request_id: value.request_id.toLowerCase(), agent: value.agent, source_site: agent.source, question: value.question.trim(), email: email || null };
}
async function rateLimit(request, env, scope) {
  if (!env.RATE_LIMITER) throw publicError("service_not_ready", 503);
  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip && env.ALLOW_LOCAL_TESTING !== "true") throw publicError("service_not_ready", 503);
  const result = await env.RATE_LIMITER.limit({ key: scope + ":" + await sha256(ip || "local") });
  if (!result.success) throw publicError("rate_limited", 429);
}
function publicRecord(row) {
  return { request_id: row.request_id, agent: row.agent, status: row.status, created_at: row.created_at, ...(row.status === "answered" ? { answer: row.answer } : {}) };
}
function queueConfigured(env) {
  return env.ENABLE_QUEUE_SYNC === "true" && !!env.GITHUB_QUEUE_TOKEN && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.GITHUB_QUEUE_REPOSITORY || "");
}
async function github(env, route, options = {}) {
  // Routes come only from constants and validated UUIDs, never from visitor text.
  const response = await fetch("https://api.github.com/repos/" + env.GITHUB_QUEUE_REPOSITORY + route, {
    ...options,
    headers: { "Authorization": "Bearer " + env.GITHUB_QUEUE_TOKEN, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "question-and-form-queue", "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10000)
  });
  if (response.status === 404 && (!options.method || options.method === "GET")) return null;
  if (!response.ok) throw new Error("queue_provider_unavailable");
  return response.json();
}
async function assertPrivateQueue(env) {
  const repo = await github(env, "");
  if (!repo || repo.private !== true) throw new Error("private_queue_required");
}
function toBase64(text) {
  const bytes = encoder.encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function fromBase64(text) {
  const binary = atob(text.replace(/\s/g, ""));
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}
function queuePayload(row) {
  return {
    schema_version: 1, request_id: row.request_id, agent: row.agent,
    source_site: row.source_site, created_at: row.created_at, expires_at: row.expires_at,
    untrusted_visitor_question: row.question
  };
}
async function syncOne(row, env) {
  if (!queueConfigured(env) || row.github_synced_at || !UUID.test(row.request_id)) return;
  await assertPrivateQueue(env);
  const path = "/contents/requests/" + row.request_id + ".json";
  const payload = queuePayload(row);
  const existing = await github(env, path);
  if (existing) {
    // Deterministic per-request files make retries idempotent, including after a lost response.
    const previous = JSON.parse(fromBase64(existing.content));
    if (JSON.stringify(previous) !== JSON.stringify(payload)) throw new Error("queue_record_conflict");
  } else {
    try {
      await github(env, path, { method: "PUT", body: JSON.stringify({ message: "Queue " + row.agent + " request " + row.request_id, content: toBase64(JSON.stringify(payload, null, 2) + "\n") }) });
    } catch {
      // A concurrent attempt may have created exactly the same immutable file.
      const concurrent = await github(env, path);
      if (!concurrent || JSON.stringify(JSON.parse(fromBase64(concurrent.content))) !== JSON.stringify(payload)) throw new Error("queue_write_failed");
    }
  }
  await env.DB.prepare("UPDATE requests SET github_synced_at = ? WHERE request_id = ?").bind(new Date().toISOString(), row.request_id).run();
}
function validateAnswer(value, row) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const allowed = ["schema_version", "request_id", "agent", "answer"];
  if (Object.keys(value).some(k => !allowed.includes(k))) return null;
  if (value.schema_version !== 1 || value.request_id !== row.request_id || value.agent !== row.agent || typeof value.answer !== "string" || !value.answer.trim() || value.answer.length > 16000) return null;
  return value.answer.trim();
}
async function refreshAnswer(row, env) {
  if (!queueConfigured(env) || !row.github_synced_at || row.status === "answered") return row;
  await assertPrivateQueue(env);
  const file = await github(env, "/contents/answers/" + row.request_id + ".json");
  if (!file) return row;
  const answer = validateAnswer(JSON.parse(fromBase64(file.content)), row);
  if (!answer) throw new Error("invalid_answer");
  await env.DB.prepare("UPDATE requests SET status = 'answered', answer = ?, updated_at = ? WHERE request_id = ? AND status = 'pending'").bind(answer, new Date().toISOString(), row.request_id).run();
  return { ...row, status: "answered", answer };
}
async function createRequest(request, env, ctx, origin) {
  if (env.ENABLE_SUBMISSIONS !== "true" || !env.DB) throw publicError("service_not_ready", 503);
  await rateLimit(request, env, "submit");
  const token = request.headers.get("X-Request-Token");
  if (!TOKEN.test(token || "")) throw publicError("invalid_receipt", 400);
  const data = validateSubmission(await readJson(request), origin, env);
  const accessHash = await sha256(token);
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 30 * 86400000).toISOString();
  await env.DB.prepare("INSERT OR IGNORE INTO requests (request_id, access_hash, agent, source_site, question, email, status, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)").bind(data.request_id, accessHash, data.agent, data.source_site, data.question, data.email, now, now, expires).run();
  const row = await env.DB.prepare("SELECT * FROM requests WHERE request_id = ? AND access_hash = ?").bind(data.request_id, accessHash).first();
  if (!row || row.agent !== data.agent || row.source_site !== data.source_site || row.question !== data.question || row.email !== data.email) throw publicError("request_conflict", 409);
  if (row.expires_at <= now) throw publicError("receipt_expired", 410);
  // Only return pending after a durable write. Sync failures leave a retryable local outbox.
  if (queueConfigured(env)) ctx.waitUntil(syncOne(row, env).catch(() => {}));
  return reply(publicRecord(row), 202, origin);
}
async function getRequest(request, env, origin, id) {
  if (!env.DB) throw publicError("service_not_ready", 503);
  await rateLimit(request, env, "status");
  const token = request.headers.get("X-Request-Token");
  if (!UUID.test(id) || !TOKEN.test(token || "")) throw publicError("receipt_not_found", 404);
  let row = await env.DB.prepare("SELECT * FROM requests WHERE request_id = ? AND access_hash = ?").bind(id.toLowerCase(), await sha256(token)).first();
  const local = env.ALLOW_LOCAL_TESTING === "true" && origin === env.LOCAL_ORIGIN;
  if (!row || (!local && AGENTS[row.agent]?.origin !== origin)) throw publicError("receipt_not_found", 404);
  if (row.expires_at <= new Date().toISOString()) throw publicError("receipt_expired", 410);
  try { row = await refreshAnswer(row, env); } catch { /* A provider outage preserves the truthful pending state. */ }
  return reply(publicRecord(row), 200, origin);
}
async function fetchHandler(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === "/health" && request.method === "GET") return reply({ service: "qf-questions", submissions_enabled: env.ENABLE_SUBMISSIONS === "true" }, 200, corsOrigin(request, env));
  const origin = corsOrigin(request, env);
  if (!origin) return reply({ error: "origin_not_allowed" }, 403, null);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Request-Token", "Access-Control-Max-Age": "600", "Vary": "Origin"
  } });
  try {
    if (url.pathname === "/v1/requests" && request.method === "POST") return await createRequest(request, env, ctx, origin);
    const match = url.pathname.match(/^\/v1\/requests\/([0-9a-f-]+)$/i);
    if (match && request.method === "GET") return await getRequest(request, env, origin, match[1]);
    return reply({ error: "not_found" }, 404, origin);
  } catch (error) {
    // Never echo input, provider responses, secrets, or exception details.
    return reply({ error: error.status ? error.message : "service_unavailable" }, error.status || 503, origin);
  }
}
async function scheduledHandler(_event, env) {
  if (!env.DB) return;
  const now = new Date().toISOString();
  await env.DB.prepare("DELETE FROM requests WHERE expires_at <= ?").bind(now).run();
  if (!queueConfigured(env)) return;
  const rows = await env.DB.prepare("SELECT * FROM requests WHERE expires_at > ? AND status = 'pending' ORDER BY (github_synced_at IS NOT NULL), created_at LIMIT 10").bind(now).all();
  for (const row of rows.results) {
    try { await syncOne(row, env); await refreshAnswer({ ...row, github_synced_at: row.github_synced_at || now }, env); } catch {}
  }
  await env.DB.prepare("DELETE FROM requests WHERE expires_at <= ?").bind(now).run();
}
export { validateSubmission, validateAnswer, queuePayload, syncOne, refreshAnswer, fetchHandler, scheduledHandler };
export default { fetch: fetchHandler, scheduled: scheduledHandler };
