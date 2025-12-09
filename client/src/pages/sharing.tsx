import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Share2, 
  Link2, 
  Lock, 
  Clock, 
  Copy, 
  Trash2, 
  ExternalLink,
  Download,
  Loader2,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShareLink } from "@shared/schema";

function formatTimeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return "Never expires";
  
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  
  if (diff <= 0) return "Expired";
  
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (days > 0) return `${days}d remaining`;
  if (hours > 0) return `${hours}h remaining`;
  return "Less than 1h";
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function Sharing() {
  const { toast } = useToast();

  const { data: shares = [], isLoading } = useQuery<ShareLink[]>({
    queryKey: ["/api/shares"],
  });

  const stopShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      return apiRequest("DELETE", `/api/shares/${shareId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shares"] });
      toast({
        title: "Share removed",
        description: "The share link has been disabled",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove share",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
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

  const activeShares = shares.filter(s => s.isActive);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1" data-testid="text-sharing-title">Sharing</h1>
        <p className="text-muted-foreground">Manage your shared files and access control</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card data-testid="card-sharing-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Active Shares
            </CardTitle>
            <CardDescription>
              Files currently being shared via secure links
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeShares.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Share2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No active shares</p>
                <p className="text-sm mt-1">Share files from the Files page to see them here</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-4">
                  {activeShares.map((share, index) => (
                    <motion.div
                      key={share.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      className="p-4 rounded-lg border bg-card space-y-4"
                      data-testid={`share-item-${share.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                            <h4 className="font-medium truncate" data-testid={`text-share-name-${share.id}`}>
                              {share.fileName}
                            </h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTimeRemaining(share.expiresAt)}
                            </Badge>
                            {share.passwordHash && (
                              <Badge variant="secondary" className="text-xs">
                                <Lock className="h-3 w-3 mr-1" />
                                Password
                              </Badge>
                            )}
                            {share.maxDownloads ? (
                              <Badge variant="secondary" className="text-xs">
                                <Download className="h-3 w-3 mr-1" />
                                {share.downloadCount}/{share.maxDownloads}
                              </Badge>
                            ) : share.downloadCount > 0 ? (
                              <Badge variant="secondary" className="text-xs">
                                <Download className="h-3 w-3 mr-1" />
                                {share.downloadCount} downloads
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Created {formatDate(share.createdAt)}
                          </p>
                        </div>
                      </div>

                      {share.tunnelUrl && (
                        <div className="flex gap-2">
                          <Input
                            value={share.tunnelUrl}
                            readOnly
                            className="font-mono text-xs"
                            data-testid={`input-share-url-${share.id}`}
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copyToClipboard(share.tunnelUrl!)}
                            data-testid={`button-copy-${share.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => window.open(share.tunnelUrl!, "_blank")}
                            data-testid={`button-open-${share.id}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {!share.tunnelUrl && (
                        <div className="flex items-center gap-2 p-2 rounded bg-muted text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Starting ngrok tunnel...
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => stopShareMutation.mutate(share.id)}
                          disabled={stopShareMutation.isPending}
                          data-testid={`button-remove-${share.id}`}
                        >
                          {stopShareMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Remove Share
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <Card data-testid="card-sharing-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              How Sharing Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">Password Protection</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add a password to your share links for an extra layer of security.
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">Expiry Times</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Set how long the link remains active, from 1 hour to never expires.
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">Download Limits</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Limit the number of times a file can be downloaded from a share link.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
