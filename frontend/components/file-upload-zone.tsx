"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  uploadFile,
  formatFileSize,
  getFileIcon,
  isImageFile,
  createImagePreview,
  type UploadedFile,
} from "@/lib/upload-utils"

interface FileUploadZoneProps {
  onFileUploaded: (file: UploadedFile) => void
  onUploadStart?: () => void
  onUploadComplete?: () => void
  className?: string
  accept?: string
  maxSize?: number
  multiple?: boolean
}

interface FileUploadItem {
  id: string
  file: File
  preview?: string
  progress: number
  status: "uploading" | "completed" | "error"
  error?: string
  uploadedFile?: UploadedFile
}

export function FileUploadZone({
  onFileUploaded,
  onUploadStart,
  onUploadComplete,
  className,
  accept = "image/*,video/*,.pdf,.doc,.docx,.txt",
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = false,
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadItems, setUploadItems] = useState<FileUploadItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files)

      // Validate files
      const validFiles = fileArray.filter((file) => {
        if (file.size > maxSize) {
          console.error(`File ${file.name} is too large`)
          return false
        }
        return true
      })

      if (validFiles.length === 0) return

      onUploadStart?.()

      // Create upload items
      const newUploadItems: FileUploadItem[] = await Promise.all(
        validFiles.map(async (file) => {
          const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          let preview: string | undefined

          if (isImageFile(file.type)) {
            try {
              preview = await createImagePreview(file)
            } catch (error) {
              console.error("Failed to create preview:", error)
            }
          }

          return {
            id,
            file,
            preview,
            progress: 0,
            status: "uploading" as const,
          }
        }),
      )

      setUploadItems((prev) => [...prev, ...newUploadItems])

      // Upload files
      for (const item of newUploadItems) {
        try {
          const uploadedFile = await uploadFile(item.file, (progress) => {
            setUploadItems((prev) => prev.map((upload) => (upload.id === item.id ? { ...upload, progress } : upload)))
          })

          setUploadItems((prev) =>
            prev.map((upload) => (upload.id === item.id ? { ...upload, status: "completed", uploadedFile } : upload)),
          )

          onFileUploaded(uploadedFile)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Upload failed"
          setUploadItems((prev) =>
            prev.map((upload) =>
              upload.id === item.id ? { ...upload, status: "error", error: errorMessage } : upload,
            ),
          )
        }
      }

      onUploadComplete?.()
    },
    [maxSize, onFileUploaded, onUploadStart, onUploadComplete],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFiles(files)
      }
    },
    [handleFiles],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFiles(files)
      }
      // Reset input
      e.target.value = ""
    },
    [handleFiles],
  )

  const removeUploadItem = useCallback((id: string) => {
    setUploadItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/50",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm font-medium mb-2">Drop files here or click to browse</p>
        <p className="text-xs text-muted-foreground">
          Supports images, videos, documents up to {formatFileSize(maxSize)}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {uploadItems.length > 0 && (
        <div className="space-y-2">
          {uploadItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-card rounded-lg border">
              {/* File Preview/Icon */}
              <div className="flex-shrink-0">
                {item.preview ? (
                  <img
                    src={item.preview || "/placeholder.svg"}
                    alt={item.file.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-lg">
                    {getFileIcon(item.file.type)}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>

                {/* Progress Bar */}
                {item.status === "uploading" && (
                  <div className="mt-2">
                    <Progress value={item.progress} className="h-1" />
                    <p className="text-xs text-muted-foreground mt-1">{item.progress}% uploaded</p>
                  </div>
                )}

                {/* Error Message */}
                {item.status === "error" && <p className="text-xs text-destructive mt-1">{item.error}</p>}

                {/* Success Message */}
                {item.status === "completed" && <p className="text-xs text-green-600 mt-1">Upload complete</p>}
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  removeUploadItem(item.id)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
