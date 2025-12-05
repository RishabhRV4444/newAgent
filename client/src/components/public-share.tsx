"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Lock, Download, AlertCircle, FileText, Loader2, Shield, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface FileInfo {
  file: {
    id: string
    name: string
    size: number
    type: string
    mimeType?: string
  }
  share: {
    downloadCount: number
    maxDownloads?: number
    expiresAt?: string
  }
}

export default function PublicSharePage() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [password, setPassword] = useState("")
  const [needsPassword, setNeedsPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetchShareInfo()
  }, [shareToken])

  const fetchShareInfo = async (pwd?: string) => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/public/share/${shareToken}/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd || password || undefined }),
      })

      const data = await res.json()

      if (res.status === 403 && data.needsPassword) {
        setNeedsPassword(true)
        setLoading(false)
        return
      }

      if (res.status === 403) {
        setError("Invalid password")
        setLoading(false)
        return
      }

      if (!res.ok) {
        throw new Error(data.error || "Share not found or expired")
      }

      setFileInfo(data)
      setNeedsPassword(false)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load share")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password) {
      fetchShareInfo(password)
    }
  }

  const downloadFile = async () => {
    try {
      setDownloading(true)
      const params = new URLSearchParams()
      if (password) params.append("password", password)

      const res = await fetch(`/api/public/share/${shareToken}/download?${params}`, {
        method: "GET",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Download failed")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileInfo?.file.name || "download"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Refresh share info to update download count
      fetchShareInfo(password)
    } catch (err: any) {
      setError(err.message || "Download failed")
    } finally {
      setDownloading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const units = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
          <p className="text-slate-400">Loading share...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/80 backdrop-blur border-slate-800 shadow-2xl">
        <div className="p-8">
          {/* Logo/Branding */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">AREVEI Cloud</span>
            </div>
          </div>

          {error && !needsPassword && (
            <div className="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-lg flex items-center gap-3 text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {needsPassword ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="flex flex-col items-center mb-4">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Password Required</h2>
                <p className="text-slate-400 text-sm text-center">
                  This file is protected. Enter the password to access it.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-red-300 text-sm text-center">
                  {error}
                </div>
              )}

              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-center"
                autoFocus
              />
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={!password}>
                <Lock className="w-4 h-4 mr-2" />
                Unlock File
              </Button>
            </form>
          ) : fileInfo ? (
            <div className="space-y-6">
              {/* File Info */}
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-blue-400" />
                </div>
                <h1 className="text-xl font-bold text-white break-all mb-1">{fileInfo.file.name}</h1>
                <p className="text-slate-400 text-sm">Shared via AREVEI Cloud</p>
              </div>

              {/* File Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 p-4 rounded-xl text-center">
                  <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Size</p>
                  <p className="text-white font-semibold">{formatSize(fileInfo.file.size)}</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl text-center">
                  <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Downloads</p>
                  <p className="text-white font-semibold">
                    {fileInfo.share.maxDownloads
                      ? `${fileInfo.share.downloadCount}/${fileInfo.share.maxDownloads}`
                      : fileInfo.share.downloadCount}
                  </p>
                </div>
              </div>

              {/* Expiry Notice */}
              {fileInfo.share.expiresAt && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-400 bg-slate-800/30 px-4 py-2 rounded-lg">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span>Expires {new Date(fileInfo.share.expiresAt).toLocaleDateString()}</span>
                </div>
              )}

              {/* Download Limit Warning */}
              {fileInfo.share.maxDownloads && fileInfo.share.downloadCount >= fileInfo.share.maxDownloads && (
                <div className="p-4 bg-red-950/50 border border-red-800 rounded-lg text-center">
                  <p className="text-red-300">Download limit reached</p>
                </div>
              )}

              {/* Download Button */}
              <Button
                onClick={downloadFile}
                disabled={
                  downloading ||
                  (fileInfo.share.maxDownloads !== undefined &&
                    fileInfo.share.downloadCount >= fileInfo.share.maxDownloads)
                }
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Download File
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
