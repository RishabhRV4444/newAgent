import type { Express } from "express"
import { createServer, type Server } from "http"
import multer from "multer"
import path from "path"
import { promises as fs } from "fs"
import { storage } from "./storage"
import { createFolderSchema, renameFileSchema } from "@shared/schema"
import {
  createUser,
  findUserByUsername,
  verifyPassword,
  requireAuth,
  type AuthenticatedRequest,
  findUserById,
} from "./auth"
import { signupSchema, loginSchema } from "@shared/auth-schema"
import { shareManager } from "./sharing"
import crypto from "crypto"

let UPLOADS_DIR: string

declare module "express-session" {
  interface SessionData {
    userId?: string
  }
}

const getMullerStorage = () => {
  const multerStorage = multer.diskStorage({
    destination: async (_req, _file, cb) => {
      UPLOADS_DIR = storage.getStoragePath()
      await fs.mkdir(UPLOADS_DIR, { recursive: true })
      cb(null, UPLOADS_DIR)
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
      const ext = path.extname(file.originalname)
      const name = path.basename(file.originalname, ext)
      cb(null, `${name}-${uniqueSuffix}${ext}`)
    },
  })

  return multer({
    storage: multerStorage,
    limits: {
      fileSize: 100 * 1024 * 1024,
    },
  })
}

