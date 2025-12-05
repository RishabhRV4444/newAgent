import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Share2, 
  Copy, 
  Clock, 
  Link2, 
  Check, 
  Loader2, 
  StopCircle,
  FileText,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShareLink } from "@shared/schema";

export default function Shares() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const handleCopyLink = async (share: ShareLink) => {
    if (!share.tunnelUrl) return;
    try {
      await navigator.clipboard.writeText(share.tunnelUrl);
      setCopiedId(share.id);
      setTimeout(() => setCopiedId(null), 2000);
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

  const formatTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return "Never expires";
    
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    }
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    
    return `${minutes}m remaining`;
  };

  const activeShares = shares.filter(s => s.isActive && s.tunnelUrl);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-shares-title">
          Active Shares
        </h1>
        <p className="text-muted-foreground">
          Manage files being shared via ngrok tunnels
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : activeShares.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <Share2 className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-medium">No active shares</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Share files from the Files page to create ngrok links that can be accessed from anywhere in the world.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {activeShares.map((share, index) => (
              <motion.div
                key={share.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
              >
                <Card data-testid={`card-share-${share.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-lg truncate" data-testid={`text-filename-${share.id}`}>
                            {share.fileName}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatTimeRemaining(share.expiresAt)}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              ngrok
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => stopShareMutation.mutate(share.id)}
                        disabled={stopShareMutation.isPending}
                        data-testid={`button-stop-${share.id}`}
                      >
                        {stopShareMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <StopCircle className="h-4 w-4 mr-1" />
                            Stop
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <code className="flex-1 text-xs break-all" data-testid={`text-url-${share.id}`}>
                        {share.tunnelUrl}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopyLink(share)}
                        data-testid={`button-copy-${share.id}`}
                      >
                        {copiedId === share.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        asChild
                        data-testid={`button-open-${share.id}`}
                      >
                        <a href={share.tunnelUrl || "#"} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Created: {new Date(share.createdAt).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
