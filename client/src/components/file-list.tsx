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
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RenameDialog } from "./rename-dialog"
import { DeleteDialog } from "./delete-dialog"
import { FilePreviewModal } from "./file-preview-modal"
import type { FileItem } from "@shared/schema"
import { formatDistanceToNow } from "date-fns"

interface FileListProps {
  files: FileItem[]
  onFolderOpen?: (file: FileItem) => void // Added folder open callback
}

export function FileList({ files, onFolderOpen }: FileListProps) {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [renameFile, setRenameFile] = useState<FileItem | null>(null)
  const [deleteFile, setDeleteFile] = useState<FileItem | null>(null)

  const getIcon = (file: FileItem) => {
    if (file.type === "folder") {
      return <Folder className="h-5 w-5 text-blue-400" /> // Enhanced colors
    }

    const mime = file.mimeType || ""
    if (mime.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5 text-purple-400" />
    }
    if (mime.startsWith("video/")) {
      return <FileVideo className="h-5 w-5 text-red-400" />
    }
    if (mime === "application/pdf") {
      return <FileText className="h-5 w-5 text-red-500" />
    }
    if (mime.includes("zip") || mime.includes("archive")) {
      return <FileArchive className="h-5 w-5 text-yellow-400" />
    }
    return <File className="h-5 w-5 text-slate-500" />
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "-"
    const units = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
  }

  const getFileType = (file: FileItem) => {
    if (file.type === "folder") return "Folder"
    const mime = file.mimeType || ""
    if (mime.startsWith("image/")) return "Image"
    if (mime.startsWith("video/")) return "Video"
    if (mime === "application/pdf") return "PDF"
    if (mime.includes("zip") || mime.includes("archive")) return "Archive"
    return "File"
  }

  const canPreview = (file: FileItem) =>
    file.type === "file" && (file.mimeType?.startsWith("image/") || file.mimeType === "application/pdf")

  const handleRowClick = (file: FileItem) => {
    if (file.type === "folder" && onFolderOpen) {
      onFolderOpen(file)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50"
      >
        <div className="bg-slate-800 border-b border-slate-700">
          <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium text-slate-300">
            <div className="col-span-5">Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2">Modified</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
        </div>

        <div className="divide-y divide-slate-700">
          {files.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              onClick={() => handleRowClick(file)}
              className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors ${
                file.type === "folder"
                  ? "cursor-pointer hover:bg-slate-700 hover:border-l-2 hover:border-l-blue-500"
                  : "hover:bg-slate-700/50"
              }`}
              data-testid={`row-file-${file.id}`}
            >
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                {getIcon(file)}
                <span
                  className="truncate font-medium text-slate-200"
                  title={file.name}
                  data-testid={`text-filename-${file.id}`}
                >
                  {file.name}
                </span>
              </div>
              <div className="col-span-2 text-sm text-slate-500">{getFileType(file)}</div>
              <div className="col-span-2 text-sm text-slate-500">
                {file.type === "file" ? formatSize(file.size) : "-"}
              </div>
              <div className="col-span-2 text-sm text-slate-500">
                {file.modifiedAt && formatDistanceToNow(new Date(file.modifiedAt), { addSuffix: true })}
              </div>
              <div className="col-span-1 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                      data-testid={`button-menu-${file.id}`}
                    >
                      <MoreVertical className="h-4 w-4" />
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
                    {canPreview(file) && (
                      <DropdownMenuItem
                        onClick={() => setSelectedFile(file)}
                        className="text-slate-300 hover:bg-slate-700 cursor-pointer"
                        data-testid={`button-preview-${file.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => setRenameFile(file)}
                      className="text-slate-300 hover:bg-slate-700 cursor-pointer"
                      data-testid={`button-rename-${file.id}`}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteFile(file)}
                      className="text-red-400 hover:bg-slate-700 cursor-pointer"
                      data-testid={`button-delete-${file.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <RenameDialog file={renameFile} open={!!renameFile} onOpenChange={(open) => !open && setRenameFile(null)} />

      <DeleteDialog file={deleteFile} open={!!deleteFile} onOpenChange={(open) => !open && setDeleteFile(null)} />

      <FilePreviewModal
        file={selectedFile}
        open={!!selectedFile}
        onOpenChange={(open) => !open && setSelectedFile(null)}
      />
    </>
  )
}
