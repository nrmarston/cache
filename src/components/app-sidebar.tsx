import { useState } from "react";
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

type Filter = "all" | "favorites" | "archived";

const NAV_ITEMS: { key: Filter; label: string; icon: typeof StarIcon }[] = [
  { key: "all", label: "All", icon: SquaresFourIcon },
  { key: "favorites", label: "Favorites", icon: StarIcon },
  { key: "archived", label: "Archived", icon: ArchiveIcon },
];

export function AppSidebar({ userEmail }: { userEmail: string }) {
  // Visual-only for now; filtering not wired yet.
  const [active, setActive] = useState<Filter>("all");

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
                    isActive={active === key}
                    onClick={() => setActive(key)}
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
        <p className="truncate px-2 text-xs text-muted-foreground" title={userEmail}>
          {userEmail}
        </p>
        <Button
          variant="secondary"
          className="w-full justify-start"
          onClick={() => {
            void authClient.signOut();
          }}
        >
          <SignOutIcon />
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
