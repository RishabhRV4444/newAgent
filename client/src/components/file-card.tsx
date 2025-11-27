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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FileItem } from "@/shared/schema";
import { formatDistanceToNow } from "date-fns";

interface FileCardProps {
  file: FileItem;
  onRename: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onPreview: (file: FileItem) => void;
}

export function FileCard({ file, onRename, onDelete, onPreview }: FileCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getIcon = () => {
    if (file.type === "folder") {
      return <Folder className="h-12 w-12 text-primary" />;
    }

    const mime = file.mimeType || "";
    if (mime.startsWith("image/")) {
      return <Image className="h-12 w-12 text-chart-2" />;
    }
    if (mime.startsWith("video/")) {
      return <FileVideo className="h-12 w-12 text-chart-3" />;
    }
    if (mime === "application/pdf") {
      return <FileText className="h-12 w-12 text-destructive" />;
    }
    if (mime.includes("zip") || mime.includes("archive")) {
      return <FileArchive className="h-12 w-12 text-chart-4" />;
    }
    return <File className="h-12 w-12 text-muted-foreground" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const canPreview = file.type === "file" && 
    (file.mimeType?.startsWith("image/") || file.mimeType === "application/pdf");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card 
        className="p-4 hover-elevate cursor-pointer transition-all"
        data-testid={`card-file-${file.id}`}
      >
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            {getIcon()}
            <div className="absolute -top-2 -right-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="h-7 w-7"
                    data-testid={`button-menu-${file.id}`}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canPreview && (
                    <DropdownMenuItem 
                      onClick={() => onPreview(file)}
                      data-testid={`button-preview-${file.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => onRename(file)}
                    data-testid={`button-rename-${file.id}`}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(file)}
                    className="text-destructive"
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
              className="font-medium truncate" 
              title={file.name}
              data-testid={`text-filename-${file.id}`}
            >
              {file.name}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{formatSize(file.size)}</span>
              {file.modifiedAt && (
                <>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(file.modifiedAt), { addSuffix: true })}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
