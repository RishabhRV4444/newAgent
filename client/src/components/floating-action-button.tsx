import { Button } from "@/components/ui/button";
import { Plus, Upload, FolderPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FloatingActionButtonProps {
  onCreateFolder: () => void;
  onUploadFiles: () => void;
}

export function FloatingActionButton({
  onCreateFolder,
  onUploadFiles,
}: FloatingActionButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-40 hover-elevate active-elevate-2"
          data-testid="button-fab"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="mb-2">
        <DropdownMenuItem
          onClick={onCreateFolder}
          data-testid="fab-create-folder"
        >
          <FolderPlus className="h-4 w-4 mr-2" />
          New Folder
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onUploadFiles}
          data-testid="fab-upload-files"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
