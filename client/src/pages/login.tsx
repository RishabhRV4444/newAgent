"use client"

import type React from "react"

import { useState } from "react"
// import { useRouter ,usePathname } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { loginSchema } from "@shared/auth-schema"
import { Cloud, Lock, User, ArrowRight, CheckCircle } from "lucide-react"
import { useLocation } from "wouter";

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  // const pathname = usePathname()
  const [location, navigate] = useLocation();
  const { toast } = useToast()
  // const goToNav = useRouter()

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Login failed")
      }

      return res.json()
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Logged in successfully",
      })
      // goToNav.push("/")
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = loginSchema.safeParse({ username, password })
    if (!result.success) {
      toast({
        title: "Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      })
      return
    }

    loginMutation.mutate({ username, password })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Cloud className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">AREVEI Cloud</span>
          </div>
        </div>

        <Card className="bg-slate-800 border-slate-700 shadow-2xl">
          <div className="p-8">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-slate-400 mb-6">Sign in to access your files</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-slate-400 text-sm">
                Don't have an account?{" "}
                {/* <button onClick={() => goToNav.push("/signup")} className="text-blue-400 hover:text-blue-300 font-medium">
                  Sign up
                </button> */}
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
            <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
            <p className="text-xs text-slate-300">Secure Storage</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
            <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
            <p className="text-xs text-slate-300">Easy Access</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
            <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
            <p className="text-xs text-slate-300">Fast Sync</p>
          </div>
        </div>
      </div>
    </div>
  )
}
