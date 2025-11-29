"use client"
import type { FileItem } from "@shared/schema"
import { Folder, File, FileText, ImageIcon, Music, Video, Archive } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileBrowserProps {
  files: FileItem[]
  currentPath: string
  onFolderOpen: (path: string) => void
  viewMode: "grid" | "list"
}

function getFileIcon(file: FileItem) {
  if (file.type === "folder") {
    return <Folder className="w-6 h-6 text-blue-400" />
  }

  const mimeType = file.mimeType || ""
  if (mimeType.startsWith("image/")) {
    return <ImageIcon className="w-6 h-6 text-purple-400" />
  }
  if (mimeType.startsWith("audio/")) {
    return <Music className="w-6 h-6 text-green-400" />
  }
  if (mimeType.startsWith("video/")) {
    return <Video className="w-6 h-6 text-red-400" />
  }
  if (mimeType.includes("zip") || mimeType.includes("compressed")) {
    return <Archive className="w-6 h-6 text-yellow-400" />
  }
  if (mimeType.includes("document") || mimeType.includes("text")) {
    return <FileText className="w-6 h-6 text-slate-400" />
  }

  return <File className="w-6 h-6 text-slate-400" />
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  })
}

export function FileBrowser({ files, currentPath, onFolderOpen, viewMode }: FileBrowserProps) {
  const currentDirFiles = files.filter(
    (f) => f.parentPath === currentPath || (currentPath === "/" && f.parentPath === "/"),
  )

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {currentDirFiles.map((file) => (
          <div
            key={file.id}
            onClick={() => {
              if (file.type === "folder") {
                onFolderOpen(file.path)
              }
            }}
            className={cn(
              "p-3 rounded-lg border border-slate-700 bg-slate-800/50 transition-all",
              file.type === "folder" && "cursor-pointer hover:bg-slate-700 hover:border-blue-500",
            )}
          >
            <div className="flex justify-center mb-2">{getFileIcon(file)}</div>
            <p className="text-xs font-medium text-slate-300 truncate text-center">{file.name}</p>
            {file.type === "file" && <p className="text-xs text-slate-500 text-center">{formatFileSize(file.size)}</p>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {currentDirFiles.map((file) => (
        <div
          key={file.id}
          onClick={() => {
            if (file.type === "folder") {
              onFolderOpen(file.path)
            }
          }}
          className={cn(
            "p-3 rounded-lg border border-slate-700 bg-slate-800/50 flex items-center gap-3 transition-all",
            file.type === "folder" && "cursor-pointer hover:bg-slate-700 hover:border-blue-500",
          )}
        >
          {getFileIcon(file)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-300 truncate">{file.name}</p>
            <p className="text-xs text-slate-500">{file.type === "folder" ? "Folder" : formatFileSize(file.size)}</p>
          </div>
          <div className="text-xs text-slate-500 whitespace-nowrap">{formatDate(file.modifiedAt)}</div>
        </div>
      ))}
    </div>
  )
}
