import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
  Play,
  Square,
  RotateCcw,
  RefreshCw,
  Heart,
  Link2,
  Trash2,
  Key,
  Server,
  Wifi,
  WifiOff,
  Container,
  Settings
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StorageInfo, ShareLink, FileItem, CloudAgentStatus, AgentLog } from "@shared/schema";

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

function CredentialsCard({ config }: { config?: { defaultUsername: string; defaultPassword: string; localUrl: string; networkUrl: string; syncFolder: string } }) {
  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30" data-testid="card-credentials">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="h-5 w-5 text-primary" />
          Default Cloud Credentials
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <span className="text-muted-foreground">Username:</span>
            <Badge variant="secondary" className="ml-2 font-mono" data-testid="text-default-username">
              {config?.defaultUsername || 'admin'}
            </Badge>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Password:</span>
            <Badge variant="secondary" className="ml-2 font-mono" data-testid="text-default-password">
              {config?.defaultPassword || 'Arevei@2024'}
            </Badge>
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <Globe className="h-3 w-3" />
            Local: <code className="bg-muted px-1 rounded">{config?.localUrl || 'http://localhost:5000'}</code>
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="h-3 w-3 text-yellow-500" />
            Network: <code className="bg-muted px-1 rounded text-yellow-600 dark:text-yellow-400">{config?.networkUrl || 'Detecting...'}</code>
          </div>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg text-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-muted-foreground text-xs">Signed in as</div>
              <div className="font-mono text-sm" data-testid="text-signed-in-user">admin@arevei.shop</div>
            </div>
            <Badge variant="outline" className="text-xs">Auto-authenticated</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusCard({ 
  title, 
  icon: Icon, 
  status, 
  statusText, 
  statusColor, 
  details 
}: { 
  title: string;
  icon: typeof Cloud;
  status: 'success' | 'error' | 'warning' | 'checking';
  statusText: string;
  statusColor: string;
  details: { label: string; value: string }[];
}) {
  const statusIcons = {
    success: <CheckCircle2 className="h-6 w-6 text-green-500" />,
    error: <XCircle className="h-6 w-6 text-red-500" />,
    warning: <AlertCircle className="h-6 w-6 text-yellow-500" />,
    checking: <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />,
  };

  return (
    <Card data-testid={`card-status-${title.toLowerCase().replace(' ', '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        {statusIcons[status]}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Status:</span>
          <span className={`font-semibold ${statusColor}`} data-testid={`text-status-${title.toLowerCase().replace(' ', '-')}`}>
            {statusText}
          </span>
        </div>
        {details.map((detail, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">{detail.label}:</span>
            <span className="text-sm">{detail.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CloudControls({ onAction }: { onAction: (action: string) => void }) {
  const { toast } = useToast();
  
  const startMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/start'),
    onSuccess: () => {
      toast({ title: "Cloud started successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/logs'] });
    },
    onError: () => toast({ title: "Failed to start cloud", variant: "destructive" }),
  });

  const stopMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/stop'),
    onSuccess: () => {
      toast({ title: "Cloud stopped successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/logs'] });
    },
    onError: () => toast({ title: "Failed to stop cloud", variant: "destructive" }),
  });

  const restartMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/restart'),
    onSuccess: () => {
      toast({ title: "Cloud restarted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/logs'] });
    },
    onError: () => toast({ title: "Failed to restart cloud", variant: "destructive" }),
  });

  return (
    <Card data-testid="card-cloud-controls">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Cloud Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white" 
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            data-testid="button-start-cloud"
          >
            <Play className="h-4 w-4 mr-2" />
            {startMutation.isPending ? 'Starting...' : 'Start Cloud'}
          </Button>
          <Button 
            variant="destructive"
            onClick={() => stopMutation.mutate()}
            disabled={stopMutation.isPending}
            data-testid="button-stop-cloud"
          >
            <Square className="h-4 w-4 mr-2" />
            {stopMutation.isPending ? 'Stopping...' : 'Stop Cloud'}
          </Button>
          <Button 
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
            onClick={() => restartMutation.mutate()}
            disabled={restartMutation.isPending}
            data-testid="button-restart-cloud"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {restartMutation.isPending ? 'Restarting...' : 'Restart'}
          </Button>
          <Link href="/files">
            <Button variant="secondary" className="w-full" data-testid="button-open-folder">
              <FolderOpen className="h-4 w-4 mr-2" />
              Open Files
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function FileManager({ files }: { files?: FileItem[] }) {
  const { toast } = useToast();
  const [uploadFolder, setUploadFolder] = useState('/');

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest('GET', '/api/files'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({ title: "Files refreshed" });
    },
  });

  const heartbeatMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/heartbeat'),
    onSuccess: () => {
      toast({ title: "Heartbeat sent successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/logs'] });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/test-connection'),
    onSuccess: () => {
      toast({ title: "Connection test successful" });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/logs'] });
    },
  });

  return (
    <Card data-testid="card-file-manager">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          Cloud File Manager
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            data-testid="button-refresh-files"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => heartbeatMutation.mutate()}
            disabled={heartbeatMutation.isPending}
            data-testid="button-heartbeat"
          >
            <Heart className="h-4 w-4 mr-1 text-red-500" />
            Heartbeat
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => testConnectionMutation.mutate()}
            disabled={testConnectionMutation.isPending}
            data-testid="button-test-connection"
          >
            <Link2 className="h-4 w-4 mr-1" />
            Test
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-semibold flex items-center gap-2 text-green-600 dark:text-green-400">
            <Upload className="h-4 w-4" />
            Upload Files
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href="/files">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white" data-testid="button-upload-file">
                <FileText className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </Link>
            <Link href="/files">
              <Button className="w-full" data-testid="button-upload-folder">
                <FolderOpen className="h-4 w-4 mr-2" />
                Upload Folder
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm whitespace-nowrap">Folder:</span>
              <Input 
                value={uploadFolder} 
                onChange={(e) => setUploadFolder(e.target.value)}
                className="flex-1"
                data-testid="input-upload-folder"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            Cloud Files
          </h3>
          <ScrollArea className="h-[200px] rounded-lg border bg-muted/30 p-4">
            {!files || files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FolderOpen className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No files found</p>
                <Link href="/files">
                  <Button variant="ghost" size="sm" className="mt-2">
                    Upload your first file
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {files.slice(0, 10).map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-background hover-elevate"
                    data-testid={`file-item-${file.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {file.type === 'folder' ? (
                        <FolderOpen className="h-5 w-5 text-primary" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {file.type === 'folder' ? 'Folder' : formatBytes(file.size)}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimeAgo(file.modifiedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentSettings({ config }: { config?: { syncFolder: string } }) {
  return (
    <Card data-testid="card-agent-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <div className="text-muted-foreground text-sm">Sync Folder</div>
            <code className="text-sm bg-muted px-2 py-1 rounded" data-testid="text-sync-folder">
              {config?.syncFolder || '~/AREVEI'}
            </code>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" data-testid="button-change-folder">
              Change Sync Folder
            </Button>
            <Link href="/settings">
              <Button variant="outline" size="sm" data-testid="button-open-settings">
                Open Settings
              </Button>
            </Link>
          </div>
          <div className="text-xs text-muted-foreground">
            Changing folder will apply after reinstall/setup.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LiveConsole({ logs }: { logs?: AgentLog[] }) {
  const { toast } = useToast();
  
  const clearLogsMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', '/api/agent/logs'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent/logs'] });
      toast({ title: "Logs cleared" });
    },
  });

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500';
      case 'success': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card data-testid="card-live-console">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Live Console Output
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => clearLogsMutation.mutate()}
          disabled={clearLogsMutation.isPending}
          data-testid="button-clear-logs"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[250px] rounded-lg bg-zinc-950 dark:bg-black p-4 font-mono text-sm">
          {!logs || logs.length === 0 ? (
            <div className="text-zinc-500">Waiting for logs...</div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className={getLogColor(log.type)}>
                  <span className="text-zinc-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                  {log.message}
                </div>
              ))}
            </div>
          )}
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

export default function ElectronDashboard() {
  const { data: storageInfo } = useQuery<StorageInfo>({
    queryKey: ["/api/storage"],
  });

  const { data: files } = useQuery<FileItem[]>({
    queryKey: ["/api/files"],
  });

  const { data: shares } = useQuery<ShareLink[]>({
    queryKey: ["/api/shares"],
  });

  const { data: agentStatus } = useQuery<CloudAgentStatus>({
    queryKey: ["/api/agent/status"],
    refetchInterval: 5000,
  });

  const { data: agentLogs } = useQuery<AgentLog[]>({
    queryKey: ["/api/agent/logs"],
    refetchInterval: 2000,
  });

  const { data: config } = useQuery<{ syncFolder: string; defaultUsername: string; defaultPassword: string; localUrl: string; networkUrl: string }>({
    queryKey: ["/api/agent/config"],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-3xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600" 
            data-testid="text-dashboard-title"
          >
            Arevei Cloud Agent Dashboard
          </h1>
          <p className="text-muted-foreground">Control your local cloud infrastructure</p>
        </div>
        <Badge variant="outline" className="text-xs">v1.0.0</Badge>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <CredentialsCard config={config} />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <StatusCard
            title="Cloud Agent Status"
            icon={Cloud}
            status={agentStatus?.cloudStatus === 'running' ? 'success' : agentStatus?.cloudStatus === 'stopped' ? 'error' : 'checking'}
            statusText={agentStatus?.cloudStatus === 'running' ? 'Running' : agentStatus?.cloudStatus === 'stopped' ? 'Stopped' : 'Checking...'}
            statusColor={agentStatus?.cloudStatus === 'running' ? 'text-green-500' : 'text-red-500'}
            details={[
              { label: 'Container', value: agentStatus?.containerName || 'arevei-cloud' },
            ]}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <StatusCard
            title="Arevei.shop Connection"
            icon={Globe}
            status={agentStatus?.connectionStatus === 'connected' ? 'success' : agentStatus?.connectionStatus === 'dev_mode' ? 'warning' : 'error'}
            statusText={agentStatus?.connectionStatus === 'connected' ? 'Connected' : agentStatus?.connectionStatus === 'dev_mode' ? 'Dev Mode' : 'Disconnected'}
            statusColor={agentStatus?.connectionStatus === 'connected' ? 'text-green-500' : agentStatus?.connectionStatus === 'dev_mode' ? 'text-yellow-500' : 'text-red-500'}
            details={[
              { label: 'User', value: agentStatus?.connectionUser || '-' },
              { label: 'Agent', value: agentStatus?.agentOnline ? 'Online' : 'Offline' },
            ]}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <StatusCard
            title="Docker Status"
            icon={Container}
            status={agentStatus?.dockerRunning ? 'success' : 'error'}
            statusText={agentStatus?.dockerInstalled ? 'Installed' : 'Not Installed'}
            statusColor={agentStatus?.dockerInstalled ? 'text-green-500' : 'text-red-500'}
            details={[
              { label: 'Version', value: agentStatus?.dockerVersion || 'v24.0+' },
            ]}
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <CloudControls onAction={() => {}} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <FileManager files={files} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <StorageCard storageInfo={storageInfo} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        >
          <AgentSettings config={config} />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.3 }}
      >
        <LiveConsole logs={agentLogs} />
      </motion.div>

      <div className="text-center text-muted-foreground text-sm py-4">
        Powered by Arevei Cloud Agent | v1.0.0
      </div>
    </div>
  );
}
