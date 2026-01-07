import { 
  LayoutDashboard, 
  FolderOpen, 
  HardDrive, 
  Settings,
  Share2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import Image from "next/image";

const menuItems = [
  // {
  //   title: "Electron",
  //   url: "/electron",
  //   icon: LayoutDashboard,
  // },
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Files",
    url: "/files",
    icon: FolderOpen,
  },
  {
    title: "Shares",
    url: "/shares",
    icon: Share2,
  },
  {
    title: "Storage",
    url: "/storage",
    icon: HardDrive,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-6 flex justify-center max-w-[13rem] mx-auto">
  {/* Light mode logo */}
  <img
    src="/ARVCloud-color-white.png"
    alt="Arevei Cloud"
    width={200}
    height={80}
    className="block dark:hidden"

  />

  {/* Dark mode logo */}
  <img
    src="/ARVCloud-color-black.png"
    alt="Arevei Cloud"
    width={200}
    height={80}
    className="hidden dark:block"
  
  />
</SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`link-nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
