import { type FileItem, type CreateFolder, type StorageInfo, type ShareLink, type CreateShare } from "@shared/schema";
import { randomUUID, randomBytes, createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

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

function getAreveiStoragePath(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, process.env.AREVEI_STORAGE_PATH || "AREVEI");
}

const AREVEI_BASE_DIR = getAreveiStoragePath();
const UPLOADS_DIR = path.join(AREVEI_BASE_DIR, "files");
const METADATA_DIR = path.join(AREVEI_BASE_DIR, ".arevei");
const METADATA_FILE = path.join(METADATA_DIR, "files.json");
const SHARES_FILE = path.join(METADATA_DIR, "shares.json");
const MAX_STORAGE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

export function getStorageBasePath(): string {
  return AREVEI_BASE_DIR;
}

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}

function generateShareToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function calculateExpiration(duration: CreateShare['duration']): string | null {
  if (duration === 'never') return null;
  
  const now = new Date();
  const durationMap: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  
  return new Date(now.getTime() + durationMap[duration]).toISOString();
}

export interface IStorage {
  getAllFiles(): Promise<FileItem[]>;
  getFileById(id: string): Promise<FileItem | undefined>;
  createFile(file: Omit<FileItem, "id" | "createdAt" | "modifiedAt">): Promise<FileItem>;
  createFolder(folder: CreateFolder): Promise<FileItem>;
  renameFile(id: string, newName: string): Promise<FileItem>;
  deleteFile(id: string): Promise<void>;
  getStorageInfo(): Promise<StorageInfo>;
  initialize(): Promise<void>;
  getAllShares(): Promise<ShareLink[]>;
  getShareByToken(token: string): Promise<ShareLink | undefined>;
  getShareByFileId(fileId: string): Promise<ShareLink | undefined>;
  createShare(data: CreateShare): Promise<ShareLink>;
  deleteShare(id: string): Promise<void>;
  cleanExpiredShares(): Promise<void>;
}

export class FileStorage implements IStorage {
  private files: Map<string, FileItem> = new Map();
  private shares: Map<string, ShareLink> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log(`Initializing AREVEI storage at: ${AREVEI_BASE_DIR}`);
      
      await fs.mkdir(AREVEI_BASE_DIR, { recursive: true });
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      await fs.mkdir(METADATA_DIR, { recursive: true });
      
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

      try {
        const sharesData = await fs.readFile(SHARES_FILE, "utf-8");
        const sharesArray: ShareLink[] = JSON.parse(sharesData);
        this.shares = new Map(sharesArray.map(s => [s.id, s]));
      } catch (error) {
        await this.saveSharesMetadata();
      }

      await this.cleanExpiredShares();

      console.log(`AREVEI storage initialized. Files directory: ${UPLOADS_DIR}`);
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize storage:", error);
      throw error;
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
      storagePath: AREVEI_BASE_DIR,
    };
  }

  private async saveSharesMetadata(): Promise<void> {
    const sharesArray = Array.from(this.shares.values());
    await fs.writeFile(SHARES_FILE, JSON.stringify(sharesArray, null, 2));
  }

  async getAllShares(): Promise<ShareLink[]> {
    await this.initialize();
    return Array.from(this.shares.values())
      .filter(s => s.isActive)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getShareByToken(token: string): Promise<ShareLink | undefined> {
    await this.initialize();
    return Array.from(this.shares.values()).find(s => s.shareToken === token && s.isActive);
  }

  async getShareByFileId(fileId: string): Promise<ShareLink | undefined> {
    await this.initialize();
    return Array.from(this.shares.values()).find(s => s.fileId === fileId && s.isActive);
  }

  async createShare(data: CreateShare): Promise<ShareLink> {
    await this.initialize();

    const file = this.files.get(data.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    if (file.type === "folder") {
      throw new Error("Cannot share folders, only files");
    }

    const existingShare = await this.getShareByFileId(data.fileId);
    if (existingShare) {
      throw new Error("File is already being shared");
    }

    const now = new Date().toISOString();
    const share: ShareLink = {
      id: randomUUID(),
      fileId: data.fileId,
      fileName: file.name,
      fileMimeType: file.mimeType,
      shareToken: generateShareToken(),
      tunnelUrl: null,
      expiresAt: calculateExpiration(data.duration),
      createdAt: now,
      isActive: true,
      passwordHash: data.password ? hashPassword(data.password) : null,
      maxDownloads: data.maxDownloads ?? null,
      downloadCount: 0,
    };

    this.shares.set(share.id, share);
    await this.saveSharesMetadata();

    return share;
  }

  async updateShare(id: string, updates: Partial<Pick<ShareLink, 'isActive' | 'expiresAt' | 'tunnelUrl' | 'downloadCount'>>): Promise<ShareLink> {
    await this.initialize();

    const share = this.shares.get(id);
    if (!share) {
      throw new Error("Share not found");
    }

    const updatedShare: ShareLink = {
      ...share,
      ...updates,
    };

    this.shares.set(id, updatedShare);
    await this.saveSharesMetadata();

    return updatedShare;
  }

  async incrementDownloadCount(id: string): Promise<ShareLink> {
    await this.initialize();

    const share = this.shares.get(id);
    if (!share) {
      throw new Error("Share not found");
    }

    const newCount = (share.downloadCount || 0) + 1;
    share.downloadCount = newCount;

    if (share.maxDownloads && newCount >= share.maxDownloads) {
      share.isActive = false;
      console.log(`Share ${share.fileName} reached max downloads (${share.maxDownloads}), deactivating`);
    }

    this.shares.set(id, share);
    await this.saveSharesMetadata();

    return share;
  }

  hasPassword(share: ShareLink): boolean {
    return !!share.passwordHash;
  }

  checkSharePassword(share: ShareLink, password: string): boolean {
    if (!share.passwordHash) return true;
    return verifyPassword(password, share.passwordHash);
  }

  async deleteShare(id: string): Promise<void> {
    await this.initialize();

    const share = this.shares.get(id);
    if (!share) {
      throw new Error("Share not found");
    }

    share.isActive = false;
    this.shares.set(id, share);
    await this.saveSharesMetadata();
  }

  async cleanExpiredShares(): Promise<void> {
    const now = new Date();
    let cleaned = false;

    const entries = Array.from(this.shares.entries());
    for (const [id, share] of entries) {
      if (share.isActive && share.expiresAt && new Date(share.expiresAt) <= now) {
        share.isActive = false;
        this.shares.set(id, share);
        cleaned = true;
        console.log(`Cleaned expired share: ${share.fileName}`);
      }
    }

    if (cleaned) {
      await this.saveSharesMetadata();
    }
  }

  getFilePath(fileId: string): string | null {
    const file = this.files.get(fileId);
    if (!file) return null;
    
    const pathSegments = file.path.replace(/^\//, "").split("/").filter(Boolean);
    return path.join(UPLOADS_DIR, ...pathSegments);
  }
}

export const storage = new FileStorage();
