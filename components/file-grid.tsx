import { useState } from "react";
import { motion } from "framer-motion";
import { FileCard } from "./file-card";
import { RenameDialog } from "./rename-dialog";
import { DeleteDialog } from "./delete-dialog";
import { FilePreviewModal } from "./file-preview-modal";
import type { FileItem } from "@/shared/schema";

interface FileGridProps {
  files: FileItem[];
}

export function FileGrid({ files }: FileGridProps) {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [renameFile, setRenameFile] = useState<FileItem | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileItem | null>(null);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {files.map((file, index) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          >
            <FileCard
              file={file}
              onRename={setRenameFile}
              onDelete={setDeleteFile}
              onPreview={setSelectedFile}
            />
          </motion.div>
        ))}
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
    </>
  );
}
