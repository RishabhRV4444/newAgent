"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { FolderPlus, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentPath?: string // Accept parent path for nested folders
}

export function CreateFolderDialog({ open, onOpenChange, parentPath = "/" }: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState("")
  const { toast } = useToast()

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", "/api/folders", {
        name,
        parentPath: parentPath, // Use provided parent path
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] })
      queryClient.invalidateQueries({ queryKey: ["/api/storage"] })
      toast({
        title: "Folder created",
        description: `"${folderName}" has been created successfully`,
      })
      setFolderName("")
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create folder",
        description: error.message || "An error occurred",
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (folderName.trim()) {
      createMutation.mutate(folderName.trim())
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700" data-testid="dialog-create-folder">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FolderPlus className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-white">Create New Folder</DialogTitle>
                <DialogDescription className="mt-1 text-slate-400">Enter a name for your new folder</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name" className="text-slate-300">
                Folder Name
              </Label>
              <Input
                id="folder-name"
                placeholder="My Folder"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                autoFocus
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-500"
                data-testid="input-folder-name"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
                className="border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!folderName.trim() || createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-create"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Create Folder
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
