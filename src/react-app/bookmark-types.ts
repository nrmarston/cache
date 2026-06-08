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
  has_readable_content: boolean;
  readable_content_length: number;
};

export type BookmarkDetail = Bookmark & {
  readable_content: string | null;
};

export type BookmarkFilter = "all" | "favorites" | "archived";
