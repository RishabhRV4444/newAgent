import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Share2, Copy, Clock, Link2, Check, Loader2, Lock, Download, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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

const DOWNLOAD_LIMIT_OPTIONS = [
  { value: "0", label: "Unlimited" },
  { value: "1", label: "1 download" },
  { value: "5", label: "5 downloads" },
  { value: "10", label: "10 downloads" },
  { value: "25", label: "25 downloads" },
  { value: "50", label: "50 downloads" },
  { value: "100", label: "100 downloads" },
];

export function ShareDialog({ file, open, onOpenChange }: ShareDialogProps) {
  const [duration, setDuration] = useState<string>("24h");
  const [copied, setCopied] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState<string>("0");
  const [accessType, setAccessType] = useState<"view" | "download">("download");
  const { toast } = useToast();

  const { data: existingShare, isLoading: checkingShare } = useQuery<{ isShared: boolean; share: ShareLink | null }>({
    queryKey: ["/api/shares", file?.id, "check"],
    queryFn: async () => {
      if (!file) return { isShared: false, share: null };
      const res = await fetch(`/api/shares/${file.id}/check`);
      return res.json();
    },
    enabled: !!file && open,
  });

  const createShareMutation = useMutation({
    mutationFn: async ({ 
      fileId, 
      duration, 
      password, 
      maxDownloads,
      accessType
    }: { 
      fileId: string; 
      duration: string;
      password?: string;
      maxDownloads?: number;
      accessType: "view" | "download";
    }) => {
      return apiRequest("POST", "/api/shares", { 
        fileId, 
        duration,
        accessType,
        ...(password && { password }),
        ...(maxDownloads && maxDownloads > 0 && { maxDownloads }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shares"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shares", file?.id, "check"] });
      toast({
        title: "Share link created",
        description: "Your file is now being shared via ngrok",
      });
      setPassword("");
      setUsePassword(false);
      setMaxDownloads("0");
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
      queryClient.invalidateQueries({ queryKey: ["/api/shares", file?.id, "check"] });
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
    if (usePassword && !password) {
      toast({
        title: "Password required",
        description: "Please enter a password or disable password protection",
        variant: "destructive",
      });
      return;
    }
    createShareMutation.mutate({ 
      fileId: file.id, 
      duration,
      accessType: "download", // Forced to download
      password: usePassword ? password : undefined,
      maxDownloads: undefined, // Removed download limit
    });
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
  const share = existingShare?.share;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-share">
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
                    {share?.tunnelUrl}
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
                
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {share?.accessType === 'view' ? 'View Only' : 'View & Download'}
                  </Badge>
                  {share?.expiresAt && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires: {new Date(share.expiresAt).toLocaleDateString()}
                    </Badge>
                  )}
                  {share?.passwordHash && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Password Protected
                    </Badge>
                  )}
                  {share?.maxDownloads && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {share.downloadCount}/{share.maxDownloads} downloads
                    </Badge>
                  )}
                  {!share?.maxDownloads && share?.downloadCount !== undefined && share.downloadCount > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {share.downloadCount} downloads
                    </Badge>
                  )}
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full sm:w-auto"
                  data-testid="button-close"
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleStopShare}
                  disabled={stopShareMutation.isPending}
                  className="w-full sm:w-auto"
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
              </div>

              <div className="space-y-3 p-4 rounded-xl border-2 border-primary/10 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Lock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="use-password" title="Enable to require a password for access" className="cursor-pointer font-semibold">Password Protection</Label>
                      <p className="text-[10px] text-muted-foreground">Require a key to access this file</p>
                    </div>
                  </div>
                  <Switch
                    id="use-password"
                    checked={usePassword}
                    onCheckedChange={setUsePassword}
                    data-testid="switch-password"
                  />
                </div>
                
                {usePassword && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3 pt-2"
                  >
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10 border-primary/20 focus-visible:ring-primary h-11"
                        data-testid="input-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-primary" />
                        ) : (
                          <Eye className="h-4 w-4 text-primary" />
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                The file will be accessible worldwide via ngrok during the selected time period.
              </p>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full sm:w-auto"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateShare}
                  disabled={createShareMutation.isPending || (usePassword && !password)}
                  className="w-full sm:w-auto"
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
