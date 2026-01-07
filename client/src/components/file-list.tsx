import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Folder,
  Image,
  FileVideo,
  FileArchive,
  File,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Share2,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RenameDialog } from "./rename-dialog";
import { DeleteDialog } from "./delete-dialog";
import { FilePreviewModal } from "./file-preview-modal";
import { ShareDialog } from "./share-dialog";
import type { FileItem } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface FileListProps {
  files: FileItem[];
  onFolderClick?: (folder: FileItem) => void;
}

export function FileList({ files, onFolderClick }: FileListProps) {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [renameFile, setRenameFile] = useState<FileItem | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileItem | null>(null);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);

  const getIcon = (file: FileItem) => {
    if (file.type === "folder") {
      return <Folder className="h-5 w-5 text-primary" />;
    }

    const mime = file.mimeType || "";
    if (mime.startsWith("image/")) {
      return <Image className="h-5 w-5 text-chart-2" />;
    }
    if (mime.startsWith("video/")) {
      return <FileVideo className="h-5 w-5 text-chart-3" />;
    }
    if (mime === "application/pdf") {
      return <FileText className="h-5 w-5 text-destructive" />;
    }
    if (mime.includes("zip") || mime.includes("archive")) {
      return <FileArchive className="h-5 w-5 text-chart-4" />;
    }
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const getThumbnail = (file: FileItem) => {
    if (file.type === "file" && file.mimeType?.startsWith("image/")) {
      const fileUrl = `/api/files/${file.id}/content`;
      return (
        <div className="h-9 w-9 rounded-lg overflow-hidden border-2 border-primary/10 shadow-sm bg-muted flex-shrink-0">
          <img 
            src={fileUrl} 
            alt={file.name}
            className="h-full w-full object-cover"
            title={file.name}
          />
        </div>
      );
    }
    return null;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const getFileType = (file: FileItem) => {
    if (file.type === "folder") return "Folder";
    const mime = file.mimeType || "";
    if (mime.startsWith("image/")) return "Image";
    if (mime.startsWith("video/")) return "Video";
    if (mime === "application/pdf") return "PDF";
    if (mime.includes("zip") || mime.includes("archive")) return "Archive";
    return "File";
  };

  const canPreview = (file: FileItem) => 
    file.type === "file" && 
    (file.mimeType?.startsWith("image/") || file.mimeType === "application/pdf");

  const handleRowClick = (file: FileItem, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-dropdown-trigger]') || target.closest('[role="menu"]') || target.closest('button')) {
      return;
    }
    
    if (file.type === "folder" && onFolderClick) {
      onFolderClick(file);
    } else if (canPreview(file)) {
      setSelectedFile(file);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="border rounded-lg overflow-hidden"
      >
        <div className="bg-muted/50">
          <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium">
            <div className="col-span-5">Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2">Modified</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
        </div>

        <div className="divide-y">
          {files.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              className={`grid grid-cols-12 gap-4 p-4 hover-elevate items-center cursor-pointer ${
                file.type === "folder" ? "hover:bg-primary/5" : ""
              }`}
              onClick={(e) => handleRowClick(file, e)}
              data-testid={`row-file-${file.id}`}
            >
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-2">
                  {getThumbnail(file) || getIcon(file)}
                </div>
                <span 
                  className="truncate font-medium" 
                  title={file.name}
                  data-testid={`text-filename-${file.id}`}
                >
                  {file.name}
                </span>
              </div>
              <div className="col-span-2 text-sm text-muted-foreground">
                {getFileType(file)}
              </div>
              <div className="col-span-2 text-sm text-muted-foreground">
                {file.type === "folder" ? "-" : formatSize(file.size)}
              </div>
              <div className="col-span-2 text-sm text-muted-foreground">
                {file.modifiedAt && formatDistanceToNow(new Date(file.modifiedAt), { addSuffix: true })}
              </div>
              <div className="col-span-1 flex justify-end" data-dropdown-trigger>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`button-menu-${file.id}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {file.type === "folder" && onFolderClick && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onFolderClick(file);
                        }}
                        data-testid={`button-open-${file.id}`}
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Open
                      </DropdownMenuItem>
                    )}
                    {canPreview(file) && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(file);
                        }}
                        data-testid={`button-preview-${file.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                    )}
                    {file.type === "file" && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareFile(file);
                        }}
                        data-testid={`button-share-${file.id}`}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameFile(file);
                      }}
                      data-testid={`button-rename-${file.id}`}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteFile(file);
                      }}
                      className="text-destructive"
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

      <RenameDialog
        file={renameFile}
        open={!!renameFile}
        onOpenChange={(open) => !open && setRenameFile(null)}
      />

      <DeleteDialog
        file={deleteFile}
        open={!!deleteFile}
        onOpenChange={(open) => !open && setDeleteFile(null)}
      />

      <FilePreviewModal
        file={selectedFile}
        open={!!selectedFile}
        onOpenChange={(open) => !open && setSelectedFile(null)}
      />

      <ShareDialog
        file={shareFile}
        open={!!shareFile}
        onOpenChange={(open) => !open && setShareFile(null)}
      />
    </>
  );
}