export async function registerRoutes(app: Express): Promise<Server> {
  await storage.initialize()
  UPLOADS_DIR = storage.getStoragePath()

  const upload = getMullerStorage()

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

  app.get("/api/auth/me", requireAuth as any, async (req, res) => {
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

  app.get("/api/storage-info", requireAuth as any, async (_req, res) => {
    try {
      const storagePath = storage.getStoragePath()
      res.json({
        path: storagePath,
        configured: !!process.env.AREVEI_STORAGE_PATH,
      })
    } catch (error) {
      console.error("Error getting storage info:", error)
      res.status(500).json({ error: "Failed to get storage path info" })
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

  app.get("/api/files", requireAuth as any, async (_req, res) => {
    try {
      const files = await storage.getAllFiles()
      res.json(files)
    } catch (error) {
      console.error("Error listing files:", error)
      res.status(500).json({ error: "Failed to list files" })
    }
  })

  app.get("/api/files/:id/content", requireAuth as any, async (req, res) => {
    try {
      const file = await storage.getFileById(req.params.id)
      if (!file) {
        return res.status(404).json({ error: "File not found" })
      }

      const pathSegments = file.path.replace(/^\//, "").split("/").filter(Boolean)
      const resolvedPath = path.resolve(storage.getStoragePath(), ...pathSegments)

      if (!resolvedPath.startsWith(storage.getStoragePath())) {
        return res.status(403).json({ error: "Access denied" })
      }

      res.sendFile(resolvedPath)
    } catch (error) {
      console.error("Error serving file:", error)
      res.status(500).json({ error: "Failed to serve file" })
    }
  })

  app.post("/api/upload", requireAuth as any, upload.array("files", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[]

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" })
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
          }),
        ),
      )

      res.json({
        message: "Files uploaded successfully",
        files: createdFiles,
      })
    } catch (error) {
      console.error("Error uploading files:", error)
      res.status(500).json({ error: "Failed to upload files" })
    }
  })

  app.post("/api/folders", requireAuth as any, async (req, res) => {
    try {
      const result = createFolderSchema.safeParse(req.body)
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: result.error.issues,
        })
      }

      const folder = await storage.createFolder(result.data)
      res.json(folder)
    } catch (error: any) {
      console.error("Error creating folder:", error)
      res.status(500).json({ error: error.message || "Failed to create folder" })
    }
  })

  app.put("/api/files/:id/rename", requireAuth as any, async (req, res) => {
    try {
      const result = renameFileSchema.safeParse({
        id: req.params.id,
        newName: req.body.newName,
      })

      if (!result.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: result.error.issues,
        })
      }

      const file = await storage.renameFile(result.data.id, result.data.newName)
      res.json(file)
    } catch (error: any) {
      console.error("Error renaming file:", error)

      if (error.message === "File not found") {
        return res.status(404).json({ error: "File not found" })
      }

      res.status(500).json({ error: error.message || "Failed to rename file" })
    }
  })

  app.delete("/api/files/:id", requireAuth as any, async (req, res) => {
    try {
      await storage.deleteFile(req.params.id)
      res.json({ message: "File deleted successfully" })
    } catch (error: any) {
      console.error("Error deleting file:", error)

      if (error.message === "File not found") {
        return res.status(404).json({ error: "File not found" })
      }

      res.status(500).json({ error: error.message || "Failed to delete file" })
    }
  })

  // Create a share link for a file
  app.post("/api/shares", requireAuth as any, async (req: any, res) => {
    try {
      const { fileId, password, expiresAt, maxDownloads } = req.body

      if (!fileId) {
        return res.status(400).json({ error: "File ID is required" })
      }

      const file = await storage.getFileById(fileId)
      if (!file) {
        return res.status(404).json({ error: "File not found" })
      }

      const share = await shareManager.createShare(fileId, req.session.userId!, {
        password,
        expiresAt,
        maxDownloads,
      })

      res.json({
        share: {
          id: share.id,
          shareToken: share.shareToken,
          fileId: share.fileId,
          password: !!share.password,
          expiresAt: share.expiresAt,
          maxDownloads: share.maxDownloads,
          createdAt: share.createdAt,
        },
      })
    } catch (error: any) {
      console.error("Error creating share:", error)
      res.status(500).json({ error: error.message || "Failed to create share" })
    }
  })

  // Get all shares for current user
  app.get("/api/shares", requireAuth as any, async (req: any, res) => {
    try {
      const shares = await shareManager.getUserShares(req.session.userId!)

      res.json({
        shares: shares.map((s) => ({
          id: s.id,
          fileId: s.fileId,
          shareToken: s.shareToken,
          password: !!s.password,
          expiresAt: s.expiresAt,
          maxDownloads: s.maxDownloads,
          downloadCount: s.downloadCount,
          createdAt: s.createdAt,
        })),
      })
    } catch (error: any) {
      console.error("Error fetching shares:", error)
      res.status(500).json({ error: error.message || "Failed to fetch shares" })
    }
  })

  // Delete a share
  app.delete("/api/shares/:shareId", requireAuth as any, async (req: any, res) => {
    try {
      const share = await shareManager.getShareById(req.params.shareId)
      if (!share) {
        return res.status(404).json({ error: "Share not found" })
      }

      if (share.userId !== req.session.userId) {
        return res.status(403).json({ error: "Unauthorized" })
      }

      await shareManager.deleteShare(req.params.shareId)
      res.json({ message: "Share deleted successfully" })
    } catch (error: any) {
      console.error("Error deleting share:", error)
      res.status(500).json({ error: error.message || "Failed to delete share" })
    }
  })

  // Download file via share token (public endpoint)
  app.get("/api/public/share/:shareToken/download", async (req, res) => {
    try {
      const { shareToken } = req.params
      const { password } = req.query

      const share = await shareManager.getShareByToken(shareToken)
      if (!share) {
        return res.status(404).json({ error: "Share not found or expired" })
      }

      // Verify password if required
      if (share.password) {
        if (!password) {
          return res.status(403).json({ error: "Password required" })
        }

        const hashedPassword = crypto
          .createHash("sha256")
          .update(password as string)
          .digest("hex")
        if (hashedPassword !== share.password) {
          return res.status(403).json({ error: "Invalid password" })
        }
      }

      const file = await storage.getFileById(share.fileId)
      if (!file) {
        return res.status(404).json({ error: "File not found" })
      }

      const pathSegments = file.path.replace(/^\//, "").split("/").filter(Boolean)
      const resolvedPath = path.resolve(storage.getStoragePath(), ...pathSegments)

      if (!resolvedPath.startsWith(storage.getStoragePath())) {
        return res.status(403).json({ error: "Access denied" })
      }

      // Increment download count
      await shareManager.incrementDownloadCount(share.id)

      // Send file
      res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`)
      res.sendFile(resolvedPath)
    } catch (error: any) {
      console.error("Error downloading shared file:", error)
      res.status(500).json({ error: error.message || "Failed to download file" })
    }
  })

  // Get share info (public endpoint)
  app.post("/api/public/share/:shareToken/info", async (req, res) => {
    try {
      const { shareToken } = req.params
      const { password } = req.body

      const share = await shareManager.getShareByToken(shareToken)
      if (!share) {
        return res.status(404).json({ error: "Share not found or expired" })
      }

      // Verify password if required
      if (share.password) {
        if (!password) {
          return res.status(403).json({ error: "Password required" })
        }

        const hashedPassword = crypto
          .createHash("sha256")
          .update(password as string)
          .digest("hex")
        if (hashedPassword !== share.password) {
          return res.status(403).json({ error: "Invalid password" })
        }
      }

      const file = await storage.getFileById(share.fileId)
      if (!file) {
        return res.status(404).json({ error: "File not found" })
      }

      res.json({
        file: {
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          mimeType: file.mimeType,
        },
        share: {
          downloadCount: share.downloadCount,
          maxDownloads: share.maxDownloads,
          expiresAt: share.expiresAt,
        },
      })
    } catch (error: any) {
      console.error("Error fetching share info:", error)
      res.status(500).json({ error: error.message || "Failed to fetch share info" })
    }
  })

  const httpServer = createServer(app)
  return httpServer
}
