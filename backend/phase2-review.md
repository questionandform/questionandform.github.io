# Community and human-help review specification

Status: source scaffold and local synthetic previews only. No backend, D1, task, email, routing, public comments or production submission has been activated. STOP BEFORE MERGING. Review screenshots and report first. A merge is not permission to enable backend features.

## Data and consent

The primary question remains private. Community, human-help interest, and contact permission have independent versioned grants/declines and server timestamps. Community and human-help choices start unchecked. Contact requires human-help interest; an email additionally requires both collection gates. Interest alone creates no qualified contactable lead. Optional answer-notification email is distinct from human-help contact email. No phone/WhatsApp collection.

Consents are immutable for a submission identity; retries can finish an interrupted write but cannot replace its preferences or regrant withdrawn consent. A new request is needed for a new grant. Receipt-authorized POST /v1/requests/<UUID>/consents accepts operation_id and a withdraw array of community, human_help, contact. Wrong tokens, origin or expiry are denied. Community withdrawal hides/clears any thread but does not cancel human-help interest. Human-help withdrawal revokes contact, closes leads, erases their email and cancels pending candidate/notification records. Answer-notification consent/email is separate and not a routing authorization.

Receipts are private bearer links, never public share links. Frontend storage is limited to request UUID/token once real delivery is active; the current draft mode stores nothing. Raw questions, contact details and private rules never enter community DTOs. The private GitHub queue contains only question/answer envelopes, not contact details, consent records or tokens. Do not log visitor text, emails, token headers, provider responses or private configuration.

## Schema and migration

For a new local database use schema.sql. For an existing database apply only migrations/0002_community_leads.sql after taking a verified private backup. Do not apply both the full schema and the migration to the same database. Migration is additive: requests is retained; new entities are request_preferences, answers, consent_events, community_publication_requests, community_threads, community_contributions, leads, lead_events, provider_candidates, notification_deliveries. UUIDs, unique operation/request constraints and D1 transactional batches support retry safety. Foreign keys cascade from requests. Public thread UUIDs are independently generated and never equal receipt IDs.

Rehearse migration and rollback against a disposable copy before production. Rollback means restore the backup or disable the extension; never drop data from a live database as part of this review. Database binding/secrets remain placeholders. Node 22.13+ native SQLite tests validate the SQL contract; the local review audit uses real Python SQLite through an adapter because this workstation's usable Node is version 20. Neither is a deployed Cloudflare integration test.

## Retention and deletion

Proposed default: 30 days from request creation for request, answer, consent, lead and dependent audit data. Receipts/publication reads/manual transitions deny expired records immediately. The existing scheduled Worker cleanup deletes expired requests and cascades dependents only when run. No cron is active. A future operator must test cleanup cadence, failed runs, D1 backups and the private GitHub queue's separate deletion/history policy. Git history can retain deleted queue files; choose a tested expiry/repository rotation and backup erasure policy before collecting real data. No indefinite raw analytics/audit retention is authorized.

Authenticated support deletion must verify receipt possession or a documented identity procedure, delete the request (cascade), purge corresponding private queue/history/backups under the approved policy, and remove public caches/static exports. No public deletion endpoint/admin route is provided. Community withdrawal removes visibility immediately in the DB design; any future CDN/static publication must support immediate takedown and cache invalidation before launch. Browser receipt removal alone is not server deletion.

## Community publication

/community/ is an honest noindex empty state. /community/thread/ is a noindex unavailable-thread shell; it is not a live visitor discussion. The reviewed synthetic thread is served only by the local audit server and is never copied into a public route or sitemap. No fake SEO content or structured discussion schema.

Future /community/<generated-public-slug>/ pages require answered private content, active versioned community consent, explicit moderation, redaction, approved publication status and the separate publication gate. Unknown/minor THINK cases additionally require explicit minor review; identity and contact details must be removed. PII heuristics are defense in depth, never a substitute for human redaction. There are no accounts, direct messages or public comment writers. Contributions schema is reserved for later moderated content; comments remain disabled.

