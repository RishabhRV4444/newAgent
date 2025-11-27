import type { Express } from "express"
import { createServer, type Server } from "http"
import multer from "multer"
import path from "path"
import { promises as fs } from "fs"
import { storage } from "./storage"
import { createFolderSchema, renameFileSchema } from "@shared/schema"

let UPLOADS_DIR: string

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
      fileSize: 100 * 1024 * 1024, // 100 MB per file
    },
  })
}

export async function registerRoutes(app: Express): Promise<Server> {
  await storage.initialize()
  UPLOADS_DIR = storage.getStoragePath()

  const upload = getMullerStorage()

  app.get("/api/storage-info", async (_req, res) => {
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
      const files = await storage.getAllFiles()
      res.json(files)
    } catch (error) {
      console.error("Error listing files:", error)
      res.status(500).json({ error: "Failed to list files" })
    }
  })

  app.get("/api/files/:id/content", async (req, res) => {
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

  app.post("/api/upload", upload.array("files", 10), async (req, res) => {
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

  app.post("/api/folders", async (req, res) => {
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

  app.put("/api/files/:id/rename", async (req, res) => {
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

  app.delete("/api/files/:id", async (req, res) => {
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

  const httpServer = createServer(app)
  return httpServer
}
