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

export type BookmarkFilter = "all" | "favorites" | "archived";
