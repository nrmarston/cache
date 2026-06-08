import {
  ArchiveIcon,
  BoxArrowUpIcon,
  SignOutIcon,
  SquaresFourIcon,
  StarIcon,
} from "@phosphor-icons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/react-app/auth-client";
import type { BookmarkFilter } from "@/react-app/bookmark-types";
import { ModeToggle } from "@/components/mode-toggle";

const NAV_ITEMS: {
  key: BookmarkFilter;
  label: string;
  icon: typeof StarIcon;
}[] = [
  { key: "all", label: "All", icon: SquaresFourIcon },
  { key: "favorites", label: "Favorites", icon: StarIcon },
  { key: "archived", label: "Archived", icon: ArchiveIcon },
];

export function AppSidebar({
  userEmail,
  activeFilter,
  onFilterChange,
}: {
  userEmail: string;
  activeFilter: BookmarkFilter;
  onFilterChange: (filter: BookmarkFilter) => void;
}) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <BoxArrowUpIcon weight="duotone" size={24} />
          <span className="text-lg font-semibold">cache</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    isActive={activeFilter === key}
                    onClick={() => onFilterChange(key)}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p
          className="truncate px-2 text-xs text-muted-foreground"
          title={userEmail}
        >
          {userEmail}
        </p>
        <div className="flex gap-1">
          <Button
            variant="secondary"
            className="grow"
            onClick={() => {
              void authClient.signOut();
            }}
            data-icon="inline-start"
          >
            <SignOutIcon />
            <span>Sign out</span>
          </Button>
          <ModeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
