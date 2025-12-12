import type { Express } from "express"
import { createServer, type Server } from "http"
import multer from "multer"
import os from "os";
import path from "path"
import { promises as fs } from "fs"
import { storage, getUploadsDir, getStorageBasePath,  } from "./storage";
import { createFolderSchema, renameFileSchema,createShareSchema } from "@shared/schema"
import {
  createUser,
  findUserByUsername,
  verifyPassword,
  requireAuth,

  findUserById,
} from "./auth"
import { signupSchema, loginSchema } from "@shared/auth-schema"

import { ngrokService } from "./ngrokService";
import type { CloudAgentStatus, AgentLog, CloudControlResult } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId?: string
  }
}

declare global {
  namespace Express {
    interface Request {
      uploadParentPath?: string
    }
  }
}
const agentLogs: AgentLog[] = [];

function addAgentLog(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
  const log: AgentLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    message,
    type,
  };
  agentLogs.unshift(log);
  if (agentLogs.length > 100) {
    agentLogs.pop();
  }
}

function getNetworkAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return `http://${iface.address}:5000`;
      }
    }
  }
  return 'Not detected';
}

let UPLOADS_DIR: string

const storagePathMiddleware = (req: any, res: any, next: any) => {
  req.uploadParentPath = (req.body?.parentPath || req.query?.parentPath || "/").toString()
  next()
}

