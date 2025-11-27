import { type FileItem, type CreateFolder, type StorageInfo } from "@/shared/schema";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const getUploadsDir = (): string => {
  const customPath = process.env.AREVEI_STORAGE_PATH;
  if (customPath) {
    return path.resolve(customPath);
  }
  
  // Default to ~/.arevei-cloud/uploads
  const homeDir = os.homedir();
  return path.join(homeDir, ".arevei-cloud", "uploads");
};

function sanitizePathSegment(segment: string): string {
  if (!segment || typeof segment !== "string") {
    throw new Error("Invalid path segment");
  }
  
  const trimmed = segment.trim();
  
  if (!trimmed) {
    throw new Error("Path segment cannot be empty");
  }
  
  if (trimmed.includes("..") || 
      trimmed.includes("/") || 
      trimmed.includes("\\") || 
      trimmed.includes("\0") ||
      path.isAbsolute(trimmed)) {
    throw new Error("Invalid characters in path segment");
  }
  
  return trimmed;
}

function sanitizeAndResolvePath(basePath: string, ...segments: string[]): string {
  const sanitizedSegments = segments.map(sanitizePathSegment);
  const resolvedPath = path.resolve(basePath, ...sanitizedSegments);
  
  if (!resolvedPath.startsWith(basePath)) {
    throw new Error("Path traversal detected");
  }
  
  return resolvedPath;
}

