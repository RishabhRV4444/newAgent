import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Share2,
  X,
  Copy,
  Eye,
  Download,
  Lock,
  Clock,
  Loader2,
  Check
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShareLink } from "@shared/schema";

export function SharedFilesBar() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: shares = [] } = useQuery<ShareLink[]>({
    queryKey: ["/api/shares", "check"],
    queryFn: async () => {
      const res = await fetch("/api/shares");
      return res.json();
    },
  });

  const stopShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      return apiRequest("DELETE", `/api/shares/${shareId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shares"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shares", "check"] });
      toast({
        title: "Share stopped",
        description: "File is no longer shared",
      });
    },
  });

  const handleCopy = async (url: string, shareId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(shareId);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: "Link copied to clipboard" });
    } catch {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  if (shares.length === 0) return null;

  return (
    <div className="border-b bg-muted/30 px-4 py-3">
      <div className="w-full">
        <div className="flex items-center flex-col gap-3">
          <Share2 className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground flex-shrink-0">
            Active Shares ({shares.length})
          </span>
          
          <div className="flex gap-2  pb-2 w-full">
            {shares.map((share) => (
              <Card
                key={share.id}
                className="flex items-center gap-2 px-3 py-2 min-w-max bg-card/70 hover-elevate"
                data-testid={`share-bar-item-${share.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">
                      {share.fileName}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {/* {share.accessType === 'view' ? (
                        <Eye className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <Download className="h-3 w-3 text-muted-foreground" />
                      )} */}
                      {share.passwordHash && (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleCopy(share.tunnelUrl || "", share.id)}
                      disabled={!share.tunnelUrl}
                      data-testid={`button-copy-bar-${share.id}`}
                    >
                      {copiedId === share.id ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 hover:text-destructive"
                      onClick={() => stopShareMutation.mutate(share.id)}
                      disabled={stopShareMutation.isPending}
                      data-testid={`button-stop-bar-${share.id}`}
                    >
                      {stopShareMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
