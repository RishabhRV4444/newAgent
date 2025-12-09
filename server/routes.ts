import type { Express } from "express"
import { createServer, type Server } from "http"
import multer from "multer"
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
import { shareManager } from "./sharing"
import crypto from "crypto"
import { ngrokManager } from "./ngrok-manager"
import { ngrokService } from "./ngrokService";

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

  

  app.get("/api/storage", requireAuth as any, async (_req, res) => {
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
          <head><title>Share Not Found</title></head>
          <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
            <div style="text-align: center;">
              <h1>Share Not Found</h1>
              <p>This file share link is invalid or has expired.</p>
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
          <head><title>Share Expired</title></head>
          <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
            <div style="text-align: center;">
              <h1>Share Expired</h1>
              <p>This file share link has expired.</p>
            </div>
          </body>
          </html>
        `);
      }

      const filePath = storage.getFilePath(share.fileId);
      if (!filePath) {
        return res.status(404).send('File not found');
      }

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

  app.get("/api/ngrok-url", requireAuth as any, async (_req, res) => {
    try {
      const ngrokUrl = process.env.NGROK_URL || process.env.PUBLIC_URL || null
      res.json({ ngrokUrl })
    } catch (error) {
      res.status(500).json({ error: "Failed to get ngrok URL" })
    }
  })

  app.post("/api/ngrok/start", requireAuth as any, async (_req, res) => {
    try {
      const url = await ngrokManager.startTunnel()
      res.json({
        url,
        message: "ngrok tunnel started successfully",
      })
    } catch (error: any) {
      console.error("Error starting ngrok:", error)
      res.status(500).json({
        error: error.message || "Failed to start ngrok tunnel",
        hint: "Make sure ngrok is installed globally: npm install -g ngrok",
      })
    }
  })

  app.post("/api/ngrok/stop", requireAuth as any, async (_req, res) => {
    try {
      await ngrokManager.stopTunnel()
      res.json({ message: "ngrok tunnel stopped successfully" })
    } catch (error: any) {
      console.error("Error stopping ngrok:", error)
      res.status(500).json({ error: error.message || "Failed to stop ngrok tunnel" })
    }
  })

  app.get("/api/ngrok/status", requireAuth as any, async (_req, res) => {
    try {
      const url = ngrokManager.getUrl()
      const isRunning = ngrokManager.isRunning()
      res.json({
        isRunning,
        url: isRunning ? url : null,
      })
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get ngrok status" })
    }
  })

  const httpServer = createServer(app)
  const port = parseInt(process.env.PORT || "5000", 10);
  await ngrokService.initialize(port);
  return httpServer
}
