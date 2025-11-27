import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Grid3x3, List, Search, Upload, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileGrid } from "@/components/file-grid";
import { FileList } from "@/components/file-list";
import { UploadZone } from "@/components/upload-zone";
import { CreateFolderDialog } from "@/components/create-folder-dialog";
import type { FileItem } from "@/shared/schema";

export default function Files() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  const { data: files = [], isLoading } = useQuery<FileItem[]>({
    queryKey: ["/api/files"],
  });

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files and folders..."
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
        ) : filteredFiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <FolderPlus className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No files yet</h3>
            <p className="text-muted-foreground mb-6">
              Upload your first file or create a folder to get started
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
              <FileGrid key="grid" files={filteredFiles} />
            ) : (
              <FileList key="list" files={filteredFiles} />
            )}
          </AnimatePresence>
        )}
      </div>

      <UploadZone open={showUploadZone} onOpenChange={setShowUploadZone} />
      <CreateFolderDialog open={showCreateFolder} onOpenChange={setShowCreateFolder} />
    </div>
  );
}
