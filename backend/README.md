# Delayed-answer queue — scaffold, not a deployed service

This is the backend interface for THINK, SHAPE, and MAKE. It contains no production credentials, paid services, live scheduler, email sender, or OpenAI API integration. All activation flags default to false.

## Architecture

```text
/ask form on its own brand domain
  → HTTPS Cloudflare Worker
  → private D1 request + receipt record
  → deterministic requests/<UUID>.json in a PRIVATE GitHub queue
  → future ChatGPT scheduled task reads unanswered JSON records
  → answers/<UUID>.json in the same private repository
  → Worker validates and stores the answer
  → visitor checks the receipt on /ask
```

D1 provides durable acceptance, receipt authorization, an outbox during provider failures, and private optional email storage. GitHub holds only the question payload and answer; **receipt secrets and email addresses never go to GitHub**. The visitor interface never shows repository paths or provider internals.

The public website repository contains code and configuration placeholders only. Use a separate, private repository for actual question/answer data. The Worker explicitly checks that the queue repository is private before reading or writing it.

## What is implemented

- POST validation and durable pending records.
- Exact THINK/SHAPE/MAKE and source-domain pairing.
- HTTPS-origin allowlist; optional explicitly enabled localhost development.
- Required edge rate limiting; 16 KB body and 6,000-character question limits.
- UUID request IDs and 256-bit receipt tokens; only token hashes stored server-side.
- Idempotent submissions and deterministic immutable private queue files.
- Answer retrieval with request ID **and** token, scoped to the originating brand.
- Answers validated against identity and a strict schema, rendered as plain text.
- A scheduled Worker handler to retry the outbox and refresh answers; no cron is configured.
- Thirty-day receipt expiry. D1 deletion requires running the scheduled handler; expired receipts are denied even if cleanup has not run.
- Unsynced requests are prioritized so older pending requests do not block new submissions.
- Optional email validation and private storage, gated off. **No delivery implementation.**

## API contract

`POST /v1/requests`

Headers: `Content-Type: application/json`, `X-Request-Token: <64 cryptographically random hex characters>`. Browser origin must match the agent.

```json
{
  "request_id": "a1234567-1234-4234-8234-123456789abc",
  "agent": "THINK",
  "source_site": "learnwithlev.com",
  "question": "Give me a probability challenge and start with one hint.",
  "email": "",
  "website": ""
}
```

The browser generates both ID and token before submission and keeps them on retries. A different body or token for an existing ID returns 409. The server returns 202 only after persistence:

```json
{
  "request_id": "a1234567-1234-4234-8234-123456789abc",
  "agent": "THINK",
  "status": "pending",
  "created_at": "<ISO-8601 timestamp>"
}
```

`GET /v1/requests/<UUID>` with the same token header returns `pending` or `answered`. An answered response includes a plain-text `answer`. Unknown ID, wrong token, or wrong brand returns 404. Expired receipts return 410. Provider errors are never echoed. Responses are not cached.

`GET /health` reports only service name and whether submissions are enabled.

Receipt links use a URL fragment, removed after loading; the token is not sent to the static host or in a referrer. Browser storage contains only the request ID and receipt token, not the question or email. Receipt links are private bearer links: anyone holding one can read that answer. No public request listing exists.

## Connect the GitHub queue later

1. Confirm the Cloudflare account is on the **Workers Free** plan. Stop and flag costs before any paid plan, add-on, or new paid provider is enabled.
2. Create a free-tier D1 database, replace the binding placeholder, apply `schema.sql`, and choose an unused rate-limit namespace. No DNS or custom domain is needed: use an approved workers.dev URL.
3. Create/select a separate **private** GitHub repository. Add `requests/` and `answers/`; no workflows or executable code are needed in it.
4. Create a narrowly scoped server credential with Contents read/write access only to that repository. Store it as the Worker secret `GITHUB_QUEUE_TOKEN`, never in Git, browser configuration, shell arguments, or logs. Configure `GITHUB_QUEUE_REPOSITORY` with the exact owner/name.
5. Test with non-personal sample questions. Confirm the private check, idempotency, token authorization, retries, retention, and answer reads.
6. Set `ENABLE_QUEUE_SYNC=true`, then `ENABLE_SUBMISSIONS=true` after the transport passes testing. Configure each site's `ask/config.js` with the approved HTTPS Worker origin.
7. Optionally enable a Worker cron for outbox/retrieval/expiry. Separately validate and schedule the ChatGPT processor described in `scheduled-task.md`. No schedule is created by this pass.
8. Keep `EMAIL_COLLECTION_ENABLED=false` and the front-end email flag false until email delivery is ready.

A temporary GitHub outage leaves accepted requests durable in D1. Enable a retry schedule before opening submissions. Private GitHub JSON files have their own retention requirement: they are **not automatically deleted by this scaffold**. Define and test a queue-file cleanup policy before production use, consistent with the D1 expiry window. Do not log raw questions, receipt tokens, email addresses, or provider response bodies.

## ChatGPT Pro feasibility

The supplied architecture deliberately does not call an OpenAI API or automate the ChatGPT browser. Official documentation says scheduled web tasks can use connected tools and that availability depends on account/workspace settings. This does **not** prove this particular Pro account can run the complete queue-writing workflow unattended.

Before activation, test one sample question in a regular chat with the exact private-repository connection, then test an unattended run. Confirm both reads and writes, plan usage limits, permissions, and whether approval prompts interrupt the run. If only desktop scheduling is available, the machine and app must remain running. No answer-time promise should be made until this has been validated.

Official reference: https://learn.chatgpt.com/docs/automations

## Email remains a separate integration

No sender is included and no production email is sent. To enable it later, select an approved provider and verified sending identity, document any cost before enabling it, store provider credentials as server-side secrets, and add an idempotent delivery job with retries and delivery-state tracking. Send only requested answer notifications; avoid sensitive answer text in the subject. Configure SPF/DKIM only with separate domain authorization. Test with controlled recipients before turning on collection and delivery flags.

The delivery flags are intended as integration gates, not proof an email sender exists. Do not enable them until delivery is implemented and tested.

## Local checks

Use **Node 22.13+** (native SQLite):

```text
node test/worker.test.mjs
```

Tests use a real in-memory SQLite database and a mocked private GitHub adapter. They cover validation, authorization, persistence, retries, Unicode and malicious-looking visitor text, disabled email collection, public-repository refusal, strict answers, and retention.

For Worker-local testing, use Wrangler with a local D1 binding after substituting valid development configuration; use `.dev.vars` for local secrets, which is ignored. No dependencies are needed for the integration tests.

Cloudflare documentation:
- https://developers.cloudflare.com/d1/worker-api/prepared-statements/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- https://developers.cloudflare.com/d1/reference/faq/


## Community and human-help review

This review extends the current release with independent consent, conditional help fields, noindex community templates and private manual lead functions. All production gates stay off. Read [the Phase 2 specification](phase2-review.md) for schema migration, consent withdrawal, retention/deletion, dashboard authentication, Facebook/taxonomy and activation blockers. Run `npm test` in backend with Node 22.13+ for both regression and extension suites. Do not merge before screenshot/report approval.


## Refined model supersedes the original hub-hosted thread plan

Read [the refined community model](community-model-review.md). Canonical threads belong on each vertical; Question & Form aggregates approved summaries. All unfinished UI is hidden by nine false public display flags. Local review fixtures are separate from production-safe pages, and review mode cannot submit. Professional reputation/matching and private first-look remain manual design scaffolds. The original review does not authorize activation or a merge.
