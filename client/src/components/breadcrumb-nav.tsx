"use client"

import { ChevronRight, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BreadcrumbNavProps {
  currentPath: string
  onNavigate: (path: string) => void
}

export function BreadcrumbNav({ currentPath, onNavigate }: BreadcrumbNavProps) {
  const segments = currentPath.split("/").filter(Boolean)

  const breadcrumbs = [
    { label: "Home", path: "/" },
    ...segments.map((segment, index) => ({
      label: segment,
      path: "/" + segments.slice(0, index + 1).join("/"),
    })),
  ]

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(crumb.path)}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            {index === 0 ? <Home className="w-4 h-4" /> : <span>{crumb.label}</span>}
          </Button>
          {index < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
        </div>
      ))}
    </div>
  )
}
