"use client"

import { useState } from "react"
import { Camera, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileUploadZone } from "./file-upload-zone"
import { useAuth } from "@/lib/auth/context"
import { useToast } from "@/hooks/use-toast"
import type { UploadedFile } from "@/lib/upload-utils"

export function ProfileSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [avatar, setAvatar] = useState(user?.avatar || "")
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarUpload = (file: UploadedFile) => {
    setAvatar(file.url)
    setShowAvatarDialog(false)
    toast({
      title: "Avatar updated",
      description: "Your profile picture has been updated.",
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal information and profile picture.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatar || "/placeholder.svg"} />
              <AvatarFallback className="text-2xl">{name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div>
              <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Camera className="h-4 w-4" />
                    Change Avatar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Profile Picture</DialogTitle>
                  </DialogHeader>
                  <FileUploadZone
                    onFileUploaded={handleAvatarUpload}
                    accept="image/*"
                    maxSize={5 * 1024 * 1024} // 5MB
                    className="mt-4"
                  />
                </DialogContent>
              </Dialog>
              <p className="text-sm text-muted-foreground mt-2">JPG, PNG or GIF. Max size 5MB.</p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
            <p className="text-sm text-muted-foreground">
              This email will be used for notifications and account recovery.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isLoading} className="gap-2">
              <Save className="h-4 w-4" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>Your account information and status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Account Status</p>
              <p className="text-sm text-muted-foreground">Your account is active and verified</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-green-600">Active</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Member Since</p>
              <p className="text-sm text-muted-foreground">Demo account created today</p>
            </div>
            <span className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
