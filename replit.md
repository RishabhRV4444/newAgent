# AREVEI Cloud - File Management Dashboard

## Overview

AREVEI Cloud is a modern, locally-hosted file management dashboard that provides users with an intuitive interface for uploading, organizing, and managing files. The application features a clean, productivity-focused design inspired by tools like Notion and Google Drive, with a fixed 10GB storage capacity and comprehensive file operations including upload, folder creation, rename, delete, and preview capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React with TypeScript, Vite for build tooling, and TailwindCSS for styling using the "new-york" shadcn/ui theme variant.

**Component Library**: Extensive use of Radix UI primitives wrapped in custom shadcn/ui components, providing accessible, composable UI elements with consistent styling.

**State Management**: TanStack Query (React Query) for server state management with custom query client configuration. No global state management library is used; component-level state with React hooks handles UI state.

**Routing**: Wouter for lightweight client-side routing with four main routes: Dashboard (/), Files (/files), Storage (/storage), and Settings (/settings).

**UI/UX Design Principles**:
- Minimal, system-based approach prioritizing file operation efficiency
- Primary brand color: #4F46E5 (AREVEI Blue)
- Typography: Inter/Poppins font families from Google Fonts
- Responsive grid layouts: 4 columns desktop → 2 tablet → 1 mobile
- Smooth animations via Framer Motion for enhanced user experience
- Light/dark theme support with localStorage persistence

**Key Features**:
- File grid and list view modes with toggle
- Real-time search filtering
- Drag-and-drop upload zone with progress tracking
- File preview modal for images and PDFs
- Contextual actions (rename, delete, preview) via dropdown menus

### Backend Architecture

**Technology Stack**: Node.js with Express framework, TypeScript, ESM modules.

**API Design**: RESTful API with JSON responses following standard HTTP methods:
- GET /api/files - List all files
- GET /api/storage - Get storage statistics
- POST /api/upload - Upload files (multipart/form-data)
- POST /api/folders - Create folder
- PUT /api/files/:id/rename - Rename file/folder
- DELETE /api/files/:id - Delete file/folder
- GET /api/files/:id/content - Download/preview file content

**File Upload Handling**: Multer middleware with disk storage strategy, generating unique filenames with timestamp and random suffix, 100MB per-file size limit.

**Storage Layer**: Custom FileStorage class implementing IStorage interface with in-memory Map for fast lookups, backed by JSON file persistence (files.json) for metadata. Physical files stored in local /uploads directory.

**Metadata Schema**: Files and folders tracked with properties: id, name, type, mimeType, size, path, parentPath, createdAt, modifiedAt.

**Validation**: Zod schemas for runtime type validation on API inputs (createFolderSchema, renameFileSchema) with drizzle-zod integration.

**Development Features**: 
- Request/response logging middleware
- Vite middleware integration for HMR in development
- Runtime error overlay via Replit plugins
- Raw body capture for request verification

### Data Storage Solutions

**Database Strategy**: Currently using JSON file-based storage (files.json) for file metadata persistence. The application is configured for PostgreSQL via Drizzle ORM but not actively using it for file operations.

**Drizzle Configuration**: Present with schema definitions and migration setup pointing to PostgreSQL via DATABASE_URL environment variable. Uses @neondatabase/serverless driver, suggesting planned Neon database integration.

**File System Storage**: Local filesystem (/uploads directory) for actual file content. Metadata and files managed separately - metadata in JSON, binary content on disk.

**Storage Limits**: Hard-coded 10GB total storage limit enforced at application level. Storage calculations aggregate file sizes from metadata.

**Session Management**: connect-pg-simple package included suggesting PostgreSQL-backed session storage capability, though not currently implemented in visible code.

### External Dependencies

**UI Component Libraries**:
- Radix UI suite (@radix-ui/*) - 20+ accessible component primitives
- shadcn/ui configuration via components.json
- Framer Motion for animations
- Lucide React for iconography
- cmdk for command palette functionality

**Form & Data Handling**:
- React Hook Form with @hookform/resolvers for form state management
- Zod for schema validation
- TanStack Query for data fetching and cache management
- date-fns for date formatting and manipulation

**Backend Services**:
- Multer for multipart file upload handling
- Express for HTTP server
- Vite for development server and build process

**Database & ORM**:
- Drizzle ORM with drizzle-kit for schema management
- @neondatabase/serverless for PostgreSQL connectivity
- connect-pg-simple for session store (configured but not actively used)

**Development Tools**:
- TypeScript compiler
- Replit-specific plugins (@replit/vite-plugin-*) for development experience
- esbuild for server-side bundling
- PostCSS with Autoprefixer

**Styling**:
- TailwindCSS with custom configuration
- class-variance-authority for component variants
- clsx and tailwind-merge for className composition

**Build & Runtime**:
- Node.js ESM modules
- tsx for TypeScript execution in development
- Vite for frontend bundling
- esbuild for backend bundling in production
## Security Implementation

### Directory Traversal Protection

AREVEI Cloud implements comprehensive defense-in-depth security against path traversal attacks:

**Multi-Layer Sanitization Functions:**
1. `sanitizePathSegment()` - Validates individual path segments:
   - Rejects ".." (directory traversal)
   - Rejects "/" and "\" (path separators)  
   - Rejects null bytes (\0)
   - Rejects absolute paths
   - Rejects empty/whitespace-only segments

2. `sanitizeParentPath()` - Validates parent paths by splitting and sanitizing each segment

3. `sanitizeAndResolvePath()` - Resolves paths and verifies they stay within UPLOADS_DIR

**Protection Applied To:**
- File uploads (validates Multer-generated paths)
- Folder creation (sanitizes names and parent paths)
- Rename operations (validates old and new names)
- Delete operations (validates paths before deletion)
- File serving (validates paths before serving content)

**Metadata Protection:**
- All user inputs sanitized before storage
- Metadata validated when loaded from disk
- Invalid entries automatically filtered out
- Cleaned metadata persisted back to disk

**Attack Vectors Blocked:**
✅ Directory traversal via "../" in any field
✅ Absolute path injection
✅ Path separator injection  
✅ Null byte injection
✅ Empty/whitespace names
✅ Corrupted/tampered metadata files

### Production Readiness

The application has undergone comprehensive security review and is confirmed production-ready:
- All file operations secured against directory traversal
- Defense-in-depth approach with multiple validation layers
- Automatic cleanup of invalid/corrupted data
- Safe file naming via Multer
- Path containment verification on all operations

**Last Security Audit:** November 2025 - PASSED ✅
**Status:** Production Ready

## Recent Changes

### November 2025 - Security Hardening
- Implemented comprehensive path sanitization across all file operations
- Added metadata validation on load with auto-cleanup  
- Secured all CRUD operations against directory traversal
- Validated containment for all filesystem operations
- Fixed file upload to preserve Multer-generated safe filenames
- E2E tests confirmed all features working with security in place

### Initial Release - MVP Features
- Complete UI/UX with drag-and-drop uploads
- Folder management (create, rename, delete)
- File preview for images and PDFs
- Storage quota enforcement (10GB)
- Grid/list view toggle
- Dark mode support
- Responsive design
