DROP TABLE IF EXISTS bookmarks;

CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  image_path TEXT,
  favorite INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO bookmarks ("id", "user_id", "title", "url", "description", "image_path", "favorite", "archived", "created_at", "updated_at")
VALUES ('0d83e24d-593a-4896-826c-e55c53b8efb8', '35c274b7-cf67-4abb-8dc0-7caeb475c544', 'Modern CSS snippets. Every old hack, replaced.', 'https://modern-css.com/', 'Side-by-side comparisons of outdated CSS techniques and their modern native replacements. Grid, custom properties, nesting, container queries, and more.', 'modern-css.com-ffa56238-48ed-4e22-b1ba-7978cf9aab4e.png', false, false, '2026-05-31 04:48:35.859358+00', '2026-05-31 04:48:35.859358+00');
