"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Grid3x3, List, Search, Upload, FolderPlus, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { FileGrid } from "@/components/file-grid"
import { FileList } from "@/components/file-list"
import { UploadZone } from "@/components/upload-zone"
import { CreateFolderDialog } from "@/components/create-folder-dialog"
import type { FileItem } from "@shared/schema"

export default function Files() {
  const [currentPath, setCurrentPath] = useState("/")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [showUploadZone, setShowUploadZone] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)

  const { data: files = [], isLoading } = useQuery<FileItem[]>({
    queryKey: ["/api/files"],
  })

  const currentFolderFiles = useMemo(() => {
    return files.filter((file) => {
      // Normalize paths for comparison
      const fileParentPath = file.parentPath || "/"
      const normalizedCurrentPath = currentPath === "/" ? "/" : currentPath
      const normalizedFileParentPath =
        fileParentPath === "/" ? "/" : `/${fileParentPath.replace(/^\//, "").replace(/\/$/, "")}`

      return normalizedFileParentPath === normalizedCurrentPath
    })
  }, [files, currentPath])

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return currentFolderFiles
    return currentFolderFiles.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [currentFolderFiles, searchQuery])

  const handleNavigate = (path: string) => {
    setCurrentPath(path)
    setSearchQuery("") // Clear search when navigating
  }

  const handleGoBack = () => {
    const segments = currentPath.split("/").filter(Boolean)
    if (segments.length > 0) {
      segments.pop()
      setCurrentPath(segments.length === 0 ? "/" : "/" + segments.join("/"))
    }
  }

  const handleFolderOpen = (file: FileItem) => {
    if (file.type === "folder") {
      // Use the file's path directly as the new current path
      const newPath = file.path.startsWith("/") ? file.path : `/${file.path}`
      setCurrentPath(newPath)
      setSearchQuery("")
    }
  }

  return (
    <div className="flex flex-col h-full ">
      <div className="p-6 border-b border-slate-700 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {currentPath !== "/" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGoBack}
                className="text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-3xl font-bold text-white">Files</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600"
            >
              {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {currentPath !== "/" && <BreadcrumbNav currentPath={currentPath} onNavigate={handleNavigate} />}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search in current folder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-500"
            />
          </div>
          <Button
            onClick={() => setShowCreateFolder(true)}
            className="bg-slate-700 hover:bg-slate-600 text-white gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
          <Button onClick={() => setShowUploadZone(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-400">Loading files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <FolderPlus className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? "No matching files" : currentPath === "/" ? "No files yet" : "This folder is empty"}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchQuery ? "Try a different search term" : "Upload your first file or create a folder to get started"}
            </p>
            {!searchQuery && (
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCreateFolder(true)}
                  className="bg-slate-700 hover:bg-slate-600 text-white gap-2"
                >
                  <FolderPlus className="h-4 w-4" />
                  Create Folder
                </Button>
                <Button
                  onClick={() => setShowUploadZone(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Files
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentPath}-${viewMode}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {viewMode === "grid" ? (
                <FileGrid files={filteredFiles} onFolderOpen={handleFolderOpen} />
              ) : (
                <FileList files={filteredFiles} onFolderOpen={handleFolderOpen} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <UploadZone open={showUploadZone} onOpenChange={setShowUploadZone} currentPath={currentPath} />
      <CreateFolderDialog open={showCreateFolder} onOpenChange={setShowCreateFolder} parentPath={currentPath} />
    </div>
  )
}
