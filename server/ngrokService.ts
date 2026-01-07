import { storage } from './storage';
import type { ShareLink } from '@shared/schema';

interface ActiveTunnel {
  shareId: string;
  url: string;
  timeoutId?: NodeJS.Timeout;
}

class NgrokService {
  private tunnels: Map<string, ActiveTunnel> = new Map();
  private localPort: number = 5000;

  async initialize(port: number): Promise<void> {
    this.localPort = port;
    const authToken = process.env.NGROK_AUTHTOKEN;
    if (!authToken) {
      console.warn('NGROK_AUTHTOKEN not set - file sharing via ngrok will not work');
      return;
    }
    console.log('Ngrok service initialized (using legacy ngrok library)');
  }

  async startTunnel(shareId: string): Promise<string> {
    const authToken = process.env.NGROK_AUTHTOKEN;
    if (!authToken) {
      throw new Error('NGROK_AUTHTOKEN is required for file sharing');
    }

    let ngrok: any;
    try {
      // Switch to the legacy 'ngrok' package which is often more stable on older Windows environments
      const m = await import('ngrok');
      ngrok = m.default || m;
    } catch (error) {
      console.error('Failed to load ngrok module:', error);
      throw new Error('ngrok module not available. Please ensure the "ngrok" package is installed.');
    }

    const shares = await storage.getAllShares();
    const share = shares.find(s => s.id === shareId);
    if (!share) {
      throw new Error('Share not found');
    }

    if (this.tunnels.has(shareId)) {
      return this.tunnels.get(shareId)!.url;
    }

    try {
      // The 'ngrok' package uses a different API than '@ngrok/ngrok'
      const url = await ngrok.connect({
        proto: 'http',
        addr: this.localPort,
        authtoken: authToken,
      });

      if (!url) {
        throw new Error('Failed to get tunnel URL');
      }

      const shareUrl = `${url}/share/${share.shareToken}`;

      const activeTunnel: ActiveTunnel = {
        shareId,
        url: shareUrl,
      };

      if (share.expiresAt) {
        const expiresIn = new Date(share.expiresAt).getTime() - Date.now();
        if (expiresIn > 0) {
          activeTunnel.timeoutId = setTimeout(() => {
            this.stopTunnel(shareId);
          }, expiresIn);
        }
      }

      this.tunnels.set(shareId, activeTunnel);
      await storage.updateShare(shareId, { tunnelUrl: shareUrl });

      console.log(`Started ngrok tunnel for share ${shareId}: ${shareUrl}`);
      return shareUrl;
    } catch (error: any) {
      console.error('Failed to start ngrok tunnel:', error);
      throw new Error(`Failed to start sharing: ${error.message}`);
    }
  }

  async stopTunnel(shareId: string): Promise<void> {
    const tunnel = this.tunnels.get(shareId);
    if (tunnel) {
      if (tunnel.timeoutId) {
        clearTimeout(tunnel.timeoutId);
      }

      try {
        const ngrok = await import('ngrok');
        await (ngrok.default || ngrok).disconnect(tunnel.url.split('/share/')[0]);
      } catch (error) {
        console.error('Error closing tunnel:', error);
      }

      this.tunnels.delete(shareId);
    }

    try {
      await storage.deleteShare(shareId);
      console.log(`Stopped sharing for ${shareId}`);
    } catch (error) {
      console.error('Error updating share status:', error);
    }
  }

  async stopAllTunnels(): Promise<void> {
    try {
      const ngrok = await import('ngrok');
      await (ngrok.default || ngrok).kill();
      this.tunnels.clear();
    } catch (error) {
      console.error('Error killing ngrok:', error);
    }
  }

  getTunnelUrl(shareId: string): string | null {
    const tunnel = this.tunnels.get(shareId);
    return tunnel ? tunnel.url : null;
  }

  isShareActive(shareId: string): boolean {
    return this.tunnels.has(shareId);
  }
}

export const ngrokService = new NgrokService();
