import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Grid3x3, List, Search, Upload, FolderPlus, Home, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileGrid } from "@/components/file-grid";
import { FileList } from "@/components/file-list";
import { UploadZone } from "@/components/upload-zone";
import { CreateFolderDialog } from "@/components/create-folder-dialog";
import type { FileItem } from "@shared/schema";

export default function Files() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [currentPath, setCurrentPath] = useState("/");

  const { data: files = [], isLoading } = useQuery<FileItem[]>({
    queryKey: ["/api/files"],
  });

  const currentFiles = useMemo(() => {
    return files.filter((file) => {
      const normalizedParentPath = file.parentPath === "" ? "/" : file.parentPath;
      return normalizedParentPath === currentPath;
    });
  }, [files, currentPath]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return currentFiles;
    return currentFiles.filter((file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentFiles, searchQuery]);

  const breadcrumbs = useMemo(() => {
    if (currentPath === "/") return [];
    const parts = currentPath.split("/").filter(Boolean);
    const crumbs: { name: string; path: string }[] = [];
    let accumulatedPath = "";
    for (const part of parts) {
      accumulatedPath += "/" + part;
      crumbs.push({ name: part, path: accumulatedPath });
    }
    return crumbs;
  }, [currentPath]);

  const handleFolderClick = (folder: FileItem) => {
    if (folder.type === "folder") {
      const folderFullPath = folder.path.startsWith("/") ? folder.path : `/${folder.path}`;
      setCurrentPath(folderFullPath);
      setSearchQuery("");
    }
  };

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
    setSearchQuery("");
  };

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredFiles]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold" data-testid="text-files-title">Files</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              data-testid="button-toggle-view"
            >
              {viewMode === "grid" ? (
                <List className="h-4 w-4" />
              ) : (
                <Grid3x3 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateToPath("/")}
            className={`h-8 px-2 ${currentPath === "/" ? "text-primary font-medium" : "text-muted-foreground"}`}
            data-testid="breadcrumb-home"
          >
            <Home className="h-4 w-4 mr-1" />
            Home
          </Button>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateToPath(crumb.path)}
                className={`h-8 px-2 ${
                  index === breadcrumbs.length - 1 
                    ? "text-primary font-medium" 
                    : "text-muted-foreground"
                }`}
                data-testid={`breadcrumb-${crumb.name}`}
              >
                {crumb.name}
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in current folder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Button
            onClick={() => setShowCreateFolder(true)}
            variant="outline"
            data-testid="button-create-folder"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button
            onClick={() => setShowUploadZone(true)}
            data-testid="button-upload"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading files...</p>
          </div>
        ) : sortedFiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <FolderPlus className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {currentPath === "/" ? "No files yet" : "This folder is empty"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {currentPath === "/" 
                ? "Upload your first file or create a folder to get started"
                : "Upload files or create a subfolder"}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setShowCreateFolder(true)} variant="outline">
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Folder
              </Button>
              <Button onClick={() => setShowUploadZone(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === "grid" ? (
              <FileGrid 
                key="grid" 
                files={sortedFiles} 
                onFolderClick={handleFolderClick}
              />
            ) : (
              <FileList 
                key="list" 
                files={sortedFiles}
                onFolderClick={handleFolderClick}
              />
            )}
          </AnimatePresence>
        )}
      </div>

      <UploadZone 
        open={showUploadZone} 
        onOpenChange={setShowUploadZone}
        parentPath={currentPath}
      />
      <CreateFolderDialog 
        open={showCreateFolder} 
        onOpenChange={setShowCreateFolder}
        parentPath={currentPath}
      />
    </div>
  );
}
