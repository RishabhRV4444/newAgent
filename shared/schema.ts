import { z } from "zod";

// File and Folder schemas for AREVEI Cloud
export const fileItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['file', 'folder']),
  mimeType: z.string().optional(),
  size: z.number(),
  path: z.string(),
  parentPath: z.string(),
  createdAt: z.string(),
  modifiedAt: z.string(),
});

export const insertFileItemSchema = fileItemSchema.omit({ 
  id: true,
  createdAt: true,
  modifiedAt: true,
});

export const renameFileSchema = z.object({
  id: z.string(),
  newName: z.string().min(1, "Name cannot be empty"),
});

export const createFolderSchema = z.object({
  name: z.string().min(1, "Folder name cannot be empty"),
  parentPath: z.string(),
});

export const storageInfoSchema = z.object({
  usedBytes: z.number(),
  totalBytes: z.number(),
  fileCount: z.number(),
  folderCount: z.number(),
   storagePath: z.string().optional(),
});

export type FileItem = z.infer<typeof fileItemSchema>;
export type InsertFileItem = z.infer<typeof insertFileItemSchema>;
export type RenameFile = z.infer<typeof renameFileSchema>;
export type CreateFolder = z.infer<typeof createFolderSchema>;
export type StorageInfo = z.infer<typeof storageInfoSchema>;

export const shareLinkSchema = z.object({
  id: z.string(),
  fileId: z.string(),
  fileName: z.string(),
  fileMimeType: z.string().optional(),
  shareToken: z.string(),
  tunnelUrl: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  isActive: z.boolean(),
  passwordHash: z.string().nullable().optional(),
  maxDownloads: z.number().nullable().optional(),
  downloadCount: z.number().default(0),
});

export const createShareSchema = z.object({
  fileId: z.string(),
  duration: z.enum(['1h', '6h', '24h', '7d', '30d', 'never']),
  password: z.string().optional(),
  maxDownloads: z.number().min(1).max(1000).optional(),
});

export const insertShareLinkSchema = shareLinkSchema.omit({
  id: true,
  createdAt: true,
});

export const verifySharePasswordSchema = z.object({
  token: z.string(),
  password: z.string(),
});
export type ShareLink = z.infer<typeof shareLinkSchema>;
export type InsertShareLink = z.infer<typeof insertShareLinkSchema>;
export type CreateShare = z.infer<typeof createShareSchema>;
export type VerifySharePassword = z.infer<typeof verifySharePasswordSchema>;