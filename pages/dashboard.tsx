import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FolderOpen, FileText, HardDrive } from "lucide-react";
import { motion } from "framer-motion";
import type { StorageInfo } from "@/shared/schema";

export default function Dashboard() {
  const { data: storageInfo, isLoading } = useQuery<StorageInfo>({
    queryKey: ["/api/storage"],
  });

  const usedGB = storageInfo ? (storageInfo.usedBytes / (1024 ** 3)).toFixed(2) : "0.00";
  const totalGB = storageInfo ? (storageInfo.totalBytes / (1024 ** 3)).toFixed(2) : "10.00";
  const percentage = storageInfo 
    ? Math.round((storageInfo.usedBytes / storageInfo.totalBytes) * 100)
    : 0;

  const stats = [
    {
      title: "Total Files",
      value: storageInfo?.fileCount ?? 0,
      icon: FileText,
      color: "text-primary",
    },
    {
      title: "Total Folders",
      value: storageInfo?.folderCount ?? 0,
      icon: FolderOpen,
      color: "text-primary",
    },
    {
      title: "Storage Used",
      value: `${usedGB} GB`,
      icon: HardDrive,
      color: "text-primary",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Manage your files and monitor storage usage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(' ', '-')}`}>
                  {isLoading ? "..." : stat.value}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Used Storage</span>
              <span className="font-medium" data-testid="text-storage-usage">
                {usedGB} GB of {totalGB} GB
              </span>
            </div>
            <Progress value={percentage} className="h-3" data-testid="progress-storage" />
            <p className="text-xs text-muted-foreground text-right">
              {percentage}% used
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
