import { spawn, type ChildProcess } from "child_process"
import path from "path"
import os from "os"
import { promises as fs } from "fs"

interface NgrokConfig {
  url?: string
  isRunning: boolean
  processId?: number
  startedAt?: string
}

const getNgrokConfigPath = (): string => {
  const homeDir = os.homedir()
  return path.join(homeDir, ".arevei-cloud", "ngrok-config.json")
}

export class NgrokManager {
  private ngrokProcess: ChildProcess | null = null
  private currentUrl: string | null = null
  private configFile: string
  private isInitialized = false
  private port = 5000

  constructor(port = 5000) {
    this.configFile = getNgrokConfigPath()
    this.port = port
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      const configDir = path.dirname(this.configFile)
      await fs.mkdir(configDir, { recursive: true })

      try {
        const data = await fs.readFile(this.configFile, "utf-8")
        const config: NgrokConfig = JSON.parse(data)
        if (config.url) {
          this.currentUrl = config.url
        }
      } catch {
        // Config file doesn't exist yet, will be created on first tunnel
      }

      this.isInitialized = true
      console.log("[NgrokManager] Initialized")
    } catch (error) {
      console.error("[NgrokManager] Initialization error:", error)
    }
  }

  async startTunnel(): Promise<string | null> {
    await this.initialize()

    if (this.currentUrl) {
      console.log("[NgrokManager] Tunnel already running:", this.currentUrl)
      return this.currentUrl
    }

    try {
      console.log("[NgrokManager] Starting ngrok tunnel on port", this.port)

      // Try to spawn ngrok - it should be in PATH or installed globally
      this.ngrokProcess = spawn("ngrok", ["http", this.port.toString()], {
        stdio: ["ignore", "pipe", "pipe"],
        detached: false,
      })

      return new Promise((resolve, reject) => {
        let output = ""
        let resolved = false

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true
            reject(new Error("Timeout waiting for ngrok URL"))
          }
        }, 15000) // 15 second timeout

        this.ngrokProcess!.stdout!.on("data", async (data: Buffer) => {
          output += data.toString()
          console.log("[NgrokManager]", data.toString().trim())

          // Look for the forwarding URL in output
          const urlMatch = output.match(/Forwarding\s+(https?:\/\/[^\s]+)/)
          if (urlMatch && !resolved) {
            resolved = true
            clearTimeout(timeout)
            this.currentUrl = urlMatch[1]

            // Save config
            await this.saveConfig({
              url: this.currentUrl,
              isRunning: true,
              startedAt: new Date().toISOString(),
            })

            resolve(this.currentUrl)
          }
        })

        this.ngrokProcess!.stderr!.on("data", (data: Buffer) => {
          console.error("[NgrokManager Error]", data.toString().trim())
        })

        this.ngrokProcess!.on("error", (err) => {
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            reject(err)
          }
        })

        this.ngrokProcess!.on("exit", (code) => {
          console.log(`[NgrokManager] Process exited with code ${code}`)
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            this.ngrokProcess = null
            this.currentUrl = null
          }
        })
      })
    } catch (error) {
      console.error("[NgrokManager] Failed to start tunnel:", error)
      throw error
    }
  }

  async stopTunnel(): Promise<void> {
    if (this.ngrokProcess) {
      console.log("[NgrokManager] Stopping ngrok tunnel")
      this.ngrokProcess.kill("SIGTERM")
      this.ngrokProcess = null
      this.currentUrl = null

      await this.saveConfig({
        isRunning: false,
      })
    }
  }

  getUrl(): string | null {
    return this.currentUrl
  }

  isRunning(): boolean {
    return this.ngrokProcess !== null && this.currentUrl !== null
  }

  private async saveConfig(config: Partial<NgrokConfig>): Promise<void> {
    try {
      const configDir = path.dirname(this.configFile)
      await fs.mkdir(configDir, { recursive: true })

      let fullConfig: NgrokConfig = {
        isRunning: false,
        ...config,
      }

      try {
        const existing = await fs.readFile(this.configFile, "utf-8")
        const existingConfig: NgrokConfig = JSON.parse(existing)
        fullConfig = { ...existingConfig, ...config }
      } catch {
        // File doesn't exist, use new config
      }

      await fs.writeFile(this.configFile, JSON.stringify(fullConfig, null, 2))
    } catch (error) {
      console.error("[NgrokManager] Failed to save config:", error)
    }
  }
}

export const ngrokManager = new NgrokManager(Number.parseInt(process.env.PORT || "5000", 10))
