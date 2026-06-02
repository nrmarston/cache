// Shared shape of the `bookmarks` table, used by the CRUD routes and the
// Import service so both read the same columns and row type.

export type Bookmark = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  description: string | null;
  image_url: string | null;
  favorite: number;
  archived: number;
  created_at: string;
  updated_at: string;
};

export const bookmarkColumns =
  "id, user_id, title, url, description, image_url, favorite, archived, created_at, updated_at";
