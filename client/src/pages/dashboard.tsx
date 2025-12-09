import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FolderOpen, 
  FileText, 
  HardDrive, 
  Cloud, 
  Power, 
  Globe, 
  Database, 
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Share2,
  Upload,
  Download,
  Trash2
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import type { StorageInfo, ShareLink, FileItem } from "@shared/schema";

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

interface ActivityLog {
  id: string;
  event: string;
  timestamp: string;
  status: "success" | "error" | "warning" | "info";
  icon?: typeof Upload;
}

function InstanceOverview({ storageInfo }: { storageInfo?: StorageInfo }) {
  const [instanceStatus] = useState<"online" | "offline">("online");

  const usedGB = storageInfo ? (storageInfo.usedBytes / (1024 ** 3)).toFixed(1) : "0.0";
  const totalGB = storageInfo ? (storageInfo.totalBytes / (1024 ** 3)).toFixed(0) : "10";

  return (
    <Card data-testid="card-instance-overview">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          Instance Overview
        </CardTitle>
        <Badge variant={instanceStatus === "online" ? "default" : "secondary"} data-testid="badge-instance-status">
          {instanceStatus === "online" ? "Online" : "Offline"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Power className="h-4 w-4" />
              Status
            </div>
            <p className="text-lg font-semibold text-green-500" data-testid="text-instance-status">
              {instanceStatus === "online" ? "Running" : "Stopped"}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Files
            </div>
            <p className="text-lg font-semibold" data-testid="text-instance-files">{storageInfo?.fileCount ?? 0}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              Storage
            </div>
            <p className="text-lg font-semibold" data-testid="text-storage-quick">{usedGB} GB</p>
            <p className="text-xs text-muted-foreground">of {totalGB} GB</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              Storage Path
            </div>
            <p className="text-sm font-medium truncate" data-testid="text-storage-path" title={storageInfo?.storagePath}>
              ~/AREVEI
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/files">
            <Button data-testid="button-go-to-files">
              <FolderOpen className="h-4 w-4 mr-2" />
              Go to Files
            </Button>
          </Link>
          <Link href="/sharing">
            <Button variant="outline" data-testid="button-manage-shares">
              <Share2 className="h-4 w-4 mr-2" />
              Manage Shares
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityLogs({ files, shares }: { files?: FileItem[], shares?: ShareLink[] }) {
  const logs: ActivityLog[] = [];

  if (files && files.length > 0) {
    const recentFiles = [...files]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    recentFiles.forEach(file => {
      logs.push({
        id: `file-${file.id}`,
        event: file.type === "folder" 
          ? `Folder created: ${file.name}` 
          : `File uploaded: ${file.name}`,
        timestamp: file.createdAt,
        status: "success",
        icon: file.type === "folder" ? FolderOpen : Upload,
      });
    });
  }

  if (shares && shares.length > 0) {
    shares.forEach(share => {
      logs.push({
        id: `share-${share.id}`,
        event: `Share created: ${share.fileName}`,
        timestamp: share.createdAt,
        status: "success",
        icon: Share2,
      });
      if (share.downloadCount > 0) {
        logs.push({
          id: `download-${share.id}`,
          event: `Downloaded ${share.downloadCount}x: ${share.fileName}`,
          timestamp: share.createdAt,
          status: "info",
          icon: Download,
        });
      }
    });
  }

  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getStatusIcon = (status: string, icon?: typeof Upload) => {
    if (icon) {
      const Icon = icon;
      return <Icon className="h-4 w-4 text-primary" />;
    }
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card data-testid="card-activity-logs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
        <CardDescription>Latest file operations and events</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
                <p className="text-xs">Upload files to see activity here</p>
              </div>
            ) : (
              logs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover-elevate"
                  data-testid={`activity-log-${log.id}`}
                >
                  <div className="mt-0.5">{getStatusIcon(log.status, log.icon)}</div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium truncate">{log.event}</p>
                    <p className="text-xs text-muted-foreground">{formatTimeAgo(log.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function StorageCard({ storageInfo }: { storageInfo?: StorageInfo }) {
  const usedGB = storageInfo ? (storageInfo.usedBytes / (1024 ** 3)).toFixed(2) : "0.00";
  const totalGB = storageInfo ? (storageInfo.totalBytes / (1024 ** 3)).toFixed(2) : "10.00";
  const percentage = storageInfo 
    ? Math.round((storageInfo.usedBytes / storageInfo.totalBytes) * 100)
    : 0;

  return (
    <Card data-testid="card-storage-usage">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          Storage Usage
        </CardTitle>
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
        
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary" data-testid="text-storage-file-count">
              {storageInfo?.fileCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Files</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary" data-testid="text-folder-count">
              {storageInfo?.folderCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Folders</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStats({ storageInfo, shares }: { storageInfo?: StorageInfo, shares?: ShareLink[] }) {
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
      title: "Active Shares",
      value: shares?.filter(s => s.isActive).length ?? 0,
      icon: Share2,
      color: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
        >
          <Card data-testid={`card-stat-${stat.title.toLowerCase().replace(' ', '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(' ', '-')}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: storageInfo, isLoading: storageLoading } = useQuery<StorageInfo>({
    queryKey: ["/api/storage"],
  });

  const { data: files } = useQuery<FileItem[]>({
    queryKey: ["/api/files"],
  });

  const { data: shares } = useQuery<ShareLink[]>({
    queryKey: ["/api/shares"],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your AREVEI file management system</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <InstanceOverview storageInfo={storageInfo} />
      </motion.div>

      <QuickStats storageInfo={storageInfo} shares={shares} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <StorageCard storageInfo={storageInfo} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <ActivityLogs files={files} shares={shares} />
        </motion.div>
      </div>
    </div>
  );
}
