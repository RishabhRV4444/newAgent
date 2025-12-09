import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UploadZoneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentPath?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "complete" | "error";
  error?: string;
}

export function UploadZone({ open, onOpenChange, parentPath = "/" }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("parentPath", parentPath);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storage"] });
      toast({
        title: "Upload complete",
        description: "Your files have been uploaded successfully",
      });
      setTimeout(() => {
        onOpenChange(false);
        setUploadingFiles([]);
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error?.message || "Failed to upload files",
        variant: "destructive",
      });
    },
  });

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const newUploadingFiles: UploadingFile[] = fileArray.map((file) => ({
      file,
      progress: 0,
      status: "uploading" as const,
    }));

    setUploadingFiles(newUploadingFiles);

    newUploadingFiles.forEach((_, index) => {
      const interval = setInterval(() => {
        setUploadingFiles((prev) => {
          const updated = [...prev];
          if (updated[index] && updated[index].progress < 90) {
            updated[index] = {
              ...updated[index],
              progress: updated[index].progress + 10,
            };
          }
          return updated;
        });
      }, 100);

      setTimeout(() => clearInterval(interval), 900);
    });

    uploadMutation.mutate(fileArray);
  }, [uploadMutation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const displayPath = parentPath === "/" ? "Home" : parentPath.split("/").pop() || "Home";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="dialog-upload">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Uploading to: <span className="font-medium text-foreground">{displayPath}</span>
          </p>
        </DialogHeader>

        {uploadingFiles.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-colors
              ${isDragging ? "border-primary bg-primary/2" : "border-border"}
            `}
          >
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: isDragging ? 1.05 : 1 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="p-4 bg-primary/10 rounded-full">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold mb-1">
                  {isDragging ? "Drop files here" : "Drag and drop files here"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse
                </p>
                <Button asChild data-testid="button-browse-files bg-primary">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                      data-testid="input-file-upload"
                    />
                    Browse Files
                  </label>
                </Button>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {uploadingFiles.map((uploadFile, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="border rounded-lg p-4"
                  data-testid={`upload-item-${index}`}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" title={uploadFile.file.name}>
                        {uploadFile.file.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(uploadFile.file.size / 1024).toFixed(1)} KB
                      </p>
                      <div className="mt-2 space-y-1">
                        <Progress 
                          value={uploadMutation.isSuccess ? 100 : uploadFile.progress} 
                          className="h-2"
                        />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {uploadMutation.isSuccess ? "100%" : `${uploadFile.progress}%`}
                          </span>
                          {uploadMutation.isSuccess ? (
                            <span className="text-chart-5 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Complete
                            </span>
                          ) : uploadMutation.isError ? (
                            <span className="text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Failed
                            </span>
                          ) : (
                            <span className="text-primary flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Uploading
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {uploadingFiles.length > 0 && !uploadMutation.isSuccess && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setUploadingFiles([]);
              }}
              data-testid="button-cancel-upload"
            >
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
