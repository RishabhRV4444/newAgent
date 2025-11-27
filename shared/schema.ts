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
});

export type FileItem = z.infer<typeof fileItemSchema>;
export type InsertFileItem = z.infer<typeof insertFileItemSchema>;
export type RenameFile = z.infer<typeof renameFileSchema>;
export type CreateFolder = z.infer<typeof createFolderSchema>;
export type StorageInfo = z.infer<typeof storageInfoSchema>;
