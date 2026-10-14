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
