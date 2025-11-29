"use client"

import { LayoutDashboard, FolderOpen, HardDrive, Settings, LogOut } from "lucide-react"
import { Link, useLocation } from "wouter"
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
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

const menuItems = [
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
    title: "Storage",
    url: "/storage",
    icon: HardDrive,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

interface AppSidebarProps {
  user?: {
    username: string
    email: string
  }
}

export function AppSidebar({ user }: AppSidebarProps) {
  const [location] = useLocation()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.reload()
  }

  return (
    <Sidebar className="bg-slate-900 border-slate-800">
      <SidebarHeader className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AR</span>
          </div>
          <h1 className="text-xl font-bold text-white">AREVEI Cloud</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="text-slate-300 hover:text-white hover:bg-slate-700 data-[active=true]:text-blue-400 data-[active=true]:bg-slate-800"
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
      <SidebarFooter className="p-4 border-t border-slate-800">
        <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <p className="text-xs text-slate-500 mb-1">Logged in as</p>
          <p className="text-sm font-medium text-slate-200">{user?.username}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <Button
          onClick={handleLogout}
          className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white justify-start"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
