import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { existsSync, mkdirSync } from "fs";
import { storage, getUploadsDir, getStorageBasePath, verifyPassword } from "./storage";
import { ngrokService } from "./ngrokService";
import { createFolderSchema, renameFileSchema, createShareSchema, verifySharePasswordSchema } from "@shared/schema";

const multerStorage = multer.diskStorage({
  destination: (req, _file, cb: any) => {
    try {
      const uploadsDir = getUploadsDir();
      const parentPath = (req.body.parentPath as string) || "/";
      const sanitizedParentPath = parentPath
        .split("/")
        .filter(segment => segment && !segment.includes(".."))
        .join("/");
      const folderPath = sanitizedParentPath === "/" 
        ? uploadsDir 
        : path.join(uploadsDir, sanitizedParentPath.replace(/^\//, ""));
      
      if (!existsSync(folderPath)) {
        mkdirSync(folderPath, { recursive: true });
      }
      cb(null, folderPath);
    } catch (error: any) {
      cb(error);
    }
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
  await storage.initialize();

  app.get("/api/storage", async (_req, res) => {
    try {
      const storageInfo = await storage.getStorageInfo();
      res.json(storageInfo);
    } catch (error) {
      console.error("Error getting storage info:", error);
      res.status(500).json({ error: "Failed to get storage info" });
    }
  });

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

      const uploadsDir = getUploadsDir();
      
      const createdFiles = await Promise.all(
        files.map(async (file) => {
          // Calculate the relative path from the uploads directory to the file
          const absoluteFilePath = file.path;
          const relativePath = path.relative(uploadsDir, absoluteFilePath);
          
          console.log("File uploaded:", {
            originalname: file.originalname,
            absolutePath: absoluteFilePath,
            uploadsDir,
            relativePath,
            parentPath: normalizedParentPath,
          });
          
          return storage.createFile({
            name: file.originalname,
            type: "file",
            mimeType: file.mimetype,
            size: file.size,
            path: relativePath,
            parentPath: normalizedParentPath,
          })
        })
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

  app.get("/api/shares", async (_req, res) => {
    try {
      const shares = await storage.getAllShares();
      res.json(shares);
    } catch (error) {
      console.error("Error getting shares:", error);
      res.status(500).json({ error: "Failed to get shares" });
    }
  });

  app.get("/api/shares/:fileId/check", async (req, res) => {
    try {
      const share = await storage.getShareByFileId(req.params.fileId);
      res.json({ isShared: !!share, share: share || null });
    } catch (error) {
      console.error("Error checking share:", error);
      res.status(500).json({ error: "Failed to check share status" });
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
        console.error("Error starting ngrok tunnel:", tunnelError);
        
        // Don't delete the share - keep it for local access
        // Just return error response without tunnel URL
        const errorMessage = tunnelError.message || 'Unknown error';
        
        if (errorMessage.includes("NGROK_AUTHTOKEN")) {
          await storage.deleteShare(share.id);
          return res.status(400).json({ 
            error: "NGROK_AUTHTOKEN is required. Please add your ngrok auth token in the Secrets tab." 
          });
        }
        
        if (errorMessage.includes("ngrok module") || errorMessage.includes("not available")) {
          // Keep the share but return error about ngrok
          return res.status(503).json({ 
            error: "ngrok tunnel service is not available",
            details: errorMessage,
            share: share // Return share without tunnel URL
          });
        }
        
        // For other errors, delete the share and return error
        await storage.deleteShare(share.id);
        return res.status(500).json({ 
          error: "Failed to create share tunnel",
          details: errorMessage
        });
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

  app.post("/api/share/:token/verify", async (req, res) => {
    try {
      const result = verifySharePasswordSchema.safeParse({
        token: req.params.token,
        password: req.body.password,
      });

      if (!result.success) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const share = await storage.getShareByToken(result.data.token);
      if (!share) {
        return res.status(404).json({ error: "Share not found" });
      }

      const isValid = storage.checkSharePassword(share, result.data.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid password" });
      }

      res.json({ valid: true, fileName: share.fileName });
    } catch (error) {
      console.error("Error verifying share password:", error);
      res.status(500).json({ error: "Failed to verify password" });
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

  const httpServer = createServer(app);
  
  const port = parseInt(process.env.PORT || "5000", 10);
  await ngrokService.initialize(port);
  
  return httpServer;
}
