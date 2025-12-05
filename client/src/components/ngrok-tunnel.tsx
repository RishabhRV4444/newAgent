"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Copy, CheckCircle, AlertCircle, Radio } from "lucide-react"
import useSWR from "swr"

export function NgrokTunnel() {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const { data: status, mutate } = useSWR(
    "/api/ngrok/status",
    (url:string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 3000 }, // Poll every 3 seconds
  )

  const handleStart = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/ngrok/start", {
        method: "POST",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to start tunnel")
      }
      await mutate()
    } catch (error) {
      console.error("Error starting ngrok:", error)
      alert(error instanceof Error ? error.message : "Failed to start tunnel")
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/ngrok/stop", {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to stop tunnel")
      await mutate()
    } catch (error) {
      console.error("Error stopping ngrok:", error)
      alert("Failed to stop tunnel")
    } finally {
      setLoading(false)
    }
  }

  const copyUrl = () => {
    if (status?.url) {
      navigator.clipboard.writeText(status.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className={`h-4 w-4 ${status?.isRunning ? "text-green-500" : "text-gray-400"}`} />
          ngrok Tunnel Status
        </CardTitle>
        <CardDescription>Expose your local server for sharing files publicly</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.isRunning ? (
          <>
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">Tunnel is active and ready for sharing</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm font-medium">Public URL</p>
              <div className="flex gap-2">
                <Input value={status.url} readOnly className="text-sm font-mono" />
                <Button size="sm" variant="outline" onClick={copyUrl} className="gap-2 bg-transparent">
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <Button onClick={handleStop} disabled={loading} variant="destructive" className="w-full">
              {loading ? "Stopping..." : "Stop Tunnel"}
            </Button>
          </>
        ) : (
          <>
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Tunnel is not running. Start it to enable public file sharing.
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Prerequisites:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  ngrok installed: <code className="bg-gray-100 px-2 py-1 rounded text-xs">npm install -g ngrok</code>
                </li>
                <li>
                  ngrok account: <code className="bg-gray-100 px-2 py-1 rounded text-xs">ngrok auth &lt;token&gt;</code>
                </li>
              </ul>
            </div>

            <Button onClick={handleStart} disabled={loading} className="w-full">
              {loading ? "Starting..." : "Start Tunnel"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
