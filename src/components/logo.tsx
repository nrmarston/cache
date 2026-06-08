import { BookmarkSimpleIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

/**
 * The Cache mark: a white bookmark on the brand-blue badge.
 *
 * Size is driven entirely by the badge `className` (e.g. `size-7`); the
 * bookmark scales to a fixed proportion of it. Pair with a wordmark when a
 * text label is wanted — this renders the mark only.
 */
export function Logo({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn(
        "grid aspect-square place-items-center rounded-md bg-primary text-primary-foreground",
        className,
      )}
    >
      <BookmarkSimpleIcon
        weight="fill"
        className={cn("size-[57%]", iconClassName)}
      />
    </span>
  );
}
