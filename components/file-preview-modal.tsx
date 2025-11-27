import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FileItem } from "@/shared/schema";

interface FilePreviewModalProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilePreviewModal({ file, open, onOpenChange }: FilePreviewModalProps) {
  if (!file) return null;

  const isImage = file.mimeType?.startsWith("image/");
  const isPDF = file.mimeType === "application/pdf";

  const fileUrl = `/api/files/${file.id}/content`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] p-0 overflow-hidden"
        data-testid="dialog-preview"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold truncate flex-1 pr-4" title={file.name}>
              {file.name}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 max-h-[calc(90vh-80px)] overflow-auto">
            {isImage && (
              <img
                src={fileUrl}
                alt={file.name}
                className="max-w-full h-auto mx-auto rounded-lg"
                data-testid="img-preview"
              />
            )}
            {isPDF && (
              <iframe
                src={fileUrl}
                className="w-full h-[70vh] rounded-lg border"
                title={file.name}
                data-testid="iframe-pdf-preview"
              />
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
