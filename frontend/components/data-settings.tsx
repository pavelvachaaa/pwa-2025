"use client"

import { useState } from "react"
import { Database, Download, Trash2, RefreshCw, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export function DataSettings() {
  const { toast } = useToast()
  const [isResetting, setIsResetting] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)

  const handleExportData = async () => {
    try {
      // Simulate data export
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Create mock export data
      const exportData = {
        user: {
          name: "Demo User",
          email: "demo@example.com",
          exportDate: new Date().toISOString(),
        },
        conversations: [],
        messages: [],
        settings: {},
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `chat-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Data exported",
        description: "Your chat data has been exported successfully.",
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleResetData = async () => {
    setIsResetting(true)
    try {
      // Simulate data reset
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // In a real app, you would reset the user's data here
      // For demo purposes, we'll just show a success message
      toast({
        title: "Demo data reset",
        description: "All demo conversations and messages have been reset.",
      })

      setShowResetDialog(false)
    } catch (error) {
      toast({
        title: "Reset failed",
        description: "Failed to reset demo data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
          <CardDescription>Download a copy of your chat data for backup or migration purposes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium">Export All Data</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Download all your conversations, messages, and settings as a JSON file.
              </p>
              <Button onClick={handleExportData} className="gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
          <CardDescription>Overview of your data usage and storage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Messages</span>
              <span className="text-sm text-muted-foreground">~2.3 MB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Media Files</span>
              <span className="text-sm text-muted-foreground">~15.7 MB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Profile Data</span>
              <span className="text-sm text-muted-foreground">~0.1 MB</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between font-medium">
                <span>Total Usage</span>
                <span>~18.1 MB</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Data Management</CardTitle>
          <CardDescription>Manage your demo data and reset conversations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is a demo application. All data is stored locally and will be lost when you clear your browser data.
            </AlertDescription>
          </Alert>

          <div className="flex items-start gap-4">
            <RefreshCw className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium">Reset Demo Data</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Clear all conversations and messages to start fresh with the demo.
              </p>

              <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Reset Demo Data
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset Demo Data</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to reset all demo data? This will clear all conversations, messages, and
                      uploaded files. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleResetData} disabled={isResetting}>
                      {isResetting ? "Resetting..." : "Reset Data"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Security</CardTitle>
          <CardDescription>Manage your privacy settings and data security.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Data Encryption</p>
                <p className="text-sm text-muted-foreground">Messages are encrypted in transit</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm text-green-600">Enabled</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Local Storage</p>
                <p className="text-sm text-muted-foreground">Data stored locally in your browser</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-sm text-blue-600">Active</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Analytics</p>
                <p className="text-sm text-muted-foreground">Anonymous usage analytics</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full" />
                <span className="text-sm text-gray-600">Disabled</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
