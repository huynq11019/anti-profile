CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proxies (
  id TEXT PRIMARY KEY NOT NULL,
  protocol TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT,
  password TEXT,
  alias TEXT,
  last_tested DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  fingerprint_seed INTEGER NOT NULL,
  proxy_id TEXT,
  user_agent TEXT,
  timezone TEXT DEFAULT 'UTC',
  note TEXT,
  is_pinned BOOLEAN DEFAULT 0,
  last_opened DATETIME,
  group_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proxy_id) REFERENCES proxies (id) ON DELETE SET NULL,
  FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_proxy_id ON profiles (proxy_id);
CREATE INDEX IF NOT EXISTS idx_profiles_group_id ON profiles (group_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_pinned ON profiles (is_pinned);
CREATE INDEX IF NOT EXISTS idx_profiles_last_opened ON profiles (last_opened);
