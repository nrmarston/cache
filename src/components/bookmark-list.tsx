import type * as React from "react";
import {
  ArchiveIcon,
  ArrowSquareOutIcon,
  StarIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import {
  formatBookmarkUrl,
  getBookmarkFallbackLabel,
  getBookmarkSubtitle,
} from "@/react-app/bookmark-display";
import type { Bookmark, BookmarkFilter } from "@/react-app/bookmark-types";
import { cn } from "@/lib/utils";

type BookmarkAction = "favorite" | "archive" | "delete";

type PendingAction = {
  bookmarkId: string;
  action: BookmarkAction;
} | null;

type BookmarkListProps = {
  bookmarks: Bookmark[];
  filter: BookmarkFilter;
  pendingAction: PendingAction;
  onToggleFavorite: (bookmark: Bookmark) => void;
  onToggleArchived: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
};

function openBookmark(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function stopAndRun(
  event: React.MouseEvent<HTMLButtonElement>,
  callback: () => void,
) {
  event.stopPropagation();
  callback();
}

function BookmarkImage({ bookmark }: { bookmark: Bookmark }) {
  if (bookmark.image_url) {
    return <img src={bookmark.image_url} alt="" loading="lazy" />;
  }

  return (
    <div className="flex size-full items-center justify-center bg-secondary text-sm font-semibold text-secondary-foreground">
      {getBookmarkFallbackLabel(bookmark)}
    </div>
  );
}

function EmptyBookmarks({ filter }: { filter: BookmarkFilter }) {
  const copy =
    filter === "favorites"
      ? "No favorite Bookmarks."
      : filter === "archived"
        ? "No Archived Bookmarks."
        : "No active Bookmarks.";

  return (
    <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
      {copy}
    </div>
  );
}

export function BookmarkList({
  bookmarks,
  filter,
  pendingAction,
  onToggleFavorite,
  onToggleArchived,
  onDelete,
}: BookmarkListProps) {
  if (bookmarks.length === 0) {
    return <EmptyBookmarks filter={filter} />;
  }

  return (
    <ItemGroup className="gap-0">
      {bookmarks.map((bookmark, index) => {
        const favoritePending =
          pendingAction?.bookmarkId === bookmark.id &&
          pendingAction.action === "favorite";
        const archivePending =
          pendingAction?.bookmarkId === bookmark.id &&
          pendingAction.action === "archive";
        const deletePending =
          pendingAction?.bookmarkId === bookmark.id &&
          pendingAction.action === "delete";

        return (
          <div key={bookmark.id}>
            <Item
              role="link"
              tabIndex={0}
              aria-label={`Open ${bookmark.title}`}
              className="min-h-20 cursor-pointer flex-nowrap border-transparent px-3 py-4 hover:bg-muted focus-visible:bg-muted sm:px-4"
              onClick={() => openBookmark(bookmark.url)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openBookmark(bookmark.url);
                }
              }}
            >
              <ItemMedia variant="image" className="rounded-[10px]">
                <BookmarkImage bookmark={bookmark} />
              </ItemMedia>

              <ItemContent className="min-w-0 gap-1">
                <ItemTitle className="max-w-full text-[15px] leading-5 font-semibold sm:text-base">
                  {bookmark.title}
                </ItemTitle>
                <ItemDescription
                  className={cn(
                    "!flex max-w-full items-center gap-2 text-[13px] leading-5 sm:text-sm",
                    bookmark.archived ? "text-muted-foreground/70" : null,
                  )}
                >
                  <span className="min-w-0 truncate">
                    {getBookmarkSubtitle(bookmark)}
                  </span>
                  <span className="hidden shrink-0 text-muted-foreground/60 sm:inline">
                    -
                  </span>
                  <span
                    className="hidden max-w-[42%] shrink-0 truncate text-right text-muted-foreground/70 sm:ml-auto sm:inline"
                    title={bookmark.url}
                  >
                    {formatBookmarkUrl(bookmark.url)}
                  </span>
                </ItemDescription>
              </ItemContent>

              <ItemActions className="ml-auto shrink-0 gap-1 opacity-80 transition-opacity group-hover/item:opacity-100">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    bookmark.favorite ? "Remove favorite" : "Add favorite"
                  }
                  disabled={favoritePending}
                  onClick={(event) =>
                    stopAndRun(event, () => onToggleFavorite(bookmark))
                  }
                >
                  <StarIcon
                    weight={bookmark.favorite ? "fill" : "regular"}
                    className={bookmark.favorite ? "text-primary" : undefined}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    bookmark.archived ? "Restore Bookmark" : "Archive Bookmark"
                  }
                  disabled={archivePending}
                  onClick={(event) =>
                    stopAndRun(event, () => onToggleArchived(bookmark))
                  }
                >
                  <ArchiveIcon
                    weight={bookmark.archived ? "fill" : "regular"}
                    className={bookmark.archived ? "text-primary" : undefined}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Open Bookmark"
                  className="hidden sm:inline-flex"
                  onClick={(event) =>
                    stopAndRun(event, () => openBookmark(bookmark.url))
                  }
                >
                  <ArrowSquareOutIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete Bookmark"
                  disabled={deletePending}
                  onClick={(event) =>
                    stopAndRun(event, () => onDelete(bookmark))
                  }
                >
                  <TrashIcon />
                </Button>
              </ItemActions>
            </Item>
            {index < bookmarks.length - 1 ? (
              <ItemSeparator className="my-0 ml-[4.75rem]" />
            ) : null}
          </div>
        );
      })}
    </ItemGroup>
  );
}
