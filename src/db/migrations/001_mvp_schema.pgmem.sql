CREATE TABLE IF NOT EXISTS monitored_url (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  keywords TEXT NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS snapshot (
  id BIGSERIAL PRIMARY KEY,
  monitored_url_id BIGINT NOT NULL REFERENCES monitored_url(id) ON DELETE CASCADE,
  raw_content TEXT NOT NULL,
  normalized_content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  scraped_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS change_event (
  id BIGSERIAL PRIMARY KEY,
  monitored_url_id BIGINT NOT NULL REFERENCES monitored_url(id) ON DELETE CASCADE,
  previous_snapshot_id BIGINT REFERENCES snapshot(id) ON DELETE SET NULL,
  current_snapshot_id BIGINT NOT NULL REFERENCES snapshot(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL,
  relevance_score INTEGER NOT NULL,
  summary TEXT NOT NULL,
  business_impact TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitored_url_url ON monitored_url (url);
CREATE INDEX IF NOT EXISTS idx_snapshot_monitored_url_id_scraped_at
  ON snapshot (monitored_url_id, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshot_content_hash ON snapshot (content_hash);