function sanitizeParentPath(parentPath: string): string {
  if (!parentPath || parentPath === "/") {
    return "/";
  }
  
  const normalized = parentPath.replace(/^\//, "");
  if (!normalized) {
    return "/";
  }
  
  const segments = normalized.split("/").filter(Boolean);
  segments.forEach(sanitizePathSegment);
  
  return "/" + segments.join("/");
}

const UPLOADS_DIR = getUploadsDir();
const METADATA_FILE = path.join(UPLOADS_DIR, "files.json");
const CONFIG_FILE = path.join(path.dirname(UPLOADS_DIR), "config.json");
const MAX_STORAGE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

export interface IStorage {
  getAllFiles(): Promise<FileItem[]>;
  getFileById(id: string): Promise<FileItem | undefined>;
  createFile(file: Omit<FileItem, "id" | "createdAt" | "modifiedAt">): Promise<FileItem>;
  createFolder(folder: CreateFolder): Promise<FileItem>;
  renameFile(id: string, newName: string): Promise<FileItem>;
  deleteFile(id: string): Promise<void>;
  getStorageInfo(): Promise<StorageInfo>;
  initialize(): Promise<void>;
  getStoragePath(): string;
}

export class FileStorage implements IStorage {
  private files: Map<string, FileItem> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      
      const configDir = path.dirname(UPLOADS_DIR);
      const configExists = await this.fileExists(CONFIG_FILE);
      if (!configExists) {
        await fs.writeFile(CONFIG_FILE, JSON.stringify({
          version: "1.0",
          createdAt: new Date().toISOString(),
          storagePath: UPLOADS_DIR,
        }, null, 2));
      }
      
      try {
        const data = await fs.readFile(METADATA_FILE, "utf-8");
        const filesArray: FileItem[] = JSON.parse(data);
        
        const validatedFiles = filesArray.filter((file) => {
          try {
            sanitizeParentPath(file.parentPath);
            const pathSegments = file.path.replace(/^\//, "").split("/").filter(Boolean);
            pathSegments.forEach(sanitizePathSegment);
            return true;
          } catch {
            console.warn(`Removing invalid file from metadata: ${file.id} (${file.name})`);
            return false;
          }
        });
        
        this.files = new Map(validatedFiles.map(f => [f.id, f]));
        
        if (validatedFiles.length !== filesArray.length) {
          console.log(`Cleaned ${filesArray.length - validatedFiles.length} invalid entries from metadata`);
          await this.saveMetadata();
        }
      } catch (error) {
        await this.saveMetadata();
      }

      this.initialized = true;
      console.log(`Storage initialized at: ${UPLOADS_DIR}`);
    } catch (error) {
      console.error("Failed to initialize storage:", error);
      throw error;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async saveMetadata(): Promise<void> {
    const filesArray = Array.from(this.files.values());
    await fs.writeFile(METADATA_FILE, JSON.stringify(filesArray, null, 2));
  }

  async getAllFiles(): Promise<FileItem[]> {
    await this.initialize();
    return Array.from(this.files.values()).sort((a, b) => {
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;
      return b.modifiedAt.localeCompare(a.modifiedAt);
    });
  }

  async getFileById(id: string): Promise<FileItem | undefined> {
    await this.initialize();
    return this.files.get(id);
  }

  async createFile(fileData: Omit<FileItem, "id" | "createdAt" | "modifiedAt">): Promise<FileItem> {
    await this.initialize();
    
    const storageInfo = await this.getStorageInfo();
    if (storageInfo.usedBytes + fileData.size > MAX_STORAGE_BYTES) {
      throw new Error("Storage quota exceeded");
    }
    
    const sanitizedName = sanitizePathSegment(fileData.name);
    const sanitizedParentPath = sanitizeParentPath(fileData.parentPath);
    
    const pathSegments = fileData.path.replace(/^\//, "").split("/").filter(Boolean);
    pathSegments.forEach(sanitizePathSegment);
    sanitizeAndResolvePath(UPLOADS_DIR, ...pathSegments);
    
    const now = new Date().toISOString();
    const file: FileItem = {
      ...fileData,
      name: sanitizedName,
      parentPath: sanitizedParentPath,
      id: randomUUID(),
      createdAt: now,
      modifiedAt: now,
    };

    this.files.set(file.id, file);
    await this.saveMetadata();
    
    return file;
  }

  async createFolder(folderData: CreateFolder): Promise<FileItem> {
    await this.initialize();

    const sanitizedName = sanitizePathSegment(folderData.name);
    const sanitizedParentPath = sanitizeParentPath(folderData.parentPath);
    const parentPath = sanitizedParentPath === "/" ? "" : sanitizedParentPath.replace(/^\//, "");
    
    const pathSegments = parentPath ? [...parentPath.split("/").filter(Boolean), sanitizedName] : [sanitizedName];
    const folderPath = sanitizeAndResolvePath(UPLOADS_DIR, ...pathSegments);
    
    await fs.mkdir(folderPath, { recursive: true });

    const now = new Date().toISOString();
    const relativePath = pathSegments.join("/");
    
    const folder: FileItem = {
      id: randomUUID(),
      name: sanitizedName,
      type: "folder",
      size: 0,
      path: relativePath,
      parentPath: sanitizedParentPath,
      createdAt: now,
      modifiedAt: now,
    };

    this.files.set(folder.id, folder);
    await this.saveMetadata();

    return folder;
  }

  async renameFile(id: string, newName: string): Promise<FileItem> {
    await this.initialize();

    const file = this.files.get(id);
    if (!file) {
      throw new Error("File not found");
    }

    const sanitizedNewName = sanitizePathSegment(newName);
    const oldPathSegments = file.path.replace(/^\//, "").split("/").filter(Boolean);
    const parentPath = file.parentPath === "/" ? "" : file.parentPath.replace(/^\//, "");
    const parentSegments = parentPath ? parentPath.split("/").filter(Boolean) : [];
    
    const oldPath = sanitizeAndResolvePath(UPLOADS_DIR, ...oldPathSegments);
    const newPath = sanitizeAndResolvePath(UPLOADS_DIR, ...parentSegments, sanitizedNewName);

    await fs.rename(oldPath, newPath);

    const newRelativePath = [...parentSegments, sanitizedNewName].join("/");
    
    const updatedFile: FileItem = {
      ...file,
      name: sanitizedNewName,
      path: newRelativePath || sanitizedNewName,
      modifiedAt: new Date().toISOString(),
    };

    this.files.set(id, updatedFile);
    await this.saveMetadata();

    return updatedFile;
  }

  async deleteFile(id: string): Promise<void> {
    await this.initialize();

    const file = this.files.get(id);
    if (!file) {
      throw new Error("File not found");
    }

    const pathSegments = file.path.replace(/^\//, "").split("/").filter(Boolean);
    const filePath = sanitizeAndResolvePath(UPLOADS_DIR, ...pathSegments);
    
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      await fs.rm(filePath, { recursive: true, force: true });
    } else {
      await fs.unlink(filePath);
    }

    this.files.delete(id);
    await this.saveMetadata();
  }

  async getStorageInfo(): Promise<StorageInfo> {
    await this.initialize();

    const files = Array.from(this.files.values());
    const usedBytes = files
      .filter(f => f.type === "file")
      .reduce((sum, f) => sum + f.size, 0);

    const fileCount = files.filter(f => f.type === "file").length;
    const folderCount = files.filter(f => f.type === "folder").length;

    return {
      usedBytes,
      totalBytes: MAX_STORAGE_BYTES,
      fileCount,
      folderCount,
    };
  }

  getStoragePath(): string {
    return UPLOADS_DIR;
  }
}

export const storage = new FileStorage();
