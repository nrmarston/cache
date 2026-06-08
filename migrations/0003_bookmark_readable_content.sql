CREATE TABLE bookmark_contents (
  bookmark_id TEXT PRIMARY KEY NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  readable_content TEXT NOT NULL,
  readable_content_length INTEGER NOT NULL,
  extracted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
