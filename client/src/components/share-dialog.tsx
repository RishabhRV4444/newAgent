import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Share2, Copy, Clock, Link2, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FileItem, ShareLink } from "@shared/schema";

interface ShareDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DURATION_OPTIONS = [
  { value: "1h", label: "1 hour" },
  { value: "6h", label: "6 hours" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "never", label: "Never expires" },
];

export function ShareDialog({ file, open, onOpenChange }: ShareDialogProps) {
  const [duration, setDuration] = useState<string>("24h");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: existingShare, isLoading: checkingShare } = useQuery<{ isShared: boolean; share: ShareLink | null }>({
    queryKey: ["/api/checkshare", file?.id],
    queryFn: async () => {
      if (!file) return { isShared: false, share: null };
      const res = await fetch(`/api/checkshare/${file.id}`);
      return res.json();
    },
    enabled: !!file && open,
  });

  const createShareMutation = useMutation({
    mutationFn: async ({ fileId, duration }: { fileId: string; duration: string }) => {
      return apiRequest("POST", "/api/shares", { fileId, duration });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shares"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkshare", file?.id] });
      toast({
        title: "Share link created",
        description: "Your file is now being shared via ngrok",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create share",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const stopShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      return apiRequest("DELETE", `/api/shares/${shareId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shares"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkshare", file?.id] });
      toast({
        title: "Sharing stopped",
        description: "The share link has been disabled",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to stop sharing",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleCreateShare = () => {
    if (!file) return;
    createShareMutation.mutate({ fileId: file.id, duration });
  };

  const handleStopShare = () => {
    if (!existingShare?.share) return;
    stopShareMutation.mutate(existingShare.share.id);
  };

  const handleCopyLink = async () => {
    if (!existingShare?.share?.tunnelUrl) return;
    try {
      await navigator.clipboard.writeText(existingShare.share.tunnelUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  if (!file) return null;

  const isShared = existingShare?.isShared && existingShare?.share?.tunnelUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-share">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Share2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Share File</DialogTitle>
                <DialogDescription className="mt-1">
                  {isShared ? "Manage sharing for" : "Create a shareable link for"} "{file.name}"
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {checkingShare ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isShared ? (
            <div className="space-y-4 pt-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Link2 className="h-4 w-4" />
                  Share Link (via ngrok)
                </div>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-background rounded text-xs break-all" data-testid="text-share-url">
                    {existingShare.share?.tunnelUrl}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyLink}
                    data-testid="button-copy-link"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {existingShare.share?.expiresAt && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Expires: {new Date(existingShare.share.expiresAt).toLocaleString()}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-close"
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleStopShare}
                  disabled={stopShareMutation.isPending}
                  data-testid="button-stop-share"
                >
                  {stopShareMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Stopping...
                    </>
                  ) : (
                    "Stop Sharing"
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Share Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger id="duration" data-testid="select-duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The file will be accessible worldwide via ngrok during this time.
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateShare}
                  disabled={createShareMutation.isPending}
                  data-testid="button-create-share"
                >
                  {createShareMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 mr-2" />
                      Start Sharing
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
