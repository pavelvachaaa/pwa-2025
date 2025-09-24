"use client"

import { useState } from "react"
import { Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { formatFileSize, isImageFile, isVideoFile, getFileIcon } from "@/lib/upload-utils"
import { cn } from "@/lib/utils"

interface MediaMessageProps {
  filename: string
  url: string
  mimeType: string
  size: number
  thumbnailUrl?: string
  isOwn: boolean
  className?: string
}

export function MediaMessage({ filename, url, mimeType, size, thumbnailUrl, isOwn, className }: MediaMessageProps) {
  const [imageError, setImageError] = useState(false)

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isImageFile(mimeType) && !imageError) {
    return (
      <div className={cn("max-w-xs lg:max-w-sm", className)}>
        <Dialog>
          <DialogTrigger asChild>
            <div className="relative group cursor-pointer">
              <img
                src={thumbnailUrl || url}
                alt={filename}
                className="rounded-lg max-w-full h-auto"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <img src={url || "/placeholder.svg"} alt={filename} className="w-full h-auto max-h-[90vh] object-contain" />
          </DialogContent>
        </Dialog>

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{filename}</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2" onClick={handleDownload}>
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  if (isVideoFile(mimeType)) {
    return (
      <div className={cn("max-w-xs lg:max-w-sm", className)}>
        <div className="relative">
          <video src={url} className="rounded-lg max-w-full h-auto" controls preload="metadata">
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{filename}</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2" onClick={handleDownload}>
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  // File attachment
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border max-w-xs lg:max-w-sm",
        isOwn ? "bg-primary/10 border-primary/20" : "bg-muted border-border",
        className,
      )}
    >
      <div className="flex-shrink-0 text-2xl">{getFileIcon(mimeType)}</div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{filename}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(size)}</p>
      </div>

      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0" onClick={handleDownload}>
        <Download className="h-4 w-4" />
      </Button>
    </div>
  )
}
