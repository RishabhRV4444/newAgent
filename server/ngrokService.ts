import ngrok from '@ngrok/ngrok';
import { storage } from './storage';
import type { ShareLink } from '@shared/schema';

interface ActiveTunnel {
  shareId: string;
  listener: ngrok.Listener;
  timeoutId?: NodeJS.Timeout;
}

class NgrokService {
  private tunnels: Map<string, ActiveTunnel> = new Map();
  private isConnected = false;
  private localPort: number = 5000;

  async initialize(port: number): Promise<void> {
    this.localPort = port;
    
    const authToken = process.env.NGROK_AUTHTOKEN;
    if (!authToken) {
      console.warn('NGROK_AUTHTOKEN not set - file sharing via ngrok will not work');
      return;
    }

    try {
      await this.recoverActiveTunnels();
      this.isConnected = true;
      console.log('Ngrok service initialized');
    } catch (error) {
      console.error('Failed to initialize ngrok service:', error);
    }
  }

  private async recoverActiveTunnels(): Promise<void> {
    const shares = await storage.getAllShares();
    for (const share of shares) {
      if (share.isActive && share.tunnelUrl) {
        await storage.updateShare(share.id, { tunnelUrl: null });
      }
    }
  }

  async startTunnel(shareId: string): Promise<string> {
    const authToken = process.env.NGROK_AUTHTOKEN;
    if (!authToken) {
      throw new Error('NGROK_AUTHTOKEN is required for file sharing');
    }

    const shares = await storage.getAllShares();
    const share = shares.find(s => s.id === shareId);
    if (!share) {
      throw new Error('Share not found');
    }

    if (this.tunnels.has(shareId)) {
      const existing = this.tunnels.get(shareId)!;
      return existing.listener.url() || '';
    }

    try {
      const listener = await ngrok.forward({
        addr: `http://localhost:${this.localPort}`,
        authtoken: authToken,
        domain: undefined,
      });

      const tunnelUrl = listener.url();
      if (!tunnelUrl) {
        throw new Error('Failed to get tunnel URL');
      }

      const shareUrl = `${tunnelUrl}/share/${share.shareToken}`;

      const activeTunnel: ActiveTunnel = {
        shareId,
        listener,
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
        await tunnel.listener.close();
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
    const shareIds = Array.from(this.tunnels.keys());
    for (const shareId of shareIds) {
      await this.stopTunnel(shareId);
    }
  }

  getTunnelUrl(shareId: string): string | null {
    const tunnel = this.tunnels.get(shareId);
    if (!tunnel) return null;
    return tunnel.listener.url() || null;
  }

  isShareActive(shareId: string): boolean {
    return this.tunnels.has(shareId);
  }
}

export const ngrokService = new NgrokService();
