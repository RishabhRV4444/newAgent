import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Settings as SettingsIcon, 
  RefreshCw, 
  Folder, 
  Network,
  Globe,
  Crown,
  ExternalLink,
  HelpCircle,
  MessageSquare,
  BookOpen,
  Send,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { StorageInfo } from "@shared/schema";

function SyncSettings({ storagePath }: { storagePath?: string }) {
  const { toast } = useToast();
  const [autoSync, setAutoSync] = useState(true);
  const [tunnelProvider, setTunnelProvider] = useState("ngrok");

  const handleSyncNow = () => {
    toast({
      title: "Syncing...",
      description: "Your files are being synchronized",
    });
    setTimeout(() => {
      toast({
        title: "Sync Complete",
        description: "All files are up to date",
      });
    }, 2000);
  };

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your sync preferences have been updated",
    });
  };

  return (
    <Card data-testid="card-sync-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          Sync & Storage
        </CardTitle>
        <CardDescription>Manage how your files are synchronized and accessed</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-sync" className="text-base">Auto Sync</Label>
            <p className="text-sm text-muted-foreground">
              Automatically sync files when changes are detected
            </p>
          </div>
          <Switch
            id="auto-sync"
            checked={autoSync}
            onCheckedChange={setAutoSync}
            data-testid="switch-auto-sync"
          />
        </div>

        <Button onClick={handleSyncNow} variant="outline" className="w-full" data-testid="button-sync-now">
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync Now
        </Button>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            Storage Location
          </Label>
          <div className="p-3 rounded-md bg-muted font-mono text-sm" data-testid="text-storage-path">
            {storagePath || "~/AREVEI"}
          </div>
          <p className="text-xs text-muted-foreground">
            This is where your cloud files are stored locally
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Tunnel Provider
          </Label>
          <Select value={tunnelProvider} onValueChange={setTunnelProvider}>
            <SelectTrigger data-testid="select-tunnel-provider">
              <SelectValue placeholder="Select tunnel provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Local Only)</SelectItem>
              <SelectItem value="ngrok">ngrok</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose how you want to access your cloud from outside your network
          </p>
        </div>

        <Button onClick={handleSaveSettings} className="w-full" data-testid="button-save-sync">
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}

function DomainSettings() {
  const { toast } = useToast();
  const [customSubdomain, setCustomSubdomain] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleAddCustomDomain = () => {
    if (!customSubdomain) {
      toast({
        title: "Invalid Subdomain",
        description: "Please enter a valid subdomain name",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Coming Soon",
      description: "Custom subdomains will be available in a future update",
    });
  };

  return (
    <Card data-testid="card-domain-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Domain Settings
        </CardTitle>
        <CardDescription>Manage your cloud access URLs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Your Cloud Access</Label>
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/50">
            <div className="flex-1">
              <p className="font-mono text-sm mb-1">via ngrok tunnel</p>
              <div className="flex items-center gap-2">
                <Badge variant="default">Dynamic</Badge>
                <span className="text-xs text-muted-foreground">URL generated per share</span>
              </div>
            </div>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Custom Subdomain
            </Label>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>

          {!showCustomInput ? (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowCustomInput(true)}
              data-testid="button-add-subdomain"
            >
              <Crown className="h-4 w-4 mr-2" />
              Add Custom Subdomain
            </Button>
          ) : (
            <div className="space-y-3 p-4 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="custom-subdomain">Choose Your Subdomain</Label>
                <div className="flex gap-2">
                  <Input
                    id="custom-subdomain"
                    placeholder="mybrand"
                    value={customSubdomain}
                    onChange={(e) => setCustomSubdomain(e.target.value)}
                    data-testid="input-subdomain"
                  />
                  <div className="flex items-center px-3 rounded-md bg-muted text-sm text-muted-foreground whitespace-nowrap">
                    .arevei.cloud
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-md bg-muted">
                <p className="text-sm font-medium mb-1">Premium Feature</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Custom subdomains will be available in a future update
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Professional branded URL</li>
                  <li>SSL certificate included</li>
                  <li>Instant activation</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddCustomDomain} className="flex-1" data-testid="button-confirm-subdomain">
                  Request Access
                </Button>
                <Button variant="ghost" onClick={() => setShowCustomInput(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SupportSection() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Message Received",
      description: "Thank you for your feedback!",
    });
    
    setMessage("");
    setEmail("");
  };

  return (
    <Card data-testid="card-support-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Support & Help
        </CardTitle>
        <CardDescription>Get assistance with your AREVEI Cloud</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button variant="outline" className="justify-start h-auto p-4" data-testid="button-docs">
            <BookOpen className="h-5 w-5 mr-3" />
            <div className="text-left">
              <p className="font-medium">Documentation</p>
              <p className="text-xs text-muted-foreground">Guides and tutorials</p>
            </div>
          </Button>
          
          <Button variant="outline" className="justify-start h-auto p-4" data-testid="button-community">
            <MessageSquare className="h-5 w-5 mr-3" />
            <div className="text-left">
              <p className="font-medium">Community</p>
              <p className="text-xs text-muted-foreground">Ask questions and share</p>
            </div>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="support-email">Your Email</Label>
            <Input
              id="support-email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-support-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-message">How can we help?</Label>
            <Textarea
              id="support-message"
              placeholder="Describe your issue or question..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              data-testid="textarea-support-message"
            />
          </div>

          <Button type="submit" className="w-full" data-testid="button-submit-support">
            <Send className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { data: storageInfo } = useQuery<StorageInfo>({
    queryKey: ["/api/storage"],
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground">Manage your AREVEI Cloud preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <SyncSettings storagePath={storageInfo?.storagePath} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <DomainSettings />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <SupportSection />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Card data-testid="card-about">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              About AREVEI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="font-medium">1.0.0</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">License</p>
                <p className="font-medium">MIT</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Platform</p>
                <p className="font-medium">Desktop App</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tunnel</p>
                <p className="font-medium">ngrok</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              AREVEI is a secure, local-first file management system that allows you to store files on your own computer
              and share them securely with temporary links, password protection, and download limits.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
