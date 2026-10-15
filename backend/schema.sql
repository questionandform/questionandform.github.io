-- Private runtime data only. Never put a production database or export in Git.
CREATE TABLE IF NOT EXISTS requests (
  request_id TEXT PRIMARY KEY,
  access_hash TEXT NOT NULL,
  agent TEXT NOT NULL CHECK (agent IN ('THINK', 'SHAPE', 'MAKE')),
  source_site TEXT NOT NULL,
  question TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  answer TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  github_synced_at TEXT,
  CHECK (status != 'answered' OR (answer IS NOT NULL AND length(answer) > 0))
);
CREATE INDEX IF NOT EXISTS requests_pending ON requests(status, created_at);
CREATE INDEX IF NOT EXISTS requests_expiry ON requests(expires_at);

-- Phase 2: additive, private schema. Apply only after a separately approved backend rollout.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS request_preferences (
 request_id TEXT PRIMARY KEY REFERENCES requests(request_id) ON DELETE CASCADE,
 input_hash TEXT NOT NULL,
 community_active INTEGER NOT NULL DEFAULT 0 CHECK(community_active IN (0,1)),
 human_help_active INTEGER NOT NULL DEFAULT 0 CHECK(human_help_active IN (0,1)),
 contact_active INTEGER NOT NULL DEFAULT 0 CHECK(contact_active IN (0,1)),
 minor_related INTEGER NOT NULL DEFAULT 0 CHECK(minor_related IN (0,1)),
 help_json TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS answers (
 id TEXT PRIMARY KEY,
 request_id TEXT NOT NULL UNIQUE REFERENCES requests(request_id) ON DELETE CASCADE,
 answer TEXT NOT NULL,
 review_state TEXT NOT NULL DEFAULT 'unreviewed' CHECK(review_state IN ('unreviewed','needs_review','reviewed')),
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS consent_events (
 id TEXT PRIMARY KEY,
 operation_id TEXT NOT NULL,
 request_id TEXT NOT NULL REFERENCES requests(request_id) ON DELETE CASCADE,
 scope TEXT NOT NULL CHECK(scope IN ('community','human_help','contact')),
 action TEXT NOT NULL CHECK(action IN ('grant','decline','withdraw')),
 version TEXT NOT NULL,
 occurred_at TEXT NOT NULL,
 UNIQUE(request_id,operation_id,scope)
);
CREATE TABLE IF NOT EXISTS community_publication_requests (
 id TEXT PRIMARY KEY,
 request_id TEXT NOT NULL UNIQUE REFERENCES requests(request_id) ON DELETE CASCADE,
 state TEXT NOT NULL DEFAULT 'awaiting_answer' CHECK(state IN ('awaiting_answer','awaiting_moderation','approved','rejected','withdrawn')),
 created_at TEXT NOT NULL,
 reviewed_at TEXT,
 reviewed_by TEXT
);
CREATE TABLE IF NOT EXISTS community_threads (
 public_id TEXT PRIMARY KEY,
 publication_request_id TEXT NOT NULL UNIQUE REFERENCES community_publication_requests(id) ON DELETE CASCADE,
 slug TEXT NOT NULL UNIQUE,
 agent TEXT NOT NULL CHECK(agent IN ('THINK','SHAPE','MAKE')),
 title TEXT NOT NULL,
 question TEXT NOT NULL,
 answer TEXT NOT NULL,
 summary TEXT NOT NULL,
 broad_region TEXT,
 region_granularity TEXT NOT NULL DEFAULT 'none' CHECK(region_granularity IN ('none','city','region')),
 state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','approved','published','withdrawn')),
 pii_removed INTEGER NOT NULL DEFAULT 0 CHECK(pii_removed IN (0,1)),
 moderation_approved INTEGER NOT NULL DEFAULT 0 CHECK(moderation_approved IN (0,1)),
 minor_review_approved INTEGER NOT NULL DEFAULT 0 CHECK(minor_review_approved IN (0,1)),
 reviewed_by TEXT,
 published_at TEXT
);
CREATE TABLE IF NOT EXISTS community_contributions (
 id TEXT PRIMARY KEY,
 thread_id TEXT NOT NULL REFERENCES community_threads(public_id) ON DELETE CASCADE,
 text TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected','withdrawn')),
 moderated_by TEXT,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS leads (
 id TEXT PRIMARY KEY,
 request_id TEXT NOT NULL UNIQUE REFERENCES requests(request_id) ON DELETE CASCADE,
 type TEXT NOT NULL CHECK(type IN ('tutoring','design_advice','3d_visualization','small_home_project','decorative_art','repair','other')),
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','needs_information','reviewed','preferred_provider_candidate','other_provider_candidate','offered','accepted','declined','closed','spam')),
 contact_email TEXT NOT NULL,
 broad_location TEXT,
 language TEXT NOT NULL,
 timeline TEXT NOT NULL,
 details_json TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lead_events (
 id TEXT PRIMARY KEY,
 operation_id TEXT NOT NULL,
 lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
 event TEXT NOT NULL,
 actor_id TEXT NOT NULL,
 occurred_at TEXT NOT NULL,
 UNIQUE(lead_id,operation_id)
);
CREATE TABLE IF NOT EXISTS provider_candidates (
 id TEXT PRIMARY KEY,
 lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
 provider_key TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'manual_review_required' CHECK(state IN ('manual_review_required','approved','rejected','cancelled')),
 flags_json TEXT NOT NULL,
 reviewed_by TEXT,
 UNIQUE(lead_id,provider_key)
);
CREATE TABLE IF NOT EXISTS notification_deliveries (
 id TEXT PRIMARY KEY,
 request_id TEXT NOT NULL REFERENCES requests(request_id) ON DELETE CASCADE,
 purpose TEXT NOT NULL CHECK(purpose IN ('answer_ready','human_help_followup')),
 channel TEXT NOT NULL DEFAULT 'email' CHECK(channel IN ('email')),
 status TEXT NOT NULL DEFAULT 'disabled' CHECK(status IN ('disabled','pending','sent','failed','cancelled')),
 idempotency_key TEXT NOT NULL UNIQUE,
 attempts INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS consent_request_scope ON consent_events(request_id,scope,occurred_at);
CREATE INDEX IF NOT EXISTS lead_status_type ON leads(status,type);
CREATE INDEX IF NOT EXISTS publication_state ON community_publication_requests(state);
