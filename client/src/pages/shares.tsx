"use client"

import { useEffect, useState } from "react"
import { useLocation } from "wouter"
import { Copy, Trash2, Clock, Lock, Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

interface Share {
  id: string
  fileId: string
  shareToken: string
  password: boolean
  expiresAt?: string
  maxDownloads?: number
  downloadCount: number
  createdAt: string
}

export default function SharesPage() {
  const [, navigate] = useLocation();
  const [shares, setShares] = useState<Share[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchShares()
  }, [])

  const fetchShares = async () => {
    try {
      const res = await fetch("/api/shares")
      if (!res.ok) throw new Error("Failed to fetch shares")
      const data = await res.json()
      setShares(data.shares || [])
    } catch (error) {
      console.error("Error fetching shares:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const deleteShare = async (id: string) => {
    try {
      const res = await fetch(`/api/shares/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete share")
      setShares(shares.filter((s) => s.id !== id))
    } catch (error) {
      console.error("Error deleting share:", error)
    }
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-slate-950">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold text-white">Shared Files</h1>
          </header>

          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400">Loading shares...</p>
              </div>
            ) : shares.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Share2 className="w-16 h-16 text-slate-600 mb-4" />
                <p className="text-slate-400 text-lg">No shared files yet</p>
                <p className="text-slate-500 text-sm mt-2">Share files from your dashboard to see them here</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {shares.map((share) => (
                  <Card key={share.id} className="bg-slate-900 border-slate-800 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-white">{share.fileId}</p>
                          {share.password && <Lock className="w-4 h-4 text-amber-500" />}
                        </div>
                        <p className="text-sm text-slate-400 mb-3">
                          Created {new Date(share.createdAt).toLocaleDateString()}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {share.maxDownloads && (
                            <div className="flex items-center gap-1 text-sm bg-slate-800 px-3 py-1 rounded text-slate-300">
                              <Download className="w-3 h-3" />
                              {share.downloadCount}/{share.maxDownloads}
                            </div>
                          )}
                          {share.expiresAt && (
                            <div className="flex items-center gap-1 text-sm bg-slate-800 px-3 py-1 rounded text-slate-300">
                              <Clock className="w-3 h-3" />
                              Expires {new Date(share.expiresAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/share/${share.shareToken}`}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300"
                          />
                          <Button
                            size="sm"
                            onClick={() => copyShareLink(share.shareToken)}
                            className={`${
                              copied === share.shareToken
                                ? "bg-green-600 hover:bg-green-600"
                                : "bg-slate-700 hover:bg-slate-600"
                            }`}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-slate-800 ml-4"
                        onClick={() => deleteShare(share.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}

