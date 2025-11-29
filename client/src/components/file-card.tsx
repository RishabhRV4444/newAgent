"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  FileText,
  Folder,
  ImageIcon,
  FileVideo,
  FileArchive,
  File,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  FolderOpen,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { FileItem } from "@shared/schema"
import { formatDistanceToNow } from "date-fns"

interface FileCardProps {
  file: FileItem
  onRename: (file: FileItem) => void
  onDelete: (file: FileItem) => void
  onPreview: (file: FileItem) => void
  onFolderOpen?: (file: FileItem) => void // Added folder navigation callback
}

export function FileCard({ file, onRename, onDelete, onPreview, onFolderOpen }: FileCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getIcon = () => {
    if (file.type === "folder") {
      return <Folder className="h-12 w-12 text-blue-400" /> // Enhanced folder icon color
    }

    const mime = file.mimeType || ""
    if (mime.startsWith("image/")) {
      return <ImageIcon className="h-12 w-12 text-purple-400" />
    }
    if (mime.startsWith("video/")) {
      return <FileVideo className="h-12 w-12 text-red-400" />
    }
    if (mime === "application/pdf") {
      return <FileText className="h-12 w-12 text-red-500" />
    }
    if (mime.includes("zip") || mime.includes("archive")) {
      return <FileArchive className="h-12 w-12 text-yellow-400" />
    }
    return <File className="h-12 w-12 text-slate-500" />
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "-"
    const units = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
  }

  const canPreview =
    file.type === "file" && (file.mimeType?.startsWith("image/") || file.mimeType === "application/pdf")

  const handleCardClick = () => {
    if (file.type === "folder" && onFolderOpen) {
      onFolderOpen(file)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <Card
        className={`p-4 transition-all ${
          file.type === "folder"
            ? "cursor-pointer hover:bg-slate-700 hover:border-blue-500 border-slate-700 bg-slate-800/50"
            : "bg-slate-800/50 border-slate-700"
        }`}
        data-testid={`card-file-${file.id}`}
      >
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            {getIcon()}
            <div className="absolute -top-2 -right-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 bg-slate-600 hover:bg-slate-500"
                    data-testid={`button-menu-${file.id}`}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                  {file.type === "folder" &&
                    onFolderOpen && ( // Add open folder option
                      <DropdownMenuItem
                        onClick={() => onFolderOpen(file)}
                        className="text-slate-300 hover:bg-slate-700 cursor-pointer"
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Open
                      </DropdownMenuItem>
                    )}
                  {canPreview && (
                    <DropdownMenuItem
                      onClick={() => onPreview(file)}
                      className="text-slate-300 hover:bg-slate-700 cursor-pointer"
                      data-testid={`button-preview-${file.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onRename(file)}
                    className="text-slate-300 hover:bg-slate-700 cursor-pointer"
                    data-testid={`button-rename-${file.id}`}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(file)}
                    className="text-red-400 hover:bg-slate-700 cursor-pointer"
                    data-testid={`button-delete-${file.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="w-full min-w-0">
            <p
              className="font-medium truncate text-slate-200"
              title={file.name}
              data-testid={`text-filename-${file.id}`}
            >
              {file.name}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-1">
              {file.type === "file" && <span>{formatSize(file.size)}</span>}
              {file.modifiedAt && (
                <>
                  {file.type === "file" && <span>•</span>}
                  <span>{formatDistanceToNow(new Date(file.modifiedAt), { addSuffix: true })}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
