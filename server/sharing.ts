import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"

interface ShareRecord {
  id: string
  fileId: string
  userId: string
  shareToken: string
  password?: string
  expiresAt?: string
  maxDownloads?: number
  downloadCount: number
  createdAt: string
}

const SHARES_FILE = path.join(
  path.dirname(process.env.AREVEI_STORAGE_PATH || process.env.HOME || "/root"),
  ".arevei-cloud",
  "shares.json",
)

export class ShareManager {
  private shares: Map<string, ShareRecord> = new Map()
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const shareDir = path.dirname(SHARES_FILE)
      await fs.mkdir(shareDir, { recursive: true })

      try {
        const data = await fs.readFile(SHARES_FILE, "utf-8")
        const sharesArray: ShareRecord[] = JSON.parse(data)
        this.shares = new Map(sharesArray.map((s) => [s.id, s]))
      } catch {
        await this.saveShares()
      }

      this.initialized = true
      console.log("Share manager initialized")
    } catch (error) {
      console.error("Failed to initialize share manager:", error)
      throw error
    }
  }

  private async saveShares(): Promise<void> {
    const sharesArray = Array.from(this.shares.values())
    const shareDir = path.dirname(SHARES_FILE)
    await fs.mkdir(shareDir, { recursive: true })
    await fs.writeFile(SHARES_FILE, JSON.stringify(sharesArray, null, 2))
  }

  async createShare(
    fileId: string,
    userId: string,
    options?: { password?: string; expiresAt?: string; maxDownloads?: number },
  ): Promise<ShareRecord> {
    await this.initialize()

    const shareToken = crypto.randomBytes(32).toString("hex")
    const now = new Date().toISOString()

    const share: ShareRecord = {
      id: randomUUID(),
      fileId,
      userId,
      shareToken,
      password: options?.password,
      expiresAt: options?.expiresAt,
      maxDownloads: options?.maxDownloads,
      downloadCount: 0,
      createdAt: now,
    }

    this.shares.set(share.id, share)
    await this.saveShares()

    return share
  }

  async getShareByToken(token: string): Promise<ShareRecord | undefined> {
    await this.initialize()

    const share = Array.from(this.shares.values()).find((s) => s.shareToken === token)

    if (!share) {
      return undefined
    }

    // Check if share has expired
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return undefined
    }

    // Check download limit
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      return undefined
    }

    return share
  }

  async incrementDownloadCount(shareId: string): Promise<void> {
    await this.initialize()

    const share = this.shares.get(shareId)
    if (share) {
      share.downloadCount++
      this.shares.set(shareId, share)
      await this.saveShares()
    }
  }

  async getUserShares(userId: string): Promise<ShareRecord[]> {
    await this.initialize()

    return Array.from(this.shares.values())
      .filter((s) => s.userId === userId)
      .filter((s) => !s.expiresAt || new Date(s.expiresAt) >= new Date())
  }

  async deleteShare(shareId: string): Promise<void> {
    await this.initialize()

    this.shares.delete(shareId)
    await this.saveShares()
  }

  async getShareById(id: string): Promise<ShareRecord | undefined> {
    await this.initialize()
    return this.shares.get(id)
  }
}

export const shareManager = new ShareManager()