The public adapter returns only whitelisted display fields. Rendering uses textContent; never inject visitor HTML. Generated routes, pagination, cache invalidation and moderation operations need implementation/validation before enabling the read flag. No raw GitHub URL or receipt lookup is exposed. Copy-share links are clean canonical public URLs without queries/tokens. The fixture has no share control.

## Private manual lead triage

Types: tutoring, design_advice, 3d_visualization, small_home_project, decorative_art, repair, other. States: new, needs_information, reviewed, preferred_provider_candidate, other_provider_candidate, offered, accepted, declined, closed, spam. Authorized manual transitions and idempotent lead events are supported; declined may return to other_provider_candidate. No transition sends anything. Provider candidates are flags for review, never assignments, guarantees or offers.

provider-rules.example.json is generic and unavailable by default. Real rules/identities belong only in private configuration, secrets or a separate private store. Exact type/area/size/timeline categories may filter candidates. Day ranges and preferred characteristics are advisory manual criteria unless a reliable private numeric timeline/characteristic model is introduced; returned flags explicitly require review. No provider has been selected or contacted.

For THINK, unknown age is treated conservatively as minor-related. Future contact requires an adult/guardian email and confirmation for under-18/unstated age. No child name, school, phone or direct messaging. Self-declared confirmation is not identity verification; privacy and guardian-handling policy require approval before collection.

## Private demand dashboard

admin/dashboard-view.mjs is an escaped aggregate renderer, not an HTTP admin endpoint. The only review fixture is behind ephemeral local Basic authentication, noindex, never public hosting. Anonymous local fixture access must return 401. A future deployment requires a real identity provider, server-verified admin session, CSRF protection on mutations, MFA/role policy, audit access and capabilities read_demand, triage_leads, moderate_community, publish_community, review_answers. Never construct a trusted auth object from visitor input. These functions are not a deployed authentication system.

Counts: questions by agent, answered/unanswered, independent opt-ins, qualified leads, lead type, broad region, offered/routed, accepted/declined, question-to-help-interest ratio and recurring enum topics. Regions with fewer than five leads are suppressed. Routed means manual candidate/offer state, not evidence a message was sent. No cookies for analytics, fingerprinting, pixels, session recording or visitor profiles. Local figures are labeled synthetic aggregates.

## Facebook and future taxonomy

site-config.js has empty Facebook Page/Group URLs. Links remain hidden until configured with a validated HTTPS facebook.com URL. No credentials, Meta API, automatic Page/Group creation, posting or tracking. Page: brand announcements, useful tips and links to approved questions. Group: moderated discussion, feedback and shared projects. Original canonical content remains on Question & Form or the relevant vertical. Hub OG metadata uses the unchanged hero PNG. Future thread OG images/metadata need real approved content and generated routes; do not share fixture pages.

Active curated agents: THINK, SHAPE, MAKE. Inactive curated cards: ARRANGE (music adaptation/arrangement), PUBLISH (hook/script/caption/storyboard/package), FORM (brief/checklist/comparison/plan). Future taxonomy: LEARN → THINK, RIDDLE, EXPLAIN; CREATE → SHAPE, ARRANGE, PUBLISH; BUILD → MAKE, CODE, VISION; DECIDE → FORM, COMPARE, PLAN. Taxonomy is documentation, not activation.

## Activation blockers

All submission, contact/email, publication, comments and routing flags stay false. No Worker/D1, scheduler, private production queue, email sender or admin service is provisioned. LearnWithLev HTTPS has a certificate hostname mismatch and THINK_HTTPS_VERIFIED remains false. Do not repair DNS, certificates, CNAME or domain settings here. Preserve the approved hero bytes and landing pages. No paid service, DNS/SPF/DKIM/WhatsApp integration. WhatsApp is documentation-only as a possible future Business Platform channel, never a personal account.

Before activation: approve privacy/retention/minor policies, implement private admin authentication, validate migration/deletion, least-privilege private queue and all seven scheduled-task checks, fix THINK HTTPS under separate authorization, rehearse moderation/takedown, and obtain explicit approval. A successful local fixture or mocked test does not authorize activation.
