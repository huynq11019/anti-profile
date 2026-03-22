CREATE TABLE IF NOT EXISTS profile_extensions (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL,
  extension_name TEXT NOT NULL,
  extension_path TEXT NOT NULL,
  source TEXT NOT NULL,
  source_ref TEXT,
  enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profile_extensions_profile_id ON profile_extensions (profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_extensions_enabled ON profile_extensions (enabled);
