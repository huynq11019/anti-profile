CREATE TABLE IF NOT EXISTS profile_bookmarks (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  folder TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profile_bookmarks_profile_id ON profile_bookmarks (profile_id);