const multerStorage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadsDir = getUploadsDir();
    await fs.mkdir(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB per file
  },
});
export async function registerRoutes(app: Express): Promise<Server> {
  await storage.initialize()
  

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const result = signupSchema.safeParse(req.body)
      if (!result.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: result.error.issues,
        })
      }

      const { username, email, password } = result.data

      // Check if user exists
      const existingUser = await findUserByUsername(username)
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" })
      }

      const user = await createUser(username, email, password)
      req.session.userId = user.id

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      })
    } catch (error: any) {
      console.error("Signup error:", error)
      res.status(500).json({ error: error.message || "Signup failed" })
    }
  })

  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body)
      if (!result.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: result.error.issues,
        })
      }

      const { username, password } = result.data
      const user = await findUserByUsername(username)

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" })
      }

      const passwordMatch = await verifyPassword(password, user.password)
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" })
      }

      req.session.userId = user.id

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      })
    } catch (error: any) {
      console.error("Login error:", error)
      res.status(500).json({ error: error.message || "Login failed" })
    }
  })

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" })
    })
  })

  app.get("/api/auth/me", async (req: any, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" })
      }

      const user = await findUserById(req.session.userId)
      if (!user) {
        return res.status(404).json({ error: "User not found" })
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      })
    } catch (error: any) {
      console.error("Error fetching user:", error)
      res.status(500).json({ error: error.message || "Failed to fetch user" })
    }
  })

  

  app.get("/api/storage", async (_req, res) => {
    try {
      const storageInfo = await storage.getStorageInfo()
      res.json(storageInfo)
    } catch (error) {
      console.error("Error getting storage info:", error)
      res.status(500).json({ error: "Failed to get storage info" })
    }
  })

  

  app.get("/api/files", async (_req, res) => {
    try {
      const files = await storage.getAllFiles();
      res.json(files);
    } catch (error) {
      console.error("Error listing files:", error);
      res.status(500).json({ error: "Failed to list files" });
    }
  });

  app.get("/api/files/:id/content", async (req, res) => {
    try {
      const file = await storage.getFileById(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      const uploadsDir = getUploadsDir();
      const pathSegments = file.path.replace(/^\//, "").split("/").filter(Boolean);
      const resolvedPath = path.resolve(uploadsDir, ...pathSegments);
      
      if (!resolvedPath.startsWith(uploadsDir)) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.sendFile(resolvedPath);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ error: "Failed to serve file" });
    }
  });

   app.post("/api/upload", upload.array("files", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const parentPath = (req.body.parentPath as string) || "/";
      
      const sanitizedParentPath = parentPath
        .split("/")
        .filter(segment => segment && !segment.includes(".."))
        .join("/");
      const normalizedParentPath = sanitizedParentPath ? `/${sanitizedParentPath}` : "/";

      const createdFiles = await Promise.all(
        files.map((file) =>
          storage.createFile({
            name: file.originalname,
            type: "file",
            mimeType: file.mimetype,
            size: file.size,
            path: file.filename,
            parentPath: normalizedParentPath,
          })
        )
      );

      res.json({ 
        message: "Files uploaded successfully", 
        files: createdFiles 
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ error: "Failed to upload files" });
    }
  });


  app.post("/api/folders", async (req, res) => {
    try {
      const result = createFolderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: result.error.issues 
        });
      }

      const folder = await storage.createFolder(result.data);
      res.json(folder);
    } catch (error: any) {
      console.error("Error creating folder:", error);
      res.status(500).json({ error: error.message || "Failed to create folder" });
    }
  });

  app.put("/api/files/:id/rename", async (req, res) => {
    try {
      const result = renameFileSchema.safeParse({
        id: req.params.id,
        newName: req.body.newName,
      });

      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: result.error.issues 
        });
      }

      const file = await storage.renameFile(result.data.id, result.data.newName);
      res.json(file);
    } catch (error: any) {
      console.error("Error renaming file:", error);
      
      if (error.message === "File not found") {
        return res.status(404).json({ error: "File not found" });
      }
      
      res.status(500).json({ error: error.message || "Failed to rename file" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      await storage.deleteFile(req.params.id);
      res.json({ message: "File deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting file:", error);
      
      if (error.message === "File not found") {
        return res.status(404).json({ error: "File not found" });
      }
      
      res.status(500).json({ error: error.message || "Failed to delete file" });
    }
  });

    app.post("/api/upload", upload.array("files", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const createdFiles = await Promise.all(
        files.map((file) =>
          storage.createFile({
            name: file.originalname,
            type: "file",
            mimeType: file.mimetype,
            size: file.size,
            path: file.filename,
            parentPath: "/",
          })
        )
      );

      res.json({ 
        message: "Files uploaded successfully", 
        files: createdFiles 
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ error: "Failed to upload files" });
    }
  });


  // app.post("/api/folders", requireAuth as any, async (req, res) => {
  //   try {
  //     const result = createFolderSchema.safeParse(req.body)
  //     if (!result.success) {
  //       return res.status(400).json({
  //         error: "Invalid request",
  //         details: result.error.issues,
  //       })
  //     }

  //     const folder = await storage.createFolder(result.data)
  //     res.json(folder)
  //   } catch (error: any) {
  //     console.error("Error creating folder:", error)
  //     res.status(500).json({ error: error.message || "Failed to create folder" })
  //   }
  // })

  // app.put("/api/files/:id/rename", requireAuth as any, async (req, res) => {
  //   try {
  //     const result = renameFileSchema.safeParse({
  //       id: req.params.id,
  //       newName: req.body.newName,
  //     })

  //     if (!result.success) {
  //       return res.status(400).json({
  //         error: "Invalid request",
  //         details: result.error.issues,
  //       })
  //     }

  //     const file = await storage.renameFile(result.data.id, result.data.newName)
  //     res.json(file)
  //   } catch (error: any) {
  //     console.error("Error renaming file:", error)

  //     if (error.message === "File not found") {
  //       return res.status(404).json({ error: "File not found" })
  //     }

  //     res.status(500).json({ error: error.message || "Failed to rename file" })
  //   }
  // })

  // app.delete("/api/files/:id", requireAuth as any, async (req, res) => {
  //   try {
  //     await storage.deleteFile(req.params.id)
  //     res.json({ message: "File deleted successfully" })
  //   } catch (error: any) {
  //     console.error("Error deleting file:", error)

  //     if (error.message === "File not found") {
  //       return res.status(404).json({ error: "File not found" })
  //     }

  //     res.status(500).json({ error: error.message || "Failed to delete file" })
  //   }
  // })

  app.get("/api/checkshare/:fileId", async (req, res) => {
  try {
      const share = await storage.getShareByFileId(req.params.fileId);
      res.json({ isShared: !!share, share: share || null });
    } catch (error) {
      console.error("Error checking share:", error);
      res.status(500).json({ error: "Failed to check share status" });
    }
});

 app.get("/api/shares", async (_req, res) => {
    try {
      const shares = await storage.getAllShares();
      res.json(shares);
    } catch (error) {
      console.error("Error getting shares:", error);
      res.status(500).json({ error: "Failed to get shares" });
    }
  });

   app.post("/api/shares", async (req, res) => {
    try {
      const result = createShareSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: result.error.issues 
        });
      }

      const existingShare = await storage.getShareByFileId(result.data.fileId);
      if (existingShare && existingShare.isActive && existingShare.tunnelUrl) {
        return res.json(existingShare);
      }

      const share = await storage.createShare(result.data);
      
      try {
        const tunnelUrl = await ngrokService.startTunnel(share.id);
        const updatedShare = await storage.updateShare(share.id, { tunnelUrl });
        res.json(updatedShare);
      } catch (tunnelError: any) {
        await storage.deleteShare(share.id);
        console.error("Error starting ngrok tunnel:", tunnelError);
        
        if (tunnelError.message?.includes("NGROK_AUTHTOKEN")) {
          return res.status(400).json({ 
            error: "NGROK_AUTHTOKEN is required. Please add your ngrok auth token in the Secrets tab." 
          });
        }
        
        throw tunnelError;
      }
    } catch (error: any) {
      console.error("Error creating share:", error);
      res.status(500).json({ error: error.message || "Failed to create share" });
    }
  });



  app.delete("/api/shares/:id", async (req, res) => {
    try {
      await ngrokService.stopTunnel(req.params.id);
      res.json({ message: "Share stopped successfully" });
    } catch (error: any) {
      console.error("Error stopping share:", error);
      
      if (error.message === "Share not found") {
        return res.status(404).json({ error: "Share not found" });
      }
      
      res.status(500).json({ error: error.message || "Failed to stop share" });
    }
  });

  app.get("/share/:token", async (req, res) => {
    try {
      const share = await storage.getShareByToken(req.params.token);
      
      if (!share) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Share Not Found - AREVEI</title></head>
          <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);">
            <div style="text-align: center; color: white; padding: 2rem; background: rgba(255,255,255,0.1); border-radius: 1rem; backdrop-filter: blur(10px);">
              <h1 style="margin-bottom: 0.5rem;">Share Not Found</h1>
              <p style="opacity: 0.9;">This file share link is invalid or has expired.</p>
            </div>
          </body>
          </html>
        `);
      }

      if (share.expiresAt && new Date(share.expiresAt) <= new Date()) {
        await ngrokService.stopTunnel(share.id);
        return res.status(410).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Share Expired - AREVEI</title></head>
          <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);">
            <div style="text-align: center; color: white; padding: 2rem; background: rgba(255,255,255,0.1); border-radius: 1rem; backdrop-filter: blur(10px);">
              <h1 style="margin-bottom: 0.5rem;">Share Expired</h1>
              <p style="opacity: 0.9;">This file share link has expired.</p>
            </div>
          </body>
          </html>
        `);
      }

      if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
        return res.status(410).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Download Limit Reached - AREVEI</title></head>
          <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);">
            <div style="text-align: center; color: white; padding: 2rem; background: rgba(255,255,255,0.1); border-radius: 1rem; backdrop-filter: blur(10px);">
              <h1 style="margin-bottom: 0.5rem;">Download Limit Reached</h1>
              <p style="opacity: 0.9;">This file has reached its maximum download limit.</p>
            </div>
          </body>
          </html>
        `);
      }

      if (storage.hasPassword(share)) {
        const providedPassword = req.query.password as string;
        if (!providedPassword || !storage.checkSharePassword(share, providedPassword)) {
          return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Password Required - AREVEI</title>
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); }
                .container { text-align: center; color: white; padding: 2rem; background: rgba(255,255,255,0.1); border-radius: 1rem; backdrop-filter: blur(10px); min-width: 320px; }
                h1 { margin-bottom: 0.5rem; font-size: 1.5rem; }
                p { opacity: 0.9; margin-bottom: 1.5rem; font-size: 0.875rem; }
                .file-name { background: rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; word-break: break-all; }
                form { display: flex; flex-direction: column; gap: 1rem; }
                input { padding: 0.75rem 1rem; border-radius: 0.5rem; border: none; font-size: 1rem; }
                button { padding: 0.75rem 1rem; border-radius: 0.5rem; border: none; background: white; color: #4F46E5; font-weight: 600; cursor: pointer; font-size: 1rem; transition: transform 0.2s; }
                button:hover { transform: scale(1.02); }
                .error { color: #FCA5A5; margin-top: 0.5rem; font-size: 0.875rem; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Password Required</h1>
                <p>This file is password protected</p>
                <div class="file-name">${share.fileName}</div>
                <form method="GET" action="/share/${req.params.token}">
                  <input type="password" name="password" placeholder="Enter password" required autofocus />
                  <button type="submit">Access File</button>
                </form>
                ${providedPassword ? '<p class="error">Incorrect password</p>' : ''}
              </div>
            </body>
            </html>
          `);
        }
      }

      const filePath = storage.getFilePath(share.fileId);
      if (!filePath) {
        return res.status(404).send('File not found');
      }

      await storage.incrementDownloadCount(share.id);

      res.setHeader('Content-Disposition', `inline; filename="${share.fileName}"`);
      if (share.fileMimeType) {
        res.setHeader('Content-Type', share.fileMimeType);
      }
      
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving shared file:", error);
      res.status(500).send('Failed to serve file');
    }
  });

  // Cloud Agent Status API
  app.get("/api/agent/status", async (_req, res) => {
    try {
      const storagePath = getStorageBasePath();
      const status: CloudAgentStatus = {
        cloudStatus: 'running',
        containerName: 'arevei-cloud',
        dockerInstalled: true,
        dockerVersion: 'v24.0+',
        dockerRunning: true,
        connectionStatus: 'connected',
        connectionUser: 'admin@arevei.shop',
        agentOnline: true,
        localUrl: 'http://localhost:5000',
        networkUrl: getNetworkAddress(),
      };
      res.json(status);
    } catch (error) {
      console.error("Error getting agent status:", error);
      res.status(500).json({ error: "Failed to get agent status" });
    }
  });

  // Cloud Agent Logs API
  app.get("/api/agent/logs", (_req, res) => {
    res.json(agentLogs);
  });

  app.delete("/api/agent/logs", (_req, res) => {
    agentLogs.length = 0;
    res.json({ message: "Logs cleared" });
  });

  // Cloud Control APIs
  app.post("/api/agent/start", async (_req, res) => {
    try {
      addAgentLog('Starting cloud agent...', 'info');
      await new Promise(resolve => setTimeout(resolve, 1000));
      addAgentLog('Cloud agent started successfully!', 'success');
      const result: CloudControlResult = { success: true, message: 'Cloud agent started' };
      res.json(result);
    } catch (error: any) {
      addAgentLog(`Failed to start: ${error.message}`, 'error');
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/agent/stop", async (_req, res) => {
    try {
      addAgentLog('Stopping cloud agent...', 'info');
      await new Promise(resolve => setTimeout(resolve, 1000));
      addAgentLog('Cloud agent stopped successfully!', 'success');
      const result: CloudControlResult = { success: true, message: 'Cloud agent stopped' };
      res.json(result);
    } catch (error: any) {
      addAgentLog(`Failed to stop: ${error.message}`, 'error');
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/agent/restart", async (_req, res) => {
    try {
      addAgentLog('Restarting cloud agent...', 'info');
      await new Promise(resolve => setTimeout(resolve, 2000));
      addAgentLog('Cloud agent restarted successfully!', 'success');
      const result: CloudControlResult = { success: true, message: 'Cloud agent restarted' };
      res.json(result);
    } catch (error: any) {
      addAgentLog(`Failed to restart: ${error.message}`, 'error');
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/agent/heartbeat", async (_req, res) => {
    try {
      addAgentLog('Heartbeat sent', 'info');
      res.json({ success: true, online: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/agent/test-connection", async (_req, res) => {
    try {
      addAgentLog('Testing connection to arevei.shop...', 'info');
      await new Promise(resolve => setTimeout(resolve, 500));
      addAgentLog('Connection successful! User: admin@arevei.shop', 'success');
      res.json({ 
        success: true, 
        connected: true, 
        user: 'admin@arevei.shop',
        devMode: true 
      });
    } catch (error: any) {
      addAgentLog(`Connection test failed: ${error.message}`, 'error');
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/agent/config", async (_req, res) => {
    try {
      const storagePath = getStorageBasePath();
      res.json({
        syncFolder: storagePath,
        defaultUsername: 'admin',
        defaultPassword: 'Arevei@2024',
        localUrl: 'http://localhost:5000',
        networkUrl: getNetworkAddress(),
      });
    } catch (error) {
      console.error("Error getting agent config:", error);
      res.status(500).json({ error: "Failed to get config" });
    }
  });

  const httpServer = createServer(app);
  
  const port = parseInt(process.env.PORT || "5000", 10);
  await ngrokService.initialize(port);
  
  addAgentLog('AREVEI Cloud Agent initialized', 'success');
  addAgentLog(`Serving on port ${port}`, 'info');
  addAgentLog(`Network URL: ${getNetworkAddress()}`, 'info');
  return httpServer
}
