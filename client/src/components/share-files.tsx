"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, CheckCircle, AlertCircle } from "lucide-react"
import useSWR from "swr"

interface ShareConfig {
  fileId: string
  password?: string
  expiresAt?: string
  availableFrom?: string
  availableUntil?: string
  maxDownloads?: number
}

interface ShareResponse {
  share: {
    id: string
    shareToken: string
    fileId: string
    hasPassword: boolean
    expiresAt?: string
    availableFrom?: string
    availableUntil?: string
    maxDownloads?: number
    createdAt: string
  }
}

export function ShareFiles({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [maxDownloads, setMaxDownloads] = useState(1)
  const [hasScheduledWindow, setHasScheduledWindow] = useState(false)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [loading, setLoading] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: ngrokStatus } = useSWR("/api/ngrok/status", (url) => fetch(url).then((r) => r.json()))

  const handleCreateShare = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString()

      const config: ShareConfig = {
        fileId,
        maxDownloads: maxDownloads || undefined,
        expiresAt,
        password: password || undefined,
      }

      if (hasScheduledWindow) {
        if (startTime) config.availableFrom = new Date(startTime).toISOString()
        if (endTime) config.availableUntil = new Date(endTime).toISOString()
      }

      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        throw new Error("Failed to create share")
      }

      const data: ShareResponse = await response.json()
      const baseUrl = ngrokStatus?.url || window.location.origin
      const link = `${baseUrl}/share/${data.share.shareToken}`
      setShareLink(link)
    } catch (error) {
      console.error("Error creating share:", error)
      alert("Failed to create share link")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>Create a temporary shareable link for {fileName} with auto-expiration</DialogDescription>
        </DialogHeader>

        {shareLink ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">Share link created successfully!</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input value={shareLink} readOnly className="text-sm" />
                <Button size="sm" variant="outline" onClick={copyToClipboard} className="gap-2 bg-transparent">
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <Button
              onClick={() => {
                setShareLink(null)
                setPassword("")
                setDurationMinutes(60)
                setMaxDownloads(1)
              }}
              className="w-full"
              variant="outline"
            >
              Create Another Share
            </Button>

            <Button onClick={() => setOpen(false)} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {!ngrokStatus?.isRunning && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  ngrok tunnel is not running. Start it to generate public share links.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="duration">Expiration Time (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="10080"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number.parseInt(e.target.value) || 60)}
                placeholder="60"
              />
              <p className="text-xs text-muted-foreground">
                Link will expire in {durationMinutes} minute{durationMinutes !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDownloads">Max Downloads (optional)</Label>
              <Input
                id="maxDownloads"
                type="number"
                min="1"
                value={maxDownloads}
                onChange={(e) => setMaxDownloads(Number.parseInt(e.target.value) || 1)}
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password Protection (optional)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty for no password"
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasScheduledWindow}
                    onChange={(e) => setHasScheduledWindow(e.target.checked)}
                    className="rounded"
                  />
                  Scheduled Availability Window
                </CardTitle>
                <CardDescription className="text-xs">Link only accessible during specified time range</CardDescription>
              </CardHeader>
              {hasScheduledWindow && (
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-sm">
                      Available From
                    </Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="text-sm">
                      Available Until
                    </Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            <div className="flex gap-2">
              <Button onClick={() => setOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreateShare} disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create Share Link"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
