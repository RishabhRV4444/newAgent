import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HardDrive } from "lucide-react";
import { motion } from "framer-motion";
import type { StorageInfo } from "@/shared/schema";

export default function Storage() {
  const { data: storageInfo, isLoading } = useQuery<StorageInfo>({
    queryKey: ["/api/storage"],
  });

  const usedGB = storageInfo ? (storageInfo.usedBytes / (1024 ** 3)).toFixed(2) : "0.00";
  const totalGB = storageInfo ? (storageInfo.totalBytes / (1024 ** 3)).toFixed(2) : "10.00";
  const percentage = storageInfo 
    ? Math.round((storageInfo.usedBytes / storageInfo.totalBytes) * 100)
    : 0;
  const availableGB = storageInfo 
    ? ((storageInfo.totalBytes - storageInfo.usedBytes) / (1024 ** 3)).toFixed(2)
    : totalGB;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-storage-title">Storage</h1>
        <p className="text-muted-foreground">Monitor your storage usage and capacity</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <HardDrive className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Storage Capacity</CardTitle>
                <CardDescription>Total storage allocation and usage</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-sm text-muted-foreground">Used Storage</span>
                <span className="text-3xl font-bold" data-testid="text-used-storage">
                  {usedGB} <span className="text-lg text-muted-foreground">GB</span>
                </span>
              </div>
              <Progress value={percentage} className="h-4" data-testid="progress-storage-main" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{percentage}% used</span>
                <span className="font-medium">{usedGB} GB of {totalGB} GB</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Capacity</p>
                <p className="text-2xl font-semibold" data-testid="text-total-capacity">{totalGB} GB</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Used Space</p>
                <p className="text-2xl font-semibold text-primary" data-testid="text-used-space">{usedGB} GB</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-semibold text-chart-5" data-testid="text-available-space">{availableGB} GB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>File Statistics</CardTitle>
            <CardDescription>Overview of your stored content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Total Files</span>
                <span className="text-2xl font-bold" data-testid="text-file-count">
                  {isLoading ? "..." : storageInfo?.fileCount ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Total Folders</span>
                <span className="text-2xl font-bold" data-testid="text-folder-count">
                  {isLoading ? "..." : storageInfo?.folderCount ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
