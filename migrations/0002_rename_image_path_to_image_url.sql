-- The image column now holds a remote og:image URL derived on Import, not a
-- stored path (there is no R2 image storage yet — see ADR 0003 / CONTEXT.md).
ALTER TABLE bookmarks RENAME COLUMN image_path TO image_url;
