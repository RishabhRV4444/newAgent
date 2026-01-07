import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Link2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { FileItem, ShareLink } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface FileCardProps {
  file: FileItem;
  onRename: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onPreview: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onClick?: (file: FileItem) => void;
}

export function FileCard({ file, onRename, onDelete, onPreview, onShare, onClick }: FileCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const { data: shareData } = useQuery<{ isShared: boolean; share: ShareLink | null }>({
    queryKey: ["/api/shares", file.id, "check"],
    queryFn: async () => {
      if (file.type !== "file") return { isShared: false, share: null };
      const res = await fetch(`/api/shares/${file.id}/check`);
      return res.json();
    },
  });

  const getPreview = () => {
    if (file.type === "file" && file.mimeType?.startsWith("image/")) {
      const fileUrl = `/api/files/${file.id}/content`;
      return (
        <div className="relative w-full h-36 bg-muted rounded-xl overflow-hidden mb-3 border-2 border-primary/5">
          <img 
            src={fileUrl} 
            alt={file.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      );
    }
    return null;
  };

  const getIcon = () => {
    if (file.type === "folder") {
      return isHovered ? (
        <FolderOpen className="h-12 w-12 text-primary" />
      ) : (
        <Folder className="h-12 w-12 text-primary" />
      );
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

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-dropdown-trigger]') || target.closest('[role="menu"]')) {
      return;
    }
    
    if (file.type === "folder" && onClick) {
      onClick(file);
    } else if (canPreview) {
      onPreview(file);
    }
  };

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
        className={`p-4 hover-elevate cursor-pointer transition-all group ${
          file.type === "folder" ? "border-primary/20 hover:border-primary/40" : ""
        }`}
        onClick={handleCardClick}
        data-testid={`card-file-${file.id}`}
      >
        <div className="flex flex-col items-center text-center space-y-3">
          {getPreview()}
          <div className="relative w-full">
            <div className="flex justify-center relative mb-2">
              {getPreview() ? null : getIcon()}
              {shareData?.isShared && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 px-1.5 text-xs gap-1" data-testid={`badge-shared-${file.id}`}>
                  <Link2 className="h-2.5 w-2.5" />
                  Shared
                </Badge>
              )}
            </div>
            
            <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity mb-2" data-dropdown-trigger>
              {file.type === "file" && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare(file);
                  }}
                  data-testid={`button-share-quick-${file.id}`}
                  title="Share file"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              )}
              {canPreview && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(file);
                  }}
                  data-testid={`button-preview-quick-${file.id}`}
                  title="Preview"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`button-menu-${file.id}`}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {file.type === "folder" && onClick && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onClick(file);
                      }}
                      data-testid={`button-open-${file.id}`}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Open
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename(file);
                    }}
                    data-testid={`button-rename-${file.id}`}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(file);
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
              {file.type === "folder" ? (
                <span>Folder</span>
              ) : (
                <span>{formatSize(file.size)}</span>
              )}
              {file.modifiedAt && (
                <>
                  <span>·</span>
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
